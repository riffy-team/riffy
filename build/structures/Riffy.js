const { EventEmitter } = require("node:events");
const { Node } = require("./Node");
const { Player } = require("./Player");
const { Track } = require("./Track");
// @ts-ignore
const { version: pkgVersion } = require("../../package.json")

const versions = ["v3", "v4"];

/**
 * Main Riffy Client class.
 * @extends {EventEmitter}
 */
class Riffy extends EventEmitter {
  /**
   * @param {import("discord.js").Client} client Discord Client instance
   * @param {import("..").NodeOptions[]} nodes Array of Node Options
   * @param {import("..").RiffyOptions} options Riffy Options
   */
  constructor(client, nodes, options) {
    super();
    if (!client) throw new Error("Client is required to initialize Riffy");
    if (!nodes || !Array.isArray(nodes)) throw new Error(`Nodes are required & Must Be an Array(Received ${typeof nodes}) for to initialize Riffy`);
    if (!options.send || typeof options.send !== "function") throw new Error("Send function is required to initialize Riffy");

    this.client = client;
    this.nodes = nodes;
    this.nodeMap = new Map();
    this.players = new Map();
    this.options = options;
    this.clientId = null;
    this.initiated = false;
    this.send = options.send || null;
    this.defaultSearchPlatform = options.defaultSearchPlatform || "ytmsearch";
    this.autoMigratePlayers = options.autoMigratePlayers ?? false;
    this.migrateOnDisconnect = options.migrateOnDisconnect ?? false;
    this.migrateOnFailure = options.migrateOnFailure ?? false;

    /**
     * Migration Strategy Function, takes a player and availableNodes returns the Best Node for the given player.
     * Could be used for custom Strategies i.e Priority Nodes for Certain Players.
     */
    this.migrationStrategyFn = options.migrationStrategyFn || this._defaultMigrationStrategy;
    this.restVersion = options.restVersion || "v3";
    this.tracks = [];
    this.loadType = null;
    this.playlistInfo = null;
    this.pluginInfo = null;
    this.plugins = options.plugins || [];
    /**
     * @description Package Version Of Riffy
     */
    this.version = pkgVersion;

    if (this.restVersion && !versions.includes(this.restVersion)) throw new RangeError(`${this.restVersion} is not a valid version`);
  }

  _defaultMigrationStrategy(player, availableNodes) {
    return availableNodes
      .filter(n => n.connected && n !== player.node)
      .sort((a, b) => a.penalties - b.penalties)[0];
  }

  get leastUsedNodes() {
    return [...this.nodeMap.values()]
      .filter((node) => node.connected)
      .sort((a, b) => a.rest.calls - b.rest.calls);
  }

  get bestNode() {
    return [...this.nodeMap.values()]
      .filter(node => node.connected)
      .sort((a, b) => a.penalties - b.penalties)[0];
  }

  /**
   * Returns connected nodes that have a priority > 0, sorted by priority (descending).
   * Ties are broken by least REST calls.
   */
  get priorityNodes() {
    return [...this.nodeMap.values()]
      .filter((node) => node.connected && node.priority > 0)
      .sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return a.rest.calls - b.rest.calls;
      });
  }

  /**
   * Initialize Riffy
   * @param {string} clientId 
   */
  init(clientId) {
    if (this.initiated) return this;
    if (!clientId) throw new Error("Client ID is required to initialize Riffy");

    this.clientId = clientId;
    this.nodes.forEach((node) => this.createNode(node));
    this.initiated = true;

    this.emit("debug", `Riffy initialized, connecting to ${this.nodes.length} node(s)`);

    if (this.plugins.length) {
      this.emit("debug", `Loading ${this.plugins.length} Riffy plugin(s)`);
      this.plugins.forEach((plugin) => plugin.load(this));
    }
  }

  /**
   * Create a Node
   * @param {import("..").LavalinkNode} options 
   */
  createNode(options) {
    const node = new Node(this, options, this.options);
    this.nodeMap.set(options.name || options.host, node);
    node.connect();

    this.emit("nodeCreate", node);
    return node;
  }

  /**
   * Destroy a Node
   * @param {string} identifier Node name or host
   */
  destroyNode(identifier) {
    const node = this.nodeMap.get(identifier);
    if (!node) return;
    node.destroy();
    this.nodeMap.delete(identifier);
    this.emit("nodeDestroy", node);
  }

  /**
   * Update Voice State
   * @param {Object} packet Voice Packet
   */
  async updateVoiceState(packet) {
    if (!["VOICE_STATE_UPDATE", "VOICE_SERVER_UPDATE"].includes(packet.t)) return;
    const player = this.players.get(packet.d.guild_id);
    if (!player) return;

    if (packet.t === "VOICE_SERVER_UPDATE") {
      await player.connection.setServerUpdate(packet.d);
    } else if (packet.t === "VOICE_STATE_UPDATE") {
      if (packet.d.user_id !== this.clientId) return;
      player.connection.setStateUpdate(packet.d);
    }
  }

  /**
   * Retrieve nodes by region
   * @param {string} region 
   */
  fetchRegion(region) {
    const nodesByRegion = [...this.nodeMap.values()]
      .filter((node) => node.connected && node.regions?.includes(region?.toLowerCase()))
      .sort((a, b) => {
        const aLoad = a.stats.cpu && a.stats.cpu.cores > 0 && Number.isFinite(a.stats.cpu.systemLoad)
          ? (a.stats.cpu.systemLoad / a.stats.cpu.cores) * 100
          : 0;
        const bLoad = b.stats.cpu && b.stats.cpu.cores > 0 && Number.isFinite(b.stats.cpu.systemLoad)
          ? (b.stats.cpu.systemLoad / b.stats.cpu.cores) * 100
          : 0;
        return aLoad - bLoad;
      });

    return nodesByRegion;
  }

  /**
   * Creates a connection based on the provided options.
   *
   * @param {Object} options - The options for creating the connection.
   * @param {string} options.guildId - The ID of the guild.
   * @param {string} options.voiceChannel - The ID of the voice channel.
   * @param {string} options.textChannel - The ID of the text channel.
   * @param {boolean} [options.deaf] - Whether to deafen the bot.
   * @param {boolean} [options.mute] - Whether to mute the bot.
   * @param {string} [options.region] - The region for the connection.
   * @param {number} [options.defaultVolume] - The default volume of the player. **By-Default**: **100**
   * @param {import("..").LoopOption} [options.loop] - The loop mode of the player.
   * @throws {Error} Throws an error if Riffy is not initialized or no nodes are available.
   * @return {Player} The created player.
   */
  createConnection(options) {
    if (!this.initiated) throw new Error("You have to initialize Riffy in your ready event");

    const player = this.players.get(options.guildId);
    if (player) return player;

    if (this.leastUsedNodes.length === 0) throw new Error("No nodes are available");

    let node;
    if (options.region) {
      const regionNodes = this.fetchRegion(options.region);
      // Among region-matched nodes, prefer highest priority first
      const priorityRegionNode = regionNodes.filter(n => n.priority > 0).sort((a, b) => b.priority - a.priority)[0];
      node = priorityRegionNode || regionNodes[0] || this.priorityNodes[0] || this.leastUsedNodes[0];
    } else {
      node = this.priorityNodes[0] || this.leastUsedNodes[0];
    }

    if (!node) throw new Error("No nodes are available");

    return this.createPlayer(node, options);
  }

  createPlayer(node, options) {
    const player = new Player(this, node, options);
    this.players.set(options.guildId, player);

    player.connect(options);

    this.emit('debug', `Created a player (${options.guildId}) on node ${node.name}`);

    this.emit("playerCreate", player);
    return player;
  }

  destroyPlayer(guildId) {
    const player = this.players.get(guildId);
    if (!player) return;
    player.destroy();
    this.players.delete(guildId);

    this.emit("playerDestroy", player);
  }

  /**
   * Migrates a player or a node to a new node.
   * @param {import("./Player").Player | import("./Node").Node} target The player or node to migrate.
   * @param {import("./Node").Node} [destinationNode] The node to migrate to.
   */
  async migrate(target, destinationNode = null) {
    if (target instanceof Player) {
      const player = target;
      let node;

      if (destinationNode) {
        node = destinationNode;
      } else {
        const availableNodes = [...this.nodeMap.values()].filter(n => n.connected && n !== player.node);
        node = this.migrationStrategyFn(player, availableNodes);
      }

      if (!node) {
        const err = new Error("No other nodes are available to migrate to.");
        this.emit("playerMigrationFailed", player, err);
        throw err;
      }
      if (player.node === node) {
        const err = new Error("Player is already on the destination node.");
        this.emit("playerMigrationFailed", player, err);
        throw err;
      }

      try {
        const oldNode = player.node;
        await player.moveTo(node);
        this.emit("playerMigrated", player, oldNode, node);
        return player;
      } catch (error) {
        this.emit("playerMigrationFailed", player, error);
        throw error;
      }
    }

    if (target instanceof Node) {
      const nodeToMigrate = target;
      const playersToMigrate = [...this.players.values()].filter(p => p.node === nodeToMigrate);
      if (!playersToMigrate.length) {
        return [];
      }

      const availableNodes = [...this.nodeMap.values()]
        .filter(n => n.connected && n !== nodeToMigrate)
        .sort((a, b) => a.penalties - b.penalties);

      if (!availableNodes.length) {
        const err = new Error("No other nodes are available to migrate to.");
        this.emit("nodeMigrationFailed", nodeToMigrate, err);
        throw err;
      }

      const migratedPlayers = [];
      let migrationFailed = false;
      for (const player of playersToMigrate) {
        const bestNode = this.migrationStrategyFn(player, availableNodes);
        if (!bestNode) {
          this.emit("debug", `Could not migrate player ${player.guildId}, no suitable node found using migration strategy.`);
          this.emit("playerMigrationFailed", player, new Error("No suitable node found for migration."));
          migrationFailed = true;
          continue;
        }
        try {
          const oldNode = player.node;
          await player.moveTo(bestNode);
          migratedPlayers.push(player);
          this.emit("playerMigrated", player, oldNode, bestNode);
        } catch (error) {
          this.emit("debug", `Failed to migrate player ${player.guildId}: ${error.message}`);
          this.emit("playerMigrationFailed", player, error);
          migrationFailed = true;
        }
      }

      if (migrationFailed) {
        this.emit("nodeMigrationFailed", nodeToMigrate, new Error("Some players failed to migrate."));
      } else {
        this.emit("nodeMigrated", nodeToMigrate, migratedPlayers);
      }
      return migratedPlayers;
    }
  }

  removeConnection(guildId) {
    this.players.get(guildId)?.destroy();
    this.players.delete(guildId);
  }

  /**
   * @param {object} param0 
   * @param {string} param0.query used for searching as a search Query  
   * @param {import("..").SearchPlatform} [param0.source] A source to search the query on example:ytmsearch for youtube music (uses defaultSearchPlatform if not provided)
   * @param {*} param0.requester the requester who's requesting 
   * @param {(string | Node)} [param0.node] Specific node to use for the search either put-in node identifier/name or the node class itself
   * @returns {Promise<import("..").nodeResponse>} returned properties values are nullable if lavalink doesn't give them
   * */
  async resolve({ query, source, requester, node }) {
    if (!this.initiated) throw new Error("You have to initialize Riffy in your ready event");

    if (node && (typeof node !== "string" && !(node instanceof Node))) {
      throw new Error(`'node' property must either be an node identifier/name('string') or an Node/Node Class, But Received: ${typeof node}`);
    }

    const querySource = source || this.defaultSearchPlatform;
    const regex = /^https?:\/\//;
    const identifier = regex.test(query) ? query : `${querySource}:${query}`;
    const queryType = this.classifyQuery(identifier);
    const isURL = regex.test(query);

    // If user specified a node, resolve only on that node (no retry/smart selection)
    const userSpecifiedNode = node ? (typeof node === 'string' ? this.nodeMap.get(node) : node) : null;
    if (node && !userSpecifiedNode) throw new Error("The specified node was not found.");

    const connectedNodes = [...this.nodeMap.values()].filter(n => n.connected);
    if (!connectedNodes.length) throw new Error("No nodes are available.");

    const maxAttempts = userSpecifiedNode ? 1 : Math.min(3, connectedNodes.length);
    const triedNodes = [];
    let lastResult = null;
    let lastError = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const requestNode = userSpecifiedNode || this.getPreferredNode(queryType, triedNodes);
      if (!requestNode) break;
      triedNodes.push(requestNode);

      try {
        this.emit("debug", `Searching for "${query}" on node "${requestNode.name}" (attempt ${attempt + 1}/${maxAttempts}, queryType: ${queryType})`);

        let response = await requestNode.rest.makeRequest(`GET`, `/${requestNode.rest.version}/loadtracks?identifier=${encodeURIComponent(identifier)}`);

        // Fallback strategies for empty/no_matches if Query is NOT a url
        if (!isURL && (response.loadType === "empty" || response.loadType === "NO_MATCHES")) {
          const spotifyRes = await requestNode.rest.makeRequest(`GET`, `/${requestNode.rest.version}/loadtracks?identifier=https://open.spotify.com/track/${encodeURIComponent(query)}`);
          if (spotifyRes.loadType !== "empty" && spotifyRes.loadType !== "NO_MATCHES") response = spotifyRes;
          else {
            const youtubeRes = await requestNode.rest.makeRequest(`GET`, `/${requestNode.rest.version}/loadtracks?identifier=https://www.youtube.com/watch?v=${encodeURIComponent(query)}`);
            if (youtubeRes.loadType !== "empty" && youtubeRes.loadType !== "NO_MATCHES") response = youtubeRes;
          }
        }

        // Check if result warrants a retry on another node
        const isLoadError = ["error", "LOAD_FAILED"].includes(response.loadType);
        const isEmpty = ["empty", "NO_MATCHES"].includes(response.loadType);

        if (isLoadError || (isEmpty && isURL)) {
          requestNode.recordResolveFailure(queryType);
          lastResult = { response, requestNode };
          this.emit("debug", `Resolve ${isLoadError ? "failed" : "returned empty"} on "${requestNode.name}" for queryType "${queryType}", ${attempt < maxAttempts - 1 ? "retrying on another node..." : "no more retries"}`);
          if (attempt < maxAttempts - 1) continue;
        } else {
          requestNode.recordResolveSuccess(queryType);
        }

        return this._buildResolveResult(response, requestNode, requester, query);
      } catch (error) {
        requestNode.recordResolveFailure(queryType);
        lastError = error;
        this.emit("debug", `Search Failed for "${query}" on node "${requestNode.name}", Due to: ${error?.message || error}`);
        if (attempt === maxAttempts - 1 || userSpecifiedNode) throw error;
      }
    }

    // All retries exhausted - return last result if we have one, otherwise throw
    if (lastResult) {
      return this._buildResolveResult(lastResult.response, lastResult.requestNode, requester, query);
    }
    if (lastError) throw lastError;
    throw new Error("No nodes are available.");
  }

  /**
   * @private
   * Builds a standardized resolve result from a raw response.
   */
  _buildResolveResult(response, requestNode, requester, query) {
    this.tracks = [];
    let tracks = [];
    let playlistInfo = null;

    if (requestNode.rest.version === "v4") {
      if (response.loadType === "track") {
        tracks = response.data ? [new Track(response.data, requester, requestNode)] : [];
      } else if (response.loadType === "playlist") {
        tracks = response.data?.tracks ? response.data.tracks.map((track) => new Track(track, requester, requestNode)) : [];
      } else if (response.loadType === "search") {
        tracks = response.data ? response.data.map((track) => new Track(track, requester, requestNode)) : [];
      }
    } else {
      // v3 (Legacy or Lavalink V3)
      tracks = response?.tracks ? response.tracks.map((track) => new Track(track, requester, requestNode)) : [];
    }

    this.emit("debug", `Search ${["error", "LOAD_FAILED"].includes(response.loadType) ? "Failed" : "Success"} for "${query}" on node "${requestNode.name}", loadType: ${response.loadType}, tracks: ${tracks.length}`);

    if (requestNode.rest.version === "v4" && response.loadType === "playlist") {
      playlistInfo = response.data?.info ?? null;
    } else {
      playlistInfo = response.playlistInfo ?? null;
    }

    this.loadType = response.loadType ?? null;
    this.playlistInfo = playlistInfo;
    this.pluginInfo = response.pluginInfo ?? {};
    this.tracks = tracks;

    return {
      loadType: response.loadType ?? null,
      exception: response.loadType === "error" ? response.data : response.loadType === "LOAD_FAILED" ? response.exception : null,
      playlistInfo: playlistInfo,
      pluginInfo: response.pluginInfo ?? {},
      tracks: tracks,
    };
  }

  /**
   * Classifies a query/identifier into a query type string for smart node selection.
   * Types follow the format "platform:contentType" (e.g. "spotify:track", "youtube:playlist").
   * @param {string} identifier The full identifier (URL or "source:query")
   * @returns {string} The query type classification
   */
  classifyQuery(identifier) {
    if (/^https?:\/\//i.test(identifier)) {
      if (/open\.spotify\.com/i.test(identifier)) {
        if (/\/track\//i.test(identifier)) return "spotify:track";
        if (/\/playlist\//i.test(identifier)) return "spotify:playlist";
        if (/\/album\//i.test(identifier)) return "spotify:album";
        return "spotify:other";
      }
      if (/music\.youtube\.com/i.test(identifier)) {
        if (/[?&]list=/i.test(identifier)) return "youtubemusic:playlist";
        return "youtubemusic:video";
      }
      if (/youtu(?:be\.com|\.be)/i.test(identifier)) {
        if (/\/playlist|[?&]list=/i.test(identifier)) return "youtube:playlist";
        return "youtube:video";
      }
      if (/soundcloud\.com/i.test(identifier)) {
        if (/\/sets\//i.test(identifier)) return "soundcloud:playlist";
        return "soundcloud:track";
      }
      if (/deezer\.com/i.test(identifier)) {
        if (/\/track\//i.test(identifier)) return "deezer:track";
        if (/\/playlist\//i.test(identifier)) return "deezer:playlist";
        if (/\/album\//i.test(identifier)) return "deezer:album";
        return "deezer:other";
      }
      if (/music\.apple\.com/i.test(identifier)) {
        if (/\/playlist\//i.test(identifier)) return "applemusic:playlist";
        if (/\/album\//i.test(identifier)) return "applemusic:album";
        return "applemusic:track";
      }
      return "url:other";
    }

    const searchMatch = identifier.match(/^(\w+):/);
    if (searchMatch) {
      const prefix = searchMatch[1].toLowerCase();
      const prefixMap = {
        spsearch: "search:spotify",
        ytsearch: "search:youtube",
        ytmsearch: "search:youtubemusic",
        scsearch: "search:soundcloud",
        amsearch: "search:applemusic",
        dzsearch: "search:deezer",
      };
      return prefixMap[prefix] || `search:${prefix}`;
    }

    return "search:unknown";
  }

  /**
   * Returns the best node for a given query type, excluding nodes already tried.
   * Nodes that have proven success for this query type are preferred.
   * Nodes that have only failures for this type are demoted.
   * @param {string} queryType
   * @param {import("./Node").Node[]} [excludeNodes=[]]
   * @returns {import("./Node").Node | null}
   */
  getPreferredNode(queryType, excludeNodes = []) {
    const candidates = [...this.nodeMap.values()]
      .filter(n => n.connected && !excludeNodes.includes(n));
    if (!candidates.length) return null;

    return candidates.sort((a, b) => {
      // Strongly prefer nodes that can resolve this type
      const canA = a.canResolve(queryType);
      const canB = b.canResolve(queryType);
      if (canA !== canB) return canA ? -1 : 1;

      // Then prefer nodes with higher resolve success score for this type
      const scoreA = a.getResolveScore(queryType);
      const scoreB = b.getResolveScore(queryType);
      if (scoreA !== scoreB) return scoreB - scoreA;

      // Fall back to general penalties
      return a.penalties - b.penalties;
    })[0];
  }

  get(guildId) {
    const player = this.players.get(guildId);
    if (!player) throw new Error(`Player not found for ${guildId} guildId`);
    return player;
  }
}

module.exports = { Riffy };
