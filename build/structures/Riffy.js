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
     * Migration Strategy Function
     */
    this.migrationStrategyFn = options.migrationStrategyFn || this._defaultMigrationStrategy;
    this.restVersion = options.restVersion || "v3";
    this.tracks = [];
    this.loadType = null;
    this.playlistInfo = null;
    this.pluginInfo = null;
    this.plugins = options.plugins || [];
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
   * @param {import("..").NodeOptions} options 
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
        const aLoad = a.stats.cpu ? (a.stats.cpu.systemLoad / a.stats.cpu.cores) * 100 : 0;
        const bLoad = b.stats.cpu ? (b.stats.cpu.systemLoad / b.stats.cpu.cores) * 100 : 0;
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
      const region = this.fetchRegion(options.region)[0];
      node = this.nodeMap.get(region?.name || this.leastUsedNodes[0].name);
    } else {
      node = this.nodeMap.get(this.leastUsedNodes[0].name);
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
      if (!playersToMigrate.length) return [];

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
   * Search for tracks/playlists.
   * @param {object} param0 
   * @param {string} param0.query Search Query
   * @param {string} [param0.source="ytmsearch"] Source (ytmsearch, scsearch, etc.)
   * @param {*} param0.requester Requester object (User)
   * @param {string|Node} [param0.node] Specific node to use
   * @returns {Promise<import("..").nodeResponse>}
   */
  async resolve({ query, source, requester, node }) {
    if (!this.initiated) throw new Error("You have to initialize Riffy in your ready event");

    if (node && (typeof node !== "string" && !(node instanceof Node))) {
      throw new Error(`'node' property must either be an node identifier/name('string') or an Node/Node Class, But Received: ${typeof node}`);
    }

    const requestNode = (node && typeof node === 'string' ? this.nodeMap.get(node) : node) || this.leastUsedNodes[0];
    if (!requestNode) throw new Error("No nodes are available.");

    try {
      const querySource = source || this.defaultSearchPlatform;
      const regex = /^https?:\/\//;
      const identifier = regex.test(query) ? query : `${querySource}:${query}`;

      this.emit("debug", `Searching for ${query} on node "${requestNode.name}"`);

      let response = await requestNode.rest.makeRequest(`GET`, `/${requestNode.rest.version}/loadtracks?identifier=${encodeURIComponent(identifier)}`);

      // Fallback strategies for empty/no_matches if Query is NOT a url
      if (!regex.test(query) && (response.loadType === "empty" || response.loadType === "NO_MATCHES")) {
        // This fallback logic looks a bit aggressive (forcing Spotify then YouTube if original query failed), 
        // but I'll keep it as it seems to be desired internal logic, just cleaning up readability.
        const spotifyRes = await requestNode.rest.makeRequest(`GET`, `/${requestNode.rest.version}/loadtracks?identifier=https://open.spotify.com/track/${query}`);
        if (spotifyRes.loadType !== "empty" && spotifyRes.loadType !== "NO_MATCHES") response = spotifyRes;
        else {
          const youtubeRes = await requestNode.rest.makeRequest(`GET`, `/${requestNode.rest.version}/loadtracks?identifier=https://www.youtube.com/watch?v=${query}`);
          if (youtubeRes.loadType !== "empty" && youtubeRes.loadType !== "NO_MATCHES") response = youtubeRes;
        }
      }

      // Process response based on version
      this.tracks = [];
      if (requestNode.rest.version === "v4") {
        if (response.loadType === "track") {
          this.tracks = response.data ? [new Track(response.data, requester, requestNode)] : [];
        } else if (response.loadType === "playlist") {
          this.tracks = response.data?.tracks ? response.data.tracks.map((track) => new Track(track, requester, requestNode)) : [];
        } else if (response.loadType === "search") {
          this.tracks = response.data ? response.data.map((track) => new Track(track, requester, requestNode)) : [];
        }
      } else {
        // v3
        this.tracks = response?.tracks ? response.tracks.map((track) => new Track(track, requester, requestNode)) : [];
      }

      this.emit("debug", `Search ${["error", "LOAD_FAILED"].includes(response.loadType) ? "Failed" : "Success"} for "${query}" on node "${requestNode.name}", loadType: ${response.loadType}, tracks: ${this.tracks.length}`);

      if (requestNode.rest.version === "v4" && response.loadType === "playlist") {
        this.playlistInfo = response.data?.info ?? null;
      } else {
        this.playlistInfo = response.playlistInfo ?? null;
      }

      this.loadType = response.loadType ?? null
      this.pluginInfo = response.pluginInfo ?? {};

      return {
        loadType: this.loadType,
        exception: this.loadType === "error" ? response.data : this.loadType === "LOAD_FAILED" ? response.exception : null,
        playlistInfo: this.playlistInfo,
        pluginInfo: this.pluginInfo,
        tracks: this.tracks,
      };
    } catch (error) {
      this.emit("debug", `Search Failed for "${query}" on node "${requestNode.name}", Due to: ${error?.message || error}`);
      throw error;
    }
  }

  get(guildId) {
    const player = this.players.get(guildId);
    if (!player) throw new Error(`Player not found for ${guildId} guildId`);
    return player;
  }
}

module.exports = { Riffy };