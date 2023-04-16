
export enum RelationType { 
    PrefixRelation,
    GreaterThanRelation
}

export interface FragmentationDescription {
    relationType: RelationType,
    path: string
}
