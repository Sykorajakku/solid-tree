import { NamedNode, Quad } from "n3";

export interface ShaclPathExtractor {
    extractPathValue: (quads: Quad[], memberRoot: NamedNode) => { treeValues: string[] }
}
