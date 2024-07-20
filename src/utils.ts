import { Data, Layout } from "plotly.js";
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
    let chunk: GameRecord[] = await loader.getNextChunk();
    // but getNextChunk doesn't, it just hangs
    while (records.length < limit && chunk.length > 0) {
        records = records.concat(chunk);
        chunk = await loader.getNextChunk();
    }

    // trim to limit
    records = records.slice(0, limit);

    return records.map((record) =>
        GameRecord.getRecordLink(record, id).split("=").pop(),
    );
};

const buildHTML = (ratings: number[], id: string) => {
    const head = `<head><script src="https://cdn.plot.ly/plotly-2.32.0.min.js" charset="utf-8"></script></head>`;
    const div = `<div id="tester" style="width:600px;height:250px;"></div>`;
    const data: Data[] = [
        {
            x: Array.from({ length: ratings.length }, (_, i) => i),
            y: ratings.map((rating) => rating * 100),
            mode: "lines",
            type: "scatter",
        },
    ];
    const layout: Partial<Layout> = {
        title: `Ratings of ${id} (last ${ratings.length} games)`,
        xaxis: {
            title: "Game",
            showgrid: false,
            zeroline: false,
        },
        yaxis: {
            title: "Rating",
            showline: false,
        },
    };
    const script = `<script>
	TESTER = document.getElementById('tester');
	Plotly.newPlot( TESTER, ${JSON.stringify(data)}, ${JSON.stringify(layout)} );
</script>`;
    return `<!DOCTYPE html><html>${head}<body>${div}${script}</body></html>`;
};

export { loadLogIds, buildHTML };
