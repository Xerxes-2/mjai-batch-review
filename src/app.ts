import loadLogIds from "./urls.js";
import { Client } from "./tensoul/index.js";
import { promises as fs } from "fs";
import config from "./config.js";
import { exit } from "process";
import { execFile } from "child_process";
import util from "util";

const execFileAsync = util.promisify(execFile);

const main = async () => {
    if (process.argv.length === 2) {
        console.error(
            `Usage: ${process.argv[0]} ${process.argv[1]} <account-id>`,
        );
        process.exit(1);
    }

    const accountId = process.argv[2];

    const logIds = await loadLogIds(accountId);

    // const client = new Client();
    // await client.init();

    // clear logs
    // await fs.rm("./logs", { recursive: true });
    // await fs.mkdir("./logs", { recursive: true });
    // get absolute path of logs
    const logsPath = await fs.realpath("./logs");

    const ratings: number[] = [];
    for (const logId of logIds) {
        // const log = await client.tenhouLogFromMjsoulID(logId);
        // await fs.writeFile(`./logs/${logId}.json`, JSON.stringify(log, null, 4));
        // mjai-reviewer --mortal-exe=mortal --mortal-cfg=config.toml  -e mortal -i=x.json -a 1 --show-rating --json --out-file=/dev/stdout 2>/dev/null | jq '.["review"].["rating"]'
        // start mjai-reviewer
        console.log(`Processing log ${logId}`);
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
        const rating = JSON.parse(stdout).review.rating;
        console.log(`Rating: ${rating}`);
        ratings.push(rating);
    }

    exit(0);
};

main();
