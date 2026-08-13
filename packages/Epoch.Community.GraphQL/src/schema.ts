export const COMMUNITY_GRAPHQL_SDL = /* GraphQL */ `
  scalar JSON
  scalar Cursor
  scalar VPath

  enum SortDirection { ASCENDING DESCENDING }
  enum NullOrder { FIRST LAST }
  enum CompareOperator { EQ NE LT LTE GT GTE IN }
  enum TextMode { TERM PHRASE PREFIX }
  enum RelationDirection { IN OUT }
  enum RelationType { REPLY QUOTE MENTION PROVENANCE PROMOTION REPLACEMENT MODERATION ATTACHMENT BACKLINK }
  enum NamespaceScope { BUILTIN COMMUNITY WORKSPACE USER SESSION }
  enum NamespaceMountMode { REPLACE BEFORE AFTER }

  input AllSearchInput { enabled: Boolean! }
  input SearchTermsInput { terms: [SearchExpressionInput!]! }
  input SearchNotInput { term: SearchExpressionInput! }
  input TextSearchInput { fields: [String!]!, value: String!, mode: TextMode! }
  input CommunityScalarInput @oneOf { string: String, number: Float, boolean: Boolean, nullValue: Boolean }
  input CommunityValueInput @oneOf { scalar: CommunityScalarInput, values: [CommunityScalarInput!] }
  input CompareSearchInput { field: String!, operator: CompareOperator!, value: CommunityValueInput! }
  input RangeSearchInput { field: String!, lower: CommunityScalarInput, upper: CommunityScalarInput, includeLower: Boolean!, includeUpper: Boolean! }
  input ExistsSearchInput { field: String! }
  input ObjectRefInput { objectId: ID!, kind: String!, atUri: String, revision: String }
  input RelatedSearchInput { relation: RelationType!, target: ObjectRefInput!, direction: RelationDirection!, maxDepth: Int! }
  input SearchExpressionInput @oneOf {
    all: AllSearchInput
    and: SearchTermsInput
    or: SearchTermsInput
    not: SearchNotInput
    text: TextSearchInput
    compare: CompareSearchInput
    range: RangeSearchInput
    exists: ExistsSearchInput
    related: RelatedSearchInput
  }
  input SearchOrderInput { field: String!, direction: SortDirection!, nulls: NullOrder! }
  input SearchScopeInput { sourceIds: [ID!], objectKinds: [String!] }

  type ObjectRef { objectId: ID!, kind: String!, atUri: String, revision: String }
  type Provenance { sourceId: ID!, nativeId: ID!, observedAt: String!, checkpoint: String, uri: String, revision: String }
  type CommunityNode {
    id: ID!
    ref: ObjectRef!
    fields: JSON!
    visibility: String!
    ownerId: ID
    createdAt: String!
    updatedAt: String!
    provenance: Provenance!
    tombstone: JSON
  }
  type SearchHit {
    target: ObjectRef!
    score: Float
    sortKey: JSON!
    matchedFields: [String!]!
    provenance: Provenance!
  }
  type PageInfo { hasNextPage: Boolean!, startCursor: Cursor, endCursor: Cursor }
  type SourceCheckpoint { sourceId: ID!, token: String!, observedAt: String!, status: String!, detail: String }
  type SearchCompleteness { status: String!, sources: [SourceCheckpoint!]!, omittedSources: [ID!]!, unsupportedPredicates: [String!]! }
  type SearchSnapshot {
    snapshotId: ID!
    createdAt: String!
    resolvedNow: String!
    timezone: String!
    locale: String!
    queryHash: String!
    planHash: String!
    fieldRegistryVersion: Int!
    analyzerVersion: String!
    sourceCheckpoints: [SourceCheckpoint!]!
  }
  type SearchConnection { nodes: [SearchHit!]!, pageInfo: PageInfo!, snapshot: SearchSnapshot!, completeness: SearchCompleteness! }

  type SourceSpan { start: Int!, end: Int!, line: Int!, column: Int! }
  type QueryDiagnostic { code: String!, message: String!, severity: String!, span: SourceSpan, suggestions: [String!]! }
  type ParsedSearch {
    expression: JSON
    canonical: String!
    canonicalJson: String!
    queryHash: String!
    version: Int!
    fieldRegistryVersion: Int!
    resolvedAt: String!
    orderBy: [SearchOrder!]!
    diagnostics: [QueryDiagnostic!]!
  }
  type SearchOrder { field: String!, direction: String!, nulls: String! }
  type SourcePlanExplanation { sourceId: ID!, pushdown: JSON!, residual: JSON! }
  type SearchExplanation {
    planHash: String!
    backendId: String!
    expression: JSON!
    parsedExpression: JSON
    normalizedExpression: JSON!
    sourcePlans: [SourcePlanExplanation!]!
    ordering: [String!]!
    authorization: String!
    omissions: [String!]!
  }

  type Projection {
    id: ID!
    version: Int!
    label: String!
    ownerId: ID
    visibility: String!
    updateMode: String!
    consistency: String!
    definition: JSON!
  }
  input SaveProjectionDefinitionInput { definition: JSON! }
  input MountProjectionInput {
    mountId: ID!
    projectionId: ID!
    path: VPath!
    mode: NamespaceMountMode!
    scope: NamespaceScope!
    order: Int! = 0
    writable: Boolean! = false
  }
  type NamespaceMount { id: ID!, scope: String!, path: VPath!, projectionId: ID!, mode: String!, order: Int!, writable: Boolean!, ownerId: ID, createdAt: String!, updatedAt: String! }
  type NamespaceReset { scope: String!, removedMountIds: [ID!]!, preservedProjectionIds: [ID!]! }

  type ProjectionEntryCapabilities { read: Boolean!, enter: Boolean!, expand: Boolean!, composeUnder: Boolean!, execute: Boolean! }
  type VfsEntry {
    entryId: ID!
    target: ObjectRef!
    projectionId: ID!
    projectionVersion: Int!
    parentEntryId: ID!
    name: String!
    logicalPath: VPath!
    kind: String!
    sortKey: JSON!
    capabilities: ProjectionEntryCapabilities!
    freshness: SearchCompleteness!
  }
  type ShadowedVfsEntry { name: String!, winner: VfsEntry!, entry: VfsEntry!, mountId: ID!, reason: String! }
  type VfsConnection { nodes: [VfsEntry!]!, pageInfo: PageInfo!, freshness: SearchCompleteness!, shadowed: [ShadowedVfsEntry!]!, componentOrder: [ID!]! }
  type ProjectionExplanation { projectionId: ID!, path: VPath!, entry: VfsEntry, componentOrder: [ID!]!, shadowed: [VfsEntry!]!, detail: String! }
  type ProjectionDelta { projectionId: ID!, projectionVersion: Int!, sequence: Int!, upserts: [VfsEntry!]!, deletes: [ID!]!, observedAt: String! }

  type SourceFieldCapability { name: String!, type: String!, operators: [String!]!, sortable: Boolean!, facetable: Boolean! }
  type SourceCapabilities {
    sourceId: ID!
    fields: [SourceFieldCapability!]!
    fullText: String!
    pagination: String!
    supportsWatch: Boolean!
    supportsPointLookup: Boolean!
    supportsRelations: Boolean!
    maxPageSize: Int!
  }

  type Query {
    node(id: ID!): CommunityNode
    search(where: SearchExpressionInput!, scope: SearchScopeInput, orderBy: [SearchOrderInput!], first: Int!, after: Cursor, snapshot: ID): SearchConnection!
    parseSearch(expression: String!, timezone: String, locale: String): ParsedSearch!
    explainSearch(where: SearchExpressionInput!, scope: SearchScopeInput, orderBy: [SearchOrderInput!]): SearchExplanation!
    projections: [Projection!]!
    projection(id: ID!): Projection
    listPath(namespace: ID, path: VPath!, first: Int!, after: Cursor, snapshot: ID): VfsConnection!
    resolvePath(namespace: ID, path: VPath!, snapshot: ID): VfsEntry
    locate(namespace: ID, objectId: ID!, snapshot: ID): [VfsEntry!]!
    explainPath(namespace: ID, path: VPath!, snapshot: ID): ProjectionExplanation!
    sourceCapabilities: [SourceCapabilities!]!
    namespaceMounts: [NamespaceMount!]!
  }

  type Mutation {
    saveProjection(input: SaveProjectionDefinitionInput!): Projection!
    deleteProjection(id: ID!): Boolean!
    mountProjection(input: MountProjectionInput!): NamespaceMount!
    unmountProjection(id: ID!): Boolean!
    resetNamespace(scope: NamespaceScope!): NamespaceReset!
  }

  type Subscription {
    projectionDeltas(namespace: ID, path: VPath!, snapshot: ID): ProjectionDelta!
  }
`;
