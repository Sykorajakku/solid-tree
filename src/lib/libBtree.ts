import { inject, injectable } from "inversify"
import { Types } from "../util/inversify/types"
import { SolidProtocolUtils } from "../util/solidProtocolUtils"
import { LibData } from "./libData"
import { BtreeNode, BtreeRelation, compareBtreeRelations } from "../data/btreeNode"
import type { LibRuntime } from "./libRuntime"
import { DataFactory, Literal, Quad } from "n3"
import TREE from "../vocabularies/tree"
import RDF from "../vocabularies/rdf"
import XSD from "../vocabularies/xsd"
import { createRandomChildContainerUrl } from "../util/url"
import { ParallelHandler } from "@solid/community-server"

const { quad, namedNode, literal } = DataFactory;

@injectable()
export class LibBtree {

    private readonly solidProtocolUtils: SolidProtocolUtils

    private readonly libRuntime: LibRuntime

    private readonly libData: LibData

    public constructor(
        @inject(Types.SolidProtocolUtils) solidProtocolUtils: SolidProtocolUtils,
        @inject(Types.LibRuntime) libRuntime: LibRuntime,
        @inject(Types.LibData) libData: LibData
    ) {
        this.solidProtocolUtils = solidProtocolUtils
        this.libRuntime = libRuntime
        this.libData = libData
    }

    public async insert<Type>(
        memberNode: URL,
        rootBtreeNodeUrl: URL,
        value: Type,
        m: number): Promise<URL> {
        
        let parent = null
        let child = await this.readBtreeNode(rootBtreeNodeUrl, parent, m) // read root
        
        while (!child.isLeaf()) {
            parent = child
            let childBtreeNodeUrl = child.find(value)
            child = await this.readBtreeNode(childBtreeNodeUrl, parent, m)
        }
        
        // add triple for new value to the the current node
        const newRelationMetadata = this.createNewRelationMetadata(child.nodeContainerUrl, memberNode, value)
        const childMetadataUrl = await this.solidProtocolUtils.findContainerDescriptionResource(child.nodeContainerUrl)
        await this.solidProtocolUtils.insertQuadsWithN3Update(childMetadataUrl, newRelationMetadata.quads)
        
        // update the relations here with new value    
        child.relations.push(newRelationMetadata)
        child.relations = child.relations.sort(compareBtreeRelations)

        if (child.isFull()) {
            // split relations for Left and Right nodes
            let mid = (child.m + 1) / 2 // +1 to move more values to the left node
            let left = child.relations.slice(0, mid) // this goes to current node
            let right = child.relations.slice(mid) // values for new node

            // left node - update the current node with delete quads for moved nodes
            const deletedOnLeft: Quad[] = []
            for (let deletedRel of right) {
                for (let deletedRelQuad of deletedRel.quads) {
                    deletedOnLeft.push(deletedRelQuad)
                }
            }

            await this.solidProtocolUtils.deleteWithN3Update(childMetadataUrl, deletedOnLeft)
            return await this.insertLeafToParentAfterSplit(child, right, child.parent, rootBtreeNodeUrl)
        }

        return rootBtreeNodeUrl
    }

    async insertLeafToParentAfterSplit<Type>(child: BtreeNode<Type>, right: BtreeRelation[], parent: BtreeNode<Type>, root: URL): Promise<URL> {
        if (parent === null) {
            let newRootNodeUrl = createRandomChildContainerUrl(root)
            let newRightNodeUrl = createRandomChildContainerUrl(root)
            await this.solidProtocolUtils.createContainer(newRootNodeUrl)
            await this.solidProtocolUtils.createContainer(newRightNodeUrl)

            let newRootQuads: Quad[] = this.createNewRootQuads(newRootNodeUrl, right[0].value.object.value, child.nodeContainerUrl, newRightNodeUrl)
            let newRightNodeQuads: Quad[] = this.createLeafQuads(right)
            
            const rootMetadata = await this.solidProtocolUtils.findContainerDescriptionResource(newRootNodeUrl)
            const rightMetadata = await this.solidProtocolUtils.findContainerDescriptionResource(newRightNodeUrl)
            await this.solidProtocolUtils.insertQuadsWithN3Update(rightMetadata, newRightNodeQuads)
            await this.solidProtocolUtils.insertQuadsWithN3Update(rootMetadata, newRootQuads)
            return newRootNodeUrl
        }
        else {
            let newRightNodeUrl = createRandomChildContainerUrl(root)
            let newRightNodeQuads: Quad[] = this.createLeafQuads(right)
            await this.solidProtocolUtils.createContainer(newRightNodeUrl)

            const parentMetadata = await this.solidProtocolUtils.findContainerDescriptionResource(parent.nodeContainerUrl)
            const rightMetadata = await this.solidProtocolUtils.findContainerDescriptionResource(newRightNodeUrl)
            
            await this.solidProtocolUtils.insertQuadsWithN3Update(rightMetadata, newRightNodeQuads)
            const newRelationFragment = this.solidProtocolUtils.combineFragmentUrl(parent.nodeContainerUrl, newRightNodeUrl)

            let newRelationToParentQuads = [
                quad(
                    namedNode(parent.nodeContainerUrl.toString()),
                    namedNode(TREE.relation),
                    namedNode(newRelationFragment.toString())
                ),
                quad(
                    namedNode(newRelationFragment.toString()),
                    namedNode(RDF.type),
                    namedNode(TREE.GreaterThanOrEqualToRelation)
                ),
                quad(
                    namedNode(newRelationFragment.toString()),
                    namedNode(TREE.value),
                    literal(right[0].value.object.value, namedNode(XSD.string))
                ),
                quad(
                    namedNode(newRelationFragment.toString()),
                    namedNode(TREE.node),
                    namedNode(newRightNodeUrl.toString())
                )
            ]

            await this.solidProtocolUtils.insertQuadsWithN3Update(parentMetadata, newRelationToParentQuads)
            parent.relations.push({
                link: newRelationToParentQuads[3],
                value: newRelationToParentQuads[2],
                type: newRelationToParentQuads[1],
                quads: newRelationToParentQuads
            })

            if (this.isOuterLeft(parent, right[0].value.object.value)) {
                let indexOfDeletedRelations = parent.relations.findIndex(rel => rel.type.object.equals(namedNode(TREE.LessThanRelation)))
                let lowerThanRelation = parent.relations[indexOfDeletedRelations]
                // delete old relations
                await this.solidProtocolUtils.deleteWithN3Update(parentMetadata, lowerThanRelation.quads)
                // update less than relation
                let valQuadIndex = lowerThanRelation.quads.findIndex(rel => rel.predicate.equals(namedNode(TREE.value)))
                lowerThanRelation.quads[valQuadIndex] = quad(
                    lowerThanRelation.quads[valQuadIndex].subject,    
                    lowerThanRelation.quads[valQuadIndex].predicate,    
                    literal(right[0].value.object.value, namedNode(XSD.string))
                )
                await this.solidProtocolUtils.insertQuadsWithN3Update(parentMetadata, lowerThanRelation.quads)
                parent.relations = parent.relations.sort(compareBtreeRelations)
            }

            if (parent.isFull()) {
                return this.splitInnerNode(parent, root)
            }
            else {
                return root
            }
        }
    }

    private isOuterLeft = <Type>(parent: BtreeNode<Type>, rightValue: string) => {
        return rightValue < parent.relations[0].value.object.value
    }

    private async splitInnerNode<Type>(current: BtreeNode<Type>, root: URL): Promise<URL> {
        let newRightNodeUrl = createRandomChildContainerUrl(root)
        await this.solidProtocolUtils.createContainer(newRightNodeUrl)
        
        const rels = current.relations.sort(compareBtreeRelations)
        let mid = (current.m + 1) / 2 // +1 to move more values to the left node
        let left = rels.slice(0, mid) // this goes to current node
        let midToModify = rels[mid]
        let right = rels.slice(mid + 1) // values for new node

        // delete split nodes from Left
        const deletedOnLeft: Quad[] = []
        for (let deletedRel of [ ...right, midToModify ]) {
            for (let deletedRelQuad of deletedRel.quads) {
                deletedOnLeft.push(deletedRelQuad)
            }
        }

        const nodeContainerMetadata = await this.solidProtocolUtils.findContainerDescriptionResource(current.nodeContainerUrl)
        await this.solidProtocolUtils.deleteWithN3Update(nodeContainerMetadata, deletedOnLeft)

        // attach to Right new LessThanRelation from modified midToModify
        const leftFragment = this.solidProtocolUtils.combineFragmentUrl(newRightNodeUrl, new URL(midToModify.type.subject.id))
        
        const leftType = quad(
            namedNode(leftFragment.toString()),
            namedNode(RDF.type),
            namedNode(TREE.LessThanRelation)
        )

        const leftVal = quad(
            namedNode(leftFragment.toString()),
            namedNode(TREE.value),
            literal(right[0].value.object.value, namedNode(XSD.string))
        )

        const leftLink = quad(
            namedNode(leftFragment.toString()),
            namedNode(TREE.node),
            namedNode(midToModify.link.object.id)
        )
        
        let newLessThanRelationQuads = [
            quad(
                namedNode(newRightNodeUrl.toString()),
                namedNode(TREE.relation),
                namedNode(leftFragment.toString())
            ),
            leftVal,
            leftLink,
            leftType
        ]

        for (let rightRelation of right) {
            const idx = rightRelation.quads.findIndex(quad => quad.predicate.equals(namedNode(TREE.relation)))
            const replacedQuad = rightRelation.quads[idx]
            rightRelation.quads[idx] = quad(namedNode(newRightNodeUrl.toString()), replacedQuad.predicate, replacedQuad.object)
        }

        right.push({
            quads: newLessThanRelationQuads,
            type: leftType,
            value: leftVal,
            link: leftLink
        })
        right = right.sort(compareBtreeRelations)
        let rightQuads = this.createLeafQuads(right)

        const rightMetadata = await this.solidProtocolUtils.findContainerDescriptionResource(newRightNodeUrl)
        await this.solidProtocolUtils.insertQuadsWithN3Update(rightMetadata, rightQuads)

        if (current.parent === null) { // new root    
            let newRootNodeUrl = createRandomChildContainerUrl(root)
            await this.solidProtocolUtils.createContainer(newRootNodeUrl)
            const rootMetadata = await this.solidProtocolUtils.findContainerDescriptionResource(newRootNodeUrl)
            const rootQuads = this.createNewRootQuads(newRootNodeUrl, midToModify.value.object.value, current.nodeContainerUrl, newRightNodeUrl)
            await this.solidProtocolUtils.insertQuadsWithN3Update(rootMetadata, rootQuads)
            return newRootNodeUrl
        }
        else {
            const rightFragment = this.solidProtocolUtils.combineFragmentUrl(current.parent.nodeContainerUrl, newRightNodeUrl)
            
            const rightType = quad(
                namedNode(rightFragment.toString()),
                namedNode(RDF.type),
                namedNode(TREE.GreaterThanOrEqualToRelation)
            )

            const rightVal = quad(
                namedNode(rightFragment.toString()),
                namedNode(TREE.value),
                literal(midToModify.value.object.value, namedNode(XSD.string))
            )

            const rightLink = quad(
                namedNode(rightFragment.toString()),
                namedNode(TREE.node),
                namedNode(newRightNodeUrl.toString())
            )
            
            let newParentRelationQuads = [
                quad(
                    namedNode(current.parent.nodeContainerUrl.toString()),
                    namedNode(TREE.relation),
                    namedNode(rightFragment.toString())
                ),
                rightVal,
                rightLink,
                rightType
            ]

            await this.solidProtocolUtils.insertQuadsWithN3Update(rightMetadata, newParentRelationQuads)
            current.parent.relations.push({
                value: rightVal,
                link: rightLink,
                type: rightType,
                quads: newParentRelationQuads
            })
            current.parent.relations = current.parent.relations.sort(compareBtreeRelations)
            
            if (current.parent.isFull())
            {
                return await this.splitInnerNode(current.parent, root)
            }
            return current.parent.nodeContainerUrl
        }    
    }

    private async readBtreeNode<Type>(btreeNodeContainer: URL, parent: BtreeNode<Type>, m: number): Promise<BtreeNode<Type>> {
        const nodeQuads = await this.solidProtocolUtils.getContainerQuads(btreeNodeContainer)
        const relations = nodeQuads.filter(quad => quad.subject.equals(namedNode(btreeNodeContainer.toString())) && quad.predicate.equals(namedNode(TREE.relation)))
        
        let btreeRelations: BtreeRelation[] = []
        for (let relation of relations) {
            const relationQuads = nodeQuads.filter(quad => quad.subject.equals(relation.object) || quad.object.equals(relation.object))
            
            btreeRelations.push({
                quads: relationQuads,
                value: relationQuads.find(quad => quad.predicate.equals(namedNode(TREE.value))),
                link: relationQuads.find(quad => quad.predicate.equals(namedNode(TREE.node))),
                type: relationQuads.find(quad => quad.predicate.equals(namedNode(RDF.type)))
            })
        }
        return new BtreeNode(btreeNodeContainer, btreeRelations, parent, m)
    }

    private createNewRelationMetadata<Type>(nodeUrl: URL, memberUrl: URL, value: Type): BtreeRelation {
        const containerResource = this.solidProtocolUtils.removeTrailingSlash(nodeUrl.toString())
        const resourceName = this.solidProtocolUtils.extractResourceName(memberUrl.toString())
        const relationUrl = `${containerResource}#${resourceName}`
        
        const type = quad(
            namedNode(relationUrl),
            namedNode(RDF.type),
            namedNode(TREE.EqualToRelation)
        )

        const val = quad(
            namedNode(relationUrl),
            namedNode(TREE.value),
            DataFactory.literal(value as string, namedNode(XSD.string))
        )

        const link = quad(
            namedNode(relationUrl),
            namedNode(TREE.node),
            namedNode(memberUrl.toString())
        )

        return {
            quads: [
                quad(
                    namedNode(nodeUrl.toString()),
                    namedNode(TREE.relation),
                    namedNode(relationUrl)
                ),
                quad(
                    namedNode(relationUrl),
                    namedNode(TREE.remainingItems),
                    DataFactory.literal(1, namedNode(XSD.integer))
                ),
                type,
                val,
                link
            ],
            type: type,
            value: val,
            link: link
        }
    }

    private createLeafQuads = (right: BtreeRelation[]):Quad[] => {
        let quads: Quad[] = []

        for (let rightRelation of right) {
            for (let quad of rightRelation.quads) {
                quads.push(quad)
            }
        }
        return quads
    }

    private createNewRootQuads = (rootUrl: URL, value: string, left: URL, right: URL): Quad[] => {
        const leftFragment = this.solidProtocolUtils.combineFragmentUrl(rootUrl, left)
        const rightFragment = this.solidProtocolUtils.combineFragmentUrl(rootUrl, right)
        
        return [
            quad(
                namedNode(rootUrl.toString()),
                namedNode(RDF.type),
                namedNode(TREE.Node)
            ),
            // left
            quad(
                namedNode(rootUrl.toString()),
                namedNode(TREE.relation),
                namedNode(leftFragment)
            ),
            quad(
                namedNode(leftFragment),
                namedNode(RDF.type),
                namedNode(TREE.LessThanRelation)
            ),
            quad(
                namedNode(leftFragment),
                namedNode(TREE.value),
                literal(value as string, namedNode(XSD.string))
            ),
            quad(
                namedNode(leftFragment),
                namedNode(TREE.node),
                namedNode(left.toString())
            ),
            // right
            quad(
                namedNode(rootUrl.toString()),
                namedNode(TREE.relation),
                namedNode(rightFragment)
            ),
            quad(
                namedNode(rightFragment),
                namedNode(RDF.type),
                namedNode(TREE.GreaterThanOrEqualToRelation)
            ),
            quad(
                namedNode(rightFragment),
                namedNode(TREE.value),
                literal(value as string, namedNode(XSD.string))
            ),
            quad(
                namedNode(rightFragment),
                namedNode(TREE.node),
                namedNode(right.toString())
            )
        ]
    }
}

