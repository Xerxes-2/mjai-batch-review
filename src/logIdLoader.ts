import { PlayerDataLoader } from "./amae-koromo/source/loader.js";
import { GameMode, GameRecord } from "./amae-koromo/types/index.js";

const reviewCompatibleModes = [16, 12, 9] as GameMode[];

const loadLogIds = async (id: string, limit = 100) => {
    const loader = new PlayerDataLoader(
        id,
        undefined,
        undefined,
        reviewCompatibleModes,
    );
    // this errors when input is invalid to ensure getNextChunk doesn't hang
    await loader.getMetadata();
    let records: GameRecord[] = [];
    let chunk: GameRecord[] = [];
    // but getNextChunk doesn't, it just hangs
    while (records.length < limit && (chunk = await loader.getNextChunk())) {
        records = records.concat(chunk);
    }

    // trim to limit
    records = records.slice(0, limit);

    return records.map((record) =>
        GameRecord.getRecordLink(record, id).split("=").pop(),
    );
};

export default loadLogIds;
