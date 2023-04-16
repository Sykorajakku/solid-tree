import { Quad, Writer } from "n3";


export const writeQuadsToTurtle = (quads: Quad[]): string => {
    const writer = new Writer()
    writer.addQuads(quads)
    let text = null

    writer.end((err, result) => {
        if (err) {
            throw new Error(`Unable to create turtle text: ${err}`)
        }
        text = result
    })
    return text
}
