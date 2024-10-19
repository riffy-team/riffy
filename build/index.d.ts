import { EventEmitter } from "events";

export declare class Track {
    constructor(data: any, requester: any, node: Node);

    public track: string;
    public info: {
        identifier: string;
        seekable: boolean;
        author: string;
        length: number;
        stream: boolean;
        sourceName: string;
        title: string;
        uri: string;
        thumbnail: string | null;
        requester: any;
    };

    public resolve(riffy: Riffy): Promise<Track>;
}

export interface RestOptions {
    secure: boolean;
    host: string;
    port: number;
    sessionId: string;
    password: string;
    restVersion: string;
}

interface RequestOptions {
    guildId: string;
    data: any;
}

interface RestResponse {

}

export declare class Rest extends EventEmitter {
    constructor(riffy: Riffy, options: RestOptions);
    public riffy: Riffy;
    public url: string
    public sessionId: RestOptions["sessionId"];
    public password: RestOptions["password"];
    public version: RestOptions["restVersion"];
    public calls: number;

    public setSessionId(sessionId: string): void;
    public makeRequest(method: string, endpoint: string, body?: any): Promise<RestResponse | null>;
    public getPlayers(): Promise<RestResponse | null>;
    public updatePlayer(options: RequestOptions): Promise<void>;
    public destroyPlayer(guildId: string): Promise<RestResponse | null>;
    public getTracks(identifier: string): Promise<void>;
    public decodeTrack(track: string, node?: any): Promise<void>;
    public decodeTracks(tracks: any[]): Promise<void>;
    public getStats(): Promise<void>;
    public getInfo(): Promise<void>;
    public getRoutePlannerStatus(): Promise<void>;
    public getRoutePlannerAddress(address: string): Promise<void>;
    public parseResponse(req: any): Promise<RestResponse | null>;
}

export declare class Queue extends Array<Track>{
    get size(): number;
    get first(): Track | null;

    add(track: Track): this;
    remove(index: number): Track;
    clear(): void;
    shuffle(): void;
}

export declare class Plugin {
    constructor(name: string);

    load(riffy: Riffy): void;
    unload(riffy: Riffy): void;
}

export interface PlayerOptions {
    guildId: string;
    textChannel?: string;
    voiceChannel?: string;
    deaf?: boolean;
    mute?: boolean;
    defaultVolume?: number;
    loop?: LoopOption;
}

export type LoopOption = "none" | "track" | "queue";

export declare class Player extends EventEmitter {
    constructor(riffy: Riffy, node: Node, options: PlayerOptions);
    public riffy: Riffy;
    public node: Node;
    public options: PlayerOptions;
    public guildId: string;
    public textChannel: string;
    public voiceChannel: string;
    public connection: Connection;
    public deaf: boolean;
    public mute: boolean;
    public volume: number;
    public loop: string;
    public filters: Filters;
    public data: {};
    public queue: Queue;
    public position: number;
    public current: Track;
    public previous: Track | null;
    public playing: boolean;
    public paused: boolean;
    public connected: boolean;
    public timestamp: number;
    public ping: number;
    public isAutoplay: boolean;

    public play(): Promise<Player>;

    public autoplay(player: Player): Promise<Player>;

    public connect(options?: {
        guildId: string;
        voiceChannel: string;
        deaf?: boolean;
        mute?: boolean;
    }): void;

    public stop(): Player;
    public pause(toggle?: boolean): Player;
    public seek(position: number): void;
    public setVolume(volume: number): Player;
    public setLoop(mode: LoopOption): Player;
    public setTextChannel(channel: string): Player;
    public setVoiceChannel(channel: string, options?: {
        mute?: boolean;
        deaf?: boolean;
    }): Player;

    public disconnect(): Player;
    public destroy(): void;
    private handleEvent(payload: any): void;
    private trackStart(player: Player, track: Track, payload: any): void;
    private trackEnd(player: Player, track: Track, payload: any): void;
    private trackError(player: Player, track: Track, payload: any): void;
    private trackStuck(player: Player, track: Track, payload: any): void;
    private socketClosed(player: Player, payload: any): void;
    private set(key: string, value: any): void;
    private get(key: string): any;
    private send(data: any): void;
}

export type SearchPlatform = "ytsearch" | "ytmsearch" | "scsearch" | "spsearch" | "amsearch" | "dzsearch" | "ymsearch" | (string & {})
export type Version = "v3" | "v4";

export type LavalinkTrackLoadException = {
  message: string | null,
  severity: "common" | "suspicious" | "fault",
  cause: string
}
export type nodeResponse = {
    /**
     * Array of Loaded Tracks
     */
    tracks: Array<Track>;
    /**
     * Lavalink Load Types
     * - V3 -> "TRACK_LOADED", "PLAYLIST_LOADED", "SEARCH_RESULT", "NO_MATCHES", "LOAD_FAILED"
     * - V4 -> "track", "playlist", "search", "error"
     * 
     * `null` in-case where Lavalink doesn't return them (due to Error or so.)
     */
    loadType: string | null
    /**
     * Playlist Info
     * `null` if Lavalink doesn't return them
     */
    playlistInfo: {
        name: string;
        selectedTrack: number;
    } | null;
    /**
     * Plugin Info
     * ## Properties may not exist(Means Empty Object) if Lavalink/Node does not return/provide them
     */
    pluginInfo: object;
    
    exception: LavalinkTrackLoadException | null 
}

export type RiffyOptions = {
    send: (payload: {
        op: number;
        d: {
            guild_id: string;
            channel_id: string;
            self_deaf: boolean;
            self_mute: boolean;
        }
    }) => void;
    defaultSearchPlatform?: SearchPlatform;
    restVersion?: Version;
    plugins?: Array<Plugin>;
} & Exclude<NodeOptions, "sessionId">

// In index.d.ts
export declare const enum RiffyEventType {
    // Node Events
    NodeConnect = "nodeConnect",
    NodeReconnect = "nodeReconnect",
    NodeDisconnect = "nodeDisconnect",
    NodeCreate = "nodeCreate",
    NodeDestroy = "nodeDestroy",
    NodeError = "nodeError",
    SocketClosed = "socketClosed",

    // Track Events
    TrackStart = "trackStart",
    TrackEnd = "trackEnd",
    TrackError = "trackError",
    TrackStuck = "trackStuck",

    // Player Events
    PlayerCreate = "playerCreate",
    PlayerDisconnect = "playerDisconnect",
    PlayerMove = "playerMove",
    PlayerUpdate = "playerUpdate",
    QueueEnd = "queueEnd",

    // Misc Events
    Debug = "debug"
}

// Define your event handlers type map
export type RiffyEvents = {
    // Node Events
    [RiffyEventType.NodeConnect]: (node: Node) => void;
    [RiffyEventType.NodeReconnect]: (node: Node) => void;
    [RiffyEventType.NodeDisconnect]: (node: Node, reason: string) => void;
    [RiffyEventType.NodeCreate]: (node: Node) => void;
    [RiffyEventType.NodeDestroy]: (node: Node) => void;
    [RiffyEventType.NodeError]: (node: Node, error: Error) => void;
    [RiffyEventType.SocketClosed]: (player: Player, payload: any) => void;

    // Track Events
    [RiffyEventType.TrackStart]: (player: Player, track: Track, payload: any) => void;
    [RiffyEventType.TrackEnd]: (player: Player, track: Track, payload: any) => void;
    [RiffyEventType.TrackError]: (player: Player, track: Track, payload: any) => void;
    [RiffyEventType.TrackStuck]: (player: Player, track: Track, payload: any) => void;

    // Player Events
    [RiffyEventType.PlayerCreate]: (player: Player) => void;
    [RiffyEventType.PlayerDisconnect]: (player: Player) => void;
    [RiffyEventType.PlayerMove]: (player: Player, oldChannel: string, newChannel: string) => void;
    [RiffyEventType.PlayerUpdate]: (player: Player, payload: any) => void;
    [RiffyEventType.QueueEnd]: (player: Player) => void;

    // Misc Events
    [RiffyEventType.Debug]: (message: string[]) => void;
};

// k as `key`
type k = string;

export declare class Riffy extends EventEmitter {
    // Event Emitter overrides
    public on<K extends keyof RiffyEvents>(event: K, listener: RiffyEvents[K]): this;
    public once<K extends keyof RiffyEvents>(event: K, listener: RiffyEvents[K]): this;
    public off<K extends keyof RiffyEvents>(event: K, listener: RiffyEvents[K]): this;
    public removeAllListeners<K extends keyof RiffyEvents>(event?: K): this;
    public emit<K extends keyof RiffyEvents>(event: K, ...args: Parameters<RiffyEvents[K]>): boolean;

    constructor(client: any, nodes: LavalinkNode[], options: RiffyOptions);
    public client: any;
    public nodes: Array<LavalinkNode>;
    public nodeMap: Map<k, Node>;
    public players: Map<k, Player>;
    public options: RiffyOptions;
    public clientId: string;
    public initiated: boolean;
    public send: RiffyOptions["send"];
    public defaultSearchPlatform: string;
    public restVersion: RiffyOptions["restVersion"];

    public readonly leastUsedNodes: Array<Node>;

    public init(clientId: string): this;

    public createNode(options: any): Node;

    public destroyNode(identifier: string): void;

    public updateVoiceState(packet: any): void;

    public fetchRegion(region: string): Array<LavalinkNode>;

   /**
   * Creates a connection based on the provided options.
   *
   * @param {Object} options - The options for creating the connection.
   * @param {string} options.guildId - The ID of the guild.
   * @param {string} [options.region] - The region for the connection.
   * @param {number} [options.defaultVolume] - The default volume of the player. **By-Default**: **100**
   * @param {LoopOption} [options.loop] - The loop mode of the player.
   * @throws {Error} Throws an error if Riffy is not initialized or no nodes are available.
   * @return {Player} The created player.
   */
    public createConnection(options: {
        guildId: string;
        voiceChannel: string;
        textChannel: string;
        deaf?: boolean;
        mute?: boolean;
        /**
         * @description Default volume of the player
         * @default default 100
         */
        defaultVolume?: number

        loop?: LoopOption;
        /**
         * @description voice region (rtc Region) used for filtering node based on it 
         */
        region?: string;
    }): Player;

    public createPlayer(node: Node, options: PlayerOptions): Player;

    public removeConnection(guildId: string): void;

    /**
   * @param {object} param0 
   * @param {string} param0.query used for searching as a search Query  
   * @param {*} param0.source  A source to search the query on example:ytmsearch for youtube music
   * @param {*} param0.requester the requester who's requesting 
   * @param {(string | Node)?} param0.node  the node to request the query on either use node identifier/name or the node class itself
   * @returns {nodeResponse} returned properties values are nullable if lavalink doesn't  give them
   * */
    public resolve(params: {
        query: string;
        source?: string;
        requester: any;
        node?: string | Node
    }): Promise<nodeResponse>;


    public get(guildId: string): Player;
}

export type LavalinkNode = {
    /**
     * The name of the node
     */
    name?: string;
    /**
     * The IP of the node
     */
    host: string;
    /**
     * The port of the node
     */
    port: number;
    /**
     * The password of the node
     */
    password: string;
    /**
     * Is node connection secured by SSL ?
     * @default false 
     */
    secure?: boolean;
    
    /**
     * Voice Regions for the Node
     */
    regions?: string[];

} & Partial<NodeOptions>

export type NodeOptions = {
    /**
     * The rest version of the node
     */
    restVersion: Version;

    /**
     * The resume key of the node 
     * Ignored if node `restVersion` is not `v3`
     */
    resumeKey?: string;
    /**
     * The session id of the node
     */
    sessionId?: string;
    /**
     * The resume timeout of the node
     */
    resumeTimeout?: number;
    /**
     * The auto resume of the node
     */
    autoResume?: boolean;
    /**
     * The reconnect timeout of the node
     */
    reconnectTimeout?: number;
    /**
     * The reconnect tries of the node
     */
    reconnectTries?: number;
}

type NodeInfo = {
    /**
     * The Semantic Version Object of the node
     * @see https://lavalink.dev/api/rest.html#version-object
     */
    version: NodeInfoSemanticVersionObj;
    buildTime: number;
    /**
     * The git information of the node
     * @see https://lavalink.dev/api/rest.html#git-object
     */
    git: {
        branch: string;
        commit: string;
        commitTime: string;
    };
    jvm: string;
    lavaplayer: string;
    /**
     * The available enabled source managers for the node
     */
    sourceManagers: string[];
    /**
     * The available filters (To apply For the Player)
     */
    filters: string[];
    /**
     * The enabled plugins of the Node
     * @see https://lavalink.dev/api/rest.html#plugin-object
     */
    plugins: Array<{
        name: string;
        version: string;
    }>;
}

type NodeInfoSemanticVersionObj = {
    semver: string;
    major: number;
    minor: number;
    patch: number;
}

export declare class Node {
    constructor(riffy: Riffy, node: LavalinkNode, options: NodeOptions);
    public riffy: Riffy;

    public name: LavalinkNode["name"];
    public host: LavalinkNode["host"];
    public port: LavalinkNode["port"];
    public password: LavalinkNode["password"];
    public secure: LavalinkNode["secure"];

    public restVersion: NodeOptions["restVersion"];
    public rest: Rest;
    public wsUrl: string;
    public restUrl: string;
    private ws: null;

    public resumeKey: NodeOptions["resumeKey"];
    public sessionId: NodeOptions["sessionId"];
    public regions: string[] | null;
    public resumeTimeout: NodeOptions["resumeTimeout"];
    public autoResume: NodeOptions["autoResume"];
    public reconnectTimeout: NodeOptions["reconnectTimeout"];
    public reconnectTries: NodeOptions["reconnectTries"];

    public reconnectAttempt: number;
    public reconnectAttempted: number;

    public connected: boolean;
    public reconnecting: boolean;
    public info: NodeInfo;
    public stats: {
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

    public connect(): void;
    public open(): void;
    public error(event: any): void;
    public message(msg: any): void;
    public close(event: any, reason: string): void;
    public reconnect(): void;
    public disconnect(): void;
    readonly penalties: number;
}

export type FilterOptions = {
    /**
     * The volume of the player
     */
    volume?: number;
    /**
     * The equalizer of the player
     */
    equalizer?: Array<{ band: number; gain: number }>;
    /**
     * The karaoke of the player
     */
    karaoke?: {
        level: number;
        monoLevel: number;
        filterBand: number;
        filterWidth: number;
    } | null;
    /**
     * The timescale of the player
     */
    timescale?: {
        speed: number;
        pitch: number;
        rate: number;
    } | null;
    /**
     * The tremolo of the player
     */
    tremolo?: {
        frequency: number;
        depth: number;
    } | null;
    /**
     * The vibrato of the player
     */
    vibrato?: {
        frequency: number;
        depth: number;
    } | null;
    /**
     * The rotation of the player
     */
    rotation?: {
        rotationHz: number;
    } | null;
    /**
     * The distortion of the player
     */
    distortion?: {
        sinOffset: number;
        sinScale: number;
        cosOffset: number;
        cosScale: number;
        tanOffset: number;
        tanScale: number;
        offset: number;
        scale: number;
    } | null;
    /**
     * The channel mix of the player
     */
    channelMix?: {
        leftToLeft: number;
        leftToRight: number;
        rightToLeft: number;
        rightToRight: number;
    } | null;
    /**
     * The low pass of the player
     */
    lowPass?: {
        smoothing: number;
    } | null;
    /**
     * The BassBoost of the player
     */
    bassboost?: number | null;
    /**
     * The Slowmode of the player
     */
    slowmode?: number | null;
    /**
     * The Nightcore of the player
     */
    nightcore?: boolean | null;
    /**
     * The Vaporwave of the player
     */
    vaporwave?: boolean | null;
    /**
     * The 8D of the player
     */
    _8d?: boolean | null;
}

export declare class Filters {
    constructor(player: Player, options: FilterOptions);
    public player: Player;
    public volume: FilterOptions["volume"];
    public equalizer: FilterOptions["equalizer"];
    public karaoke: FilterOptions["karaoke"];
    public timescale: FilterOptions["timescale"];
    public tremolo: FilterOptions["tremolo"];
    public vibrato: FilterOptions["vibrato"];
    public rotation: FilterOptions["rotation"];
    public distortion: FilterOptions["distortion"];
    public channelMix: FilterOptions["channelMix"];
    public lowPass: FilterOptions["lowPass"];
    public bassboost: FilterOptions["bassboost"];
    public slowmode: FilterOptions["slowmode"];
    public nightcore: FilterOptions["nightcore"];
    public vaporwave: FilterOptions["vaporwave"];
    public _8d: FilterOptions["_8d"];

    public setEquilizer(band: Array<{ band: number; gain: number }>): this;

    public setKaraoke(enabled: boolean, options?: {
        level: number;
        monoLevel: number;
        filterBand: number;
        filterWidth: number;
    }): this;

    public setTimescale(enabled: boolean, options?: {
        speed: number;
        pitch: number;
        rate: number;
    }): this;


    public setTremolo(enabled: boolean, options?: {
        frequency: number;
        depth: number;
    }): this;

    public setVibrato(enabled: boolean, options?: {
        frequency: number;
        depth: number;
    }): this;

    public setRotation(enabled: boolean, options?: {
        rotationHz: number;
    }): this;

    public setDistortion(enabled: boolean, options?: {
        sinOffset: number;
        sinScale: number;
        cosOffset: number;
        cosScale: number;
        tanOffset: number;
        tanScale: number;
        offset: number;
        scale: number;
    }): this;

    public setChannelMix(enabled: boolean, options?: {
        leftToLeft: number;
        leftToRight: number;
        rightToLeft: number;
        rightToRight: number;
    }): this;

    public setLowPass(enabled: boolean, options?: {
        smoothing: number;
    }): this;


    public setBassboost(enabled: boolean, options?: {
        value: number;
    }): this;

    public setSlowmode(enabled: boolean, options?: {
        rate: number;
    }): this;

    public setNightcore(enabled: boolean, options?: {
        rate: number;
    }): this;

    public setVaporwave(enabled: boolean, options?: {
        pitch: number;
    }): this;

    public set8D(enabled: boolean, options?: {
        rotationHz: number;
    }): this;

    public clearFilters(): this;

    public updateFilters(): this;
}

export type Voice = {
    /**
     * The voice session id
     */
    sessionId: string,
    /**
     * The voice event
     */
    event: null,
    /**
     * The voice endpoint
     */
    endpoint: string
}

export declare class Connection {
    constructor(player: Player);
    public player: Player;
    public sessionId: string;
    public voice: Voice;
    public region: string;
    public self_deaf: boolean;
    public self_mute: boolean;
    public voiceChannel: string;

    public setServerUpdate(data: { endpoint: string; token: string }): void;

    public setStateUpdate(data: {
        session_id: string;
        channel_id: string;
        self_deaf: boolean;
        self_mute: boolean;
    }): void;

    private updatePlayerVoiceData(): void;
}
