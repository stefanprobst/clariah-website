import type { CollectionFieldConfig, SearchFieldType } from "#/lib/search/schema.ts";

export type SearchFilterValue = boolean | number | string;

export interface SearchValueFilter<Field extends string> {
	operator: "equals" | "notEquals";
	field: Field;
	/** Multiple values are combined with `or`, i.e. the field must match any of them. */
	value: ReadonlyArray<SearchFilterValue> | SearchFilterValue;
}

export interface SearchRangeFilter<Field extends string> {
	operator: "range";
	field: Field;
	/** Inclusive lower bound. */
	min?: number;
	/** Inclusive upper bound. */
	max?: number;
}

export interface SearchFilterGroup<Field extends string> {
	operator: "all" | "any";
	filters: ReadonlyArray<SearchFilter<Field>>;
}

export interface SearchRawFilter {
	operator: "raw";
	/** A typesense `filter_by` expression, which is passed through as-is. */
	value: string;
}

/**
 * Matches the children of an `object[]` field within one and the same array element.
 *
 * Filtering two children with `and` does not do this: `contributors.name:=Bob && contributors.year:=2021` matches a
 * document whose contributors are `Bob (2020)` and `Cleo (2021)`, because each condition is satisfied by a different
 * element. Typesense expresses per-element matching as `contributors.{name:=Bob && year:=2021}`, which is what this
 * serializes to.
 */
export interface SearchNestedFilter<Field extends string> {
	operator: "nested";
	/** An `object[]` field. Narrowing this to only the fields which have children would make `SearchFilter` invariant. */
	field: Field;
	/** Field names relative to `field`, e.g. `name` for the `contributors.name` field. */
	filters: ReadonlyArray<SearchFilter<string>>;
}

export type SearchFilter<Field extends string> =
	| SearchFilterGroup<Field>
	| SearchNestedFilter<Field>
	| SearchRangeFilter<Field>
	| SearchRawFilter
	| SearchValueFilter<Field>;

export interface SearchFieldInfo {
	type: SearchFieldType;
	array: boolean;
}

export type SearchFieldTypes = ReadonlyMap<string, SearchFieldInfo>;

export function getFieldTypes(fields: ReadonlyArray<CollectionFieldConfig>): SearchFieldTypes {
	return new Map(
		fields.map((field): [string, SearchFieldInfo] => [field.name, { type: field.type, array: field.array === true }]),
	);
}

const numericFieldTypes = new Set<SearchFieldType>(["float", "int32", "int64"]);
const booleanFieldTypes = new Set<SearchFieldType>(["bool"]);

/**
 * Typesense filter values are only comparable when they are serialized according to the field type: numbers and
 * booleans must be bare literals, everything else must be wrapped in backticks, so values containing `,`, `&&`, `||`,
 * `(` or `)` don't break the expression.
 *
 * Note that typesense treats a backtick in a _field value_ as a token separator, so values which themselves contain
 * backticks cannot be matched exactly. There is no escape sequence for this.
 *
 * Returns `null` for values which cannot be represented for the field, e.g. a non-numeric string selected for a numeric
 * facet, which callers drop instead of emitting a filter which errors.
 */
function serializeFilterValue(type: SearchFieldType | undefined, value: SearchFilterValue): string | null {
	if (type != null && numericFieldTypes.has(type)) {
		const numericValue = typeof value === "number" ? value : Number(value);
		return Number.isFinite(numericValue) ? String(numericValue) : null;
	}

	if (type != null && booleanFieldTypes.has(type)) {
		if (typeof value === "boolean") {
			return String(value);
		}
		return value === "true" || value === "false" ? value : null;
	}

	return `\`${String(value)}\``;
}

/**
 * Inside `parent.{…}` the child fields are named relative to the parent, while their declared types are keyed by the
 * full path, so the two are resolved separately.
 */
function resolveFieldPath(prefix: string, field: string): string {
	return prefix === "" ? field : `${prefix}.${field}`;
}

function serializeValueFilter<Field extends string>(
	fieldTypes: SearchFieldTypes,
	filter: SearchValueFilter<Field>,
	prefix: string,
): string | null {
	const type = fieldTypes.get(resolveFieldPath(prefix, filter.field))?.type;
	const values: ReadonlyArray<SearchFilterValue> = Array.isArray(filter.value) ? filter.value : [filter.value];

	const serializedValues: Array<string> = [];
	for (const value of values) {
		const serializedValue = serializeFilterValue(type, value);
		if (serializedValue != null) {
			serializedValues.push(serializedValue);
		}
	}

	if (serializedValues.length === 0) {
		return null;
	}

	const comparator = filter.operator === "notEquals" ? ":!=" : ":=";

	/** The list form is also valid for a single value, and for fields which are not arrays. */
	return `${filter.field}${comparator}[${serializedValues.join(",")}]`;
}

function serializeRangeFilter<Field extends string>(filter: SearchRangeFilter<Field>): string | null {
	const hasMin = filter.min != null && Number.isFinite(filter.min);
	const hasMax = filter.max != null && Number.isFinite(filter.max);

	if (hasMin && hasMax) {
		/** Typesense range syntax is inclusive on both ends, but has no open-ended form. */
		return `${filter.field}:[${String(filter.min)}..${String(filter.max)}]`;
	}

	if (hasMin) {
		return `${filter.field}:>=${String(filter.min)}`;
	}

	if (hasMax) {
		return `${filter.field}:<=${String(filter.max)}`;
	}

	return null;
}

function serializeFilterGroup<Field extends string>(
	fieldTypes: SearchFieldTypes,
	filter: SearchFilterGroup<Field>,
	prefix: string,
): string | null {
	const expressions = serializeFilterList(fieldTypes, filter.filters, prefix);

	if (expressions.length === 0) {
		return null;
	}

	if (expressions.length === 1) {
		return expressions[0] ?? null;
	}

	return `(${expressions.join(filter.operator === "any" ? " || " : " && ")})`;
}

/** The fields a filter refers to, so a nested filter can be checked against the hazard below. */
function collectFieldNames<Field extends string>(
	filters: ReadonlyArray<SearchFilter<Field>>,
	names: Set<string>,
): void {
	for (const filter of filters) {
		switch (filter.operator) {
			case "all":
			case "any": {
				collectFieldNames(filter.filters, names);
				break;
			}

			case "equals":
			case "nested":
			case "notEquals":
			case "range": {
				names.add(filter.field);
				break;
			}

			case "raw": {
				break;
			}
		}
	}
}

function serializeNestedFilter<Field extends string>(
	fieldTypes: SearchFieldTypes,
	filter: SearchNestedFilter<Field>,
	prefix: string,
): string | null {
	const path = resolveFieldPath(prefix, filter.field);
	const expressions = serializeFilterList(fieldTypes, filter.filters, path);

	if (expressions.length === 0) {
		return null;
	}

	if (expressions.length > 1) {
		const names = new Set<string>();
		collectFieldNames(filter.filters, names);

		for (const name of names) {
			/**
			 * Typesense 30.0 never answers `parent.{x && y}` when a matching element holds an array in one of the children —
			 * the request hangs until the client times out, rather than failing. Each condition on its own is fine, and so is
			 * combining them with `or`. Which children hold an array is exactly what a typesense schema cannot say and ours
			 * can, so the request is rejected here instead of being left to hang.
			 */
			if (fieldTypes.get(resolveFieldPath(path, name))?.array === true) {
				throw new Error(
					`Nested filter on "${path}" combines several conditions with "and", one of which is on "${name}", ` +
						`which holds many values per object. Typesense does not answer that query. Filter on "${path}.${name}" ` +
						"outside of the nested filter, or combine the conditions with `any` instead.",
				);
			}
		}
	}

	return `${filter.field}.{${expressions.join(" && ")}}`;
}

function serializeFilter<Field extends string>(
	fieldTypes: SearchFieldTypes,
	filter: SearchFilter<Field>,
	prefix: string,
): string | null {
	switch (filter.operator) {
		case "all":
		case "any": {
			return serializeFilterGroup(fieldTypes, filter, prefix);
		}

		case "equals":
		case "notEquals": {
			return serializeValueFilter(fieldTypes, filter, prefix);
		}

		case "nested": {
			return serializeNestedFilter(fieldTypes, filter, prefix);
		}

		case "range": {
			return serializeRangeFilter(filter);
		}

		case "raw": {
			const value = filter.value.trim();
			/** Parenthesized, because we cannot know the precedence of the operators it contains. */
			return value.length > 0 ? `(${value})` : null;
		}
	}
}

function serializeFilterList<Field extends string>(
	fieldTypes: SearchFieldTypes,
	filters: ReadonlyArray<SearchFilter<Field>>,
	prefix: string,
): Array<string> {
	const expressions: Array<string> = [];

	for (const filter of filters) {
		const expression = serializeFilter(fieldTypes, filter, prefix);
		if (expression != null) {
			expressions.push(expression);
		}
	}

	return expressions;
}

/** Serializes filters into a typesense `filter_by` expression. Filters are combined with `and`. */
export function serializeFilters<Field extends string>(
	fieldTypes: SearchFieldTypes,
	filters: ReadonlyArray<SearchFilter<Field>>,
): string | undefined {
	const expressions = serializeFilterList(fieldTypes, filters, "");
	return expressions.length > 0 ? expressions.join(" && ") : undefined;
}
