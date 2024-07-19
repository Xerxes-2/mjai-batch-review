import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

import { FixedNumberPlayerDataLoader } from "amae-koromo/src/data/source/records/loader";
import { GameMode } from "amae-koromo/src/data/types";

const reviewCompatibleModes = [16, 12, 9] as GameMode[];

const loadUrl = async (id: string, limit: number = 100) => {
    const loader = new FixedNumberPlayerDataLoader(
        id,
        limit,
        reviewCompatibleModes
    );
    const metadata = await loader.getMetadata();
    const data = await loader.getNextChunk();
    console.log(metadata, data);
};

export default loadUrl;
