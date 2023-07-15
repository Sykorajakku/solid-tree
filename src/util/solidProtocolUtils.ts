import { Types } from "./inversify/types"
import { inject, injectable } from "inversify"
import type { LibRuntime } from "../lib/libRuntime"
import { Parser, Quad, Writer } from "n3"
import { writeQuadsToTurtle } from "./rdf"

@injectable()
export class SolidProtocolUtils {

    private readonly libRuntime: LibRuntime
    
    public constructor(@inject(Types.LibRuntime) libRuntime: LibRuntime) {
        this.libRuntime = libRuntime
    }

    public createContainer = async (containerUrl: URL) => {
        const response = await this.libRuntime.authenticatedFetch.fetch(
            containerUrl.toString(),
            { method: 'PUT', headers: { 'Content-Type': 'text/turtle' } }
        )

        if (!response.ok) {
            throw new Error('Unable to create container at ' + containerUrl)
        }
    }

    public containerExist = async (containerUrl: URL) => {
        const response = await this.libRuntime.authenticatedFetch.fetch(
            containerUrl.toString(),
            { method: 'GET', headers: { 'Content-Type': 'text/turtle' } }
        )
        return response.ok
    }

    public postResource = async (containerUrl: URL, quads: Quad[]): Promise<URL> => {
        const writer = new Writer()
        writer.addQuads(quads)
        let text = null

        writer.end((err, result) => {
            if (err) {
                throw new Error(`Unable to create n3 update body: ${err}`)
            }
            text = result
        })
        
        const response = await this.libRuntime.authenticatedFetch.fetch(
            containerUrl.toString(),
            { 
                method: 'POST',
                headers: { 'Content-Type': 'text/turtle' },
                body: text
            }
        )
        
        if (!response.ok) {
            throw new Error('Unable to POST new resource to container at ' + containerUrl)
        }

        let location = response.headers.get('Location')
        if (this.linkIsRelative(location)) {
            location = containerUrl.origin.toString() + location
        }
        return new URL(location)
    }

    public getContainerQuads = async (containerUrl: URL): Promise<Quad[]> => {
        const response = await this.libRuntime.authenticatedFetch.fetch(
            containerUrl.toString(),
            { 
                method: 'GET',
                headers: { 'Accept': 'text/turtle' }
            }
        )

        if (!response.ok) {
            throw new Error('Unable to fetch GET for ' + containerUrl)
        }
        
        const parser = new Parser({ baseIRI: containerUrl.toString() })
        const text = await response.text()
        return parser.parse(text)
    }

    public findContainerDescriptionResource = async (containerUrl: URL): Promise<URL> => {
        const response = await this.libRuntime.authenticatedFetch.fetch(
            containerUrl.toString(),
            { method: 'HEAD' }
        )
        
        if (!response.ok) {
            throw new Error('Unable to fetch HEAD matadata for ' + containerUrl)
        }

        let describedByLink = this.parseDescribedByLink(response.headers.get('link'))
        
        if (!describedByLink) {
            throw new Error('Unable to find describedBy link for ' + containerUrl)
        }

        if(this.linkIsRelative(describedByLink)) {
            describedByLink = containerUrl.toString() + describedByLink
        }

        return new URL(describedByLink)
    }

    public insertQuadsWithN3Update = async (resource: URL, insertedQuads: Quad[]) => {
        await this.insertWriterWithN3Update(resource, writeQuadsToTurtle(insertedQuads))
    }

    public insertWriterWithN3Update = async (resource: URL, insertTurtle: string) => {
        const result = await this.libRuntime.authenticatedFetch.fetch(
            resource.toString(),
            { 
                method: 'PATCH',
                headers: { 'Content-Type': 'text/n3' },
                body: `
                    @prefix solid: <http://www.w3.org/ns/solid/terms#> .
                    _:rename a solid:InsertDeletePatch;
                    solid:inserts { ${insertTurtle} } .
                `
            }
        )

        if (!result.ok) {
            throw new Error(`Unable to proceed with n3 update at ${resource}: ${result.statusText}`)
        }
    }

    public deleteInsertWithN3Update = async (resource: URL, insertedQuads: Quad[], deletedQuads: Quad[]) => {
        const insertTurtle = writeQuadsToTurtle(insertedQuads)
        const deleteTurtle = writeQuadsToTurtle(deletedQuads)

        const result = await this.libRuntime.authenticatedFetch.fetch(
            resource.toString(),
            { 
                method: 'PATCH',
                headers: { 'Content-Type': 'text/n3' },
                body: `
                    @prefix solid: <http://www.w3.org/ns/solid/terms#> .
                    _:rename a solid:InsertDeletePatch;
                    solid:inserts { ${insertTurtle} }; 
                    solid:deletes { ${deleteTurtle} }.
                `
            }
        )

        if (!result.ok) {
            throw new Error(`Unable to proceed with n3 update at ${resource}: ${result.statusText}`)
        }
    }

    public deleteWithN3Update = async (resource: URL, deletedQuads: Quad[]) => {
        const deleteTurtle = writeQuadsToTurtle(deletedQuads)

        const result = await this.libRuntime.authenticatedFetch.fetch(
            resource.toString(),
            { 
                method: 'PATCH',
                headers: { 'Content-Type': 'text/n3' },
                body: `
                    @prefix solid: <http://www.w3.org/ns/solid/terms#> .
                    _:rename a solid:InsertDeletePatch;
                    solid:deletes { ${deleteTurtle} }.
                `
            }
        )

        if (!result.ok) {
            throw new Error(`Unable to proceed with n3 update at ${resource}: ${result.statusText}`)
        }
    }

    public removeTrailingSlash = (url: string): string => url.replace(/\/$/, '')

    public extractResourceName = (url: string): string => {
        const parts = url.split('/');
        return parts[parts.length - 1];
    }

    public combineFragmentUrl = (root: URL, member: URL): string => {
        const containerResource = this.removeTrailingSlash(root.toString())
        const resourceName = this.extractResourceName(this.removeTrailingSlash(member.toString()))
        return `${containerResource}#${resourceName}`
    }

    private parseDescribedByLink = (linkHeader: string): string | null => {
        const linkParts = linkHeader.split(',')

        for (const part of linkParts) {
            const [url, rel] = part.trim().split(';').map(s => s.trim())
            const relValue = rel.split('=')[1]?.replace(/"/g, '')

            // specification mentions describedby, NSS uses describedBy
            if (relValue === 'describedBy' || relValue === 'describedby') {
            return url.slice(1, -1)
            }
        }
        return null;
    }

    private linkIsRelative = (linkValue: string) => !linkValue.startsWith('http')
}
