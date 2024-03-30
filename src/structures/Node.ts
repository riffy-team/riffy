import WebSocket from "ws";
import { Rest, Riffy, Player } from "../index";
import { RestOptions, NodeOptions, RestVersion } from "./Riffy";

export interface NodeStats {
    players: number;
    playingPlayers: number;
    memory: {
        reservable: number;
        used: number;
        free: number;
        allocated: number;
    };
    frameStats: {
        sent: number;
        deficit: number;
        nulled: number;
    };
    cpu: {
        cores: number;
        systemLoad: number;
        lavalinkLoad: number;
    };
    uptime: number;
}

export class Node {
    public riffy: Riffy;
    public name?: string;
    public host: string;
    public port: number;
    public password: string;
    public restVersion?: RestVersion;
    public secure: boolean;
    public sessionId?: string;
    public rest: Rest;

    public readonly restURL: string;
    public readonly socketURL: string;

    public ws: WebSocket | null;
    public regions: string | null;
    public stats: NodeStats;
    public connected: boolean;

    public resumeKey: string | null;
    public resumeTimeout: number;
    public autoResume: boolean;

    public reconnectTimeout: number;
    public reconnectTries: number;
    public reconnectAttempt: NodeJS.Timeout | null;
    public reconnectAttempted: number;

    constructor(riffy: Riffy, node: RestOptions, options: NodeOptions) {
        this.riffy = riffy;
        this.name = node.name || node.host;
        this.host = node.host || "localhost";
        this.port = node.port || 2333;
        this.password = node.password || "youshallnotpass";
        this.restVersion = options.restVersion || "v3";
        this.secure = node.secure || false;
        this.sessionId = node.sessionId;
        this.rest = new Rest(riffy, this);

        this.socketURL = `${this.secure ? "wss" : "ws"}://${this.host}:${this.port}${this.restVersion === "v4" ? "/v4/websocket" : ""}`;
        this.restURL = `${this.secure ? "https" : "http"}://${this.host}:${this.port}`;

        this.ws = null;
        this.regions = null;
        this.stats = {
            players: 0,
            playingPlayers: 0,
            uptime: 0,
            memory: {
                free: 0,
                used: 0,
                allocated: 0,
                reservable: 0,
            },
            cpu: {
                cores: 0,
                systemLoad: 0,
                lavalinkLoad: 0,
            },
            frameStats: {
                sent: 0,
                nulled: 0,
                deficit: 0,
            },
        };

        this.connected = false;

        this.resumeKey = options.resumeKey || null;
        this.resumeTimeout = options.resumeTimeout || 60;
        this.autoResume = options.autoResume || false;

        this.reconnectTimeout = options.reconnectTimeout || 5000;
        this.reconnectTries = options.reconnectTries || 5;
        this.reconnectAttempt = null;
        this.reconnectAttempted = 1;
    }

    public connect(): void {
        if (this.ws) this.ws.close();

        const headers: any = {
            Authorization: this.password,
            "User-Id": this.riffy.clientId,
            "Client-Name": `Riffy/${this.riffy.version}`
        };

        if (this.restVersion === "v4" && this.sessionId) {
            headers["Session-Id"] = this.sessionId;
        } else if (this.resumeKey) {
            headers["Resume-Key"] = this.resumeKey;
        }

        this.ws = new WebSocket(this.socketURL, { headers });

        this.ws.on("open", this.open.bind(this));
        this.ws.on("error", this.error.bind(this));
        this.ws.on("message", this.message.bind(this));
        this.ws.on("close", this.close.bind(this));
    }

    public open(): void {
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

        if (this.autoResume) {
            for (const player of this.riffy.players.values()) {
                if (player.node === this) {
                    player.restart();
                }
            }
        }

        this.riffy.emit("nodeConnect", this);
        this.connected = true;
        this.riffy.emit('debug', this.name, `Connection with Lavalink established on ${this.socketURL}`);
    }

    public error(error: string): void {
        if (!error) return;
        this.riffy.emit("nodeError", this, error);
    }

    public message(msg: WebSocket.Data): void {
        const payload: any = JSON.parse(msg.toString());

        if (!payload.op) return;

        this.riffy.emit("raw", payload);
        this.riffy.emit("debug", this.name, `Lavalink Node Update : ${JSON.stringify(payload)}`);

        if (payload.op === "stats") {
            this.stats = { ...payload };
        }

        if (payload.op === "ready") {
            if (this.sessionId !== payload.sessionId) {
                this.rest.setSessionId(payload.sessionId);
                this.sessionId = payload.sessionId;
            }

            this.riffy.emit("debug", this.name, `Ready Payload received ${JSON.stringify(payload)}`);

            if (this.restVersion === "v4" && this.sessionId) {
                this.rest.makeRequest(`PATCH`, `/${this.rest.version}/sessions/${this.sessionId}`, { resuming: true, timeout: this.resumeTimeout });
                this.riffy.emit("debug", this.name, `Resuming configured on Lavalink`);
            } else if (this.resumeKey) {
                this.rest.makeRequest(`PATCH`, `/${this.rest.version}/sessions/${this.sessionId}`, { resumingKey: this.resumeKey, timeout: this.resumeTimeout });
                this.riffy.emit("debug", this.name, `Resuming configured on Lavalink`);
            }
        }

        const player = this.riffy.players.get(payload.guildId);
        if (payload.guildId && player) player.emit(payload.op, payload);
    }

    public close(event: number, reason: string): void {
        this.riffy.emit("nodeDisconnect", this, { event, reason });
        this.riffy.emit("debug", `Connection with Lavalink closed with Error code : ${event || "Unknown code"}`);

        this.connected = false;
        this.reconnect();
    }

    public reconnect(): void {
        this.reconnectAttempt = setTimeout(() => {
            if (this.reconnectAttempted >= this.reconnectTries) {
                const error = new Error(`Unable to connect with ${this.name} node after ${this.reconnectTries} attempts.`);
                this.riffy.emit("nodeError", this, error);
                return this.destroy();
            }

            if (this.ws) {
                this.ws.removeAllListeners();
                this.ws = null;
            }

            this.riffy.emit("nodeReconnect", this);
            this.connect();
            this.reconnectAttempted++;
        }, this.reconnectTimeout);
    }

    public destroy(): void {
        if (!this.connected) return;

        const players = Array.from(this.riffy.players.values()).filter((player: Player) => player.node === this);
        if (players.length > 0) {
            players.forEach((player: Player) => player.destroy());
        }

        if (this.ws) {
            this.ws.close(1000, "destroy");
            this.ws.removeAllListeners();
            this.ws = null;
        }

        this.reconnectAttempted = 1;

        if (this.reconnectAttempt) {
            clearTimeout(this.reconnectAttempt);
        }

        this.riffy.emit("nodeDestroy", this);

        players.forEach((player: Player) => {
            this.riffy.destroyPlayer(player.guildId);
        });

        if (this.name !== null && this.name !== undefined) {
            this.riffy.nodeMap.delete(this.name);
        }

        this.connected = false;
    }

    public send(payload: any): void {
        const data = JSON.stringify(payload);
        this.ws?.send(data, (error?: Error) => {
            if (error) {
                this.riffy.emit("nodeError", this, error);
            }
        });
    }

    public disconnect(): void {
        if (!this.connected) return;

        this.riffy.players.forEach((player: Player) => {
            if (player.node === this) {
                player.destroy();
            }
        });

        if (this.ws) {
            this.ws.close(1000, "destroy");
            this.ws.removeAllListeners();
            this.ws = null;
        }

        if (this.name !== null && this.name !== undefined) {
            this.riffy.players.delete(this.name);
        }

        this.riffy.emit("nodeDisconnect", this);
        this.connected = false;
    }

    get penalties(): number {
        let penalties = 0;
        if (!this.connected) return penalties;
        if (this.stats.players) {
            penalties += this.stats.players;
        }
        if (this.stats.cpu && this.stats.cpu.systemLoad) {
            penalties += Math.round(Math.pow(1.05, 100 * this.stats.cpu.systemLoad) * 10 - 10);
        }
        if (this.stats.frameStats) {
            if (this.stats.frameStats.deficit) {
                penalties += this.stats.frameStats.deficit;
            }
            if (this.stats.frameStats.nulled) {
                penalties += this.stats.frameStats.nulled * 2;
            }
        }

        return penalties;
    }
}
