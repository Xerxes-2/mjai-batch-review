const config = {
    // Base URL of the game
    httpBase: "https://mahjongsoul.game.yo-star.com",
    // URL of the websocket gateway
    wsGateway: "wss://mjusgs.mahjongsoul.com:9663/",

    // Store your access token here
    // get it by logging into your temporary account and running the following command in the browser console:
    // GameMgr.Inst.access_token

    // IMPORTANT!!!
    // DO NOT SHARE THIS TOKEN WITH ANYONE
    // DO NOT USE YOUR PRIMARY ACCOUNT
    accessToken: "",
    // Absolute path to mjai-reviewer executable
    mjaiReviewer: "",
    // Absolute path to mortal executable
    mortal: "",
    // Absolute path to mortal config file
    mortalCfg: "",
};

if (!config.accessToken) {
    throw new Error("Access token is not set");
}

if (!config.mjaiReviewer) {
    throw new Error("mjai-reviewer executable path is not set");
}

if (!config.mortal) {
    throw new Error("mortal executable path is not set");
}

if (!config.mortalCfg) {
    throw new Error("mortal config path is not set");
}

// trim tailing slash of httpBase before exporting
config.httpBase = config.httpBase.replace(/\/$/, "");

export default config;
