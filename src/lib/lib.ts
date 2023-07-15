import { inject, injectable } from "inversify"
import { SolidProtocolUtils } from "../util/solidProtocolUtils"
import { Types } from "../util/inversify/types"
import type { LibRuntime } from "./libRuntime"
import { Quad, DataFactory } from "n3"
import { LibData } from "./libData"
import LDES from "../vocabularies/ldes"
import { getCurrentDateInXsdDateTimeFormat } from "../util/time"
import { LibBtree } from "./libBtree"
import { MemoryMapStorage } from "@solid/community-server"

@injectable()
export class Lib {

    private readonly solidProtocolUtils: SolidProtocolUtils

    private readonly libRuntime: LibRuntime

    private readonly libData: LibData

    private readonly libBtree: LibBtree

    public constructor(
        @inject(Types.SolidProtocolUtils) solidProtocolUtils: SolidProtocolUtils,
        @inject(Types.LibRuntime) libRuntime: LibRuntime,
        @inject(Types.LibData) libData: LibData,
        @inject(Types.LibBtree) libBtree: LibBtree
    ) {
        this.solidProtocolUtils = solidProtocolUtils
        this.libRuntime = libRuntime
        this.libData = libData
        this.libBtree = libBtree
    }

    public insertCollectionMember = async (memberQuads: Quad[], memberRoot: URL): Promise<URL> => {
        const views = await this.libData.extractViews()
        const ldesEventSource = views.find(view => view.viewDescription.isEventSource)

        if (!ldesEventSource) {
            throw new Error(`LDES collection with root container at` +
             ` ${this.libRuntime.rootContainerUrl} has` +
             ` no view description of ${LDES.eventSource}}`)
        }

        const insertionTime = getCurrentDateInXsdDateTimeFormat()
        const membersCount = await this.libData.countLeafRelationNodes(ldesEventSource.nodeContainerUrl)
        let newMemberContainer = ldesEventSource.nodeContainerUrl

        if (membersCount > 10) { // TODO: read paging configuration
            newMemberContainer = await this.libData.createNewMembersContainer(newMemberContainer, insertionTime)            
        }

        memberQuads = this.libData.addTimepathProperty(memberQuads, memberRoot, insertionTime)
        const location = await this.solidProtocolUtils.postResource(newMemberContainer, memberQuads)
        
        const leafRelationQuads = await this.libData.createLeafRelation(newMemberContainer, location, insertionTime)
        const newMemberContainerMetadata = await this.solidProtocolUtils.findContainerDescriptionResource(newMemberContainer)
        await this.solidProtocolUtils.insertQuadsWithN3Update(newMemberContainerMetadata, leafRelationQuads)
        return location
    }

    public insertBtree = async (newMember: URL, value: string, rootBtreeContainerUrl: URL) => {
        if (!await this.solidProtocolUtils.containerExist(rootBtreeContainerUrl)) {
            await this.solidProtocolUtils.createContainer(rootBtreeContainerUrl)
        }
        return await this.libBtree.insert(newMember, rootBtreeContainerUrl, value, 8)
    }
}
