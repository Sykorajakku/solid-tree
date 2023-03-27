import { InitializerConfig } from "./initializerConfig"
import { Lib } from "./lib"

type AuthenticatedFetch = { fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response> }

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
            private initializerConfig?: InitializerConfig

            constructor(
                rootContainerUrl: string,
                authenticatedFetch: AuthenticatedFetch,
                initializerConfig: InitializerConfig
            ) {
                this.rootContainerUrl = rootContainerUrl
                this.authenticatedFetch = authenticatedFetch
                this.initializerConfig = initializerConfig
            }

            public build = () => {
                return new Lib()
            }
        }
    }
}
