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
    const metadata = loader.getMetadata();
    let records: GameRecord[] = [];
    let chunk: GameRecord[] = [];
    while (records.length < limit && (chunk = await loader.getNextChunk())) {
        records = records.concat(chunk);
    }

    return records.map((record) =>
        GameRecord.getRecordLink(record, id).split("=").pop(),
    );
};

export default loadLogIds;
