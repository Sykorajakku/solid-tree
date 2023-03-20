import { AppRunner } from '@solid/community-server';

export const runCliCommunityServer = async () => {
    const appRunner = new AppRunner();
    return appRunner.createCli();
};
