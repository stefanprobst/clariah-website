import { Result } from "better-result";
import { Client, type ConfigurationOptions, type DocumentSchema, type SearchResponse } from "typesense";

import { cacheSearchResultsForSeconds } from "#/configs/search.config.ts";
import {
	type ResourceDocument,
	type ResourcesCollection,
	resourcesCollection,
} from "#/lib/search/collections/resources.ts";
import { type WebsiteCollection, type WebsiteDocument, websiteCollection } from "#/lib/search/collections/website.ts";
import { SearchError } from "#/lib/search/errors.ts";
import { getFieldTypes } from "#/lib/search/filters.ts";
import type { Collection, CollectionFacetableFieldName, CollectionFieldConfig } from "#/lib/search/schema.ts";
import {
	type SearchCollectionParams,
	type SearchFacet,
	type SearchFacetValuesParams,
	type SearchPlan,
	type SearchResult,
	type SearchableCollection,
	createFacetValuesRequest,
	createSearchPlan,
	getFacet,
	mapSearchResult,
} from "#/lib/search/search.ts";

export type {
	PublicationResourceDocument,
	ResourceDocument,
	ResourceFacetField,
	ResourceFilterField,
	ResourceItem,
	ResourceSearchField,
	ResourceSearchResult,
	ResourceSortField,
	ResourcesCollection,
	SearchResourcesParams,
	SearchResourcesFacetValuesParams,
	ServiceResourceDocument,
	SoftwareResourceDocument,
	TrainingMaterialResourceDocument,
	WorkflowResourceDocument,
} from "#/lib/search/collections/resources.ts";
export {
	resourcesCollection,
	resourceServiceKinds,
	resourceSources,
	resourceTypes,
} from "#/lib/search/collections/resources.ts";
export type {
	SearchWebsiteParams,
	SearchWebsiteFacetValuesParams,
	WebsiteCollection,
	WebsiteDocument,
	WebsiteEntityDocument,
	WebsiteFacetField,
	WebsiteFilterField,
	WebsiteItem,
	WebsiteResourceDocument,
	WebsiteSearchField,
	WebsiteSearchResult,
	WebsiteSortField,
} from "#/lib/search/collections/website.ts";
export { websiteCollection, websiteEntityTypes, websiteResourceTypes } from "#/lib/search/collections/website.ts";
export type {
	SearchFieldTypes,
	SearchFilter,
	SearchFilterGroup,
	SearchFilterValue,
	SearchNestedFilter,
	SearchRangeFilter,
	SearchRawFilter,
	SearchValueFilter,
} from "#/lib/search/filters.ts";
export { defineJoin } from "#/lib/search/search.ts";
export type {
	AnySearchJoin,
	SearchCollectionParams,
	SearchFacet,
	SearchFacetConfig,
	SearchFacetOperator,
	SearchFacetStats,
	SearchFacetValue,
	SearchFacetValuesParams,
	SearchFacetsConfig,
	SearchHighlight,
	SearchJoin,
	SearchItem,
	SearchPagination,
	SearchResult,
	SearchSort,
	SearchableCollection,
} from "#/lib/search/search.ts";

export interface SearchServiceConfig extends Pick<ConfigurationOptions, "cacheSearchResultsForSeconds"> {}

export interface CreateSearchServiceParams {
	apiKey: string;
	nodes: Array<{ host: string; port: number; protocol: "http" | "https" }>;
	collections: {
		resources: string;
		website: string;
	};
	config?: SearchServiceConfig;
}

export interface CollectionSearchClient<C extends SearchableCollection, Document> {
	search: (
		params: SearchCollectionParams<C>,
	) => Promise<Result<SearchResult<Document, CollectionFacetableFieldName<C>>, SearchError>>;
	/**
	 * Searches the values of a single facet, within the context of the current search, so the returned counts match what
	 * selecting one of the values would yield.
	 */
	searchFacetValues: (params: SearchFacetValuesParams<C>) => Promise<Result<SearchFacet, SearchError>>;
}

/** Multi-search results carry per-request errors in the response payload, instead of rejecting. */
function assertOk<Document extends DocumentSchema>(response: SearchResponse<Document>): SearchResponse<Document> {
	if (response.error != null) {
		throw new Error(response.error);
	}

	return response;
}

function createCollectionSearchClient<F extends ReadonlyArray<CollectionFieldConfig>, Document extends DocumentSchema>(
	client: Client,
	name: string,
	collection: Collection<F>,
	/** The runtime name of every collection, so a join can resolve the one it references. */
	referencedNames: Readonly<Record<string, string>>,
): CollectionSearchClient<Collection<F>, Document> {
	const fieldTypes = getFieldTypes(collection.fields);
	const documents = client.collections<Document>(name).documents();

	async function execute(plan: SearchPlan<Document, CollectionFacetableFieldName<Collection<F>>>): Promise<{
		main: SearchResponse<Document>;
		facets: Array<SearchResponse<Document>>;
		joinedFacets: Array<SearchResponse<Document>>;
	}> {
		/** A single request does not need the overhead of `multi_search`. */
		if (plan.facetRequests.length === 0 && plan.joinedFacetRequests.length === 0) {
			return { main: await documents.search(plan.main), facets: [], joinedFacets: [] };
		}

		const searches = [{ collection: name, ...plan.main }];
		for (const facetRequest of [...plan.facetRequests, ...plan.joinedFacetRequests]) {
			searches.push({ collection: name, ...facetRequest.params });
		}

		const { results } = await client.multiSearch.perform<Array<Document>>({ searches });

		const [main, ...rest] = results;

		if (main == null) {
			throw new Error(`Search on collection "${name}" returned no results.`);
		}

		const facetResponses = rest.map((response) => assertOk(response));

		return {
			main: assertOk(main),
			facets: facetResponses.slice(0, plan.facetRequests.length),
			joinedFacets: facetResponses.slice(plan.facetRequests.length),
		};
	}

	return {
		search(params) {
			return Result.tryPromise({
				async try() {
					const plan = createSearchPlan<F, Document>(collection, fieldTypes, params, referencedNames);
					return mapSearchResult(plan, await execute(plan));
				},
				catch(cause) {
					return new SearchError({ cause });
				},
			});
		},

		searchFacetValues(params) {
			return Result.tryPromise({
				async try() {
					const request = createFacetValuesRequest<F, Document>(collection, fieldTypes, params);
					return getFacet(await documents.search(request), params.facet);
				},
				catch(cause) {
					return new SearchError({ cause });
				},
			});
		},
	};
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createSearchService(params: CreateSearchServiceParams) {
	const { apiKey, collections, nodes, config } = params;

	const client = new Client({
		apiKey,
		cacheSearchResultsForSeconds,
		connectionTimeoutSeconds: 5,
		nodes,
		numRetries: 3,
		retryIntervalSeconds: 0.1,
		...config,
	});

	return {
		collections: {
			resources: createCollectionSearchClient<ResourcesCollection["fields"], ResourceDocument>(
				client,
				collections.resources,
				resourcesCollection,
				collections,
			),
			website: createCollectionSearchClient<WebsiteCollection["fields"], WebsiteDocument>(
				client,
				collections.website,
				websiteCollection,
				collections,
			),
		},
	};
}

export type SearchService = ReturnType<typeof createSearchService>;
