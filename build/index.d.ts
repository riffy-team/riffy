import { EventEmitter } from "events";
import { WebSocket } from "ws";

type Nullable<T> = T | null;
type Prettify<T> =
    [T] extends [object]
    ? { [K in keyof T]: Prettify<T[K]> }
    : T;

type PrettifyWithNull<T> =
    [T] extends [object]
    ? { [K in keyof T]: PrettifyWithNullOrUndefined<T[K]> } & {}
    : (null extends T ? (Exclude<T, null> | null) : never);

type PrettifyWithNullOrUndefined<T> =
    [T] extends [object]
    ? { [K in keyof T]: PrettifyWithNullOrUndefined<T[K]> } & {}
    : (null extends T ? (Exclude<T, null> | null) : (undefined extends T ? (Exclude<T, undefined> | undefined) : T));

export interface RestTrack {
    encoded: string,
    info: {
        /**
         * @description The unique identifier of the track.
         */
        identifier: string;
        /**
         * @description Whether the track is seekable.
         */
        isSeekable: boolean;
        /**
         * @description The author of the track.
         */
        author: string;
        /**
         * @description The length of the track in milliseconds.
         */
        length: number;
        /**
         * @description Whether the track is a stream.
         */
        isStream: boolean;
        /**
         * @description The source name of the track.
         */
        sourceName: string;
        /**
         * @description The title of the track.
         */
        title: string;
        /**
         * @description The URI of the track.
         */
        uri: string;
        /**
         * @description The artwork (thumbnail) URL of the track.
         */
        artworkUrl?: string;
        /**
         * @description The ISRC of the track.
         */
        isrc?: string;
        /**
         * @description The position of the track in milliseconds.
         */ 
        position: number;
    }

    /**
     * Plugin Info
     * ## Properties may not exist(Means Empty Object) if Lavalink/Node does not return/provide them
     */
    pluginInfo?: object
    userData?: object
}

export interface RestPlaylistInfo {
    /**
     * The name of the playlist.
     */
    name: string;
    /**
     * The selected track of the playlist (-1 if no track is selected)
     */
    selectedTrack: number;
}

export type RestFilters = Omit<FilterOptions, '_8d'>
/**
 * A Player Object returned by the Node
 */
export interface RestPlayer {
    guildId: string;
    track: PrettifyWithNull<Nullable<RestTrack>>
    volume: number;
    paused: boolean;
    state: {
        time: number,
        position: number,
        connected: boolean,
        ping: number,
    },
    voice: Voice,
    filters: RestFilters,
}

export declare class Track {
    constructor(data: RestTrack, requester: any, node: Node);

    public track: string;
    public encoded: string;
    public info: {
        identifier: string;
        seekable: boolean;
        author: string;
        length: number;
        stream: boolean;
        sourceName: string;
        title: string;
        uri: string;
        isrc: string | null;
        position: number;

        /**
         * @description Caches the fetched (if any), reuses this. Instead of fetching them again.
         */
        _cachedThumbnail: string | null;
        thumbnail: string | null;
        requester: any;
    };

    /**
     * Plugin Info
     * ## Properties may not exist(Means Empty Object) if Lavalink/Node does not return/provide them
     */
    public pluginInfo: object;
    public rawData: RestTrack;
    public userData: object;
    /**
     * (Client-Specific Property - not from the Node), If the track was auto-played by the Client/Riffy. 
     */
    public isAutoplay: boolean;

    public resolve(riffy: Riffy): Promise<Track | undefined>;
}

export interface RestOptions {
    secure: boolean;
    host: string;
    port: number;
    sessionId: string;
    password: string;
    restVersion: string;
}

interface playerUpdateOptions {
    guildId: string;
    data: any;
}

export interface RestResponse {
    [key: string]: any;
}

export declare class Rest {
    constructor(riffy: Riffy, options: RestOptions);
    public riffy: Riffy;
    public url: string
    public sessionId: RestOptions["sessionId"];
    public password: RestOptions["password"];
    public version: RestOptions["restVersion"];
    public calls: number;

    public setSessionId(sessionId: string): void;
    public makeRequest(method: string, endpoint: string, body?: any, includeHeaders?: boolean, retryCount?: number): Promise<RestResponse | { data: RestResponse, headers: any } | null>;
    public getPlayers(): Promise<RestPlayer[] | null>;
    public updatePlayer(options: playerUpdateOptions): Promise<RestPlayer | null>;
    public destroyPlayer(guildId: string): Promise<null>;
    public getTracks(identifier: string): Promise<nodeResponse | null>;
    public decodeTrack(track: string): Promise<RestTrack | null>;
    public decodeTracks(tracks: string[]): Promise<RestTrack[] | null>;
    public getStats(): Promise<Prettify<Omit<Node["stats"], "frameStats"> & { frameStats: null }> | null>;
    public getInfo(): Promise<NodeInfo | null>;
    public getRoutePlannerStatus(): Promise<RestResponse | null>;
    public getRoutePlannerAddress(address: string): Promise<RestResponse | null>;
    public parseResponse(req: any): Promise<RestResponse | string | ReadableStream | null>;
}

export declare class Queue extends Array<Track> {
    get size(): number;
    get first(): Track | null;

    add(track: Track): this;
    remove(index: number): Track;
    clear(): this;
    shuffle(): this;
    move(from: number, to: number): this;
}

export declare class Plugin {
    constructor(name: string);
    public name: string;

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
    public textChannel: string | undefined;
    public voiceChannel: string | null | undefined;
    public connection: Connection | null;
    public deaf: boolean;
    public mute: boolean;
    public volume: number;
    public loop: LoopOption;
    public filters: Filters;
    public data: {};
    public queue: Queue;
    public position: number;
    public current: Track | null;
    public previousTracks: Track[];
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
    
    /**
     * NodeLink Only.
     * 
     * Sends the next track in the queue to the player.
     * Informs the node about the next track to preload for gapless transitions (between tracks)
     * 
     * @throws {Error} If the player is not playing
     * @throws {Error} If the track is not provided for sending next track
     */
    public sendNextTrack(track: { encoded: string }): Promise<Player>;
    
    /**
     * NodeLink Only
     * Smooth volume transitions for track changes, seeking, and pausing.
     * NodeLink supports high-fidelity volume fading to prevent jarring audio clips.
     * @param {boolean} enabled
     * @param {object} fading accepts a fading object containing settings for different scenarios (or types) such as `trackStart`, `trackEnd`, `trackStop`, `seek`, and `ducking`, each with a duration (in milliseconds) and curve (Mathematical curve for the fade (linear, exponential, logarithmic, s-curve)) properties.
     */
     public setFadings(enabled?: boolean, fading?: {
         trackStart?: { duration: number; curve: string };
         trackEnd?: { duration: number; curve: string };
         trackStop?: { duration: number; curve: string };
         seek?: { duration: number; curve: string };
         ducking?: { duration: number; curve: string };
    }): Promise<void>;
  
    public autoplay(player: Player): Promise<Player>;

    public connect(options?: {
        guildId: string;
        voiceChannel: string;
        deaf?: boolean;
        mute?: boolean;
    }): void;

    public stop(): Player;
    public pause(toggle?: boolean): Promise<Player>;
    public seek(position: number): void;
    public setVolume(volume: number): Player;
    public setLoop(mode: LoopOption): Player;
    public setTextChannel(channel: string): Player;
    public setVoiceChannel(channel: string, options?: {
        mute?: boolean;
        deaf?: boolean;
    }): Player;

    public disconnect(): Player | void;
    public destroy(): void;
    private handleEvent(payload: NodePlayerEvent): void;
    private trackStart(player: Player, track: Track, payload: PlayerTrackStartEventPayload): void;
    private trackEnd(player: Player, track: Track, payload: PlayerTrackEndEventPayload<this["node"]["restVersion"]>): void;
    private trackError(player: Player, track: Track, payload: PlayerTrackErrorEventPayload): void;
    private trackStuck(player: Player, track: Track, payload: PlayerTrackStuckEventPayload): void;
    private socketClosed(player: Player, payload: PlayerSocketClosedEventPayload): void;
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

export type SearchPlatform = "ytsearch" | "ytmsearch" | "scsearch" | "spsearch" | "amsearch" | "dzsearch" | "ymsearch" | (string & {});
export type NodelinkSearchPlatform = "admsearch" | "amsearch" | "audiomack" | "bcsearch" | "bilibili"
                                    | "dzsearch" | "flowery" | "ftts" | "gaanasearch" | "gtts" | "jssearch" 
                                    | "lfsearch" | "mcsearch" | "ncsearch" | "nicovideo" | "pdsearch" | "shsearch"
                                    | "speak" | "spsearch" | "szsearch" | "tdsearch" | "vksearch";
export type SearchType = "track" | "album" | "playlist" | "artist" | (string & {});
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
     * @param param1.code The WebSocket close code sent by Lavalink (if any).
     * @param param1.reason The WebSocket close reason sent by Lavalink (if any).
     */
    "nodeDisconnect": (node: Node, { code, reason }: { code: number; reason: string }) => void;

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
    "socketClosed": (player: Player, payload: PlayerSocketClosedEventPayload) => void;

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
    "trackStart": (player: Player, track: Track, payload: PlayerTrackStartEventPayload) => void;

    /**
     * Emitted when a track ends (Queue End is emitted when the queue ends i.e when the last track ends Instead of this.)
     * @param player The player that ended the track.
     * @param track The track that ended.
     * @param payload The payload of the track end.
     * 
     * @see https://lavalink.dev/api/websocket.html#trackendevent
     */
    "trackEnd": <TPlayer extends Player>(player: TPlayer, track: Track, payload: PlayerTrackEndEventPayload<TPlayer["node"]["restVersion"]>) => void;

    /**
     * Emitted when a track encounters an error (Sent by Lavalink via [TrackExceptionEvent](https://lavalink.dev/api/websocket.html#trackexceptionevent))
     * @param player The player that encountered the error.
     * @param track The track that encountered the error.
     * @param payload The payload of the track error.
     */
    "trackError": (player: Player, track: Track, payload: PlayerTrackErrorEventPayload) => void;

    /**
     * Emitted when a track gets stuck (Sent by Lavalink via [TrackStuckEvent](https://lavalink.dev/api/websocket.html#trackstuckevent))
     * @param player The player that got stuck.
     * @param track The track that got stuck.
     * @param payload The payload of the track stuck.
     * 
     * @see https://lavalink.dev/api/websocket.html#trackstuckevent
     */
    "trackStuck": (player: Player, track: Track, payload: PlayerTrackStuckEventPayload) => void;

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
     * Emitted when a player is Destroyed
     * @param player The player that was Destroyed.
     */
    "playerDestroy": (player: Player) => void;

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
    "playerUpdate": (player: Player, payload: NodePlayerUpdatePayload) => void;

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

    /**
     * NodeLink Only.
     * Emitted when lyrics are found for a track.
     * @param player The player that found the lyrics.
     * @param lyrics The lyrics that were found.
     * @param payload The payload of the lyrics found event.
     */
    "lyricsFound": (player: Player, lyrics: PlayerLyricsFoundEventPayload["lyrics"], payload: PlayerLyricsFoundEventPayload) => void;

    /**
     * NodeLink Only.
     * Emitted when lyrics are not found for a track.
     * @param player The player that did not find the lyrics.
     * @param payload The payload of the lyrics not found event.
     */
    "lyricsNotFound": (player: Player, payload: BaseNodePlayerEvent<"lyricsNotFoundEvent", {}>) => void;

    /**
     * NodeLink Only.
     * Emitted when a line of lyrics is found for a track.
     * @param player The player that found the lyrics line.
     * @param payload The payload of the lyrics line event.
     */
    "lyricsLine": (player: Player, payload: PlayerLyricLineEventPayload) => void;

    /**
     * NodeLink Only.
     * Emitted when SponsorBlock segments are loaded.
     */
    "sponsorBlockSegmentsLoaded": (player: Player, segments: SponsorBlockSegment[], payload: BaseNodePlayerEvent<"sponsorBlockSegmentsLoadedEvent", { segments: SponsorBlockSegment[] }>) => void;

    /**
     * NodeLink Only.
     * Emitted when a SponsorBlock segment is skipped.
     */
    "sponsorBlockSegmentSkipped": (player: Player, segment: SponsorBlockSegment, payload: BaseNodePlayerEvent<"sponsorBlockSegmentSkippedEvent", { segment: SponsorBlockSegment }>) => void;

    /**
     * NodeLink Only.
     * @param player 
     * @param payload 
     */
    "mixStarted": (player: Player, payload: BaseNodePlayerEvent<"mixStartedEvent", any>) => void;

    /**
     * NodeLink Only.
     * @param player 
     * @param payload 
     */
    "mixEnded": (player: Player, payload: BaseNodePlayerEvent<"mixEndedEvent", any>) => void;

    // Misc Events
    "apiResponse": (endpoint: string, response: any) => void;
    "debug": (...message: string[]) => void;
    "raw": (type: string, payload: any) => void;
    "nodeLinkEvent": (event: string, payload: any) => void;
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

    public init(clientId: string): this | void;

    public createNode(options: LavalinkNode): Node;

    public destroyNode(identifier: string): void;

    public updateVoiceState(packet: any): Promise<void>;

    public fetchRegion(region: string): Array<Node>;

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
    public destroyPlayer(guildId: string): void;

    /**
    * Migrates a player or a node to a new node.
    * @param {import("./Player").Player | import("./Node").Node} target The player or node to migrate.
    * @param {import("./Node").Node} [destinationNode] The node to migrate to.
    */
    public migrate(target: Node | Player, destinationNode?: Node | null): Promise<Player | Player[] | undefined>
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
        source?: SearchPlatform;
        requester: any;
        node?: string | Node;
        searchType?: SearchType;
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

type BaseNodeInfo = {
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

export type NodeInfo = BaseNodeInfo & (
    | {
        /**
         * Whether the Node is hosted with Nodelink Server
         */
        isNodelink: true;

        /**
         * Node name (Used by Nodelink)
         */
        node: string;

        /**
         * Voice info (Used by Nodelink)
         */
        voice: {
            name: string;
            version: string;
        };
    }
    | {
        isNodelink?: false;
        node?: never;
        voice?: never;
    }
);

export type NodeInfoSemanticVersionObj = {
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

export type SponsorBlockSegment = {
    uuid: string;
    start: number;
    end: number;
    category: string;
    actionType: string;
    votes: number;
    locked: boolean;
    videoDuration: number;
    description: string;
};

export type SponsorBlockUpdateOptions = {
    enabled: boolean;
    categories: string[];
    actionTypes?: string[];
    skipMarginMs?: number;
};

export type SponsorBlockState = {
    enabled?: boolean;
    categories?: string[];
    actionTypes?: string[];
    skipMarginMs?: number;
    segments?: SponsorBlockSegment[];
    [key: string]: any;
};

export type NodePayloadOp = "ready" | "playerUpdate" | "event" | "stats";

export type BaseNodePayload<TOp extends NodePayloadOp, TData> = Prettify<{
    op: TOp;
} & TData>;

export type NodeReadyPayload = BaseNodePayload<"ready", {
    sessionId: string;
    resumed: boolean;
}>;

export type NodePlayerUpdatePayload = BaseNodePayload<"playerUpdate", {
    guildId: string;
    state: {
        time: number;
        position: number;
        connected: boolean;
        ping: number;
    }
}>;

export type NodeStatsPayload = BaseNodePayload<"stats", Node["stats"]>;

export type BaseNodePlayerEvent<TEvent extends (string), TEData> = BaseNodePayload<"event", {
    guildId: string;
    event: TEvent;
} & TEData>;

export type PlayerTrackStartEventPayload = BaseNodePlayerEvent<"TrackStartEvent", {
    track: RestTrack;
}>;

export type PlayerTrackEndEventPayload<TVer extends Version> = BaseNodePlayerEvent<"TrackEndEvent", {
    track: RestTrack;
    reason: TVer extends "v4" 
            ? "stopped" | "finished" | "loadFailed" | "replaced" | "cleanup" 
            : "STOPPED" | "FINISHED" | "LOAD_FAILED" | "REPLACED" | "CLEANUP";
}>;

export type PlayerTrackErrorEventPayload = BaseNodePlayerEvent<"TrackExceptionEvent", {
    track: RestTrack;
    error: LavalinkTrackLoadException;
}>;

export type PlayerTrackStuckEventPayload = BaseNodePlayerEvent<"TrackStuckEvent", {
    track: RestTrack;
    thresholdMs: number;
    /**
     * The reason why the track got stuck, if provided by Nodelink (Lavalink does not provide this).
     */
    reason?: string;
}>;

export type PlayerSocketClosedEventPayload = BaseNodePlayerEvent<"WebSocketClosedEvent", {
    code: number;
    reason: string;
    byRemote: boolean;
}>;

export type NodeEventPayload = NodeReadyPayload | NodePlayerUpdatePayload | NodeStatsPayload | PlayerTrackStartEventPayload | PlayerTrackEndEventPayload<Version> | PlayerTrackErrorEventPayload | PlayerTrackStuckEventPayload | PlayerSocketClosedEventPayload;

type PlayerLyricLineEventPayload = BaseNodePlayerEvent<"lyricsLineEvent", {
    line: {
        text: string;
        timestamp: number;
        duration: number;
        words: Array<Record<string, unknown>>;
        plugin: object;
    };
    lineIndex: number;
    skipped: boolean;
}>;

type PlayerLyricsFoundEventPayload = BaseNodePlayerEvent<"lyricsFoundEvent", {
    lyrics: {
        sourceName: string;
        provider: string;
        text: string,
        lines: Array<PlayerLyricLineEventPayload["line"]>,
        plugin: object;
    };
}>;

type NodePlayerEventMap = {
    "TrackStartEvent": PlayerTrackStartEventPayload;
    "TrackEndEvent": PlayerTrackEndEventPayload<Version>;
    "TrackExceptionEvent": PlayerTrackErrorEventPayload;
    "TrackStuckEvent": PlayerTrackStuckEventPayload;
    "WebSocketClosedEvent": PlayerSocketClosedEventPayload;
    "lyricsLineEvent": PlayerLyricLineEventPayload;
    "lyricsFoundEvent": PlayerLyricsFoundEventPayload;
    [key: string]: BaseNodePlayerEvent<string, any>;
}

export type NodePlayerEvent = PlayerTrackStartEventPayload | PlayerTrackEndEventPayload<Version> | PlayerTrackErrorEventPayload | PlayerTrackStuckEventPayload | PlayerSocketClosedEventPayload | PlayerLyricLineEventPayload | PlayerLyricsFoundEventPayload | BaseNodePlayerEvent<string, any>;

export declare class Node {
    constructor(riffy: Riffy, node: LavalinkNode, options: NodeOptions);
    public riffy: Riffy;
    public readonly options: RiffyOptions;

    public name: LavalinkNode["name"];
    public host: LavalinkNode["host"];
    public port: LavalinkNode["port"];
    public password: LavalinkNode["password"];
    public secure: LavalinkNode["secure"];

    public restVersion: NodeOptions["restVersion"];
    public rest: Rest;
    public wsUrl: string;
    public restUrl: string;
    private ws: WebSocket | null;

    public resumeKey: NodeOptions["resumeKey"];
    public sessionId: NodeOptions["sessionId"];
    /**
     * Voice Regions Setup for the Node
     * Helpful for region-based Node filtering.
     * i.e If Voice Channel Region is `eu_west` Filter's Nodes specifically to `eu_west` 
     */
    public regions: string[] | undefined;
    public resumeTimeout: NodeOptions["resumeTimeout"];
    public autoResume: NodeOptions["autoResume"];
    public reconnectTimeout: NodeOptions["reconnectTimeout"];
    public reconnectTries: NodeOptions["reconnectTries"];

    public reconnectAttempt: NodeJS.Timeout | null;
    public reconnectAttempted: number;

    public connected: boolean;
    /**
    * Lavalink Info fetched While/After connecting.
    */
    public info: NodeInfo | null;
    public stats: {
        players: number,
        playingPlayers: number,
        uptime: number,
        memory: {
            free: number,
            used: number,
            allocated: number,
            reservable: number,
        },
        cpu: {
            cores: number,
            systemLoad: number,
            lavalinkLoad: number,
        },
        frameStats: {
            sent: number,
            nulled: number,
            deficit: number,
        },

        /**
         * Nodelink specific stats
         */
        detailedStats: {
            api: {
                requests: Record<string, number>
                errors: object
            },
            sources: Record<string, number>,
            playback: {
                events: {
                    TrackStartEvent: number,
                    TrackEndEvent: number,
                } & Record<string, number>
            }
        } | null,

        /**
         * Nodelink specific stats
         */
        eventLoopLagP50: number;
        /**
         * Nodelink specific stats
         */
        eventLoopLagP95: number;
        /**
         * Nodelink specific stats
         */
        eventLoopLagP99: number;
        /**
         * Nodelink specific stats
         */
        stuckRecoveries: number;
    };
    public lastStats: number

    /**
     * fetches Lavalink Info
     * returns null if some error occurred.
     * @see https://lavalink.dev/api/rest.html#info
     */
    fetchInfo(options?: { restVersion?: Version; includeHeaders?: boolean }): Promise<NodeInfo | { data: NodeInfo | null; headers: any } | null>;

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
        checkAvailable: (eitherOne?: boolean, ...plugins: string[]) => Promise<boolean>;
        /**
         * Fetches lyrics for a given track or encoded track string.
         * 
         * @param {Track|string} trackOrEncodedTrackStr - The track object or encoded track string.
         * @param {boolean} [skipTrackSource=false] - Whether to skip the track source and fetch from the highest priority source (configured on Lavalink Server).
         * @returns {Promise<Object|null>} The lyrics data or null if the plugin is unavailable Or If no lyrics were found OR some Http request error occured.
         * @throws {TypeError} If `trackOrEncodedTrackStr` is not a `Track` or `string`.
         */
        get: (trackOrEncodedTrackStr: Track | string, skipTrackSource?: boolean) => Promise<NodeLyricsResult | null>;

        /** @description fetches Lyrics for Currently playing Track 
         * @param {string} guildId The Guild Id of the Player
         * @param {boolean} [skipTrackSource=false] skips the Track Source & fetches from highest priority source (configured on Lavalink Server) 
         * @param {string} [plugin] The Plugin to use(**Only required if you have too many known (i.e java-lyrics-plugin, lavalyrics-plugin) Lyric Plugins**)
         */
        getCurrentTrack: <TPlugin extends LyricPluginWithoutLavaLyrics | (string & {}) >(guildId: string, skipTrackSource?: boolean, plugin?: TPlugin) => Promise<TPlugin extends LyricPluginWithoutLavaLyrics ? LyricPluginWithoutLavaLyricsResult : NodeLyricsResult | null>;
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

    /**
     * [Nodelink-Only](https://nodelink.js.org)
     * SponsorBlock API.
     */
    sponsorBlock: {
        /**
         * @internal
         * Validates the provided segment object, throws an error if it's invalid (all fields are required).
         * @param {SponsorBlockSegment} segment
         */
        _validateSponsorBlockSegment: (segment: SponsorBlockSegment) => void;
        /**
         * Returns `true` if this node is hosted with a NodeLink Server.
         */
        check: () => boolean;
        /**
         * Returns the current SponsorBlock state for a player.
         * @param {string} guildId
         * @throws {Error} If the node is not a NodeLink Server.
         * @throws {TypeError} If `guildId` is not a string.
         */
        getCurrentBlock: (guildId: string) => Promise<SponsorBlockState | null>;
        /**
         * Updates SponsorBlock settings for a player. Only the provided options are changed.
         * @link https://nodelink.js.org/docs/api/rest#updatesponsorblock
         * @param {string} guildId
         * @param {SponsorBlockUpdateOptions} options
         * @throws {Error} If the node is not a NodeLink Server.
         * @throws {TypeError} If the provided options are of invalid types or values.
         */
        updateSettings: (guildId: string, options: SponsorBlockUpdateOptions) => Promise<object>;
        /**
         * Overrides the segments array for a player with a custom set of segments.
         * @link https://nodelink.js.org/docs/api/rest#setsponsorblocksegments
         * @param {string} guildId
         * @param {SponsorBlockSegment[]} segments
         * @throws {Error} If the node is not a NodeLink Server.
         * @throws {TypeError} If `guildId` is not a string or `segments` is not an array.
         */
        setBlockSegments: (guildId: string, segments: SponsorBlockSegment[]) => Promise<object>;
        /**
         * Clears all SponsorBlock state for a player (segments, last skipped UUID, and resets to defaults).
         * @link https://nodelink.js.org/docs/api/rest#clearsponsorblock
         * @param {string} guildId
         * @throws {Error} If the node is not a NodeLink Server.
         * @throws {TypeError} If `guildId` is not a string.
         */
        clearSponsorBlock: (guildId: string) => Promise<object>;
    };

    /**
     * [Nodelink-Only](https://nodelink.js.org) & works when `enableTrackStreamEndpoint` config option is enabled on the Nodelink Server.
     * 
     * @description Retrives the Source's Audio Stream URL & formats for the provided encoded track string and itag.
     * 
     * **Note:** This method is only for fetching the audio source URL for a track, it doesn't actually fetch or return the audio stream itself, you can use the returned URL to directly stream the audio from the source.
     * @param {string} encodedTrackStr The Encoded Track String of the track to fetch the stream for.
     * @param {number} itag The itag of the source to fetch
     * @returns {Promise<string>} The Audio Source URL for the provided track and (optionally) itag.
     * @throws {Error} If the node is not a Nodelink Server.
     * @see https://nodelink.js.org/docs/api/nodelink-features#direct-streaming
     */
    fetchTrackStream(encodedTrackStr: string, itag?: number | null): Promise<string>;
    /**
     * [Nodelink-Only](https://nodelink.js.org) & works when `enableLoadStreamEndpoint` config option is enabled on the Nodelink Server.
     * 
     * Stream raw PCM audio for custom processing or recording.
     * 
     * @param {string} encodedTrackStr 
     * @param {number|null} volume 
     * @param {number|null} position 
     * @param {string|object|null} filters 
     * @returns {Promise<ReadableStream>} Readable Stream of raw PCM audio data for the provided track, volume, position, and filters.
     * @throws {Error} If the node is not a Nodelink Server.
     * @throws {TypeError} If the provided parameters are of invalid types or values.
     * @see https://nodelink.js.org/docs/api/nodelink-features#pcm-streaming
     */
    fetchPCMStream(encodedTrackStr: string, volume?: number | null, position?: number | null, filters?: string | object | null): Promise<ReadableStream | null>;

    /**
     * [Nodelink-Only](https://nodelink.js.org)
     *
     * Retrieves chapter markers from YouTube videos.
     * @link https://nodelink.js.org/docs/api/nodelink-features#chapters-api
     * @param {string} encodedTrackStr The encoded track string of the YouTube video.
     * @returns {Promise<object>} The chapter markers for the provided track.
     * @throws {Error} If the node is not a NodeLink Server.
     * @throws {TypeError} If `encodedTrackStr` is not a string.
     */
    loadChapters(encodedTrackStr: string): Promise<object>;

    public connect(): Promise<void>;
    public open(): Promise<void>;
    public error(event: any): void;
    public message(msg: any): void;
    public close(event: any, reason: string): Promise<void>;
    public reconnect(): void;
    public disconnect(): void;
    public destroy(clean?: boolean): void;
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
     * 0.0 to 5.0, where 1.0 is 100%. Values >1.0 may cause clipping
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
     * NodeLink only: delay-based repetitions with feedback control.
     */
    echo?: {
        delay: number;
        feedback: number;
        mix: number;
    } | null;
    /**
     * NodeLink only: simulates multiple voices with modulated delays.
     */
    chorus?: {
        rate: number;
        depth: number;
        delay: number;
        mix: number;
        feedback: number;
    } | null;
    /**
     * NodeLink only: dynamic range compression.
     */
    compressor?: {
        threshold: number;
        ratio: number;
        attack: number;
        release: number;
        gain: number;
    } | null;
    /**
     * NodeLink only: attenuates low frequencies.
     */
    highpass?: {
        smoothing: number;
    } | null;
    /**
     * NodeLink only: all-pass filter sweep effect.
     */
    phaser?: {
        stages: number;
        rate: number;
        depth: number;
        feedback: number;
        mix: number;
        minFrequency: number;
        maxFrequency: number;
    } | null;
    /**
     * NodeLink only: cross-channel spatial effect.
     */
    spatial?: {
        depth: number;
        rate: number;
    } | null;
    /**
     * The BassBoost of the player
     */
    bassboost?: number | null;
    /**
     * The Slowmode of the player
     */
    slowmode?: boolean | null;
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
    /** NodeLink Only. Delay-based repetitions with feedback control. */
    public echo: FilterOptions["echo"];
    /** NodeLink Only. Simulates multiple voices with modulated delays. */
    public chorus: FilterOptions["chorus"];
    /** NodeLink Only. Dynamic range compression for balanced audio. */
    public compressor: FilterOptions["compressor"];
    /** NodeLink Only. Attenuates low frequencies. */
    public highpass: FilterOptions["highpass"];
    /** NodeLink Only. Sweeps all-pass filters across the frequency spectrum. */
    public phaser: FilterOptions["phaser"];
    /** NodeLink Only. Creates spatial audio using cross-channel delays. */
    public spatial: FilterOptions["spatial"];
    public bassboost: FilterOptions["bassboost"];
    public slowmode: FilterOptions["slowmode"];
    public nightcore: FilterOptions["nightcore"];
    public vaporwave: FilterOptions["vaporwave"];
    public _8d: FilterOptions["_8d"];

    public setEqualizer(band: Array<{ band: number; gain: number }>): this;

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

    /**
     * NodeLink Only.
     * Delay-based repetitions with feedback control.
     * @param {boolean} enabled
     * @param {object} [options]
     * @param {number} [options.delay] Delay time in milliseconds (0–5000). Default: 500
     * @param {number} [options.feedback] Amount of signal fed back (0.0–1.0). Default: 0.3
     * @param {number} [options.mix] Dry/wet mix ratio (0.0–1.0). Default: 0.5
     */
    public setEcho(enabled: boolean, options?: {
        delay: number;
        feedback: number;
        mix: number;
    }): this;

    /**
     * NodeLink Only.
     * Simulates multiple voices with modulated delays.
     * @param {boolean} enabled
     * @param {object} [options]
     * @param {number} [options.rate] LFO modulation rate in Hz. Default: 1.5
     * @param {number} [options.depth] Modulation depth (0.0–1.0). Default: 0.5
     * @param {number} [options.delay] Base delay time in milliseconds (1–45ms). Default: 25
     * @param {number} [options.mix] Dry/wet mix ratio (0.0–1.0). Default: 0.6
     * @param {number} [options.feedback] Feedback amount (0.0–0.95). Default: 0.2
     */
    public setChorus(enabled: boolean, options?: {
        rate: number;
        depth: number;
        delay: number;
        mix: number;
        feedback: number;
    }): this;

    /**
     * NodeLink Only.
     * Dynamic range compression for balanced audio.
     * @param {boolean} enabled
     * @param {object} [options]
     * @param {number} [options.threshold] Threshold level in dB. Default: -20
     * @param {number} [options.ratio] Compression ratio (1.0 = no compression). Default: 4
     * @param {number} [options.attack] Attack time in milliseconds. Default: 10
     * @param {number} [options.release] Release time in milliseconds. Default: 100
     * @param {number} [options.gain] Makeup gain in dB. Default: 5
     */
    public setCompressor(enabled: boolean, options?: {
        threshold: number;
        ratio: number;
        attack: number;
        release: number;
        gain: number;
    }): this;

    /**
     * NodeLink Only.
     * Attenuates low frequencies.
     * @param {boolean} enabled
     * @param {object} [options]
     * @param {number} [options.smoothing] Smoothing factor (>1.0 to enable). Default: 20
     */
    public setHighpass(enabled: boolean, options?: {
        smoothing: number;
    }): this;

    /**
     * NodeLink Only.
     * Sweeps all-pass filters across the frequency spectrum.
     * @param {boolean} enabled
     * @param {object} [options]
     * @param {number} [options.stages] Filter stages (2–12). Default: 6
     * @param {number} [options.rate] LFO rate in Hz. Default: 0.5
     * @param {number} [options.depth] Modulation depth (0.0–1.0). Default: 0.7
     * @param {number} [options.feedback] Feedback amount (0.0–0.9). Default: 0.5
     * @param {number} [options.mix] Dry/wet mix (0.0–1.0). Default: 0.5
     * @param {number} [options.minFrequency] Minimum sweep frequency in Hz. Default: 200
     * @param {number} [options.maxFrequency] Maximum sweep frequency in Hz. Default: 2000
     */
    public setPhaser(enabled: boolean, options?: {
        stages: number;
        rate: number;
        depth: number;
        feedback: number;
        mix: number;
        minFrequency: number;
        maxFrequency: number;
    }): this;

    /**
     * NodeLink Only.
     * Creates spatial audio using cross-channel delays.
     * @param {boolean} enabled
     * @param {object} [options]
     * @param {number} [options.depth] Effect depth (0.0–1.0). Default: 0.8
     * @param {number} [options.rate] Modulation rate in Hz. Default: 0.3
     */
    public setSpatial(enabled: boolean, options?: {
        depth: number;
        rate: number;
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

    public clearFilters(): Promise<this>;

    public updateFilters(): Promise<this>;
}

export type Voice = {
    /**
     * The voice session id
     */
    sessionId: string | null,
    /**
     * The voice event
     */
    event: null,
    /**
     * The voice endpoint
     */
    endpoint: string | null,
    token?: string | null
}

export declare class Connection {
    constructor(player: Player);
    public player: Player;
    public sessionId: string | null;
    public voice: Voice;
    public region: string | null;
    public self_deaf: boolean;
    public self_mute: boolean;
    public voiceChannel: string | null;

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
    private pendingUpdate: Promise<any> | null;
    /**
     * @default false
     * @since 1.0.9
     */
    public establishing: boolean;

    /**
     * Checks if we have all necessary voice credentials.
     */
    get isReady(): boolean;

    private _credentialsChanged(): boolean;

    /**
    * Waits for the connection to be ready and for any active voice updates to the Node to complete.
    * Optimization: Returns immediately if ready and idle to save resources.
    */
    public resolve(): Promise<any>;

    /**
    * Checks if ready, performs the update, and manages the resolution flow.
    */
    private checkAndSend(): Promise<void>;

    public setServerUpdate(data: { endpoint: string; token: string }): Promise<void>;

    public setStateUpdate(data: {
        session_id: string;
        channel_id: string;
        self_deaf: boolean;
        self_mute: boolean;
    }): void;

    private updatePlayerVoiceData(voiceData: any): Promise<RestResponse | null>;
}
