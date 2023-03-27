import { BlankNode, NamedNode, Quad, Store } from "n3";
import clownface from "clownface";
import { findNodes } from 'clownface-shacl-path';
import { ShaclPathExtractor } from "./interfaces/shaclPathExtractor";

export class RdfjsShaclPathExtractor implements ShaclPathExtractor {
    
    private findNodesPath: any;

    constructor(relation: Quad[]) {
        // TODO: hardcoded tree:path -> namespace
        // TODO: tree:path exception handling if not found    
        const relationStore = new Store(relation);
        const treePath = [... relationStore.match(null, new NamedNode('https://w3id.org/tree#path'), null)];

        if (treePath[0].object.termType === 'BlankNode') {
            const replacingNamedBlankNode = new BlankNode('kekw');
            const treePathBlankNode = treePath[0].object
            const replacedRelations = relation.map(q => {
                if (q.object.value == treePathBlankNode.value) {
                    return new Quad(q.subject, q.predicate, replacingNamedBlankNode);
                }
                if (q.subject.value == treePathBlankNode.value) {
                    return new Quad(replacingNamedBlankNode, q.predicate, q.object);
                }
                return q
            });
        
            this.findNodesPath = clownface({ dataset: new Store(replacedRelations) })
                .namedNode(treePath[0].subject.value)
                .namedNode('https://w3id.org/tree#path')
                .blankNode('kekw')
        } else {
            this.findNodesPath = clownface({ dataset: new Store(relation) })
                .namedNode(treePath[0].subject.value)
                .namedNode('https://w3id.org/tree#path')
                .namedNode(treePath[0].object.value)
        }
    }

    extractPathValue = (quads: Quad[], memberRoot: NamedNode) => {
        const ldesMember = clownface({ dataset: new Store(quads) })
            .namedNode(memberRoot.id);

        const result = findNodes(ldesMember, this.findNodesPath);
        return { treeValues: result.values }
    }
}
