import solidServer from 'solid-server';
import path from 'path';
import fs from 'fs';
import rimraf from 'rimraf';
import { SolidServerRunner } from "./SolidServerRunner";

export class NodeSolidServerRunner implements SolidServerRunner {
    private app: any;

    public readonly baseUri = 'http://localhost:8443/public';

    public start = async () => {
        const server = solidServer.createServer({
            root: './test/integration/config/node-solid-server/'
        });

        this.app = server.listen(8443, () => {});
    };

    public stop = async () => {
        await this.app.close();
        await this.clearPublicDirectoryAfterTest();
    };

    private clearPublicDirectoryAfterTest = async () => {
        const dirPath = './test/integration/config/node-solid-server/public';
        const aclFilePath = path.join(dirPath, '.acl');

        fs.readFile(aclFilePath, 'utf8', async (err, aclFileContent) => {
            if (err) {
                console.error(`Error reading .acl file: ${err}`);
                return;
            }

            await rimraf(dirPath);

            fs.mkdir(dirPath, { recursive: true }, (err) => {
                if (err) {
                    console.error(`Error creating directory: ${err}`);
                    return;
                }
            });

            fs.writeFile(aclFilePath, aclFileContent, (err) => {
                if (err) {
                    console.error(`Error writing .acl file: ${err}`);
                    return;
                }
            });
        });
    };
}
