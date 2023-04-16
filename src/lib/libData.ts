import { Types } from "./../util/inversify/types"
import { inject, injectable } from "inversify"
import { DataFactory } from "n3"
import { SolidProtocolUtils } from "../util/solidProtocolUtils"
import { Node } from "../data/node"
import TREE from "../vocabularies/tree"
import type { LibRuntime } from "../lib/libRuntime"
import { RDF } from "@solid/community-server"
import LDES from "../vocabularies/ldes"

const { namedNode } = DataFactory;

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

    public countLeafRelationNodes = async (containerUrl: URL): Promise<number> => {
        const quads = await this.solidProtocolUtils.getContainerQuads(containerUrl)
        const equalToRelationQuads = quads.filter(quad => quad.object.equals(namedNode(TREE.EqualToRelation)))
        return equalToRelationQuads.length
    }
}
