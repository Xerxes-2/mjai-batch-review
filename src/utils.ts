import { Data, Layout } from "plotly.js";
import { PlayerDataLoader } from "./amae-koromo/source/loader.js";
import { GameMode, GameRecord } from "./amae-koromo/types/index.js";

interface Review {
    rating: number;
    concordance: number;
}

class Record {
    logId: string;
    playerIndex: number;

    constructor(logId: string, playerIndex: number) {
        this.logId = logId;
        this.playerIndex = playerIndex;
    }
}
const reviewCompatibleModes = [16, 12, 9] as GameMode[];

const loadLogIds = async (id: string, limit = 100) => {
    const loader = new PlayerDataLoader(
        id,
        undefined,
        undefined,
        reviewCompatibleModes,
    );
    // this errors when input is invalid to ensure getNextChunk doesn't hang
    const meta = await loader.getMetadata();
    const nickname = meta.nickname;
    let records: GameRecord[] = [];
    let chunk: GameRecord[] = await loader.getNextChunk();
    // but getNextChunk doesn't, it just hangs
    while (records.length < limit && chunk.length > 0) {
        records = records.concat(chunk);
        chunk = await loader.getNextChunk();
    }

    // trim to limit
    records = records.slice(0, limit);

    return {
        nickname,
        records: records
            .map((record) => ({
                log: GameRecord.getRecordLink(record).split("=").pop(),
                idx: GameRecord.getRankIndexByPlayer(record, id),
            }))
            .map(({ log, idx }) =>
                log !== undefined && idx !== -1 ? new Record(log, idx) : null,
            )
            .filter((record) => record !== null),
    };
};

const buildHTML = (reviews: Review[], id: string, name: string) => {
    const head = `<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.plot.ly/plotly-2.32.0.min.js" charset="utf-8"></script></head>`;
    const div = `<div id="plot" style="width:600px;height:250px;"></div>`;
    const trace_rating: Data = {
        x: Array.from({ length: reviews.length }, (_, i) => i),
        y: reviews.map((r) => r.rating),
        hoverinfo: "y",
        mode: "lines+markers",
        type: "scatter",
        name: "Rating",
    };
    const trace_concordance: Data = {
        x: Array.from({ length: reviews.length }, (_, i) => i),
        y: reviews.map((r) => r.concordance),
        hoverinfo: "y",
        mode: "lines+markers",
        type: "scatter",
        name: "Concordance",
    };
    const data: Data[] = [trace_rating, trace_concordance];
    const layout: Partial<Layout> = {
        title: `Reviews of ${name}(id: ${id}) (last ${reviews.length} games)`,
        xaxis: {
            showgrid: false,
            showspikes: true,
            showticklabels: false,
        },
    };
    const script = `<script>
	var PLOT = document.getElementById('plot');
	Plotly.newPlot( PLOT, ${JSON.stringify(data)}, ${JSON.stringify(layout)} );
</script>`;
    return `<!DOCTYPE html><html lang="en">${head}<body>${div}${script}</body></html>`;
};

export { loadLogIds, buildHTML, type Review };
