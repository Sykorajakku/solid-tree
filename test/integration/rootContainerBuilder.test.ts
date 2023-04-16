import fetch from 'cross-fetch';
import { describe, beforeAll, afterAll, test } from '@jest/globals';
import { CommunitySolidServerRunner } from './config/CommunitySolidServerRunner';
import { NodeSolidServerRunner } from './config/NodeSolidServerRunner';
import { SolidServerRunner } from './config/SolidServerRunner';
import { LibBuilder } from '../../src/lib/libBuilder';
import { InitializerConfig } from '../../src/init/initializerConfig';

describe('Library using', () => {
    const solidImplementations: { name: string, runner: SolidServerRunner }[] = [
        //{ name: 'Community Solid Server (CSS)', runner: new CommunitySolidServerRunner() },
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
            test('initializes root container using builder with empty config', async () => {
                const rootContainerUrl = runner.baseUri + '/ldes/'
                const emptyInitializerConfig: InitializerConfig = {}
            })

            test('inserts members into LDES collection', async () => {
                const rootContainerUrl = runner.baseUri + '/ldes/'
                const emptyInitializerConfig: InitializerConfig = {}

                const lib = await LibBuilder
                    .builder(rootContainerUrl, { fetch: fetch })
                    .withInitializerConfig(emptyInitializerConfig)
                    .build()
            
                for (let i = 0; i < 12; ++i) {
                    await lib.insertCollectionMember([], new URL('http://localhost:3000/'))
                }
            })
        })
    })
})
