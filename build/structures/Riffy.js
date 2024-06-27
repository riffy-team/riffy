const { EventEmitter } = require("events");
const { Node } = require("./Node");
const { Plugin } = require("./Plugins");
const { Player } = require("./Player");
const { Track } = require("./Track");
const { Collection } = require("@discordjs/collection");

const versions = ["v3", "v4"];

class Riffy extends EventEmitter {
    constructor(client, nodes, options) {
        super();
        if (!client) throw new Error("Client is required to initialize Riffy");
        if (!nodes) throw new Error("Nodes are required to initialize Riffy");
        if (!options.send) throw new Error("Send function is required to initialize Riffy");

        this.client = client;
        this.nodes = nodes;
        this.nodeMap = new Collection();
        this.nodeByRegion = null;
        this.players = new Collection();
        this.options = options;
        this.clientId = null;
        this.initiated = false;
        this.send = options.send || null;
        this.defaultSearchPlatform = options.defaultSearchPlatform || "ytmsearch";
        this.restVersion = options.restVersion || "v3";
        this.tracks = [];
        this.loadType = null;
        this.playlistInfo = null;
        this.pluginInfo = null;
        this.plugins = options.plugins;

        if (this.restVersion && !versions.includes(this.restVersion)) throw new RangeError(`${this.restVersion} is not a valid version`);
    }

    get leastUsedNodes() {
        return [...this.nodeMap.values()]
            .filter((node) => node.connected)
            .sort((a, b) => a.rest.calls - b.rest.calls);
    }

    init(clientId) {
        if (this.initiated) return this;
        this.clientId = clientId;
        this.nodes.forEach((node) => this.createNode(node));
        this.initiated = true;

        if (this.plugins) {
            this.plugins.forEach((plugin) => {
                plugin.load(this);
            });
        }
    }

    createNode(options) {
        const node = new Node(this, options, this.options);
        this.nodeMap.set(options.name || options.host, node);
        node.connect();

        this.emit("nodeCreate", node);
        return node;
    }

    destroyNode(identifier) {
        const node = this.nodeMap.get(identifier);
        if (!node) return;
        node.disconnect();
        this.nodeMap.delete(identifier);
        this.emit("nodeDestroy", node);
    }

    updateVoiceState(packet) {
        if (!["VOICE_STATE_UPDATE", "VOICE_SERVER_UPDATE"].includes(packet.t)) return;
        const player = this.players.get(packet.d.guild_id);
        if (!player) return;

        if (packet.t === "VOICE_SERVER_UPDATE") {
            player.connection.setServerUpdate(packet.d);
        } else if (packet.t === "VOICE_STATE_UPDATE") {
            if (packet.d.user_id !== this.clientId) return;
            player.connection.setStateUpdate(packet.d);
        }
    }

    fetchRegion(region) {
        const nodesByRegion = [...this.nodeMap.values()]
            .filter((node) => node.connected && node.regions == region?.toLowerCase())
            .sort((a, b) => b.rest.calls - a.rest.calls);

        return nodesByRegion;
    }

    createConnection(options) {
        if (!this.initiated) throw new Error("You have to initialize Riffy in your ready event");

        const player = this.players.get(options.guildId);
        if (player) return player;

        if (this.leastUsedNodes.length === 0) throw new Error("No nodes are available");

        let node;
        if (options.region) {
            let node = this.fetchRegion(options.region)[0];
            if (!node) throw new Error("No nodes are available in the specified region.");

            this.nodeByRegion = node;
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

    removeConnection(guildId) {
        this.players.get(guildId)?.destroy();
        this.players.delete(guildId);
    }

    async resolve({ query, source, requester }) {
        try {
            if (!this.initiated) throw new Error("You have to initialize Riffy in your ready event");

            const sources = source || this.defaultSearchPlatform;

            const node = this.nodeByRegion || this.leastUsedNodes[0];
            if (!node) throw new Error("No nodes are available.");

            const regex = /^https?:\/\//;
            const identifier = regex.test(query) ? query : `${sources}:${query}`;

            let response = await node.rest.makeRequest(`GET`, `/${node.rest.version}/loadtracks?identifier=${encodeURIComponent(identifier)}`);

            // for resolving identifiers - Only works in Spotify and Youtube
            if (response.loadType === "empty" || response.loadType === "NO_MATCHES") {
                response = await node.rest.makeRequest(`GET`, `/${node.rest.version}/loadtracks?identifier=https://open.spotify.com/track/${query}`);
                if (response.loadType === "empty" || response.loadType === "NO_MATCHES") {
                    response = await node.rest.makeRequest(`GET`, `/${node.rest.version}/loadtracks?identifier=https://www.youtube.com/watch?v=${query}`);
                }
            }

            if (node.rest.version === "v4") {
                if (response.loadType === "track") {
                    this.tracks = response.data ? [new Track(response.data, requester, node)] : [];
                } else if (response.loadType === "playlist") {
                    this.tracks = response.data?.tracks ? response.data.tracks.map((track) => new Track(track, requester, node)) : [];
                } else {
                    this.tracks = response.loadType === "search" && response.data ? response.data.map((track) => new Track(track, requester, node)) : [];
                }
            } else {
                this.tracks = response.data?.tracks ? response.tracks.map((track) => new Track(track, requester, node)) : [];
            }

            if (
              node.rest.version === "v4" &&
              this.loadType === "playlist"
            ) {
              this.playlistInfo = response.data?.info ?? null;
            } else {
              this.playlistInfo = response.playlistInfo ?? null;
            }

            this.loadType = response.loadType ?? null
            this.pluginInfo = response.pluginInfo ?? null;

            return {
                loadType: this.loadType,
                exception: this.loadType == "error" ? response.data : this.loadType == "LOAD_FAILED" ? response?.exception : null,
                playlistInfo: this.playlistInfo,
                pluginInfo: this.pluginInfo,
                tracks: this.tracks,
              };
        } catch (error) {
            throw new Error(error);
        }
    }

    get(guildId) {
        const player = this.players.get(guildId);
        if (!player) throw new Error(`Player not found for ${guildId} guildId`);
        return player;
    }
}

module.exports = { Riffy };
