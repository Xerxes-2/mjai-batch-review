import dayjs from "dayjs";

import { GameRecord } from "../types/record.js";
import {
    Metadata,
    PlayerMetadata,
    PlayerExtendedStats,
    MODE_BASE_POINT,
} from "../types/metadata.js";
import { apiCacheablePost, apiGet } from "./api.js";
import { GameMode } from "../types/index.js";
import Conf from "../utils/conf.js";

const CHUNK_SIZE = 100;

export interface DataLoader<T extends Metadata, TRecord = GameRecord> {
    getMetadata(): Promise<T>;
    getNextChunk(): Promise<TRecord[]>;
    getEstimatedChunkSize(): number;
}

export class DummyDataLoader implements DataLoader<Metadata> {
    getMetadata(): Promise<Metadata> {
        return Promise.resolve({ count: 0 });
    }
    getNextChunk(): Promise<GameRecord[]> {
        return Promise.resolve([]);
    }
    getEstimatedChunkSize(): number {
        return 0;
    }
}

export class ListingDataLoader implements DataLoader<Metadata> {
    _date: dayjs.Dayjs;
    _cursor: dayjs.Dayjs;
    _modeString: string;
    constructor(date: dayjs.ConfigType, mode: GameMode | null) {
        this._date = dayjs(date).startOf("day");
        const cursor = Math.floor(new Date().getTime() / 120000) * 120000;
        this._cursor = dayjs(
            Math.min(this._date.clone().add(1, "day").valueOf() - 1, cursor),
        );
        this._modeString =
            mode && mode.toString() !== "0" ? mode.toString() : "";
    }
    getEstimatedChunkSize() {
        return CHUNK_SIZE;
    }
    shouldReturnEmptyResult() {
        return !this._modeString && Conf.availableModes.length > 1;
    }
    async getMetadata(): Promise<Metadata> {
        if (this.shouldReturnEmptyResult()) {
            return { count: 0 };
        }
        return { count: +Infinity };
    }
    async getNextChunk(): Promise<GameRecord[]> {
        if (
            this._cursor.isBefore(this._date) ||
            this._cursor.isSame(this._date) ||
            this.shouldReturnEmptyResult()
        ) {
            return [];
        }
        const chunk = await apiGet<GameRecord[]>(
            `games/${this._cursor.valueOf()}/${this._date.valueOf()}?limit=${CHUNK_SIZE}&descending=true&mode=${
                this._modeString
            }`,
        );
        if (chunk.length) {
            this._cursor = dayjs(chunk[chunk.length - 1].startTime * 1000 - 1);
        } else {
            this._cursor = this._date;
        }
        return chunk;
    }
}

function processExtendedStats(
    stats: PlayerMetadata,
): (value: PlayerExtendedStats) => PlayerExtendedStats {
    return (extendedStats) => {
        const gameBasePoint = MODE_BASE_POINT[Conf.availableModes[0]];
        if (gameBasePoint) {
            extendedStats.局收支 =
                ((stats.rank_rates.reduce(
                    (acc, x, index) => acc + x * stats.rank_avg_score[index],
                    0,
                ) -
                    gameBasePoint) *
                    stats.count) /
                extendedStats.count;
        }
        stats.extended_stats = extendedStats;
        return extendedStats;
    };
}

export class PlayerDataLoader implements DataLoader<PlayerMetadata> {
    _playerId: string;
    _startDate: dayjs.Dayjs;
    _endDate: dayjs.Dayjs;
    _cursor: dayjs.Dayjs;
    _mode: GameMode[];
    _initialParams: string;
    _tag: string;
    constructor(
        playerId: string,
        startDate?: dayjs.Dayjs,
        endDate?: dayjs.Dayjs,
        mode = [] as GameMode[],
    ) {
        this._playerId = playerId;
        this._startDate = startDate || dayjs("2010-01-01T00:00:00.000Z");
        this._endDate = endDate || dayjs().endOf("minute");
        this._cursor = this._endDate;
        this._mode = mode;
        this._initialParams = this._getParams();
        this._tag = "";
    }
    _getDatePath(): string {
        let result = `/${this._startDate.valueOf()}`;
        if (this._cursor) {
            result += `/${this._cursor.valueOf()}`;
        }
        return result;
    }
    _getParams(mode = this._mode): string {
        return `${this._playerId}${this._getDatePath()}?mode=${(mode.length ? mode : Conf.availableModes).join(".")}`;
    }
    getEstimatedChunkSize() {
        return CHUNK_SIZE;
    }
    async getMetadata(): Promise<PlayerMetadata> {
        if (this._endDate.isBefore(this._startDate)) {
            return Promise.reject(new Error("Invalid date range"));
        }
        const timeTag = Math.floor(new Date().getTime() / 1000 / 60 / 60);
        const stats = await apiGet<PlayerMetadata>(
            `player_stats/${this._initialParams}&tag=${timeTag}`,
        );
        if (this._mode.length || !Conf.availableModes.length) {
            stats.extended_stats = apiGet<PlayerExtendedStats>(
                `player_extended_stats/${this._initialParams}&tag=${timeTag}`,
            ).then(processExtendedStats(stats));
            stats.extended_stats.catch((e) => {
                console.error("Failed to get extended stats:", e);
            });
        }
        if (!this._mode.length && Conf.availableModes.length) {
            stats.count = 0;
        }
        let crossStats = stats;
        if (
            this._mode.length &&
            !Conf.availableModes.every((x) => this._mode.includes(x))
        ) {
            crossStats = await apiGet<PlayerMetadata>(
                `player_stats/${this._getParams([])}&tag=${timeTag}`,
            );
        }
        stats.cross_stats = {
            id: crossStats.id,
            level: crossStats.level,
            max_level: crossStats.max_level,
            played_modes:
                crossStats.played_modes
                    ?.map((x) =>
                        typeof x === "string"
                            ? (parseInt(x, 10) as GameMode)
                            : x,
                    )
                    ?.sort(
                        (a, b) =>
                            Conf.availableModes.indexOf(a) -
                            Conf.availableModes.indexOf(b),
                    ) || [],
            nickname: crossStats.nickname,
            count: crossStats.count,
        };
        this._tag = stats.count.toString();
        return stats;
    }
    async getNextChunk(): Promise<GameRecord[]> {
        if (
            this._cursor.isBefore(this._startDate) ||
            this._cursor.isSame(this._startDate)
        ) {
            return [];
        }
        if (!this._mode.length && Conf.availableModes.length) {
            return [];
        }
        const chunk = await apiGet<GameRecord[]>(
            `player_records/${this._playerId}/${this._cursor.valueOf()}/${this._startDate.valueOf()}?limit=${
                CHUNK_SIZE + ((parseInt(this._tag, 10) || 0) % CHUNK_SIZE)
            }&mode=${this._mode}&descending=true&tag=${this._tag}`,
        );
        if (chunk.length) {
            this._cursor = dayjs(chunk[chunk.length - 1].startTime * 1000 - 1);
        } else {
            this._cursor = this._startDate;
        }
        this._tag = "";
        return chunk;
    }
}
export class FilteredPlayerDataLoader implements DataLoader<PlayerMetadata> {
    private _recordPromise: Promise<GameRecord[]> | GameRecord[] | null = null;
    private _chunkReturned = false;
    constructor(
        private _playerId: string,
        private _loadRecord: () => Promise<GameRecord[]>,
        private _mode: GameMode[],
    ) {
        if (!_mode.length) {
            throw new Error("No mode");
        }
        _mode.sort(
            (a, b) =>
                Conf.availableModes.indexOf(a) - Conf.availableModes.indexOf(b),
        );
    }
    getEstimatedChunkSize() {
        return CHUNK_SIZE;
    }
    private async getRecords(): Promise<GameRecord[]> {
        if (!this._recordPromise) {
            this._recordPromise = this._loadRecord().then((records) => {
                this._recordPromise = records;
                return records;
            });
        }
        return this._recordPromise;
    }
    async getMetadata(): Promise<PlayerMetadata> {
        const records = await this.getRecords();
        if (!records.length) {
            throw new Error("No records");
        }
        const keys = records.map((x) => x.startTime);
        keys.sort((a, b) => b - a);
        const stats = await apiCacheablePost<PlayerMetadata>(
            `player_stats/${this._playerId}`,
            { keys, modes: this._mode },
        );
        if (this._mode.length || !Conf.availableModes.length) {
            stats.extended_stats = apiCacheablePost<PlayerExtendedStats>(
                `player_extended_stats/${this._playerId}`,
                {
                    keys,
                    modes: this._mode,
                },
            ).then(processExtendedStats(stats));
            stats.extended_stats.catch((e) => {
                console.error("Failed to get extended stats:", e);
            });
        }
        const crossStats = stats;
        stats.cross_stats = {
            id: crossStats.id,
            level: crossStats.level,
            max_level: crossStats.max_level,
            played_modes:
                crossStats.played_modes
                    ?.map((x) =>
                        typeof x === "string"
                            ? (parseInt(x, 10) as GameMode)
                            : x,
                    )
                    ?.sort(
                        (a, b) =>
                            Conf.availableModes.indexOf(a) -
                            Conf.availableModes.indexOf(b),
                    ) || [],
            nickname: crossStats.nickname,
            count: crossStats.count,
        };
        return stats;
    }
    async getNextChunk(): Promise<GameRecord[]> {
        if (this._chunkReturned) {
            return [];
        }
        const chunk = await this.getRecords();
        this._chunkReturned = true;
        return chunk;
    }
}
export class FixedNumberPlayerDataLoader extends PlayerDataLoader {
    _limit: number;
    _data: GameRecord[];
    constructor(playerId: string, limit: number, mode: GameMode[]) {
        super(playerId, undefined, dayjs().endOf("hour"), mode);
        if (!mode.length) {
            if (Conf.availableModes.length <= 1) {
                mode = Conf.availableModes;
                this._mode = mode;
            } else {
                throw new Error("No mode specified");
            }
        }
        this._limit = limit;
        this._data = [];
    }
    getEstimatedChunkSize() {
        return this._limit;
    }
    async getMetadata(): Promise<PlayerMetadata> {
        const chunk = await apiGet<GameRecord[]>(
            `player_records/${this._playerId}/${this._endDate.valueOf()}/${this._startDate.valueOf()}?limit=${
                this._limit
            }&mode=${this._mode}&descending=true`,
        );
        if (!chunk.length) {
            throw new Error("No data");
        }
        this._data = chunk;
        this._startDate = dayjs(chunk[chunk.length - 1].startTime * 1000);
        this._initialParams = this._getParams();
        return super.getMetadata().then((x) => {
            this._cursor = this._startDate;
            return x;
        });
    }
    async getNextChunk(): Promise<GameRecord[]> {
        const chunk = this._data;
        this._data = [];
        return chunk;
    }
}
