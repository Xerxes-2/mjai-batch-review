import { loadLogIds, buildHTML, Review } from "./utils.js";
import { Client } from "./tensoul/index.js";
import { promises as fs } from "fs";
import config from "./config.js";
import { execFile } from "child_process";
import util from "util";

const execFileAsync = util.promisify(execFile);

if (process.argv.length === 2) {
    console.error(`Usage: npm start <account-id> [limit]`);
    process.exit(1);
}

const accountId = process.argv[2];
const limit = process.argv[3] ? parseInt(process.argv[3]) : 100;

console.log(`Loading log ids for ${accountId}`);
const logIds = await loadLogIds(accountId, limit);
console.log(`Nickname: ${logIds.nickname}`);
console.log(`Loaded ${logIds.records.length} log ids`);

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
    console.log(`\tDownloading log ${rec.logLink}`);
    const log = await client.tenhouLogFromMjsoulID(rec.logLink);
    await fs.writeFile(
        `./logs/${rec.logLink}.json`,
        JSON.stringify(log, null, 4),
    );
    // mjai-reviewer --mortal-exe=mortal --mortal-cfg=config.toml  -e mortal -i=x.json --show-rating --json --out-file=- 2>/dev/null | jq '.["review"].["rating"]'
    console.log("\tDownload complete, running mjai-reviewer");
    const { stdout } = await execFileAsync(
        config.mjaiReviewer,
        [
            `--mortal-exe=${config.mortal}`,
            `--mortal-cfg=${config.mortalCfg}`,
            "-e=mortal",
            `-i=./${rec.logLink}.json`,
            `-a=${rec.index}`,
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
    console.log(`\tRating: ${rating}, Concordance: ${concordance}%`);
    ratings.push({
        log: rec.logLink,
        rating,
        concordance,
    });
}

ratings.reverse();

const html = buildHTML(ratings, accountId, nickname);
console.log(`Writing ratings-${accountId}.html`);
await fs.rm(`./ratings-${accountId}.html`, { force: true });
await fs.writeFile(`./ratings-${accountId}.html`, html);

const open = (await import("open")).default;
await open(`./ratings-${accountId}.html`);

process.exit(0);
