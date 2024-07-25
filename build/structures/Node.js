const Websocket = require("ws");
const { Rest } = require("./Rest");

class Node {
   /**
    * @param {import("./Riffy").Riffy} riffy 
    * @param {} node 
    */
    constructor(riffy, node, options) {
        this.riffy = riffy
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
        this.regions = node.regions;
        /**
         * Lavalink Info fetched While connecting.
         * @todo Add Types
         * @todo Add This Property Later
         */
        //this.info = {};
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

        this.lastStats = Date.now();
    }

    connect() {
        if (this.ws) this.ws.close();

        this.riffy.emit('debug', this.name, `Checking Node Version`);

        /**
         * @todo Probably to wait until version checks are completed before continuing to connnect to Lavalink.
         * @todo Add option to skip the version checks in-case needed.
         */
        //(async () => {
          //  const requestOpts = (version = this.restVersion) => { 
            //    return {
            //      method: "GET",
            //      endpoint: `/${version}/info`,
            //      undefined,
            //      includeHeaders: true
            //    };
           // }

           // await Promise.all([this.rest.makeRequest(...Object.values(requestOpts())), this.rest.makeRequest(...Object.values(requestOpts(this.restVersion == "v3" ? "v4" : "v3")))]).then(([restVersionRequest, flippedRestRequest]) => {
                /**
                 * Lavalink Node's Version that was fetched, checks and uses the succeeded request
                 * Uses `lavalink-api-version` header if `major` property isn't available/is `0` in the request, it can use either one variable. Defaults to `0` if `lavalink-api-version` isn't available.
                 */

               // const nodeFetchedVersionObj = Object.assign(
                 //   (
                 //     ("version" in restVersionRequest && restVersionRequest) ||
                 //     flippedRestRequest
                 //   ).version,
                 //   {
                 //     major: !(restVersionRequest?.version || flippedRestRequest?.version)?.major
                 //       ? Number(
                 //           (restVersionRequest || flippedRestRequest).headers.get("lavalink-api-version")
                 //         ) || 0
                 //       : (restVersionRequest?.version || flippedRestRequest?.version)?.major,
                 //   }
                //  ); 

                /* if(restVersionRequest?.status == 404) this.riffy.emit(
                  "debug",
                  `[Node (${this.name}) - Version Check] ${
                    this.restVersion
                  } set By User/Defaulted Version Check Failed, attempted ${
                    this.restVersion == "v3" ? "v4" : "v3"
                  } For version Checking`
                );

                if(flippedRestRequest?.status === 404 && restVersionRequest?.status === 404) {
                    this.riffy.emit("debug", `[Node (${this.name}) - Version Check] Both Version Checks failed, Disconnecting Gracefully & Throwing Error`)

                    // Disconnect Websocket & Destroy the players(if any created - Just incase)
                    this.destroy()

                    throw new Error(`${this.name}(${this.host}) is using unsupported Lavalink Version, Supported Lavalink Versions are v3 and v4.`)
                }

                if(restVersionRequest?.status !== 404 || flippedRestRequest?.status !== 404) {
                    this.riffy.emit(
                      "debug",
                      `[Node (${this.name}) - Version Check] Check ${restVersionRequest?.status === 404 ? "Un" : ""}successful Lavalink Server uses ${nodeFetchedVersionObj.semver} ${restVersionRequest.status === 404 ? `Doesn't match with restVersion: ${this.restVersion}, Provided in Riffy Options` : ""}`
                    );

                    // If defaulted/user-specified fails Graceful Destroy/close the node's connection.
                    if(restVersionRequest?.status === 404) {
                    this.riffy.emit("debug", `[Node (${this.name}) - Version Check] Disconnecting Gracefully & Throwing Error`)

                    // Disconnect Websocket & Destroy the players(if any created - Just incase)
                    this.destroy()

                    throw new Error(`${this.name} is specified/defaulted to use ${this.restVersion}, but found using Lavalink version v${nodeFetchedVersionObj.major}, TIP: Set 'restVersion' property to v${nodeFetchedVersionObj.major}`);
                    }
                }
                
                const { headers, ...restVersionRequestWithoutHeaders } = restVersionRequest;

                // If `restVersionRequest` isn't failed then update the `info` or set it back to empty Object.
                this.info = !("status" in restVersionRequest) ? restVersionRequestWithoutHeaders : {};
            })

        })() */

        const headers = {
            "Authorization": this.password,
            "User-Id": this.riffy.clientId,
            "Client-Name": `Riffy/${this.riffy.version}`,
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

        setInterval(() => {
            if(Date.now() - this.lastStats > 5 * 60 * 1000) {
                this.riffy.emit("debug", this.name, `[Beta] No stat received since 5 minutes.`);
                this.connect();
            }
        }, 5 * 60 * 1000)
    }

    open() {
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

        this.connected = true;
        this.riffy.emit('debug', this.name, `Connection with Lavalink established on ${this.wsUrl}`);

        /** @todo Add Version Checking of Node */

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
            this.lastStats = Date.now();
        }

        if (payload.op === "ready") {
            if (this.sessionId !== payload.sessionId) {
                this.rest.setSessionId(payload.sessionId);
                this.sessionId = payload.sessionId;
            }
            
            this.riffy.emit("nodeConnect", this);

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
        this.riffy.emit("debug", `Connection with Lavalink closed with Error code : ${event || "Unknown code"}, reason: ${reason || "Unknown reason"}`);

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

            this.ws?.removeAllListeners();
            this.ws = null;
            this.riffy.emit("nodeReconnect", this);
            this.connect();
            this.reconnectAttempted++;
        }, this.reconnectTimeout);
    }

    destroy() {
        if (!this.connected) return;

        this.riffy.players.forEach((player) => {
            if (player.node !== this) return;

            player.destroy()
        });

        if (this.ws) this.ws.close(1000, "destroy");
        this.ws?.removeAllListeners();
        this.ws = null;

        clearTimeout(this.reconnectAttempt);

        this.riffy.emit("nodeDestroy", this);

        this.riffy.nodeMap.delete(this.name);
        this.connected = false;
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
