import { App, AppRunner } from "@solid/community-server";
import { SolidServerRunner } from "./SolidServerRunner";

export class CommunitySolidServerRunner implements SolidServerRunner {
    private app: App | null = null;

    public readonly baseUri = 'http://localhost:3000';

    public start = async () => {
        const appRunner = new AppRunner();
        this.app = await appRunner.createCli(['-l', 'off']);
        await this.app.start();
    };

    public stop = async () => {
        await this.app!.stop();
    };
}
