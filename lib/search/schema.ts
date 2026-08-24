import type { CollectionCreateSchema, CollectionFieldSchema, FieldType } from "typesense";

/**
 * The type of a single value.
 *
 * Typesense names an array of values as a type of its own (`string[]`), which conflates how a value is indexed with
 * what the document holds. It has no way to distinguish `contributors.name: string[]` meaning one name per contributor
 * from many names per contributor, because every child of an array of objects has to be declared as an array either
 * way. Declaring the element type and whether the field holds many of them keeps the two apart, and the typesense type
 * is derived from the pair on the way out.
 */
export type SearchFieldType =
	| "auto"
	| "bool"
	| "float"
	| "geopoint"
	| "geopolygon"
	| "image"
	| "int32"
	| "int64"
	| "object"
	| "string";

interface FieldTypeMap {
	auto: unknown;
	bool: boolean;
	float: number;
	geopoint: [number, number];
	geopolygon: unknown;
	image: unknown;
	int32: number;
	int64: number;
	object: Record<string, unknown>;
	string: string;
}

/** The typesense type of each element type which can hold many values. The rest have no array form. */
const arrayFieldTypes: Partial<Record<SearchFieldType, FieldType>> = {
	bool: "bool[]",
	float: "float[]",
	geopoint: "geopoint[]",
	int32: "int32[]",
	int64: "int64[]",
	object: "object[]",
	string: "string[]",
};

/**
 * A reference from this field to a document in another collection, which typesense can then join on.
 *
 * The referenced collection is named by its key in the `collections` map of the search service rather than by its
 * typesense name, because that name is only known at runtime — it comes from the environment, and differs between
 * deployments. It is resolved when the schema is built.
 */
export interface FieldReferenceConfig {
	/** The key of the referenced collection, e.g. `"website"`. */
	collection: string;
	/** The field to reference, which is almost always `"id"`. */
	field: string;
	/**
	 * Whether a document may be indexed before the document it references exists. Without this, ingest fails with
	 * `Referenced document having id: … not found`, so the referenced collection has to be filled first.
	 */
	async?: boolean;
	/**
	 * Whether deleting the referenced document also deletes this one. Typesense defaults this to `true`, so removing one
	 * document from the referenced collection silently removes every document pointing at it. Requires `async`.
	 */
	cascadeDelete?: boolean;
}

export interface CollectionFieldConfig {
	/** A `.` denotes a path into an `object` field, e.g. `contributors.name`. */
	name: string;
	type: SearchFieldType;
	reference?: FieldReferenceConfig;
	/** Whether the field holds many values — many keywords per document, or many names per contributor. */
	array?: boolean;
	index?: boolean;
	facet?: boolean;
	sort?: boolean;
	optional?: boolean;
	/** Merged into the typesense field, for the options which are not modelled here. */
	options?: Record<string, unknown>;
}

type StrictFieldConfig = CollectionFieldConfig &
	({ index?: true | undefined } | { index: false; facet?: never; sort?: never });

type SearchableFieldType = "string";

type QueryableFieldNames<T extends CollectionFieldConfig> = T extends { index: false } ? never : T["name"];
type SearchableFieldNames<T extends CollectionFieldConfig> = T extends { index: false }
	? never
	: T["type"] extends SearchableFieldType
		? T["name"]
		: never;
type FilterableFieldNames<T extends CollectionFieldConfig> = T extends { index: false } ? never : T["name"];
type SortableFieldNames<T extends CollectionFieldConfig> = T extends { sort: true } ? T["name"] : never;
type FacetableFieldNames<T extends CollectionFieldConfig> = T extends { facet: true } ? T["name"] : never;

/**
 * The fields which are properties of the document itself. A nested child declares how to index part of an object field,
 * rather than a property of its own, so it contributes to the type of its parent instead.
 */
type DocumentField<F extends ReadonlyArray<CollectionFieldConfig>> = Exclude<
	F[number],
	{ name: `${string}.${string}` }
>;

/** The name of a nested child, relative to its parent: `contributors.name` under `contributors` is `name`. */
type RelativeFieldName<Name extends string, Prefix extends string> = Name extends `${Prefix}.${infer Child}`
	? Child
	: never;

/** The fields declared directly below `Prefix`, so `a.b` but not `a.b.c`. */
type DirectChildField<F extends ReadonlyArray<CollectionFieldConfig>, Prefix extends string> =
	Extract<F[number], { name: `${Prefix}.${string}` }> extends infer Child
		? Child extends CollectionFieldConfig
			? RelativeFieldName<Child["name"], Prefix> extends `${string}.${string}`
				? never
				: Child
			: never
		: never;

type FieldElementValue<
	F extends ReadonlyArray<CollectionFieldConfig>,
	Field extends CollectionFieldConfig,
> = Field["type"] extends "object" ? NestedObjectFromFields<F, Field["name"]> : FieldTypeMap[Field["type"]];

type FieldValue<F extends ReadonlyArray<CollectionFieldConfig>, Field extends CollectionFieldConfig> = Field extends {
	array: true;
}
	? Array<FieldElementValue<F, Field>>
	: FieldElementValue<F, Field>;

/** An object field with no declared children is indexed in full by typesense, and stays open here too. */
type NestedObjectFromFields<F extends ReadonlyArray<CollectionFieldConfig>, Prefix extends string> = [
	DirectChildField<F, Prefix>,
] extends [never]
	? Record<string, unknown>
	: {
			[
				Child in DirectChildField<F, Prefix> as Child extends { optional: true }
					? never
					: RelativeFieldName<Child["name"], Prefix>
			]: FieldValue<F, Child>;
		} & {
			[
				Child in DirectChildField<F, Prefix> as Child extends { optional: true }
					? RelativeFieldName<Child["name"], Prefix>
					: never
			]?: FieldValue<F, Child> | null;
		};

type DocumentFromFields<F extends ReadonlyArray<CollectionFieldConfig>> = {
	[Field in DocumentField<F> as Field extends { optional: true } ? never : Field["name"]]: FieldValue<F, Field>;
} & {
	[Field in DocumentField<F> as Field extends { optional: true } ? Field["name"] : never]?: FieldValue<F, Field> | null;
};

export type CollectionDocument<C extends { fields: ReadonlyArray<CollectionFieldConfig> }> = DocumentFromFields<
	C["fields"]
>;
export type CollectionQueryableFieldName<C extends { fields: ReadonlyArray<CollectionFieldConfig> }> =
	QueryableFieldNames<C["fields"][number]>;
export type CollectionSearchableFieldName<C extends { fields: ReadonlyArray<CollectionFieldConfig> }> =
	SearchableFieldNames<C["fields"][number]>;
export type CollectionFilterableFieldName<C extends { fields: ReadonlyArray<CollectionFieldConfig> }> =
	FilterableFieldNames<C["fields"][number]>;
export type CollectionSortableFieldName<C extends { fields: ReadonlyArray<CollectionFieldConfig> }> =
	SortableFieldNames<C["fields"][number]>;
export type CollectionFacetableFieldName<C extends { fields: ReadonlyArray<CollectionFieldConfig> }> =
	FacetableFieldNames<C["fields"][number]>;

function getQueryableFields<F extends ReadonlyArray<CollectionFieldConfig>>(
	fields: F,
): Array<QueryableFieldNames<F[number]>> {
	return fields.filter((f) => f.index !== false).map((f) => f.name) as Array<QueryableFieldNames<F[number]>>;
}

function getSearchableFields<F extends ReadonlyArray<CollectionFieldConfig>>(
	fields: F,
): Array<SearchableFieldNames<F[number]>> {
	return fields.filter((f) => f.index !== false && f.type === "string").map((f) => f.name) as Array<
		SearchableFieldNames<F[number]>
	>;
}

function getFilterableFields<F extends ReadonlyArray<CollectionFieldConfig>>(
	fields: F,
): Array<FilterableFieldNames<F[number]>> {
	return fields.filter((f) => f.index !== false).map((f) => f.name) as Array<FilterableFieldNames<F[number]>>;
}

function getSortableFields<F extends ReadonlyArray<CollectionFieldConfig>>(
	fields: F,
): Array<SortableFieldNames<F[number]>> {
	return fields.filter((f) => f.sort === true).map((f) => f.name) as Array<SortableFieldNames<F[number]>>;
}

function getFacetableFields<F extends ReadonlyArray<CollectionFieldConfig>>(
	fields: F,
): Array<FacetableFieldNames<F[number]>> {
	return fields.filter((f) => f.facet === true).map((f) => f.name) as Array<FacetableFieldNames<F[number]>>;
}

/** `a.b.c` is nested below `a` and `a.b`. */
function getAncestorPaths(name: string): Array<string> {
	const segments = name.split(".");
	return segments.slice(0, -1).map((_segment, index) => segments.slice(0, index + 1).join("."));
}

function toFieldSchema(field: CollectionFieldConfig, isArray: boolean): CollectionFieldSchema {
	const type = isArray ? arrayFieldTypes[field.type] : field.type;

	if (type == null) {
		throw new Error(`Field "${field.name}" is of type "${field.type}", which cannot hold many values.`);
	}

	const schema: CollectionFieldSchema = { ...field.options, name: field.name, type };

	if (field.index != null) {
		schema.index = field.index;
	}

	if (field.facet != null) {
		schema.facet = field.facet;
	}

	if (field.sort != null) {
		schema.sort = field.sort;
	}

	if (field.optional != null) {
		schema.optional = field.optional;
	}

	return schema;
}

function toFieldSchemas(fields: ReadonlyArray<CollectionFieldConfig>): Array<CollectionFieldSchema> {
	const byName = new Map(fields.map((field): [string, CollectionFieldConfig] => [field.name, field]));

	return fields.map((field) => {
		let isArray = field.array === true;

		for (const path of getAncestorPaths(field.name)) {
			const parent = byName.get(path);

			if (parent?.type !== "object") {
				throw new Error(
					`Field "${field.name}" is nested, but its parent "${path}" is not declared as an "object" field.`,
				);
			}

			/**
			 * Every object in an array of objects puts its values into one shared index, so typesense requires the children
			 * of such a field to be declared as arrays, whatever an individual object holds. That is a property of the index
			 * rather than of the document, which is why `array` above stays the source of truth for the document type.
			 */
			isArray ||= parent.array === true;
		}

		return toFieldSchema(field, isArray);
	});
}

export interface Collection<F extends ReadonlyArray<CollectionFieldConfig>, M extends object = object> {
	fields: F;
	queryableFields: ReadonlyArray<QueryableFieldNames<F[number]>>;
	searchableFields: ReadonlyArray<SearchableFieldNames<F[number]>>;
	filterableFields: ReadonlyArray<FilterableFieldNames<F[number]>>;
	sortableFields: ReadonlyArray<SortableFieldNames<F[number]>>;
	facetableFields: ReadonlyArray<FacetableFieldNames<F[number]>>;
	defaultSortingField: SortableFieldNames<F[number]> | undefined;
	metadata: M | undefined;
	/**
	 * @param name The typesense name of this collection.
	 * @param referencedNames The typesense name of every collection referenced by a field, keyed as in the reference.
	 */
	schema: (name: string, referencedNames?: Readonly<Record<string, string>>) => CollectionCreateSchema;
}

export interface CollectionConfig<F extends ReadonlyArray<StrictFieldConfig>, M extends object> {
	fields: F;
	/** Must be one of the fields marked as `sort: true`. */
	defaultSortingField?: SortableFieldNames<F[number]>;
	metadata?: M;
}

/** Resolves each reference to the runtime name of the collection it points at. */
function withReferences(
	fields: ReadonlyArray<CollectionFieldSchema>,
	configs: ReadonlyArray<CollectionFieldConfig>,
	referencedNames: Readonly<Record<string, string>>,
): Array<CollectionFieldSchema> {
	return fields.map((field, index) => {
		const reference = configs[index]?.reference;

		if (reference == null) {
			return field;
		}

		const referencedName = referencedNames[reference.collection];

		if (referencedName == null) {
			throw new Error(
				`Field "${field.name}" references the collection "${reference.collection}", whose name was not provided.`,
			);
		}

		const referencing: CollectionFieldSchema = { ...field, reference: `${referencedName}.${reference.field}` };

		if (reference.async === true) {
			referencing.async_reference = true;
		}

		if (reference.cascadeDelete === false) {
			referencing.cascade_delete = false;
		}

		return referencing;
	});
}

export function defineCollection<F extends ReadonlyArray<StrictFieldConfig>, M extends object = object>(
	config: CollectionConfig<F, M>,
): Collection<F, M> {
	/** Validates the nesting, so a collection with an invalid schema fails on import rather than on first ingest. */
	const fields = toFieldSchemas(config.fields);
	const hasObjectField = config.fields.some((field) => field.type === "object");
	const hasReference = config.fields.some((field) => field.reference != null);

	for (const field of config.fields) {
		if (field.reference?.cascadeDelete === false && field.reference.async !== true) {
			throw new Error(`Field "${field.name}" sets "cascadeDelete", which typesense only allows together with "async".`);
		}
	}

	return {
		fields: config.fields,
		queryableFields: getQueryableFields(config.fields),
		searchableFields: getSearchableFields(config.fields),
		filterableFields: getFilterableFields(config.fields),
		sortableFields: getSortableFields(config.fields),
		facetableFields: getFacetableFields(config.fields),
		defaultSortingField: config.defaultSortingField,
		metadata: config.metadata,
		schema(name: string, referencedNames: Readonly<Record<string, string>> = {}): CollectionCreateSchema {
			const schema: CollectionCreateSchema = {
				name,
				fields: hasReference ? withReferences(fields, config.fields, referencedNames) : fields,
			};

			/** Typesense rejects `object` and `object[]` fields outright unless this is set. */
			if (hasObjectField) {
				schema.enable_nested_fields = true;
			}

			if (config.defaultSortingField != null) {
				schema.default_sorting_field = config.defaultSortingField;
			}

			if (config.metadata != null) {
				schema.metadata = config.metadata;
			}

			return schema;
		},
	};
}
