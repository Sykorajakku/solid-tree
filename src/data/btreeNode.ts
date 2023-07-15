import { Quad, DataFactory } from "n3"
import TREE from "../vocabularies/tree";
import { RelationType } from "../init/fragmentationDescription";
const { quad, namedNode } = DataFactory;

interface BtreeRelation {
    quads: Quad[],
    type: Quad,
    value: Quad,
    link: Quad
}

const compareBtreeRelations = (a: BtreeRelation, b: BtreeRelation): number => {
    if (a.value.object.value === b.value.object.value) {
        if (a.type.object.equals(namedNode(TREE.LessThanRelation))) {
            return -1
        }
        else return 1
    }
    else {
        return a.value.object.value < b.value.object.value ? -1 : 1
    }
}

class BtreeNode<Type> {
    nodeContainerUrl: URL
    relations: BtreeRelation[]
    parent: BtreeNode<Type>
    m: number

    constructor(nodeContainerUrl: URL, relations: BtreeRelation[], parent: BtreeNode<Type>, m: number) {
        this.nodeContainerUrl = nodeContainerUrl
        this.relations = relations.sort(compareBtreeRelations)
        this.parent = parent
        this.m = m
    }

    isLeaf(): boolean {
        return this.relations.every((rel) => rel.type.object.equals(namedNode(TREE.EqualToRelation)))
    }

    isFull(): boolean {
        return this.isLeaf() ?
            this.relations.length === this.m : 
            this.relations.length === this.m + 1
    }

    find(value: Type): URL {
        const stringVal = value as string

        // relations are already sorted
        let finalURL = null

        for (let relation of this.relations) {
            if (relation.type.object.equals(namedNode(TREE.LessThanRelation)) &&
                stringVal < relation.value.object.value) {
                finalURL = new URL(relation.link.object.id) // if here, this is not going to get updated with Greater relations
            }
            if (relation.type.object.equals(namedNode(TREE.GreaterThanOrEqualToRelation)) &&
                stringVal >= relation.value.object.value) {
                finalURL = new URL(relation.link.object.id) // just updating to upper bound
            }
        }

        return finalURL
    }

    insertLeafToParentAfterSplit(leftNode: BtreeNode<Type>, rightNodes: Quad[], parent: BtreeNode<Type>): URL {
        if (parent == null) {
            

        }
        else {
            let newParentVal = rightNodes[0].value
            // create a new node
            //return this.insertInner()
        }

        return null
    }

    insertInner(newParentVal: Type, rightNode: BtreeNode<Type>): URL {
        return null
    }
}

export { compareBtreeRelations, BtreeNode }
export type { BtreeRelation }
