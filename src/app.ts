import loadLogIds from "./logIdLoader.js";
import { Client } from "./tensoul/index.js";
import { promises as fs } from "fs";
import config from "./config.js";
import { exit } from "process";
import { execFile } from "child_process";
import util from "util";
import { Data, Layout } from "plotly.js";

const execFileAsync = util.promisify(execFile);

const main = async () => {
    if (process.argv.length === 2) {
        console.error(
            `Usage: ${process.argv[0]} ${process.argv[1]} <account-id> [limit]`,
        );
        process.exit(1);
    }

    const accountId = process.argv[2];
    const limit = process.argv[3] ? parseInt(process.argv[3]) : 100;

    console.log(`Loading log ids for ${accountId}`);
    const logIds = await loadLogIds(accountId);

    // clear logs
    console.log("Clearing logs directory");
    await fs.rm("./logs", { recursive: true });
    console.log("Creating logs directory");
    await fs.mkdir("./logs", { recursive: true });
    // get absolute path of logs
    const logsPath = await fs.realpath("./logs");

    console.log("Initializing client");
    const client = new Client();
    await client.init();
    const ratings: number[] = [];
    for (const [i, logId] of logIds.entries()) {
        console.log(`Processing log ${i + 1}/${logIds.length}`);
        const log = await client.tenhouLogFromMjsoulID(logId);
        await fs.writeFile(
            `./logs/${logId}.json`,
            JSON.stringify(log, null, 4),
        );
        // mjai-reviewer --mortal-exe=mortal --mortal-cfg=config.toml  -e mortal -i=x.json -a 1 --show-rating --json --out-file=/dev/stdout 2>/dev/null | jq '.["review"].["rating"]'
        // start mjai-reviewer
        console.log("Download complete, running mjai-reviewer");
        const { stdout } = await execFileAsync(
            config.mjaiReviewer,
            [
                "--mortal-exe=" + config.mortal,
                "--mortal-cfg=" + config.mortalCfg,
                "-e",
                "mortal",
                "-i",
                `./${logId}.json`,
                "-a",
                "1",
                "--show-rating",
                "--json",
                "--out-file=/dev/stdout",
            ],
            {
                cwd: logsPath,
            },
        );
        const rating = JSON.parse(stdout).review.rating as number;
        console.log(`Rating: ${rating}`);
        ratings.push(rating);
    }

    ratings.reverse();

    const html = buildHTML(ratings, accountId);
    console.log("Writing ratings.html");
    await fs.rm("./ratings.html", { force: true });
    await fs.writeFile("./ratings.html", html);

    const open = (await import("open")).default;
    await open("./ratings.html");

    exit(0);
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

main();
