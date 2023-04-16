import { Types } from "./../util/inversify/types"
import { inject, injectable } from "inversify"
import { DataFactory, Quad, Writer } from "n3"
import { SolidProtocolUtils } from "../util/solidProtocolUtils"
import { Node } from "../data/node"
import TREE from "../vocabularies/tree"
import type { LibRuntime } from "../lib/libRuntime"
import { RDF } from "@solid/community-server"
import LDES from "../vocabularies/ldes"
import SOLIDSTREAMS from "../vocabularies/solidstreams"
import XSD from "../vocabularies/xsd"
import { createRandomChildContainerUrl } from "../util/url"

const { quad, namedNode } = DataFactory;

@injectable()
export class LibData {

    private readonly libRuntime: LibRuntime
    private readonly solidProtocolUtils: SolidProtocolUtils
    
    public constructor(
        @inject(Types.LibRuntime) libRuntime: LibRuntime,
        @inject(Types.SolidProtocolUtils) solidProtocolUtils: SolidProtocolUtils
    ) {
        this.libRuntime = libRuntime
        this.solidProtocolUtils = solidProtocolUtils
    }

    public extractViews = async (): Promise<Node[]> => {
        const views: Node[] = []
        const quads = await this.solidProtocolUtils.getContainerQuads(this.libRuntime.rootContainerUrl)
        const viewQuads = quads.filter(quad => quad.predicate.equals(namedNode(TREE.view)))

        for (const viewQuad of viewQuads) {
            const nodeContainerUrl = new URL(viewQuad.object.id)
            const viewNodeQuads = await this.solidProtocolUtils.getContainerQuads(nodeContainerUrl)
            const viewDescriptions = viewNodeQuads.filter(filterQuad => filterQuad.predicate.equals(namedNode(TREE.viewDescription)))

            if (viewDescriptions.length === 0) {
                throw new Error(`${TREE.viewDescription} predicate quad not found in ${nodeContainerUrl}`)
            }
            
            const eventSourceQuads = viewNodeQuads.filter(filterQuad => 
                filterQuad.subject.equals(namedNode(viewDescriptions[0].object.id)) &&
                filterQuad.predicate.equals(namedNode(RDF.type)) &&
                filterQuad.object.equals(namedNode(LDES.eventSource))
            )
            
            views.push({
                nodeContainerUrl: nodeContainerUrl,
                viewDescription: { isEventSource: eventSourceQuads.length > 0 }
            })
        }

        return views
    }

    public createLeafRelation = (containerUrl: URL, memberUrl: URL, generatedAtTime: string): Quad[] => {
        const containerResource = this.solidProtocolUtils.removeTrailingSlash(containerUrl.toString())
        const resourceName = this.solidProtocolUtils.extractResourceName(memberUrl.toString())
        const relationUrl = `${containerResource}#${resourceName}`

        // N3 updates does not allow to use blank nodes (stated in SOLID specification)
        return [
            quad(
                namedNode(containerUrl.toString()),
                namedNode(TREE.relation),
                namedNode(relationUrl)
            ),
            quad(
                namedNode(relationUrl),
                namedNode(RDF.type),
                namedNode(TREE.EqualToRelation)
            ),
            quad(
                namedNode(relationUrl),
                namedNode(TREE.path),
                namedNode(SOLIDSTREAMS.publishTimestamp)
            ),
            quad(
                namedNode(relationUrl),
                namedNode(TREE.value),
                DataFactory.literal(generatedAtTime, namedNode(XSD.dateTime))
            ),
            quad(
                namedNode(relationUrl),
                namedNode(TREE.remainingItems),
                DataFactory.literal(1, namedNode(XSD.integer))
            ),
            quad(
                namedNode(relationUrl),
                namedNode(TREE.node),
                namedNode(memberUrl.toString())
            )
        ]
    }

    public addTimepathProperty = (memberQuads: Quad[], memberRoot: URL, generatedAtTime: string): Quad[] => {
        memberQuads.push(
            quad(
                namedNode(memberRoot.toString()),
                namedNode(SOLIDSTREAMS.publishTimestamp),
                DataFactory.literal(generatedAtTime, namedNode(XSD.dateTime))
            )
        )
        return memberQuads   
    }

    public countLeafRelationNodes = async (containerUrl: URL): Promise<number> => {
        const quads = await this.solidProtocolUtils.getContainerQuads(containerUrl)
        const equalToRelationQuads = quads.filter(quad => quad.object.equals(namedNode(TREE.EqualToRelation)))
        return equalToRelationQuads.length
    }

    public createNewMembersContainer = async (containerUrl: URL, generatedAtTime: string): Promise<URL> => {
        const newContainerUrl = createRandomChildContainerUrl(this.libRuntime.rootContainerUrl)
        const rootContainerMetadataUrl = await this.solidProtocolUtils.findContainerDescriptionResource(this.libRuntime.rootContainerUrl)
        await this.solidProtocolUtils.createContainer(newContainerUrl)
        
        await this.solidProtocolUtils.deleteInsertWithN3Update(
            rootContainerMetadataUrl,
            [ quad(namedNode(this.libRuntime.rootContainerUrl.toString()), namedNode(TREE.view), namedNode(newContainerUrl.toString())) ],
            [ quad(namedNode(this.libRuntime.rootContainerUrl.toString()), namedNode(TREE.view), namedNode(containerUrl.toString())) ],
        )

        // TODO: add tree:remaningItems to inserted quads
        const insertQuads = this.createNewMembersContainerMetadata(newContainerUrl, containerUrl, generatedAtTime)
        const newContainerUrlMetadataUrl = await this.solidProtocolUtils.findContainerDescriptionResource(newContainerUrl) 
        await this.solidProtocolUtils.insertQuadsWithN3Update(newContainerUrlMetadataUrl, insertQuads)

        return containerUrl
    }

    private createNewMembersContainerMetadata = (newContainerUrl: URL, oldContainerURL: URL, generatedAtTime: string): Quad[] => {
        const newContainerBase = this.solidProtocolUtils.removeTrailingSlash(newContainerUrl.toString())
        const oldContainerResourceIds = this.solidProtocolUtils.extractResourceName(oldContainerURL.toString())  
        const relationUrl = `${newContainerBase}#${oldContainerResourceIds}`

        // N3 updates does not support blank nodes
        return [
            quad(
                namedNode(newContainerUrl.toString()),
                namedNode(RDF.type),
                namedNode(TREE.Node)
            ),
            quad(
                namedNode(newContainerUrl.toString()),
                namedNode(TREE.viewDescription),
                namedNode(newContainerUrl.toString() + 'viewDescription')
            ),
            quad(
                namedNode(newContainerUrl.toString() + 'viewDescription'),
                namedNode(RDF.type),
                namedNode(LDES.eventSource)
            ),
            quad(
                namedNode(newContainerUrl.toString()),
                namedNode(TREE.relation),
                namedNode(relationUrl)    
            ),
            quad(
                namedNode(relationUrl),
                namedNode(RDF.type),
                namedNode(TREE.LessThanRelation)
            ),
            quad(
                namedNode(relationUrl),
                namedNode(TREE.node),
                namedNode(oldContainerURL.toString())
            ),
            quad(
                namedNode(relationUrl),
                namedNode(TREE.path),
                namedNode(SOLIDSTREAMS.publishTimestamp)
            ),
            quad(
                namedNode(relationUrl),
                namedNode(TREE.value),
                DataFactory.literal(generatedAtTime, namedNode(XSD.dateTime))
            ),
        ]
    }
}
