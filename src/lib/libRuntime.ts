import { AuthenticatedFetch } from "./libBuilder"

export interface LibRuntime {
    readonly rootContainerUrl: URL
    readonly authenticatedFetch: AuthenticatedFetch
}
