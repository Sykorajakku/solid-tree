import { inject, injectable } from "inversify"
import { SolidProtocolUtils } from "../util/solidProtocolUtils"
import { Types } from "../util/inversify/types"
import type { LibRuntime } from "./libRuntime"
import { Quad, DataFactory } from "n3"
import { LibData } from "./libData"
import LDES from "../vocabularies/ldes"
import { getCurrentDateInXsdDateTimeFormat } from "../util/time"

const { quad, namedNode } = DataFactory;

@injectable()
export class Lib {

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

    public insertCollectionMember = async (memberQuads: Quad[], memberRoot: URL) => {
        const views = await this.libData.extractViews()
        const ldesEventSource = views.find(view => view.viewDescription.isEventSource)

        if (!ldesEventSource) {
            throw new Error(`LDES collection with root container at` +
             ` ${this.libRuntime.rootContainerUrl} has` +
             ` no view description of ${LDES.eventSource}}`)
        }

        const membersCount = await this.libData.countLeafRelationNodes(ldesEventSource.nodeContainerUrl)
        let newMemberContainer = ldesEventSource.nodeContainerUrl

        if (membersCount > 10) {
            // TODO: newMemberContainer update, implementing paging
            throw new Error('TODO: Implement paging. More members currently unsupported!')
        }

        const insertionTime = getCurrentDateInXsdDateTimeFormat()
        memberQuads = this.libData.addTimepathProperty(memberQuads, memberRoot, insertionTime)
        const location = await this.solidProtocolUtils.postResource(newMemberContainer, memberQuads)
        
        const leafRelationWriter = await this.libData.createLeafRelation(newMemberContainer, location, insertionTime)
        const newMemberContainerMetadata = await this.solidProtocolUtils.findContainerDescriptionResource(newMemberContainer)
        await this.solidProtocolUtils.insertWriterWithN3Update(newMemberContainerMetadata, leafRelationWriter)
    }
}
