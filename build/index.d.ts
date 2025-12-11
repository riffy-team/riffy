import { EventEmitter } from "events";

type Nullable<T> = T | null;
type Prettify<T> = 
    [T] extends [object]
        ? { [K in keyof T]: Prettify<T[K]>}
        : T;

type PrettifyWithNull<T> = 
  [T] extends [object]
    ? { [K in keyof T]: PrettifyWithNullOrUndefined<T[K]> } & {}
    : (null extends T ? (Exclude<T, null> | null) : never);

type PrettifyWithNullOrUndefined<T> =
  [T] extends [object]
    ? { [K in keyof T]: PrettifyWithNullOrUndefined<T[K]> } & {}
    : (null extends T ? (Exclude<T, null> | null) : (undefined extends T ? (Exclude<T, undefined> | undefined) : T));

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
        isrc: string | null

        /**
         * @description Caches the fetched (if any), reuses this. Instead of fetching them again.
         */
        _cachedThumbnail: string | null;
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

export declare class Queue extends Array<Track> {
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
    public playing: boolean;
    public paused: boolean;
    public connected: boolean;
    public timestamp: number;
    public ping: number;
    public isAutoplay: boolean;
    public migrating: boolean;
    /**
     * @default 10000
     * @readonly
     * @since 1.0.9
     */
    public readonly connectionTimeout: number;
    
    /**
     * @warn Lazily (defined; Only when autoplay is called/used.) Initialized. 
     */
    public readonly playedIdentifiers: Set<String> | undefined;
    /**
     * @description gets the Previously played Track
     */
    get previous(): Track | undefined

    /**
     * @private
     * @param track
     */
    addToPreviousTrack(track: Track): void

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
    public set(key: string, value: any): any;
    public get(key: string): any;

    /**
    * @description clears All custom Data set on the Player
    */ 
    public clearData(): this;
    private send(data: any): void;

    /**
     * Moves the player to a new node.
     * @param {import("./Node").Node} newNode The node to move the player to.
     * @throws {TypeError} If no `newNode` is provided.
     * @throws {Error} If `newNode` provided is not connected.
     * @throws {Error} If `newNode` provided is same as the Player's current Node.
     */
    public moveTo(newNode: Node): Promise<Player>;
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

    /**
     * Auto Migrate Players on/when (??? something 🙃🥲)
     * 
     * Default: false
     * @default false
     */
    autoMigratePlayers?: boolean

    /**
     * Auto Migration of Players when the Node Disconnects.
     * 
     * Default: false
     * @default false
     */
    migrateOnDisconnect?: boolean

    /**
     * Auto Migration of Players when The Node Fails (receives an Error in the Websocket Connection)
     * 
     * Default: false
     * @default false
     */
    migrateOnFailure?: boolean

    /**
     * Migration Strategy Function, takes a player and availableNodes returns the Best Node for the given player.
     * Could be used for custom Strategies i.e Priority Nodes for Certain Players.
     * Default to {@link Riffy._defaultMigrationStrategy} that filters nodes which are Connected, not same (Node) as given player's Node, {@link Node.penalties penalties}
     */
    migrationStrategyFn?: Function;

    plugins?: Array<Plugin>;
    /**
     * @description Default is false (only one track) 
     */
    multipleTrackHistory?: number | boolean;
    /**
     * @description Used to bypass few checks that throw Errors (Only Possible ones are listed below)
     */
    bypassChecks: {
        nodeFetchInfo: boolean;
    }
} & Exclude<NodeOptions, "sessionId">

export declare const enum RiffyEventType {
    // Node Events
    NodeConnect = "nodeConnect",
    NodeReconnect = "nodeReconnect",
    NodeDisconnect = "nodeDisconnect",
    NodeCreate = "nodeCreate",
    NodeDestroy = "nodeDestroy",
    NodeError = "nodeError",
    NodeMigrated = "nodeMigrated",
    NodeMigrationFailed = "nodeMigrationFailed",
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
    PlayerMigrationFailed = "playerMigrationFailed",
    PlayerMigrated = "playerMigrated",
    QueueEnd = "queueEnd",

    // Misc Events
    Debug = "debug",
    Raw = "raw"
}

export type RiffyEvents = {

    // Node Events

    /**
     * Emitted when a node connects
     * @param node The node that connected.
     */
    "nodeConnect": (node: Node) => void;

    /**
     * Emitted when a node reconnects
     * @param node The node that reconnected.
     */
    "nodeReconnect": (node: Node) => void;
    /**
     * Emitted when a node disconnects
     * @param node The node that disconnected.
     * @param reason The reason for the disconnect.
     */
    "nodeDisconnect": (node: Node, reason: string) => void;

    /**
     * Emitted when a node is created
     * @param node The node that was created.
     */
    "nodeCreate": (node: Node) => void;

    /**
     * Emitted when a node is destroyed
     * @param node The node that was destroyed.
     */
    "nodeDestroy": (node: Node) => void;

    /**
     * Emitted when a node encounters an error
     * @param node The node that encountered the error.
     * @param error The error that occurred.
     */
    "nodeError": (node: Node, error: Error) => void;

    /**
     * Emitted when a Player's socket(Websocket to Discord from Lavalink) is closed
     * @description This is emitted when a player disconnects/leaves a voice channel (Sent by Lavalink via WebSocketClosedEvent)
     * @param player The player that the socket is closed for.
     * @param payload The payload of the socket close.
     * 
     * @see https://lavalink.dev/api/websocket.html#websocketclosedevent
     */
    "socketClosed": (player: Player, payload: any) => void;

    /**
     * Emitted When a Node Has been Migrated.
     * Migration means moving all resources (i.e players) from One Node to Another.
     * @param node 
     * @param players 
     * @returns {void}
     */
    "nodeMigrated": (node: Node, players: Player[]) => void;

    /**
     * Emitted When a Node Migration Has Failed.
     * @param node 
     * @param error Humanly written Error/Reason why that happened (humanly :upside_down_emoji:).
     * @returns {void}
     */
    "nodeMigrationFailed": (node: Node, error: Error) => void;

    // Track Events

    /**
     * Emitted when a track starts playing
     * @param player The player that started playing the track.
     * @param track The track that is playing.
     * @param payload The payload of the track start.
     * 
     * @see https://lavalink.dev/api/websocket.html#trackstartevent
     */
    "trackStart": (player: Player, track: Track, payload: any) => void;

    /**
     * Emitted when a track ends (Queue End is emitted when the queue ends i.e when the last track ends Instead of this.)
     * @param player The player that ended the track.
     * @param track The track that ended.
     * @param payload The payload of the track end.
     * 
     * @see https://lavalink.dev/api/websocket.html#trackendevent
     */
    "trackEnd": (player: Player, track: Track, payload: any) => void;

    /**
     * Emitted when a track encounters an error (Sent by Lavalink via [TrackExceptionEvent](https://lavalink.dev/api/websocket.html#trackexceptionevent))
     * @param player The player that encountered the error.
     * @param track The track that encountered the error.
     * @param payload The payload of the track error.
     */
    "trackError": (player: Player, track: Track, payload: any) => void;

    /**
     * Emitted when a track gets stuck (Sent by Lavalink via [TrackStuckEvent](https://lavalink.dev/api/websocket.html#trackstuckevent))
     * @param player The player that got stuck.
     * @param track The track that got stuck.
     * @param payload The payload of the track stuck.
     * 
     * @see https://lavalink.dev/api/websocket.html#trackstuckevent
     */
    "trackStuck": (player: Player, track: Track, payload: any) => void;

    // Player Events

    /**
     * Emitted when a player is created
     * @param player The player that was created.
     */
    "playerCreate": (player: Player) => void;

    /**
     * Emitted when a player disconnects
     * @param player The player that disconnected.
     */
    "playerDisconnect": (player: Player) => void;

    /**
     * Emitted when a player moves to a new voice channel
     * @param player The player that moved.
     * @param oldChannel The old voice channel.
     * @param newChannel The new voice channel.
     */
    "playerMove": (player: Player, oldChannel: string, newChannel: string) => void;

    /**
     * Emitted when a player's state is updated
     * @param player The player that was updated.
     * @param payload The payload of the player update.
     */
    "playerUpdate": (player: Player, payload: any) => void;

    /**
     * Emitted when a Player's Migration has Failed (🥲 sad life no music for them)
     * @param player For The Player that Migration Failed.
     * @param error Error/Reason why that happened (humanly :upside_down:).
     * @returns 
     */
    "playerMigrationFailed": (player: Player, error: Error) => void;

    /**
     * Emitted When a Player was Migrated (😃👏 More Music for them)
     * @param player The Player that was migrated (Gotta know them 🙃)
     * @param oldNode Node that the Player was migrated From. (Poor Node ⚒️)
     * @param newNode To the Node which the Player Migrated. (😃👏)
     * @returns 
     */
    "playerMigrated": (player: Player, oldNode: Node, newNode: Node) => void;

    /**
     * Emitted when a player's queue ends
     * @param player The player that had its queue end.
     */
    "queueEnd": (player: Player) => void;

    // Misc Events
    "debug": (...message: string[]) => void;
    "raw": (type: string, payload: any) => void;
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
    public clientId: PrettifyWithNull<Nullable<string>>;
    public initiated: boolean;
    public send: RiffyOptions["send"] | null;
    /**
     * Auto Migrate Players on/when (??? something 🙃🥲)
     */
    public readonly autoMigratePlayers: boolean
    /**
     * Auto Migration of Players when the Node Disconnects.
     */
    public readonly migrateOnDisconnect: boolean
    /**
     * Auto Migration of Players when The Node Fails (receives an Error in the Websocket Connection)
     */
    public readonly migrateOnFailure: boolean
    /**
     * Migration Strategy Function, takes a player and availableNodes returns the Best Node for the given player.
     * Could be used for custom Strategies i.e Priority Nodes for Certain Players.
     * Default to {@link _defaultMigrationStrategy} that filters nodes which are Connected, not same (Node) as given player's Node, {@link Node.penalties penalties}
     */
    public readonly migrationStrategyFn?: Function;
    public defaultSearchPlatform: string;
    
    public restVersion: RiffyOptions["restVersion"];

    /**
     * @description The Tracks from last search/load tracks (Riffy.resolve) result **OR** Empty Array if none.
     */
    public tracks: Track[];

    /**
     * Lavalink Load Types
     * - V3 -> "TRACK_LOADED", "PLAYLIST_LOADED", "SEARCH_RESULT", "NO_MATCHES", "LOAD_FAILED"
     * - V4 -> "track", "playlist", "search", "error"
     * 
     * `null` in-case where Lavalink doesn't return them (due to Error or so.)
     */
    public loadType: nodeResponse["loadType"];

    /**
     * @description playlistInfo from last search/load tracks (Riffy.resolve) result, OR is `null` if none.
     */
    public playlistInfo: nodeResponse["playlistInfo"]

    /**
     * @description `pluginInfo` from last search/load tracks (Riffy.resolve) result, OR is `null` if none. 
     */
    public pluginInfo: nodeResponse["pluginInfo"];

    /**
     * @description (Read-Only) Array of Riffy Plugins, as provided (added) in Riffy Options/Constructor
     * @readonly
     */
    public readonly plugins: RiffyOptions["plugins"]

    /**
     * @description Current Version of Riffy.
     */
    public readonly version: string

    private _defaultMigrationStrategy(player: Player, availableNodes: Node[]): Node | undefined | null

    public readonly leastUsedNodes: Array<Node>;

    /**
     * @description A Single Best Node is returned After Filtering All connected Nodes by {@link Node.penalties penalties}
     */
    public readonly bestNode: Node | null | undefined;

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

    /**
     * @description Destroys the player for given guildId (if present)
     */
    public destroyPlayer(guildId): void;

    /**
    * Migrates a player or a node to a new node.
    * @param {import("./Player").Player | import("./Node").Node} target The player or node to migrate.
    * @param {import("./Node").Node} [destinationNode] The node to migrate to.
    */
    public migrate(target: Node | Player, destinationNode?: Node): Player[]
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


    /**
     * @description Get a Player by it's given `guildId`
     * @throws {Error} Throws an Error if player is not found.
     */
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
} | {
    node: string;
    voice: {
      name: string;
      version: string;
    };
    isNodelink: boolean;
}

type NodeInfoSemanticVersionObj = {
    semver: string;
    major: number;
    minor: number;
    patch: number;
    prerelease: string[] | string | null,
    build: string | null,
}

type LyricPluginWithoutLavaLyrics = "java-lyrics-plugin" | "lyrics"

/**
 * @see https://github.com/DuncteBot/java-timed-lyrics
 * @see https://github.com/DRSchlaubi/lyrics.kt
 */
export type LyricPluginWithoutLavaLyricsResult = {
    type: "timed" | "text" | (string & {}),
    track: {
        title: string;
        author: string;
        album: string | null;
        albumArt: {
            url: string;
            height: number;
            width: number;
        }[] | null;
    };
    source: string;
} | {
    type: "text";
    text: string;
} | {
    type: "timed";
    lines: {
        line: string;
        range: {
            start: number;
            end: number;
        };
    }[];
}

export interface NodeLyricsResult {
    /** The name of the source */
    sourceName: string;
    /** The name of the provider */
    provider: string;
    /** The Lyrics Text */
    text: Nullable<string>;
    /** The Lyrics Lines */
    lines: Array<NodeLyricsLine>;
    /** Additional plugin related Information */
    plugin: object
}

interface NodeLyricsLine {
    /** timestamp of the line in ms(milliseconds) */
    timestamp: number;
    /** Duration of the line in ms(milliseconds) */
    duration: number;
    /** The Lyric String */
    line: string;
    /** Additional plugin related Information */
    plugin: object
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
    /**
     * Voice Regions Setup for the Node
     * Helpful for region-based Node filtering.
     * i.e If Voice Channel Region is `eu_west` Filter's Nodes specifically to `eu_west` 
     */
    public regions: string[] | null;
    public resumeTimeout: NodeOptions["resumeTimeout"];
    public autoResume: NodeOptions["autoResume"];
    public reconnectTimeout: NodeOptions["reconnectTimeout"];
    public reconnectTries: NodeOptions["reconnectTries"];

    public reconnectAttempt: number;
    public reconnectAttempted: number;

    public connected: boolean;
    public reconnecting: boolean;
    /**
    * Lavalink Info fetched While/After connecting.
    */
    public info: NodeInfo | null;
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
    public lastStats: number

    /**
     * fetches Lavalink Info
     * returns null if some error occurred.
     * @see https://lavalink.dev/api/rest.html#info
     */
    fetchInfo(): Promise<NodeInfo | null>;

    /**
     * Lavalink Lyrics API (Works Only when Lavalink has Lyrics Plugin like: [lavalyrics](https://github.com/topi314/LavaLyrics))
     */
    lyrics: {
        /**
         * Checks if the node has all the required plugins available.
         * @param {boolean} [eitherOne=true] If set to true, will return true if at least one of the plugins is present.
         * @param {...string} plugins The plugins to look for.
         * @returns {Promise<boolean>} If the plugins are available.
         * @throws {RangeError} If the plugins are missing.
         */
        checkAvailable: (eitherOne: boolean, ...plugins: string[]) => Promise<boolean>;
        /**
         * Fetches lyrics for a given track or encoded track string.
         * 
         * @param {Track|string} trackOrEncodedTrackStr - The track object or encoded track string.
         * @param {boolean} [skipTrackSource=false] - Whether to skip the track source and fetch from the highest priority source (configured on Lavalink Server).
         * @returns {Promise<Object|null>} The lyrics data or null if the plugin is unavailable Or If no lyrics were found OR some Http request error occured.
         * @throws {TypeError} If `trackOrEncodedTrackStr` is not a `Track` or `string`.
         */
        get: (trackOrEncodedTrackStr: Track | string, skipTrackSource: boolean) => Promise<NodeLyricsResult | null>;

        /** @description fetches Lyrics for Currently playing Track 
         * @param {string} guildId The Guild Id of the Player
         * @param {boolean} skipTrackSource skips the Track Source & fetches from highest priority source (configured on Lavalink Server) 
         * @param {string} [plugin] The Plugin to use(**Only required if you have too many known (i.e java-lyrics-plugin, lavalyrics-plugin) Lyric Plugins**)
         */
        getCurrentTrack: <TPlugin extends LyricPluginWithoutLavaLyrics | (string & {}) >(guildId: string, skipTrackSource: boolean, plugin?: TPlugin) => Promise<TPlugin extends LyricPluginWithoutLavaLyrics ? LyricPluginWithoutLavaLyricsResult : NodeLyricsResult | null>;
    }
    
    /**
     * Nodelink Mixer API (Works Only when Node is hosted with [Nodelink Server](https://nodelink.js.org))
     * @description The Audio Mixer allows overlaying auxiliary audio tracks (like TTS, sound effects, or background music) on top of the main active track.
     */
    mixer: {
      /**
       * Check if Node is hosted with Nodelink Server
       */
       check: () => boolean;
       /**
        * Adds a new audio track to be mixed over the current playback.
        * @param {string} guildId 
        * @param {AddMixLayerOptions} mixLayerOptions 
        */
       addMixLayer: (guildId: string, mixLayerOptions: AddMixLayerOptions) => Promise<NodelinkMixLayer>;
       /**
        * Retrieves a list of currently active mix layers.
        */
       getActiveMixLayers: (guildId: string) => Promise<NodelinkMixLayer[]>;
       /**
        * Update Mix Layer Volume
        */
       updateMixLayerVolume: (guildId: string, mixId: string, volume: number) => Promise<void>;
       /**
        * Remove Mix Layer
        */
       removeMixLayer: (guildId: string, mixId: string) => Promise<void>;
    }

    public connect(): void;
    public open(): void;
    public error(event: any): void;
    public message(msg: any): void;
    public close(event: any, reason: string): void;
    public reconnect(): void;
    public disconnect(): void;
    readonly penalties: number;
}

/**
 * Options for adding a mix layer.
 */
export type AddMixLayerOptions = {
  track: {
    /** 
     * Base64 encoded track string (optional if identifier provided) 
     */
    encoded?: string;

    /** 
     * Track identifier (optional if encoded provided) 
     */
    identifier?: string;

    /** 
     * (Optional) Track User Data 
     */
    userData?: string;
  };

  /** 
   * Float 0.0 to 1.0 (Default: 0.8) 
   */
  volume?: number;
};

export type NodelinkMixLayer = {
  id: string;
  track: {
    encoded: string;
    identifier: string;
    userData: string;
  };
  volume: number;
  position?: number;
  startTime?: number;
};

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

    /**
     * Tracks the promise for the initial connection (credentials)
     * @private
     * @since 1.0.9
     */
    private deferred: { 
      promise: Promise<void>; 
      resolve: (value?: void | PromiseLike<void>) => void 
    } | null;
  
    /**
     * Tracks the promise for the active REST update to the Node
     * @private
     * @since 1.0.9
     */
    private pendingUpdate: Promise<void> | null;
    /**
     * @default false
     * @since 1.0.9
     */
    public establishing: boolean;
    
    /**
     * Checks if we have all necessary voice credentials.
     */
    get isReady(): boolean;
    
    /**
    * Waits for the connection to be ready and for any active voice updates to the Node to complete.
    * Optimization: Returns immediately if ready and idle to save resources.
    */
    public resolve(): Promise<any>;
    
    /**
    * Checks if ready, performs the update, and manages the resolution flow.
    */
    private checkAndSend(): Promise<void>;

    public setServerUpdate(data: { endpoint: string; token: string }): void;

    public setStateUpdate(data: {
        session_id: string;
        channel_id: string;
        self_deaf: boolean;
        self_mute: boolean;
    }): void;

    private updatePlayerVoiceData(): void;
}
