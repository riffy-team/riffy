const Websocket = require("ws");
const { Rest } = require("./Rest");

class Node {
    constructor(riffy, node, options) {
        this.riffy = riffy;
        this.name = node.name || node.host;
        this.host = node.host || "localhost";
        this.port = node.port || 2333;
        this.password = node.password || "youshallnotpass";
        this.restVersion = options.restVersion;
        this.secure = node.secure || false;
        this.sessionId = node.sessionId || null;
        this.rest = new Rest(riffy, this);

        if (options.restVersion === "v4") {
            this.wsUrl = `ws${this.secure ? "s" : ""}://${this.host}:${this.port}/v4/websocket`;
        } else {
            this.wsUrl = `ws${this.secure ? "s" : ""}://${this.host}:${this.port}`;
        }

        this.restUrl = `http${this.secure ? "s" : ""}://${this.host}:${this.port}`;
        this.ws = null;
        this.send = options.send;
        this.region = null;
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

        this.reconnectTimeout = options.reconnectTimeout || 5000
        this.reconnectTries = options.reconnectTries || 3;
        this.reconnectAttempt = null;
        this.reconnectAttempted = 1;
    }

    connect() {
        if (this.ws) this.ws.close();
        const headers = {
            "Authorization": this.password,
            "User-Id": this.riffy.clientId,
            "Client-Name": "Riffy",
        };

        if (this.restVersion === "v4") {
            if (this.sessionId) headers["Session-Id"] = this.sessionId;
        } else {
            if (this.resumeKey) headers["Resume-Key"] = this.resumeKey;
        }

        this.ws = new Websocket(this.wsUrl, { headers });
        this.ws.on("open", this.open.bind(this));
        this.ws.on("error", this.error.bind(this));
        this.ws.on("message", this.message.bind(this));
        this.ws.on("close", this.close.bind(this));
    }

    open() {
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

        this.riffy.emit("nodeConnect", this);
        this.connected = true;
        this.riffy.emit('debug', this.name, `Connection with Lavalink established on ${this.wsUrl}`);

        /** @todo Add Version Checking of Node */

        // this.riffy.emit('debug', this.name, `Checking Node Version`)
        
        // (async () => {
        //     const requestOpts = (version = this.restVersion) => { 
        //         return {
        //           method: "GET",
        //           endpoint: `/${version}/stats`,
        //         };
        //     }
            
        //     await Promise.all([this.rest.makeRequest(requestOpts), this.rest.makeRequest(requestOpts(this.restVersion == "v3" ? "v4" : "v3"))]).then((restVersionRequest, flippedRestRequest) => {

        //         if(restVersionRequest == null) this.riffy.emit(
        //           "debug",
        //           `[Node (${this.name}) - Version Check] ${
        //             this.restVersion
        //           } set By User/Defaulted Version Check Failed, attempted ${
        //             this.restVersion == "v3" ? "v4" : "v3"
        //           } For version Checking`
        //         );

        //         if(flippedRestRequest == null && restVersionRequest == null) {
        //             this.riffy.emit("debug", `[Node (${this.name}) - Version Check] Both Version Checks failed, Disconnecting Gracefully & Throwing Error`)

        //             // Disconnect Websocket & Destroy the players(if any created - Just incase)
        //             this.destroy()
                    
        //             throw new Error(`${this.name}(${this.host}) is using unsupported Lavalink Version, Supported Lavalink Versions are v3 and v4.`)
        //         }

        //         if(restVersionRequest !== null || flippedRestRequest !== null) {
        //             this.riffy.emit(
        //               "debug",
        //               `[Node (${this.name}) - Version Check] Check ${restVersionRequest == null ? "Un" : ""}successful Lavalink Server uses ${(restVersionRequest || flippedRestRequest).version.string} ${restVersionRequest == null && this.restVersion !== `v${restVersionRequest.version.major}` ? `Doesn't match with restVersion: ${this.restVersion}, Provided in Riffy Options` : ""}`
        //             );
                    
        //         }

        //     })

        // })()

        if (this.autoResume) {
            for (const player of this.riffy.players.values()) {
                if (player.node === this) {
                    player.restart();
                }
            }
        }
    }

    error(event) {
        if (!event) return;
        this.riffy.emit("nodeError", this, event);
    }

    message(msg) {
        if (Array.isArray(msg)) msg = Buffer.concat(msg);
        else if (msg instanceof ArrayBuffer) msg = Buffer.from(msg);

        const payload = JSON.parse(msg.toString());
        if (!payload.op) return;

        this.riffy.emit("raw", "Node", payload);
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

            if (this.restVersion === "v4") {
                if (this.sessionId) {
                    this.rest.makeRequest(`PATCH`, `/${this.rest.version}/sessions/${this.sessionId}`, { resuming: true, timeout: this.resumeTimeout });
                    this.riffy.emit("debug", this.name, `Resuming configured on Lavalink`);
                }
            } else {
                if (this.resumeKey) {
                    this.rest.makeRequest(`PATCH`, `/${this.rest.version}/sessions/${this.sessionId}`, { resumingKey: this.resumeKey, timeout: this.resumeTimeout });
                    this.riffy.emit("debug", this.name, `Resuming configured on Lavalink`);
                }
            }
        }

        const player = this.riffy.players.get(payload.guildId);
        if (payload.guildId && player) player.emit(payload.op, payload);
    }

    close(event, reason) {
        this.riffy.emit("nodeDisconnect", this, { event, reason });
        this.riffy.emit("debug", `Connection with Lavalink closed with Error code : ${event || "Unknown code"}`);

        this.connected = false;
        this.reconnect();
    }

    reconnect() {
        this.reconnectAttempt = setTimeout(() => {
            if (this.reconnectAttempted >= this.reconnectTries) {
                const error = new Error(`Unable to connect with ${this.name} node after ${this.reconnectTries} attempts.`);

                this.riffy.emit("nodeError", this, error);
                return this.destroy();
            }

            this.ws.removeAllListeners();
            this.ws = null;
            this.riffy.emit("nodeReconnect", this);
            this.connect();
            this.reconnectAttempted++;
        }, this.reconnectTimeout);
    }

    destroy() {
        if (!this.connected) return;

        this.riffy.players.forEach((player) => {
          if (!player.node) return;

          player.destroy()
        });

        if (this.ws) this.ws.close(1000, "destroy");
        this.ws.removeAllListeners();
        this.ws = null;

        this.reconnectAttempted = 1;
        clearTimeout(this.reconnectAttempt);

        this.riffy.emit("nodeDestroy", this);
        this.riffy.destroyPlayer(player.guildId)

        this.riffy.nodeMap.delete(this.name);
        this.connected = false;
    }

    send(payload) {
        const data = JSON.stringify(payload);
        this.ws.send(data, (error) => {
            if (error) return error;
            return null;
        });
    }

    disconnect() {
        if (!this.connected) return;
        this.riffy.players.forEach((player) => { if (player.node == this) { player.move() } });
        this.ws.close(1000, "destroy");
        this.ws?.removeAllListeners();
        this.ws = null;
        this.riffy.nodes.delete(this.name);
        this.riffy.emit("nodeDisconnect", this);
        this.connected = false;
    }

    get penalties() {
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

module.exports = { Node };