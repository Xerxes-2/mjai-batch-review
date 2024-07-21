"use strict";

import process from "process";
import appConfig from "../config.js";

const config = {
    userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36",

    mjsoul: {
        // US: https://mahjongsoul.game.yo-star.com
        // JP: https://game.mahjongsoul.com
        base: appConfig.httpBase,
        // can be null
        gateway: appConfig.wsGateway,
        timeout: 10000,
    },

    login: {
        type: 7,
        access_token: appConfig.accessToken,
        currency_platforms: [4, 9],
        reconnect: false,
        device: {
            platform: "pc",
            hardware: "pc",
            os: "windows",
            os_version: "win10",
            is_browser: true,
            sale_platform: "web",
            software: "Chrome",
        },
        gen_access_token: false,
        random_key: "33ef6d48-ed12-4937-8227-17135bbd7e9e",
        tag: "en",
        version: 0,
    },

    forceReLoginIntervalMs: 0,

    // optional
    // apiAuth: {
    //   name: 'equim',
    //   pass: 'password',
    // },

    port: process.env.PORT || 2563,
    addr: "0.0.0.0",
};

if (!config.login.access_token) {
    console.error("missing access token");
    process.exit(1);
}

export default config;
