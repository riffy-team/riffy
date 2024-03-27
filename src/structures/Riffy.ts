import { EventEmitter } from "events"
import { Track, Player, Node, Plugin } from ".."

const versions = ["v3", "v4"] as const;

type restVersion = "v3" | "v4";

export interface RiffyOptions {
    send: Function;
    defaultSearchPlatform?: string;
    restVersion?: restVersion;
    plugins?: Plugin[];
}

export class Riffy extends EventEmitter {
    public client: any;
    public nodes: Node;
    public nodeMap: Map<string, Node>;
    public players: Map<string, Player>;
    public options: RiffyOptions | any;
    public clientId: string | null;
    public initiated: boolean;
    public send: Function;
    public defaultSearchPlatform: string;
    public restVersion: restVersion;
    public tracks: Track[];
    public loadType: string | any;
    public playlistInfo: any;
    public pluginInfo: any;
    public plugins: Plugin[];

    constructor(client: any, nodes: Node, options: RiffyOptions) {
        super();
        if (!client) throw new Error("Client is required to initialize Riffy");
        if (!nodes) throw new Error("Nodes are required to initialize Riffy");
        if (!options.send) throw new Error("Send function is required to initialize Riffy");

        this.client = client;
        this.nodes = nodes;
        this.nodeMap = new Map();
        this.players = new Map();
        this.options = options;
        this.clientId = null;
        this.initiated = false;
        this.send = options.send || null;
        this.defaultSearchPlatform = options.defaultSearchPlatform || "ytmsearch";
        this.restVersion = options.restVersion || "v3";
        this.tracks = [] as Track[] | any;
        this.loadType = null;
        this.playlistInfo = null;
        this.pluginInfo = null;
        this.plugins = options.plugins = [];

        if (this.restVersion && !versions.includes(this.restVersion)) throw new RangeError(`${this.restVersion} is not a valid version`);
    }

    get leastUsedNodes(): Node[] {
        return [...this.nodeMap.values()]
            .filter((node) => node.connected)
            .sort((a, b) => b.rest.calls - a.rest.calls);
    }

    public init(clientId: string) {
        if (this.initiated) return this;
        this.clientId = clientId;
        this.nodes.forEach((node: Node) => {
            this.createNode(node)
        });
        this.initiated = true;

        if (this.plugins) {
            this.plugins.forEach((plugin: Plugin) => {
                plugin.load(this);
            });
        }
    }

    public createNode(options: any) {
        const node = new Node(this, options, this.options);
        this.nodeMap.set(options.name || options.host, node);
        node.connect();

        this.emit("nodeCreate", node);
        return node;
    }

    public destroyNode(identifier: string) {
        const node = this.nodeMap.get(identifier);
        if (!node) return;
        node.disconnect();
        this.nodeMap.delete(identifier);
        this.emit("nodeDestroy", node);
    }

    public updateVoiceState(packet: any) {
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

    public fetchRegion(region: string) {
        const nodesByRegion = [...this.nodeMap.values()]
            .filter((node) => node.connected && node.regions?.includes(region?.toLowerCase()))
            .sort((a, b) => {
                const aLoad = a.stats.cpu
                    ? (a.stats.cpu.systemLoad / a.stats.cpu.cores) * 100
                    : 0;
                const bLoad = b.stats.cpu
                    ? (b.stats.cpu.systemLoad / b.stats.cpu.cores) * 100
                    : 0;
                return aLoad - bLoad;
            });

        return nodesByRegion;
    }

    public createConnection(options: any) {
        if (!this.initiated) throw new Error("You have to initialize Riffy in your ready event");

        const player = this.players.get(options.guildId);
        if (player) return player;

        if (this.leastUsedNodes.length === 0) throw new Error("No nodes are available");

        let node;
        if (options.region) {
            const region = this.fetchRegion(options.region)[0];
            node = this.nodeMap.get(region.name || this.leastUsedNodes[0].name!);
        } else {
            node = this.nodeMap.get(this.leastUsedNodes[0].name!);
        }

        if (!node) throw new Error("No nodes are available");

        return this.createPlayer(node, options);
    }

    public createPlayer(node: Node, options: any) {
        const player = new Player(this, node, options);
        this.players.set(options.guildId, player);

        player.connect(options);

        this.emit("playerCreate", player);
        return player;
    }

    public destroyPlayer(guildId: string) {
        const player = this.players.get(guildId);
        if (!player) return;
        player.destroy();
        this.players.delete(guildId);

        this.emit("playerDestroy", player);
    }

    public removeConnection(guildId: string) {
        this.players.get(guildId)?.destroy();
        this.players.delete(guildId);
    }

    public async resolve({ query, source, requester }: any) {
        try {
            if (!this.initiated) throw new Error("You have to initialize Riffy in your ready event");

            const sources = source || this.defaultSearchPlatform;

            const node = this.leastUsedNodes[0]
            if (!node) throw new Error("No nodes are available.");

            const regex = /^https?:\/\//;
            const identifier = regex.test(query) ? query : `${sources}:${query}`;

            let response = await node.rest.makeRequest(`GET`, `/${node.rest.version}/loadtracks?identifier=${encodeURIComponent(identifier)}`);

            if (response.loadType === "empty" || response.loadType === "NO_MATCHES") {
                response = await node.rest.makeRequest(`GET`, `/${node.rest.version}/loadtracks?identifier=https://open.spotify.com/track/${query}`);
                if (response.loadType === "empty" || response.loadType === "NO_MATCHES") {
                    response = await node.rest.makeRequest(`GET`, `/${node.rest.version}/loadtracks?identifier=https://www.youtube.com/watch?v=${query}`);
                }
            }

            if (node.rest.version === "v4") {
                if (response.loadType === "track") {
                    this.tracks = [new Track(response.data, requester)];
                } else if (response.loadType === "playlist") {
                    this.tracks = response.data.tracks.map((track: Track | any) => new Track(track, requester));
                } else {
                    this.tracks = response.data.map((track: Track | any) => new Track(track, requester));
                }
            } else {
                this.tracks = response.tracks.map((track: Track | any) => new Track(track, requester));
            }

            if (node.rest.version === "v4" && response.loadType === "playlist") {
                this.playlistInfo = response.data.info
            } else {
                this.playlistInfo = response.playlistInfo
            }

            this.loadType = response.loadType
            this.pluginInfo = response.pluginInfo;

            return this;
        } catch (error: any) {
            throw new Error(error);
        }
    }

    public get(guildId: string) {
        const player = this.players.get(guildId);
        if (!player) throw new Error(`Player not found for ${guildId} guildId`);
        return player;
    }
}