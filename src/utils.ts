import { Data, Layout } from "plotly.js";
import { PlayerDataLoader } from "./amae-koromo/source/loader.js";
import { GameMode, GameRecord } from "./amae-koromo/types/index.js";
import config from "./config.js";

interface Review {
    log: string;
    rating: number;
    concordance: number;
}

class Record {
    logLink: string;
    logId: string;
    index: number;

    constructor(rec: GameRecord, id: string) {
        const link = GameRecord.getRecordLink(rec, id);
        this.logLink = link?.split("=").pop() ?? "";
        this.logId = rec.uuid;
        this.index = GameRecord.getRankIndexByPlayer(rec, id);
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
            .map((record) => new Record(record, id))
            .filter(
                (record) =>
                    record.logLink !== "" &&
                    record.logId !== "" &&
                    record.index !== -1,
            ),
    };
};

const buildHTML = (reviews: Review[], id: string, name: string) => {
    const avgRating =
        reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
    const avgConcordance =
        reviews.reduce((acc, r) => acc + r.concordance, 0) / reviews.length;
    const maxRating = Math.max(...reviews.map((r) => r.rating));
    const minRating = Math.min(...reviews.map((r) => r.rating));
    const maxConcordance = Math.max(...reviews.map((r) => r.concordance));
    const minConcordance = Math.min(...reviews.map((r) => r.concordance));
    const head = `<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.plot.ly/plotly-2.35.0.min.js" charset="utf-8"></script><style>
                body {
                    text-align: center;
                }
                #plot {
                    display: block;
                    margin: 0 auto;
                }
                .averages {
                    text-align: center;
                    margin-top: 10px;
                    margin-bottom: 10px;
                }
                .average-row {
                    display: flex;
                    justify-content: center;
                    gap: 20px;
                }
                .average-column {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                table {
                    margin: 0 auto;
                    border-collapse: collapse;
                    width: 80%;
                }
                th, td {
                    padding: 8px;
                    text-align: left;
                    border: 1px solid #ddd;
                }
                th {
                    background-color: #f4f4f4;
                }
                details {
                    margin: 20px 0;
                }
            </style></head>`;
    const div = `
            <div id="plot" style="width:800px;height:400px;"></div>
            <div class="averages">
                <div class="average-row">
                    <div class="average-column">
                        <p><strong>Average Rating:</strong> ${avgRating.toFixed(2)}</p>
                        <p><strong>Average Concordance:</strong> ${avgConcordance.toFixed(2)}%</p>
                    </div>
                    <div class="average-column">
                        <p><strong>Max Rating:</strong> ${maxRating.toFixed(2)}</p>
                        <p><strong>Min Rating:</strong> ${minRating.toFixed(2)}</p>
                    </div>
                    <div class="average-column">
                        <p><strong>Max Concordance:</strong> ${maxConcordance.toFixed(2)}%</p>
                        <p><strong>Min Concordance:</strong> ${minConcordance.toFixed(2)}%</p>
                    </div>
                </div>
            </div>
            <details>
                <summary>View Logs</summary>
                <table>
                    <thead>
                        <tr>
                            <th>Paipu</th>
                            <th>Rating</th>
                            <th>Concordance (%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reviews
                            .map((review) => {
                                const url = `${config.paipuBase}/?paipu=${review.log}`;
                                return `
                                <tr>
                                    <td><a href="${url}" target="_blank">${review.log}</a></td>
                                    <td>${review.rating.toFixed(2)}</td>
                                    <td>${review.concordance.toFixed(2)}</td>
                                </tr>
                            `;
                            })
                            .join("")}
                    </tbody>
                </table>
            </details>
        `;
    const trace_rating: Data = {
        x: Array.from({ length: reviews.length }, (_, i) => i),
        y: reviews.map((r) => r.rating.toFixed(2)),
        hoverinfo: "y",
        mode: "lines+markers",
        type: "scatter",
        name: "Rating",
    };
    const trace_concordance: Data = {
        x: Array.from({ length: reviews.length }, (_, i) => i),
        y: reviews.map((r) => r.concordance.toFixed(2)),
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
