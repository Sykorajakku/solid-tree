export interface SolidServerRunner {
    start: () => Promise<void>
    stop: () => Promise<void>
    baseUri: string
}