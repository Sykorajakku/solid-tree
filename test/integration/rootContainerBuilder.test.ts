import fetch from 'cross-fetch';
import { describe, beforeAll, afterAll, it, expect, test } from '@jest/globals';
import { CommunitySolidServerRunner } from './config/CommunitySolidServerRunner';
import { NodeSolidServerRunner } from './config/NodeSolidServerRunner';
import { SolidServerRunner } from './config/SolidServerRunner';
import { LibBuilder } from '../../src/operations/libBuilder';

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
            test('initializes root container using builder', async () => {
                const rootContainerUrl = runner.baseUri

                const lib = LibBuilder
                    .builder(rootContainerUrl, { fetch: fetch })
                    .withInitializerConfig(null)
                    .build()

                lib.insertCollectionMember()
            });
        });
    });
});
