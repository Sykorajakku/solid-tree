import { runCliCommunityServer } from './config/server';
import { fetch } from 'cross-fetch';
import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import { App } from '@solid/community-server';
import { DataFactory, Writer, Parser, Quad, Store, StreamParser } from 'n3'; 
import { initialize, insertMember } from '../../src/init/Initializer';
const { quad, namedNode, literal } = DataFactory;

describe('SOLID server', () => {
    let solidServer: App;
    
    beforeAll(async () => {
        solidServer = await runCliCommunityServer();
        await solidServer.start();
    });

    afterAll(async () => {
        await solidServer.stop();
    });

    it('initializes LDES root container.', async () => {
        let parser = new Parser();

        await initialize('http://localhost:3000/', 'ldes/');

        let res = await fetch('http://localhost:3000/ldes/', { method: 'GET', headers: { 'Content-Type' : 'text/turtle' }});        
        let text = await res.text();
        let quads = parser.parse(text);
        let store = new Store(quads);
        let stream = store.match(null, DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), DataFactory.namedNode('https://w3id.org/ldes#EventStreamr'));
        
        for (let i = 0; i < 12; ++i) {
            let writer = new Writer();
            writer.addQuads([
                quad(
                    namedNode(`http://example.org/records/${i}`),
                    namedNode('http://example.org/has'),
                    namedNode('http://example.org/abcd'),
                )
            ]);

            await insertMember('http://localhost:3000/', 'ldes/', `http://example.org/records/${i}`, writer);
        }

        expect(stream.size > 0);
    });
});
