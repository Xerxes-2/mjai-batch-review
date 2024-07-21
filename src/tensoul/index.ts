"use strict";

// import pb from "protobufjs";
import MJSoul from "mjsoul";
import superagent from "superagent";
import superagentProxy from "superagent-proxy";
superagentProxy(superagent);
import { HttpsProxyAgent } from "https-proxy-agent";

import { toTenhou } from "./convert.js";
import * as deobfuse from "./deobfuse.js";
import * as serverConfig from "./server_config.js";
import config from "./config.js";

import process from "process";
import EventEmitter from "events";

class Client {
    _condvar;
    _is_logged_in;
    _serverVersion;
    _clientVersionString;
    _mjsoul;
    constructor() {}

    async init() {
        this._condvar = new EventEmitter();
        this._is_logged_in = false;

        const scfg = await serverConfig.getServerConfig(config.mjsoul.base);
        console.error(scfg);

        this._serverVersion = scfg.version;
        this._clientVersionString =
            "web-" + this._serverVersion.replace(/\.w$/, "");

        // const root = pb.Root.fromJSON(scfg.liqi);
        // const wrapper = root.lookupType("Wrapper");

        let gateway = config.mjsoul.gateway;
        if (gateway == null) {
            const endpoint = await serverConfig.chooseFastestServer(
                scfg.serviceDiscoveryServers,
            );
            gateway = (await serverConfig.getCtlEndpoints(endpoint)).shift();
        }
        console.error(`using ${gateway}`);

        this._mjsoul = new MJSoul({
            url: gateway,
            timeout: config.mjsoul.timeout,
            // root,
            // wrapper,
            wsOption: {
                agent: process.env.https_proxy
                    ? new HttpsProxyAgent(process.env.https_proxy)
                    : undefined,
                // origin: config.mjsoul.base,
                headers: {
                    "User-Agent": config.userAgent,
                },
            },
        });

        this._mjsoul.on("NotifyAccountLogout", () => this.login());
        this._mjsoul.open(() => this.login());

        if (config.forceReLoginIntervalMs > 0) {
            process.nextTick(async () => {
                while (true) {
                    await new Promise((resolve) =>
                        setTimeout(resolve, config.forceReLoginIntervalMs),
                    );
                    this._is_logged_in = false;
                    this._mjsoul.close();

                    this._mjsoul = new MJSoul({
                        url: gateway,
                        timeout: config.mjsoul.timeout,
                        // root,
                        // wrapper,
                        wsOption: {
                            agent: process.env.https_proxy
                                ? new HttpsProxyAgent(process.env.https_proxy)
                                : undefined,
                            // origin: config.mjsoul.base,
                            headers: {
                                "User-Agent": config.userAgent,
                            },
                        },
                    });

                    this._mjsoul.on("NotifyAccountLogout", () => this.login());
                    this._mjsoul.open(() => this.login());
                }
            });
        }
    }

    async login() {
        try {
            this._is_logged_in = false;
            console.error("login triggered");

            // const pong = await this._mjsoul.sendAsync("heatbeat");

            const login = {
                client_version_string: this._clientVersionString,
                client_version: {
                    resource: this._serverVersion,
                },
                ...config.login,
            };

            const res = await this._mjsoul.sendAsync("oauth2Login", login);
            console.error("login done");
            this._is_logged_in = true;
            this._condvar.emit("logged_in");

            return res;
        } catch (err) {
            console.error("login failed", err.stack || err);
            process.exit(1);
        }
    }

    async tenhouLogFromMjsoulID(id) {
        const seps = id.split("_");
        let logID = seps[0];
        let targetID: number | null = null;

        if (seps.length >= 3 && seps[2] === "2") {
            // "anonymized" log id
            logID = deobfuse.decodeLogID(logID);
        }
        if (seps.length >= 2) {
            if (seps[1].charAt(0) === "a") {
                targetID = deobfuse.decodeAccountID(
                    parseInt(seps[1].substring(1)),
                );
            } else {
                targetID = parseInt(seps[1]);
            }
        }

        while (!this._is_logged_in) {
            await new Promise((resolve) =>
                this._condvar.once("logged_in", resolve),
            );
        }

        const log = await this._mjsoul.sendAsync("fetchGameRecord", {
            game_uuid: logID,
            client_version_string: this._clientVersionString,
        });

        if (log.data_url) {
            // data_url is for some very old logs
            log.data = (
                await superagent
                    .get(log.data_url)
                    .proxy(process.env.https_proxy || "")
                    .buffer(true)
            ).body;
        }

        const detailRecords = this._mjsoul.wrapper.decode(log.data);
        const name = detailRecords.name.substring(4);
        const data = detailRecords.data;
        const payload = this._mjsoul.root.lookupType(name).decode(data);
        if (payload.version < 210715 && payload.records.length > 0) {
            log.data = payload.records.map((value) => {
                const raw = this._mjsoul.wrapper.decode(value);
                return this._mjsoul.root.lookupType(raw.name).decode(raw.data);
            });
        } else {
            // for version 210715 or later
            log.data = payload.actions
                .filter((action) => action.result && action.result.length > 0)
                .map((action) => {
                    const raw = this._mjsoul.wrapper.decode(action.result);
                    return this._mjsoul.root
                        .lookupType(raw.name)
                        .decode(raw.data);
                });
        }

        const tenhouLog = toTenhou(log);

        if (targetID != null) {
            for (const acc of log.head.accounts) {
                if (acc.account_id === targetID) {
                    tenhouLog._target_actor = acc.seat;
                    break;
                }
            }
        }

        return tenhouLog;
    }
}

export { Client };
