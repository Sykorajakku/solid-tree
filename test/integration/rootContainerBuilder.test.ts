import fetch from 'cross-fetch';
import { describe, beforeAll, afterAll, test } from '@jest/globals';
import { CommunitySolidServerRunner } from './config/CommunitySolidServerRunner';
import { NodeSolidServerRunner } from './config/NodeSolidServerRunner';
import { SolidServerRunner } from './config/SolidServerRunner';
import { LibBuilder } from '../../src/lib/libBuilder';
import { InitializerConfig } from '../../src/init/initializerConfig';

describe('Library using', () => {
    const solidImplementations: { name: string, runner: SolidServerRunner }[] = [
        { name: 'Community Solid Server (CSS)', runner: new CommunitySolidServerRunner() },
        //{ name: 'Node Solid Server (NSS)', runner: new NodeSolidServerRunner() }
    ];

    solidImplementations.forEach(({ name, runner }) => {
        beforeAll(async () => {
            //await runner.start();            
        });

        afterAll(async () => {
            //await runner.stop();
        });

        describe(name, () => {
            // test('inserts members into LDES collection', async () => {
            //     const rootContainerUrl = runner.baseUri + '/ldes/'
            //     const emptyInitializerConfig: InitializerConfig = {}

            //     const lib = await LibBuilder
            //         .builder(rootContainerUrl, { fetch: fetch })
            //         .withInitializerConfig(emptyInitializerConfig)
            //         .build()
            
            //     for (let i = 0; i < 12; ++i) {
            //         await lib.insertCollectionMember([], new URL('http://localhost:3000/'))
            //     }
            // })

            // test('inserts members into LDES collection and B+ Tree structure', async () => {
            //     const rootContainerUrl = runner.baseUri + '/ldes/'
            //     const rootBtreeContainerUrl = new URL(runner.baseUri + '/ldes/btree/')
            //     const emptyInitializerConfig: InitializerConfig = {}

            //     const lib = await LibBuilder
            //         .builder(rootContainerUrl, { fetch: fetch })
            //         .withInitializerConfig(emptyInitializerConfig)
            //         .build()

            //     const newMemberLocation1 = await lib.insertCollectionMember([], new URL('http://localhost:3000/'))
            //     const newMemberLocation2 = await lib.insertCollectionMember([], new URL('http://localhost:3000/'))
            //     const newMemberLocation3 = await lib.insertCollectionMember([], new URL('http://localhost:3000/'))
            //     const newMemberLocation4 = await lib.insertCollectionMember([], new URL('http://localhost:3000/'))
            //     const newMemberLocation5 = await lib.insertCollectionMember([], new URL('http://localhost:3000/'))
            //     const newMemberLocation6 = await lib.insertCollectionMember([], new URL('http://localhost:3000/'))
            //     const newMemberLocation7 = await lib.insertCollectionMember([], new URL('http://localhost:3000/'))
            //     const newMemberLocation8 = await lib.insertCollectionMember([], new URL('http://localhost:3000/'))
            //     const newMemberLocation9 = await lib.insertCollectionMember([], new URL('http://localhost:3000/'))
            //     const newMemberLocation10 = await lib.insertCollectionMember([], new URL('http://localhost:3000/'))

            //     let url = await lib.insertBtree(newMemberLocation1, "Na Příkopě", rootBtreeContainerUrl)
            //     url = await lib.insertBtree(newMemberLocation2, "Karlova", url)
            //     url = await lib.insertBtree(newMemberLocation3, "Pařížská", url)
            //     url = await lib.insertBtree(newMemberLocation4, "Národní třída", url)
            //     url = await lib.insertBtree(newMemberLocation5, "Václavské náměstí", url)
            //     url = await lib.insertBtree(newMemberLocation6, "Revoluční", url)
            //     url = await lib.insertBtree(newMemberLocation7, "Dlouhá", url)
            //     url = await lib.insertBtree(newMemberLocation8, "Josefovská", url)
            //     url = await lib.insertBtree(newMemberLocation9, "Malá Strana", url)
            //     url = await lib.insertBtree(newMemberLocation10, "Široká", url)
            //     console.log(url)
            // })

            test('inserts members into LDES collection and B+ Tree structure', async () => {
                const rootContainerUrl = runner.baseUri + '/ldes/'
                const rootBtreeContainerUrl = new URL(runner.baseUri + '/ldes/btree/')
                const emptyInitializerConfig: InitializerConfig = {}

                const lib = await LibBuilder
                    .builder(rootContainerUrl, { fetch: fetch })
                    .withInitializerConfig(emptyInitializerConfig)
                    .build()
                
                const pragueStreets = [
                    "Na Příkopě",
                    "Václavské náměstí",
                    "Pařížská",
                    "Národní třída",
                    "Karlovo náměstí",
                    "Dlouhá",
                    "Staroměstské náměstí",
                    "Malostranské náměstí",
                    "Náměstí Republiky",
                    "Vodičkova",
                    "Vinohradská",
                    "Wenceslas Square",
                    "Jungmannovo náměstí",
                    "Náměstí Míru",
                    "Revoluční",
                    "Vítězná",
                    "Jindřišská",
                    "Rytířská",
                    "Újezd",
                    "Křižovnická",
                    "Rytířská",
                    "Karmelitská",
                    "Politických vězňů",
                    "Křižíkova",
                    "Bělehradská",
                    "Letenské náměstí",
                    "Myslíkova",
                    "Legerova",
                    "Pobřežní",
                    "Havelská",
                    "Lazarská",
                    "Vojtěšská",
                    "Rohanské nábřeží",
                    "Nádražní",
                    "Jáchymova",
                    "Korunní",
                    "Karlovo náměstí",
                    "Bubenské nábřeží",
                    "Nábřeží Edvarda Beneše",
                    "Těšnov",
                    "Jugoslávských partyzánů",
                    "Opletalova",
                    "Kaprova",
                    "Újezd"
                ];
                

                let rootUrl = rootBtreeContainerUrl;
                for (let street of pragueStreets) {
                    const memberUrl = await lib.insertCollectionMember([], new URL('http://localhost:3000/'))
                    rootUrl = await lib.insertBtree(memberUrl, street, rootUrl)
                }
                console.log(rootUrl)
            })
        })
    })
})
