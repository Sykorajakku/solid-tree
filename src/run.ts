import fetch from 'cross-fetch';
import { CommunitySolidServerRunner } from './../test/integration/config/CommunitySolidServerRunner';
import { LibBuilder } from '../src/lib/libBuilder';
import { InitializerConfig } from '../src/init/initializerConfig';

let run = async () => {
    let runner = new CommunitySolidServerRunner()
    await runner.start()

    const rootContainerUrl = runner.baseUri + '/ldes/'
    const rootBtreeContainerUrl = new URL(runner.baseUri + '/ldes/btree')
    const emptyInitializerConfig: InitializerConfig = {}

    const lib = await LibBuilder
        .builder(rootContainerUrl, { fetch: fetch })
        .withInitializerConfig(emptyInitializerConfig)
        .build()

    const newMemberLocation = await lib.insertCollectionMember([], new URL('http://localhost:3000/'))
    await lib.insertBtree(newMemberLocation, "1", rootBtreeContainerUrl)
}

run()