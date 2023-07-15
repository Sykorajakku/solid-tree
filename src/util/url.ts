import { v4 } from "uuid"

export const parseSolidContainerUrl = (containerUrl: string): URL => {
    const url = new URL(containerUrl)
    
    if (url.origin + url.pathname != containerUrl) {
        throw new Error(`Provided url ${containerUrl} has not valid SOLID Pod container path. `)
    }
    if (!url.pathname.endsWith('/')) {
        throw new Error(`Provided url ${containerUrl} has not valid SOLID Pod container path. Path needs to end with "/" according to SOLID specification.`)
    }

    return new URL(containerUrl)
}

export const createRandomChildContainerUrl = (containerUrl: URL): URL => {
    return new URL(containerUrl.toString() + v4().substring(0, 6) + '/')
}
