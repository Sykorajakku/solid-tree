import fetch from 'cross-fetch';
import { describe, beforeAll, afterAll, it, expect, test } from '@jest/globals';
import { DataFactory, Writer, Parser, Quad, Store, StreamParser } from 'n3'; 
import { initialize, insertMember } from '../../src/init/Initializer';
import { CommunitySolidServerRunner } from './config/CommunitySolidServerRunner';
import solidServer from 'solid-server';
import { NodeSolidServerRunner } from './config/NodeSolidServerRunner';
import { SolidServerRunner } from './config/SolidServerRunner';
import rimraf from 'rimraf';
import TREE from '../../src/vocabularies/tree';
const { quad, namedNode, literal } = DataFactory;

describe('Library using', () => {
    const solidImplementations: { name: string, runner: SolidServerRunner }[] = [
        { name: 'Community Solid Server (CSS)', runner: new CommunitySolidServerRunner() },
        { name: 'Node Solid Server (NSS)', runner: new NodeSolidServerRunner() }
    ];

    solidImplementations.forEach(({ name, runner }) => {
        beforeAll(async () => {
            await runner.start();            
        });

        afterAll(async () => {
            await runner.stop();
        });

        describe(name, () => {
            test('reads root container of SOLID Pod to test connectivity', async () => {
                const response = await fetch(runner.baseUri, { method: 'GET' });
                expect(response.ok);
            });
        });

        describe(name, () => {
            test('creates container with LDES collection description', async () => {
                await initialize(runner.baseUri, 'ldes/');
                
                const response = await fetch(runner.baseUri + 'ldes/', { method: 'GET' });
                
                const parser = new Parser({ baseIRI: runner.baseUri + 'ldes/' });
                const quads = parser.parse(await response.text());
                const store = new Store(quads);
                
                const treeViewQuad = [
                    ...store.match(
                        namedNode(runner.baseUri + 'ldes/'),
                        namedNode(TREE.view),
                        null
                    )
                ];

                expect(treeViewQuad.length).toEqual(1);                
            });
        });
    });
});
