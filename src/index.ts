import { loadLogIds, buildHTML, Review } from "./utils.js";
import { Client } from "./tensoul/index.js";
import { promises as fs } from "fs";
import config from "./config.js";
import { execFile } from "child_process";
import util from "util";

const execFileAsync = util.promisify(execFile);

if (process.argv.length === 2) {
    console.error(
        `Usage: npm start <account-id> [limit]`,
    );
    process.exit(1);
}

const accountId = process.argv[2];
const limit = process.argv[3] ? parseInt(process.argv[3]) : 100;

console.log(`Loading log ids for ${accountId}`);
const logIds = await loadLogIds(accountId, limit);

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

const ratings: Review[] = [];
const nickname = logIds.nickname;
for (const [i, rec] of logIds.records.entries()) {
    console.log(`Processing log ${i + 1}/${logIds.records.length}`);
    const log = await client.tenhouLogFromMjsoulID(rec.logId);
    await fs.writeFile(`./logs/${rec.logId}.json`, JSON.stringify(log, null, 4));
    // mjai-reviewer --mortal-exe=mortal --mortal-cfg=config.toml  -e mortal -i=x.json --show-rating --json --out-file=- 2>/dev/null | jq '.["review"].["rating"]'
    console.log("Download complete, running mjai-reviewer");
    const { stdout } = await execFileAsync(
        config.mjaiReviewer,
        [
            `--mortal-exe=${config.mortal}`,
            `--mortal-cfg=${config.mortalCfg}`,
            "-e=mortal",
            `-i=./${rec.logId}.json`,
            `-a=${rec.playerIndex}`,
            "--show-rating",
            "--json",
            "--out-file=-",
        ],
        {
            cwd: logsPath,
        },
    );
    const json = JSON.parse(stdout);
    const rating = json.review.rating * 100;
    const concordance =
        (json.review.total_matches / json.review.total_reviewed) * 100;
    console.log(`Rating: ${rating}, Concordance: ${concordance}%`);
    ratings.push({ rating, concordance });
}

ratings.reverse();

const html = buildHTML(ratings, accountId, nickname);
console.log("Writing ratings.html");
await fs.rm("./ratings.html", { force: true });
await fs.writeFile("./ratings.html", html);

const open = (await import("open")).default;
await open("./ratings.html");

process.exit(0);
