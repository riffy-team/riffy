import { EventEmitter } from "events";
import { Collection } from "@discordjs/collection";

export declare class Track {
    constructor(data: any, requester: any, node: Node);

    public track: String;
    public info: {
        identifier: String;
        seekable: Boolean;
        author: String;
        length: Number;
        stream: Boolean;
        sourceName: String;
        title: String;
        uri: String;
        thumbnail: String | null;
        requester: any;
    };

    public resolve(riffy: Riffy): Promise<Track>;
}

export interface RestOptions {
    secure: Boolean;
    host: String;
    port: Number;
    sessionId: String;
    password: String;
    restVersion: String;
}

interface RequestOptions {
    guildId: String;
    data: any;
}

interface RestResponse {

}

export declare class Rest extends EventEmitter {
    constructor(riffy: Riffy, options: RestOptions);
    public riffy: Riffy;
    public url: String
    public sessionId: RestOptions["sessionId"];
    public password: RestOptions["password"];
    public version: RestOptions["restVersion"];
    public calls: Number;

    public setSessionId(sessionId: String): void;
    public makeRequest(method: String, endpoint: String, body?: any): Promise<RestResponse | null>;
    public getPlayers(): Promise<RestResponse | null>;
    public updatePlayer(options: RequestOptions): Promise<void>;
    public destroyPlayer(guildId: String): Promise<RestResponse | null>;
    public getTracks(identifier: String): Promise<void>;
    public decodeTrack(track: String, node?: any): Promise<void>;
    public decodeTracks(tracks: any[]): Promise<void>;
    public getStats(): Promise<void>;
    public getInfo(): Promise<void>;
    public getRoutePlannerStatus(): Promise<void>;
    public getRoutePlannerAddress(address: String): Promise<void>;
    public parseResponse(req: any): Promise<RestResponse | null>;
}

export declare class Queue<T> extends Array<T>{
    get size(): Number;
    get first(): T | null;

    add(track: T): this;
    remove(index: Number): T;
    clear(): void;
    shuffle(): void;
}

export declare class Plugin {
    constructor(name: String);

    load(riffy: Riffy): void;
    unload(riffy: Riffy): void;
}

export interface PlayerOptions {
    guildId: String;
    textChannel?: String;
    voiceChannel?: String;
    deaf?: Boolean;
    mute?: Boolean;
    volume?: Number;
    loop?: String;
}

export type LoopOption = "none" | "track" | "queue";

export declare class Player extends EventEmitter {
    constructor(riffy: Riffy, node: Node, options: PlayerOptions);
    public riffy: Riffy;
    public node: Node;
    public options: PlayerOptions;
    public guildId: String;
    public textChannel: String;
    public voiceChannel: String;
    public connection: Connection;
    public deaf: Boolean;
    public mute: Boolean;
    public volume: Number;
    public loop: String;
    public filters: Filters;
    public data: {};
    public queue: Queue<Track>;
    public position: Number;
    public current: Track;
    public previous: Track | null;
    public playing: Boolean;
    public paused: Boolean;
    public connected: Boolean;
    public timestamp: Number;
    public ping: Number;
    public isAutoplay: Boolean;

    public play(): Promise<Player>;

    public autoplay(player: Player): Promise<Player>;

    public connect(options?: {
        guildId: String;
        voiceChannel: String;
        deaf?: Boolean;
        mute?: Boolean;
    }): void;

    public stop(): Player;
    public pause(toggle?: Boolean): Player;
    public seek(position: Number): void;
    public setVolume(volume: Number): Player;
    public setLoop(mode: LoopOption): Player;
    public setTextChannel(channel: String): Player;
    public setVoiceChannel(channel: String, options?: {
        mute?: Boolean;
        deaf?: Boolean;
    }): Player;

    public disconnect(): Player;
    public destroy(): void;
    private handleEvent(payload: any): void;
    private trackStart(player: Player, track: Track, payload: any): void;
    private trackEnd(player: Player, track: Track, payload: any): void;
    private trackError(player: Player, track: Track, payload: any): void;
    private trackStuck(player: Player, track: Track, payload: any): void;
    private socketClosed(player: Player, payload: any): void;
    private set(key: String, value: any): void;
    private get(key: String): any;
    private send(data: any): void;
}

export type SearchPlatform = "ytsearch" | "ytmsearch" | "scsearch" | "spsearch" | "amsearch" | "dzsearch" | "ymsearch";
export type Version = "v3" | "v4";
export type nodeResponse = {
    /**
     * Array of Loaded Tracks
     */
    tracks: Array<Track>;
    /**
     * Load Type - "TRACK_LOADED", "PLAYLIST_LOADED", "SEARCH_RESULT", "NO_MATCHES", "LOAD_FAILED" for v3 and "track", "playlist", "search", "error" for v4
     */
    loadType: String
    /**
     * Playlist Info
     */
    playlistInfo?: {
        name: String;
        selectedTrack: Number;
    };
    /**
     * Plugin Info
     */
    pluginInfo?: any;
}

export type RiffyOptions = {
    send: (payload: {
        op: Number;
        d: {
            guild_id: String;
            channel_id: String;
            self_deaf: Boolean;
            self_mute: Boolean;
        }
    }) => void;
    defaultSearchPlatform?: SearchPlatform;
    restVersion?: Version;
    plugins?: Array<Plugin>;
}

type k = String;
type v = any;

export declare class Riffy extends EventEmitter {
    constructor(client: any, nodes: {
        name?: String;
        host: String;
        port: Number;
        password: String;
        secure: Boolean;
    }, options: RiffyOptions);
    public client: any;
    public nodes: Array<LavalinkNode>;
    public nodeMap: Collection<k, Node>;
    public players: Collection<k, Player>;
    public options: RiffyOptions;
    public clientId: String;
    public initiated: Boolean;
    public send: RiffyOptions["send"];
    public defaultSearchPlatform: String;
    public restVersion: NodeOptions["restVersion"];

    public readonly leastUsedNodes: Array<LavalinkNode>;

    public init(clientId: String): this;

    public createNode(options: any): Node;

    public destroyNode(identifier: String): void;

    public updateVoiceState(packet: any): void;

    public fetchRegion(region: String): Array<LavalinkNode>;

    public createConnection(options: {
        guildId: String;
        voiceChannel: String;
        textChannel: String;
        deaf?: Boolean;
    }): Player;

    public createPlayer(node: Node, options: PlayerOptions): Player;

    public removeConnection(guildId: String): void;

    public resolve(params: {
        query: String;
        source?: String;
        requester: any;
    }): Promise<nodeResponse>;


    public get(guildId: String): Player;

    public on(event: "nodeConnect", listener: (node: Node) => void): this;
    public on(event: "nodeReconnect", listener: (node: Node) => void): this;
    public on(event: "nodeDisconnect", listener: (node: Node, reason: String) => void): this;
    public on(event: "nodeCreate", listener: (node: Node) => void): this;
    public on(event: "nodeDestroy", listener: (node: Node) => void): this;
    public on(event: "nodeError", listener: (node: Node, error: Error) => void): this;

    public on(event: "trackStart", listener: (player: Player, track: Track, payload: any) => void): this;
    public on(event: "trackEnd", listener: (player: Player, track: Track, payload: any) => void): this;
    public on(event: "trackError", listener: (player: Player, track: Track, payload: any) => void): this;
    public on(event: "trackStuck", listener: (player: Player, track: Track, payload: any) => void): this;

    public on(event: "socketClosed", listener: (player: Player, payload: any) => void): this;

    public on(event: "playerCreate", listener: (player: Player) => void): this;
    public on(event: "playerDisconnect", listener: (player: Player) => void): this;
    public on(event: "playerMove", listener: (player: Player, oldChannel: String, newChannel: String) => void): this;
    public on(event: "playerUpdate", listener: (player: Player, payload: any) => void): this;

    public on(event: "queueEnd", listener: (player: Player) => void): this;
    public on(event: "debug", listener: (message: String) => void): this;
}

export type LavalinkNode = {
    /**
     * The name of the node
     */
    name?: String;
    /**
     * The IP of the node
     */
    host: String;
    /**
     * The port of the node
     */
    port: Number;
    /**
     * The password of the node
     */
    password: String;
    /**
     * Is node connection secured by SSL ?
     */
    secure: Boolean;
}

export type NodeOptions = {
    /**
     * The rest version of the node
     */
    restVersion: "v3" | "v4";
    /**
     * The send function of the node
     */
    send: (payload: {
        op: Number;
        d: {
            guild_id: String;
            channel_id: String;
            self_deaf: Boolean;
            self_mute: Boolean;
        }
    }) => void;
    /**
     * The resume key of the node
     */
    resumeKey?: String;
    /**
     * The session id of the node
     */
    sessionId?: String;
    /**
     * The resume timeout of the node
     */
    resumeTimeout?: Number;
    /**
     * The auto resume of the node
     */
    autoResume?: Boolean;
    /**
     * The reconnect timeout of the node
     */
    reconnectTimeout?: Number;
    /**
     * The reconnect tries of the node
     */
    reconnectTries?: Number;
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
    public wsUrl: String;
    public restUrl: String;
    private ws: null;

    public send: NodeOptions["send"];
    public resumeKey: NodeOptions["resumeKey"];
    public sessionId: NodeOptions["sessionId"];
    public region: String | null;
    public resumeTimeout: NodeOptions["resumeTimeout"];
    public autoResume: NodeOptions["autoResume"];
    public reconnectTimeout: NodeOptions["reconnectTimeout"];
    public reconnectTries: NodeOptions["reconnectTries"];

    public reconnectAttempt: Number;
    public reconnectAttempted: Number;

    public connected: Boolean;
    public reconnecting: Boolean;
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
    public close(event: any, reason: String): void;
    public reconnect(): void;
    public disconnect(): void;
    readonly penalties: Number;
}

export type FilterOptions = {
    /**
     * The volume of the player
     */
    volume?: Number;
    /**
     * The equalizer of the player
     */
    equalizer?: Array<{ band: Number; gain: Number }>;
    /**
     * The karaoke of the player
     */
    karaoke?: {
        level: Number;
        monoLevel: Number;
        filterBand: Number;
        filterWidth: Number;
    } | null;
    /**
     * The timescale of the player
     */
    timescale?: {
        speed: Number;
        pitch: Number;
        rate: Number;
    } | null;
    /**
     * The tremolo of the player
     */
    tremolo?: {
        frequency: Number;
        depth: Number;
    } | null;
    /**
     * The vibrato of the player
     */
    vibrato?: {
        frequency: Number;
        depth: Number;
    } | null;
    /**
     * The rotation of the player
     */
    rotation?: {
        rotationHz: Number;
    } | null;
    /**
     * The distortion of the player
     */
    distortion?: {
        sinOffset: Number;
        sinScale: Number;
        cosOffset: Number;
        cosScale: Number;
        tanOffset: Number;
        tanScale: Number;
        offset: Number;
        scale: Number;
    } | null;
    /**
     * The channel mix of the player
     */
    channelMix?: {
        leftToLeft: Number;
        leftToRight: Number;
        rightToLeft: Number;
        rightToRight: Number;
    } | null;
    /**
     * The low pass of the player
     */
    lowPass?: {
        smoothing: Number;
    } | null;
    /**
     * The BassBoost of the player
     */
    bassboost?: Number | null;
    /**
     * The Slowmode of the player
     */
    slowmode?: Number | null;
    /**
     * The Nightcore of the player
     */
    nightcore?: Boolean | null;
    /**
     * The Vaporwave of the player
     */
    vaporwave?: Boolean | null;
    /**
     * The 8D of the player
     */
    _8d?: Boolean | null;
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

    public setEquilizer(band: Array<{ band: Number; gain: Number }>): this;

    public setKaraoke(enabled: Boolean, options?: {
        level: Number;
        monoLevel: Number;
        filterBand: Number;
        filterWidth: Number;
    }): this;

    public setTimescale(enabled: Boolean, options?: {
        speed: Number;
        pitch: Number;
        rate: Number;
    }): this;


    public setTremolo(enabled: Boolean, options?: {
        frequency: Number;
        depth: Number;
    }): this;

    public setVibrato(enabled: Boolean, options?: {
        frequency: Number;
        depth: Number;
    }): this;

    public setRotation(enabled: Boolean, options?: {
        rotationHz: Number;
    }): this;

    public setDistortion(enabled: Boolean, options?: {
        sinOffset: Number;
        sinScale: Number;
        cosOffset: Number;
        cosScale: Number;
        tanOffset: Number;
        tanScale: Number;
        offset: Number;
        scale: Number;
    }): this;

    public setChannelMix(enabled: Boolean, options?: {
        leftToLeft: Number;
        leftToRight: Number;
        rightToLeft: Number;
        rightToRight: Number;
    }): this;

    public setLowPass(enabled: Boolean, options?: {
        smoothing: Number;
    }): this;


    public setBassboost(enabled: Boolean, options?: {
        value: Number;
    }): this;

    public setSlowmode(enabled: Boolean, options?: {
        rate: Number;
    }): this;

    public setNightcore(enabled: Boolean, options?: {
        rate: Number;
    }): this;

    public setVaporwave(enabled: Boolean, options?: {
        pitch: Number;
    }): this;

    public set8D(enabled: Boolean, options?: {
        rotationHz: Number;
    }): this;

    public clearFilters(): this;

    public updateFilters(): this;
}

export type Voice = {
    /**
     * The voice session id
     */
    sessionId: String,
    /**
     * The voice event
     */
    event: null,
    /**
     * The voice endpoint
     */
    endpoint: String
}

export declare class Connection {
    constructor(player: Player);
    public player: Player;
    public sessionId: String;
    public voice: Voice;
    public region: String;
    public self_deaf: Boolean;
    public self_mute: Boolean;
    public voiceChannel: String;

    public setServerUpdate(data: { endpoint: String; token: String }): void;

    public setStateUpdate(data: {
        session_id: String;
        channel_id: String;
        self_deaf: Boolean;
        self_mute: Boolean;
    }): void;

    private updatePlayerVoiceData(): void;
}
