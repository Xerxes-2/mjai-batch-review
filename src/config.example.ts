const BASES = {
    CN: "https://game.maj-soul.com/1",
    EN: "https://mahjongsoul.game.yo-star.com",
    JP: "https://game.mahjongsoul.com",
};

const config = {
    // Base URL of generated paipu, use whatever server you want
    paipuBase: BASES.CN,
    // Base URL used by dump client, EN server recommended
    httpBase: BASES.EN,
    // URL of the websocket gateway used by dump client, better be the same server as httpBase
    // You can check it using browser devtools, in the Network -> WS tab
    wsGateway: "wss://engame.mahjongsoul.com/gateway",

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
config.paipuBase = config.paipuBase.replace(/\/$/, "");
config.httpBase = config.httpBase.replace(/\/$/, "");

process.env.MJS_BASE = config.httpBase;
process.env.MJS_GATEWAY = config.wsGateway;
process.env.ACCESS_TOKEN = config.accessToken;

export default config;
