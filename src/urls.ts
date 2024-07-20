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
    let data = await loader.getNextChunk();
    let records: GameRecord[] = [];
    while (data && records.length < limit) {
        records = records.concat(data);
        data = await loader.getNextChunk();
    }

    return records.map((record) =>
        GameRecord.getRecordLink(record, id).split("=").pop(),
    );
};

export default loadLogIds;
