
import { createRandomChildContainerUrl, parseSolidContainerUrl } from "../util/url"
import { InitializerConfig } from "../init/initializerConfig"
import { AuthenticatedFetch } from "./libBuilder"
import { SolidProtocolUtils } from "../util/solidProtocolUtils";
import { Quad, DataFactory } from "n3";
import RDF from "../vocabularies/rdf";
import LDES from "../vocabularies/ldes";
import SOLIDSTREAMS from "../vocabularies/solidstreams";
import TREE from "../vocabularies/tree";
const { quad, namedNode } = DataFactory;

export class LibSolidRuntime {

    readonly rootContainerUrl: URL
    readonly authenticatedFetch: AuthenticatedFetch

    constructor(
        rootContainerUrl: URL,
        authenticatedFetch: AuthenticatedFetch
    ) {
        this.rootContainerUrl = rootContainerUrl
        this.authenticatedFetch = authenticatedFetch
    }

    static async createWithInitializerConfig(
        rootContainerUrl: string,
        authenticatedFetch: AuthenticatedFetch,
        initializerConfig: InitializerConfig
    ): Promise<LibSolidRuntime> {
        const containerUrl = parseSolidContainerUrl(rootContainerUrl)
        const runtime = new LibSolidRuntime(containerUrl, authenticatedFetch)
        await runtime.initializeLdesCollectionInContainer()
        return runtime
    }

    static createWithExistingConfig(
        rootContainerUrl: string,
        authenticatedFetch: AuthenticatedFetch
    ) {
        const containerUrl = parseSolidContainerUrl(rootContainerUrl)
        const runtime = new LibSolidRuntime(containerUrl, authenticatedFetch)
        runtime.validateLdesCollectionInContainer()
        return runtime
    }

    private validateLdesCollectionInContainer = () => {

    }

    private initializeLdesCollectionInContainer = async () => {
        const solidProtocolUtils = new SolidProtocolUtils(this)
        const collectionsMembersContainerUrl = createRandomChildContainerUrl(this.rootContainerUrl)

        await solidProtocolUtils.createContainer(this.rootContainerUrl)
        await solidProtocolUtils.createContainer(collectionsMembersContainerUrl)

        const rootContainerQuads = this.createRootContainerTriples(collectionsMembersContainerUrl)
        const rootContainerMeta = await solidProtocolUtils.findContainerDescriptionResource(this.rootContainerUrl)
        await solidProtocolUtils.insertQuadsWithN3Update(rootContainerMeta, rootContainerQuads)
        
        const membersContainerQuads = this.createMembersContainerTriples(collectionsMembersContainerUrl)
        const membersContainerMeta = await solidProtocolUtils.findContainerDescriptionResource(collectionsMembersContainerUrl)
        await solidProtocolUtils.insertQuadsWithN3Update(membersContainerMeta, membersContainerQuads)
    }

    private createRootContainerTriples = (membersCollectionContainerUrl: URL): Quad[] => [
        quad(
            namedNode(this.rootContainerUrl.toString()),
            namedNode(RDF.type),
            namedNode(LDES.eventStream)
        ),
        quad(
            namedNode(this.rootContainerUrl.toString()),
            namedNode(LDES.timestampPath),
            namedNode(SOLIDSTREAMS.publishTimestamp)
        ),
        quad(
            namedNode(this.rootContainerUrl.toString()),
            namedNode(TREE.view),
            namedNode(membersCollectionContainerUrl.toString())
        )
    ]

    private createMembersContainerTriples = (membersCollectionContainerUrl: URL): Quad[] => {
        return [
            quad(
                namedNode(membersCollectionContainerUrl.toString()),
                namedNode(RDF.type),
                namedNode(TREE.Node)
            ),
            quad(
                namedNode(membersCollectionContainerUrl.toString()),
                namedNode(TREE.viewDescription),
                namedNode(membersCollectionContainerUrl.toString() + 'viewDescription')
            ),
            quad(
                namedNode(membersCollectionContainerUrl.toString() + 'viewDescription'),
                namedNode(RDF.type),
                namedNode(LDES.eventSource)
            )
        ]
    }
}
