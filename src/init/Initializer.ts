import { Writer, DataFactory, Store, Parser, StreamWriter, Literal } from "n3";
import { fetch } from 'cross-fetch';
import RDF from "../vocabularies/rdf";
import LDES from "../vocabularies/ldes";
import SOLIDSTREAMS from "../vocabularies/solidstreams";
import TREE from "../vocabularies/tree";
import { v4 } from 'uuid';
import { getCurrentDateInXsdDateTimeFormat } from "../util/time";

const { quad, namedNode } = DataFactory;

export const initialize = async (base: string, ldesRootRelativePath: string): Promise<string> => {
    let writer = new Writer();
    const rootContainerPath = base + ldesRootRelativePath;

    // get metadata from describedBy
    
    // create root container
    await fetch(base + ldesRootRelativePath, { method: 'PUT', headers: { 'Content-Type': 'text/turtle' }});
    const membersContainer = base + ldesRootRelativePath + v4() + "/";
    let response = await fetch(membersContainer, { method: 'PUT', headers: { 'Content-type': 'text/turtle' }});
    let containerLocation = response.headers.get('location');
    
    // TODO: fetch metadata file location using HEAD
    
    writer.addQuads([
        quad(
            namedNode(rootContainerPath),
            namedNode(RDF.type),
            namedNode(LDES.eventStream)
        ),
        quad(
            namedNode(rootContainerPath),
            namedNode(LDES.timestampPath),
            namedNode(SOLIDSTREAMS.publishTimestamp)
        ),
        quad(
            namedNode(rootContainerPath),
            namedNode(TREE.view),
            namedNode(containerLocation!)
        )
    ]);

    let text = null;
    writer.end(async (err, result) => {
        text = result;
    });
  
    await fetch(base + ldesRootRelativePath + ".meta", { method: 'PATCH', body: `INSERT DATA { ${text} }`, headers: { 'Content-type': 'application/sparql-update' }});

    writer = new Writer();
    writer.addQuads([
        quad(
            namedNode(membersContainer),
            namedNode(RDF.type),
            namedNode(TREE.Node)
        )
    ]);

    writer.end(async (err, result) => {
        text = result;
    });

    await fetch(membersContainer + ".meta", { method: 'PATCH', body: `INSERT DATA { ${text} }`, headers: { 'Content-type': 'application/sparql-update' }});
    return membersContainer;
};

export const insertMember = async (base: string, ldesRootRelativePath: string, memberRoot: string, memberTriples: Writer) => {
    const loadLdesMetadataStore = await fetch(base + ldesRootRelativePath, { method: 'GET', headers: { 'Accept': 'application/n-triples' } });
    let parser = new Parser();
    let text = await loadLdesMetadataStore.text();
    let quads = parser.parse(text);
    let store = new Store(quads);
    let treeView = store.getQuads(null, namedNode(TREE.view), null, null)[0].object;
    let collection = store.getQuads(null, namedNode(TREE.view), null, null)[0].subject;

    let date = getCurrentDateInXsdDateTimeFormat();
    let newMemberContainerPath = treeView.id;

    let count = await getCurrentMembersCount(treeView.id);
    if(count >= 10) {
        const rootContainerPath = base + ldesRootRelativePath;
        const membersContainer = base + ldesRootRelativePath + v4() + "/";
        await fetch(membersContainer, { method: 'PUT', headers: { 'Content-type': 'text/turtle' }});

        let writer = new Writer();
        writer.addQuads([
            quad(
                namedNode(membersContainer),
                namedNode(RDF.type),
                namedNode(TREE.Node)
            ),
            quad(
                namedNode(membersContainer),
                namedNode(TREE.relation),
                writer.blank([
                    {
                        predicate: namedNode(RDF.type),
                        object: namedNode(TREE.LessThanRelation)
                    },
                    {
                        predicate: namedNode(TREE.path),
                        object: namedNode(SOLIDSTREAMS.publishTimestamp)
                    },
                    {
                        predicate: namedNode(TREE.value),
                        object: DataFactory.literal(date)
                    },
                    {
                        predicate: namedNode(TREE.node),
                        object: treeView
                    }
                ])
            )
        ]);

        let text = null;
        writer.end(async (err, result) => {
            text = result;
        });
        await fetch(membersContainer + ".meta", { method: 'PATCH', body: `INSERT DATA { ${text} }`, headers: { 'Content-type': 'application/sparql-update' }});
        
        let body =
        `
            DELETE { ?s <https://w3id.org/tree#view> <${treeView.id}> . } WHERE { ?s <https://w3id.org/tree#view> <${treeView.id}> . };
            INSERT DATA { <${rootContainerPath}> <https://w3id.org/tree#view> <${membersContainer}> };
        `;
        
        await fetch(rootContainerPath + ".meta", { method: 'PATCH', body: body, headers: { 'Content-type': 'application/sparql-update' }});
        newMemberContainerPath = membersContainer;
    }
        
    let writer = memberTriples;
    memberTriples.addQuad(namedNode(memberRoot), namedNode(SOLIDSTREAMS.publishTimestamp), DataFactory.literal(date));
    let memberText = null;
    writer.end(async (err, result) => {
        memberText = result;
    });

    let response = await fetch(newMemberContainerPath, { method: 'POST', body: memberText, headers: { 'Content-type': 'text/turtle' } });
    let location = response.headers.get('location');
    text = `<${collection.id}> <${TREE.member}> <${location}>`;
    await fetch(newMemberContainerPath + ".meta", { method: 'PATCH', body: `INSERT DATA { ${text} }`, headers: { 'Content-type': 'application/sparql-update' }});
};

const getCurrentMembersCount = async (containerPath: string): Promise<number> => {
    const response = await fetch(containerPath, { method: 'GET', headers: { 'Accept': 'application/n-triples' } });
    let parser = new Parser();
    let text = await response.text();
    let quads = parser.parse(text);
    let store = new Store(quads);
    
    return store.countQuads(null, namedNode(TREE.member), null, null);
}
