"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dayjs_1 = __importDefault(require("dayjs"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
dayjs_1.default.extend(utc_1.default);
const loader_1 = require("amae-koromo/src/data/source/records/loader");
const reviewCompatibleModes = [16, 12, 9];
const loadUrl = async (id, limit = 100) => {
    const loader = new loader_1.FixedNumberPlayerDataLoader(id, limit, reviewCompatibleModes);
    const metadata = await loader.getMetadata();
    const data = await loader.getNextChunk();
    console.log(metadata, data);
};
exports.default = loadUrl;
