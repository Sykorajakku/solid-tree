import "reflect-metadata"
import { Container } from "inversify"
import { Types } from "../util/inversify/types"
import { InitializerConfig } from "../init/initializerConfig"
import { Lib } from "./lib"
import { LibRuntime } from "./libRuntime"
import { LibSolidRuntime } from "./libSolidRuntime"
import { SolidProtocolUtils } from "../util/solidProtocolUtils"
import { LibData } from "./libData"
import { ShaclPathExtractor } from "../shacl/interfaces/shaclPathExtractor"
import { RdfjsShaclPathExtractor } from "../shacl/rdfjsShaclPathExtractor"

export type AuthenticatedFetch = { fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response> }

export class LibBuilder {

    private constructor() {}

    public static builder = (rootContainerUrl: string, authenticatedFetch: AuthenticatedFetch) => {
        return new this.initBuilder(rootContainerUrl, authenticatedFetch)
    }
    
    static initBuilder = class InitBuilder {
        private rootContainerUrl: string
        private authenticatedFetch: AuthenticatedFetch
        
        constructor(rootContainerUrl: string, authenticatedFetch: AuthenticatedFetch) {
            this.rootContainerUrl = rootContainerUrl
            this.authenticatedFetch = authenticatedFetch
        }

        public withInitializerConfig = (initializerConfig: InitializerConfig) => {
            return new InitBuilder.builder(this.rootContainerUrl, this.authenticatedFetch, initializerConfig)
        }

        public withStoredConfig = () => {
            return new InitBuilder.builder(this.rootContainerUrl, this.authenticatedFetch, null)
        }

        static builder = class Builder {
            private rootContainerUrl: string
            private authenticatedFetch: AuthenticatedFetch
            private initializerConfig: InitializerConfig | null

            constructor(
                rootContainerUrl: string,
                authenticatedFetch: AuthenticatedFetch,
                initializerConfig: InitializerConfig | null
            ) {
                this.rootContainerUrl = rootContainerUrl
                this.authenticatedFetch = authenticatedFetch
                this.initializerConfig = initializerConfig
            }

            public build = async (): Promise<Lib> => {
                const container = new Container()
                container.bind<LibRuntime>(Types.LibRuntime).toConstantValue(await this.createLibRuntime())
                container.bind<LibData>(Types.LibData).to(LibData)
                container.bind<SolidProtocolUtils>(Types.SolidProtocolUtils).to(SolidProtocolUtils)
                container.bind<ShaclPathExtractor>(Types.ShaclPathExtractor).to(RdfjsShaclPathExtractor)
                container.bind<Lib>(Types.Lib).to(Lib)
                return container.get<Lib>(Types.Lib)
            }

            private createLibRuntime = () => {
                if (this.initializerConfig == null) {
                    return LibSolidRuntime.createWithExistingConfig(
                        this.rootContainerUrl,
                        this.authenticatedFetch
                    )
                } else {
                    return LibSolidRuntime.createWithInitializerConfig(
                        this.rootContainerUrl,
                        this.authenticatedFetch,
                        this.initializerConfig
                    )
                }
            }
        }
    }
}
