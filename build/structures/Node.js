const Websocket = require("ws");
const { Rest } = require("./Rest");
const { Track } = require("./Track");

class Node {
  /**
   * @param {import("./Riffy").Riffy} riffy
   * @param {import("..").NodeOptions} node
   * @param {import("..").RiffyOptions} options
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

    // Define options as read-only
    Object.defineProperty(this, "options", {
      value: options,
      writable: false
    });

    this.wsUrl = `ws${this.secure ? "s" : ""}://${this.host}:${this.port}${this.restVersion === "v4" ? "/v4/websocket" : ""}`;
    this.restUrl = `http${this.secure ? "s" : ""}://${this.host}:${this.port}`;
    this.ws = null;
    this.regions = node.regions || [];

    /**
     * Lavalink Info fetched While/After connecting.
     * @type {import("..").NodeInfo | null}
     */
    this.info = null;

    /**
     * @type {import("..").NodeStats}
     */
    this.stats = {
      players: 0,
      playingPlayers: 0,
      uptime: 0,
      memory: { free: 0, used: 0, allocated: 0, reservable: 0 },
      cpu: { cores: 0, systemLoad: 0, lavalinkLoad: 0 },
      frameStats: { sent: 0, nulled: 0, deficit: 0 },
      detailedStats: null,
    };

    this.connected = false;
    this.resumeKey = options.resumeKey || null;
    this.resumeTimeout = options.resumeTimeout || 60;
    this.autoResume = options.autoResume || false;

    this.reconnectTimeout = options.reconnectTimeout || 5000;
    this.reconnectTries = options.reconnectTries || 3;
    this.reconnectAttempt = null;
    this.reconnectAttempted = 1;

    this.lastStats = Date.now();
  }

  /**
   * Lyrics Manager
   */
  lyrics = {
    /**
     * Checks if the node has all the required plugins available.
     * @param {boolean} [eitherOne=true] If set to true, will return true if at least one of the plugins is present.
     * @param {...string} plugins The plugins to look for.
     * @returns {Promise<boolean>} If the plugins are available.
     * @throws {RangeError} If the plugins are missing and node is disconnected.
     */
    checkAvailable: async (eitherOne = true, ...plugins) => {
      if (!this.sessionId && !this.connected) throw new Error(`Node (${this.name}) is not Ready/Connected.`);

      const targetPlugins = plugins.length ? plugins : ["lavalyrics-plugin", "java-lyrics-plugin", "lyrics"];
      const availablePlugins = this.info?.plugins || [];
      const missingPlugins = targetPlugins.filter(p => !availablePlugins.find(ip => ip.name === p));

      if (eitherOne) {
        // If we need at least one, and we found NO matching plugins (missing length == target length)
        if (missingPlugins.length === targetPlugins.length) {
          throw new RangeError(`Node (${this.name}) is missing plugins: ${missingPlugins.join(", ")}`);
        }
      } else {
        // If we need ALL, and we have ANY missing
        if (missingPlugins.length > 0) {
          throw new RangeError(`Node (${this.name}) is missing plugins: ${missingPlugins.join(", ")}`);
        }
      }
      return true;
    },

    /**
     * Fetches lyrics for a given track or encoded track string.
     * @param {Track|string} trackOrEncodedTrackStr - The track object or encoded track string.
     * @param {boolean} [skipTrackSource=false] - Whether to skip the track source.
     * @returns {Promise<Object|null>} The lyrics data or null.
     */
    get: async (trackOrEncodedTrackStr, skipTrackSource = false) => {
      try {
        await this.lyrics.checkAvailable(false, "lavalyrics-plugin");
      } catch {
        // Fallback or silently return null if strictly requiring lavalyrics
        return null;
      }

      if (!(trackOrEncodedTrackStr instanceof Track) && typeof trackOrEncodedTrackStr !== "string") {
        throw new TypeError(`Expected Track or string, got ${typeof trackOrEncodedTrackStr}`);
      }

      const encodedTrackStr = typeof trackOrEncodedTrackStr === "string" ? trackOrEncodedTrackStr : trackOrEncodedTrackStr.track;
      return await this.rest.makeRequest("GET", `/v4/lyrics?skipTrackSource=${skipTrackSource}&track=${encodedTrackStr}`);
    },

    /**
     * Fetches Lyrics for Currently playing Track.
     * @param {string} guildId The Guild Id of the Player.
     * @param {boolean} skipTrackSource Skips the Track Source.
     * @param {string} [plugin] The Plugin to use.
     */
    getCurrentTrack: async (guildId, skipTrackSource = false, plugin) => {
      if (!(await this.lyrics.checkAvailable())) return null;

      const nodePlugins = this.info?.plugins || [];
      let requestURL = `/v4/sessions/${this.sessionId}/players/${guildId}/track/lyrics?skipTrackSource=${skipTrackSource}&plugin=${plugin || ""}`;

      // Auto-detect plugin if not provided
      const hasJava = nodePlugins.some(p => p.name === "java-lyrics-plugin" || p.name === "lyrics");
      const hasLava = nodePlugins.some(p => p.name === "lavalyrics-plugin");

      if (!plugin && hasJava && !hasLava) {
        requestURL = `/v4/sessions/${this.sessionId}/players/${guildId}/lyrics?skipTrackSource=${skipTrackSource}`;
      } else if (plugin && ["java-lyrics-plugin", "lyrics"].includes(plugin)) {
        requestURL = `/v4/sessions/${this.sessionId}/players/${guildId}/lyrics?skipTrackSource=${skipTrackSource}`;
      }

      return await this.rest.makeRequest("GET", requestURL);
    }
  }

  /**
   * Mixer Manager (Nodelink Only)
   * @since 1.0.9
   */
  mixer = {
    check: () => this.info?.isNodelink ?? false,

    /**
     * Add a mix layer.
     * @param {string} guildId 
     * @param {import("..").AddMixLayerOptions} mixLayerOptions 
     */
    addMixLayer: async (guildId, mixLayerOptions) => {
      if (!this.mixer.check()) throw new Error("Node is not a Nodelink Server");
      if (!mixLayerOptions || typeof mixLayerOptions !== "object") throw new TypeError("mixLayerOptions must be an object");

      return this.rest.makeRequest("POST", `/v4/sessions/${this.sessionId}/players/${guildId}/mix`, mixLayerOptions);
    },

    getActiveMixLayers: async (guildId) => {
      if (!this.mixer.check()) throw new Error("Node is not a Nodelink Server");
      return await this.rest.makeRequest("GET", `/v4/sessions/${this.sessionId}/players/${guildId}/mix`);
    },

    updateMixLayerVolume: async (guildId, mixId, volume) => {
      if (!this.mixer.check()) throw new Error("Node is not a Nodelink Server");
      return await this.rest.makeRequest("PATCH", `/v4/sessions/${this.sessionId}/players/${guildId}/mix/${mixId}`, { volume });
    },

    removeMixLayer: async (guildId, mixId) => {
      if (!this.mixer.check()) throw new Error("Node is not a Nodelink Server");
      return await this.rest.makeRequest("DELETE", `/v4/sessions/${this.sessionId}/players/${guildId}/mix/${mixId}`);
    }
  }

  /**
   * Fetch Info from the Node.
   * @param {import("..").fetchInfoOptions} options
   */
  async fetchInfo(options = { restVersion: this.restVersion, includeHeaders: false }) {
    return await this.rest.makeRequest("GET", `/${options.restVersion || this.restVersion}/info`, null, options.includeHeaders);
  }

  /**
   * Connect to the Lavalink Node.
   */
  async connect() {
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }

    this.riffy.emit('debug', this.name, `Connecting to Node...`);

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
  }

  async open() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectAttempt);
      this.reconnectAttempt = null;
      this.reconnectAttempted = 1;
    }

    this.connected = true;
    this.riffy.emit('debug', `[Node: ${this.name}] Websocket connection established on ${this.wsUrl}`);

    try {
      this.info = await this.fetchInfo();
    } catch (e) {
      this.riffy.emit('debug', `[Node: ${this.name}] Failed to fetch info on open: ${e.message}`);
    }

    if (!this.info && !this.options.bypassChecks?.nodeFetchInfo) {
      this.riffy.emit('nodeError', this, new Error(`Failed to fetch info for node ${this.name}`));
      // We don't throw to prevent crashing the whole process for one node failure at this stage
    }

    if (this.autoResume) {
      for (const player of this.riffy.players.values()) {
        if (player.node === this) player.restart();
      }
    }
  }

  error(event) {
    if (!event) return;
    this.riffy.emit("nodeError", this, event);
    this.riffy.emit("debug", `[Node: ${this.name}] Websocket Error: ${event.message || event}`);

    if (this.riffy.migrateOnFailure && this.connected) {
      // attempt migration only if we were previously "connected" logic-wise
      this.riffy.migrate(this).catch(err => {
        this.riffy.emit("debug", `Failed to auto-migrate players from node ${this.name} on error: ${err.message}`);
      });
    }
  }

  message(msg) {
    if (Array.isArray(msg)) msg = Buffer.concat(msg);
    else if (msg instanceof ArrayBuffer) msg = Buffer.from(msg);

    const payload = JSON.parse(msg.toString());
    if (!payload.op) return;

    this.riffy.emit("raw", "Node", payload);
    this.riffy.emit("debug", `[Node: ${this.name}] Received OP: ${payload.op} | Payload: ${JSON.stringify(payload)}`);

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
      this.riffy.emit("debug", `[Node: ${this.name}] Ready (Ready Payload received)! Session ID: ${payload.sessionId}, ${this.info?.isNodelink ? `Nodelink ✨ (V${this.info?.version?.semver})` : ""}`);

      // Configure Resuming
      if (this.restVersion === "v4" && this.sessionId) {
        this.rest.makeRequest(`PATCH`, `/${this.rest.version}/sessions/${this.sessionId}`, { resuming: true, timeout: this.resumeTimeout });
        this.riffy.emit("debug", `[Node: ${this.name}] Resuming configured (v4).`);
      } else if (this.resumeKey) {
        this.rest.makeRequest(`PATCH`, `/${this.rest.version}/sessions/${this.sessionId}`, { resumingKey: this.resumeKey, timeout: this.resumeTimeout });
        this.riffy.emit("debug", `[Node: ${this.name}] Resuming configured (v3).`);
      }
    }

    const player = this.riffy.players.get(payload.guildId);
    if (payload.guildId && player) player.emit(payload.op, payload);
  }

  async close(event, reason) {
    this.riffy.emit("nodeDisconnect", this, { event, reason });
    this.riffy.emit("debug", `Connection with Lavalink closed with Error code : ${event || "Unknown code"}, reason: ${reason || "Unknown reason"}`);

    this.connected = false;

    if (this.riffy.migrateOnDisconnect) {
      this.riffy.migrate(this).catch(err => {
        this.riffy.emit("debug", `Failed to auto-migrate players from node ${this.name} on disconnect: ${err.message}`);
      });
    }

    this.reconnect();
  }

  reconnect() {
    // Prevent multiple reconnect loops
    if (this.reconnectAttempt) return;

    this.reconnectAttempt = setTimeout(() => {
      this.reconnectAttempt = null;

      if (this.reconnectAttempted >= this.reconnectTries) {
        const error = new Error(`[Node: ${this.name}] Failed to reconnect after ${this.reconnectTries} attempts.`);
        this.riffy.emit("nodeError", this, error);
        return this.destroy(true); // Clean destroy
      }

      this.ws?.removeAllListeners();
      this.ws = null;

      this.riffy.emit("nodeReconnect", this);
      this.riffy.emit("debug", `[Node: ${this.name}] Reconnecting... (${this.reconnectAttempted}/${this.reconnectTries})`);

      this.connect();
      this.reconnectAttempted++;
    }, this.reconnectTimeout);
  }

  /**
   * Destroys the node connection and cleans up resources.
   * @param {boolean} [clean=false]
   */
  destroy(clean = false) {
    if (clean) {
      this.ws?.close(1000, "destroy");
      this.ws?.removeAllListeners();
      this.ws = null;
      this.riffy.emit("nodeDestroy", this);
      this.riffy.nodeMap.delete(this.name);
      return;
    }

    if (!this.connected && !this.ws) return;

    this.riffy.players.forEach((player) => {
      if (player.node === this) player.destroy();
    });

    this.ws?.close(1000, "destroy");
    this.ws?.removeAllListeners();
    this.ws = null;

    if (this.reconnectAttempt) {
      clearTimeout(this.reconnectAttempt);
      this.reconnectAttempt = null;
    }

    this.riffy.emit("nodeDestroy", this);
    this.riffy.emit("debug", `[Node: ${this.name}] Destroyed.`);

    this.riffy.nodeMap.delete(this.name);
    this.connected = false;
  }

  disconnect() {
    if (!this.connected) return;
    this.riffy.players.forEach((player) => { if (player.node == this) { this.riffy.bestNode() ? player.moveTo(this.riffy.bestNode()) : true } });
    this.ws.close(1000, "destroy");
    this.ws?.removeAllListeners();
    this.ws = null;
    // Allowing to connect back.
    // this.riffy.nodeMap.delete(this.name);
    this.riffy.emit("nodeDisconnect", this);
    this.connected = false;
  }

  get penalties() {
    let penalties = 0;
    if (!this.connected) return 999999;
    if (this.stats.players) penalties += this.stats.players;
    if (this.stats.cpu?.systemLoad) {
      penalties += Math.round(Math.pow(1.05, 100 * this.stats.cpu.systemLoad) * 10 - 10);
    }
    if (this.stats.frameStats) {
      if (this.stats.frameStats.deficit) penalties += this.stats.frameStats.deficit;
      if (this.stats.frameStats.nulled) penalties += this.stats.frameStats.nulled * 2;
    }
    return penalties;
  }
}

module.exports = { Node };