import { FixedNumberPlayerDataLoader } from "./amae-koromo/source/loader.js";
import { GameMode } from "./amae-koromo/types/index.js";

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
