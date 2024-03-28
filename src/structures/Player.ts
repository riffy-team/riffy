import { Node, Riffy, Connection, Filters, Queue, Track } from "..";
import { EventEmitter } from "events"
import { Soundcloud, Spotify } from '../functions/autoplay';

type Loop = "none" | "track" | "queue";

export interface PlayerOptions {
    guildId: string;
    textChannel: string;
    voiceChannel: string;
    mute?: boolean;
    deaf?: boolean;
    volume?: number;
    loop?: Loop;
}

export class Player extends EventEmitter {
    public riffy: Riffy;
    public node: Node;
    public connection: Connection;
    public filters: Filters;
    public queue: Queue;
    public options: PlayerOptions;
    public guildId: string;
    public textChannel: string;
    public voiceChannel: string | null;
    public mute: boolean;
    public deaf: boolean;
    public volume: number;
    public loop: Loop;
    public data: any;
    public position: number;
    public current: Track | null;
    public previous: Track | null;
    public playing: boolean;
    public paused: boolean;
    public connected: boolean;
    public timestamp: number;
    public ping: number;
    public isAutoplay: boolean;

    constructor(riffy: Riffy, node: Node, options: PlayerOptions) {
        super();
        this.riffy = riffy;
        this.node = node;
        this.connection = new Connection(this);
        this.filters = new Filters(this);
        this.queue = new Queue();
        this.options = options;
        this.guildId = options.guildId;
        this.textChannel = options.textChannel;
        this.voiceChannel = options.voiceChannel;
        this.mute = options.mute || false;
        this.deaf = options.deaf || false;
        this.volume = options.volume || 100;
        this.loop = options.loop || "none";
        this.data = {};
        this.position = 0;
        this.current = null;
        this.previous = null;
        this.playing = false;
        this.paused = false;
        this.connected = false;
        this.timestamp = 0;
        this.ping = 0;
        this.isAutoplay = false;

        this.on("playerUpdate", (packet: {
            state: {
                connected: boolean;
                position: number;
                ping: number;
                time: number;
            };
        }) => {
            (this.connected = packet.state.connected),
                (this.position = packet.state.position),
                (this.ping = packet.state.ping);
            this.timestamp = packet.state.time;

            this.riffy.emit("playerUpdate", this, packet);
        });

        this.on("event", (data) => {
            this.handleEvent(data)
        });
    }

    public async play() {
        if (!this.connected) throw new Error("Player connection is not initiated. Kindly user Riffy.createConnection() and establish a connection");
        if (!this.queue.length) return;

        this.current = this.queue.shift();

        if (this.current === null || this.current?.track === undefined) {
            const resolvedTrack = await this.current?.resolve(this.riffy);
            if (resolvedTrack !== undefined) {
                this.current = resolvedTrack;
            }
        }


        this.playing = true;
        this.position = 0;

        const { track } = this.current!;

        this.node.rest.updatePlayer({
            guildId: this.guildId,
            data: {
                encodedTrack: track,
            },
        });

        return this;
    }

    public async autoplay(player: Player) {
        if (!player) {
            if (player == null) {
                this.isAutoplay = false;
                return this;
            } else if (player == false) {
                this.isAutoplay = false;
                return this;
            } else throw new Error("Missing argument. Quick Fix: player.autoplay(player)");
        }

        this.isAutoplay = true;

        if (player.previous) {
            if (player.previous.info.sourceName === "youtube") {
                try {
                    let data = `https://www.youtube.com/watch?v=${player.previous.info.identifier}&list=RD${player.previous.info.identifier}`;

                    let response = await this.riffy.resolve({ query: data, source: "ytmsearch", requester: player.previous.info.requester });

                    if (this.node.rest.version === "v4") {
                        if (!response || !response.tracks || ["error", "empty"].includes(response.loadType)) return this.stop();
                    } else {
                        if (!response || !response.tracks || ["LOAD_FAILED", "NO_MATCHES"].includes(response.loadType)) return this.stop();
                    }

                    let track = response.tracks[Math.floor(Math.random() * Math.floor(response.tracks.length))];
                    this.queue.push(track);
                    this.play();
                    return this
                } catch (e) {
                    return this.stop();
                }
            } else if (player.previous.info.sourceName === "soundcloud") {
                try {
                    Soundcloud(player.previous.info.uri).then(async (data) => {
                        if (data.status !== 200) return this.stop();

                        const response = await this.riffy.resolve({ query: data.songs, source: "scsearch", requester: player.previous?.info.requester });

                        if (this.node.rest.version === "v4") {
                            if (!response || !response.tracks || ["error", "empty"].includes(response.loadType)) return this.stop();
                        } else {
                            if (!response || !response.tracks || ["LOAD_FAILED", "NO_MATCHES"].includes(response.loadType)) return this.stop();
                        }

                        const track = response.tracks[Math.floor(Math.random() * Math.floor(response.tracks.length))];

                        this.queue.push(track);
                        this.play();
                        return this;
                    })
                } catch (e) {
                    return this.stop();
                }
            } else if (player.previous.info.sourceName === "spotify") {
                try {
                    Spotify(player.previous.info.identifier).then(async (data) => {
                        if (data.status !== 200) return this.stop();

                        const response = await this.riffy.resolve({ query: `https://open.spotify.com/track/${data.songs}`, requester: player.previous?.info.requester });

                        if (this.node.rest.version === "v4") {
                            if (!response || !response.tracks || ["error", "empty"].includes(response.loadType)) return this.stop();
                        } else {
                            if (!response || !response.tracks || ["LOAD_FAILED", "NO_MATCHES"].includes(response.loadType)) return this.stop();
                        }

                        const track = response.tracks[Math.floor(Math.random() * Math.floor(response.tracks.length))];
                        this.queue.push(track);
                        this.play();
                        return this;
                    })
                } catch (e) {
                    return this.stop();
                }
            }
        } else return this;
    }

    public connect(options: {
        guildId: string,
        voiceChannel: string,
        textChannel?: string
        deaf?: boolean,
        mute?: boolean
    }) {
        const { guildId, voiceChannel, deaf = true, mute = false } = options;
        this.send({
            guild_id: guildId,
            channel_id: voiceChannel,
            self_deaf: deaf,
            self_mute: mute,
        });

        this.connected = true;
        this.riffy.emit("debug", this.guildId, "Player has been connected");
    }

    public stop() {
        this.position = 0;
        this.playing = false;
        this.node.rest.updatePlayer({
            guildId: this.guildId,
            data: { encodedTrack: null },
        });

        return this;
    }

    public pause(toggle = true) {
        this.node.rest.updatePlayer({
            guildId: this.guildId,
            data: { paused: toggle },
        });

        this.playing = !toggle;
        this.paused = toggle;

        return this;
    }

    public seek(position: number) {
        const trackLength = this.current?.info.length ?? 0;
        this.position = Math.max(0, Math.min(trackLength, position));

        this.node.rest.updatePlayer({ guildId: this.guildId, data: { position } });
    }

    public setVolume(volume: number) {
        if (volume < 0 || volume > 1000) {
            throw new Error("[Volume] Volume must be between 0 to 1000");
        }

        this.node.rest.updatePlayer({ guildId: this.guildId, data: { volume } });
        this.volume = volume;
        return this;
    }

    public setLoop(mode: Loop) {
        if (!mode) {
            throw new Error("You must provide the loop mode as an argument for setLoop");
        }

        if (!["none", "track", "queue"].includes(mode)) {
            throw new Error("setLoop arguments must be 'none', 'track', or 'queue'");
        }

        this.loop = mode;
        return this;
    }

    public setTextChannel(channel: string) {
        if (typeof channel !== "string") throw new TypeError("Channel must be a non-empty string.");
        this.textChannel = channel;
        return this;
    }

    public setVoiceChannel(channel: string, options: { mute?: boolean, deaf?: boolean } = {}) {
        if (typeof channel !== "string") throw new TypeError("Channel must be a non-empty string.");

        if (this.connected && channel === this.voiceChannel) {
            throw new ReferenceError(`Player is already connected to ${channel}`);
        }

        this.voiceChannel = channel;

        if (options) {
            this.mute = options.mute ?? this.mute;
            this.deaf = options.deaf ?? this.deaf;
        }

        this.connect({
            deaf: this.deaf,
            guildId: this.guildId,
            voiceChannel: this.voiceChannel,
            textChannel: this.textChannel,
            mute: this.mute
        });

        return this;
    }

    public disconnect() {
        if (!this.voiceChannel) {
            return;
        }

        this.connected = false;
        this.send({
            guild_id: this.guildId,
            channel_id: null,
            self_mute: false,
            self_deaf: false,
        });

        this.voiceChannel = null;
        return this;
    }

    public async restart() {
        if (!this.current?.track && !this.queue.length) return;
        if (!this.current?.track) return await this.play();

        await this.node.rest.updatePlayer({
            guildId: this.guildId,
            data: {
                position: this.position,
                track: this.current,
            },
        });

        return this;
    };

    public destroy() {
        this.disconnect();
        this.node.rest.destroyPlayer(this.guildId);
        this.riffy.emit("playerDisconnect", this);
        this.riffy.players.delete(this.guildId);
    }

    public async handleEvent(payload: any) {
        const player = this.riffy.players.get(payload.guildId);
        if (!player) return;

        const track = this.current!;

        switch (payload.type) {
            case "TrackStartEvent":
                this.trackStart(player, track, payload);
                break;

            case "TrackEndEvent":
                this.trackEnd(player, track, payload);
                break;

            case "TrackExceptionEvent":
                this.trackError(player, track, payload);
                break;

            case "TrackStuckEvent":
                this.trackStuck(player, track, payload);
                break;

            case "WebSocketClosedEvent":
                this.socketClosed(player, payload);
                break;

            default:
                const error = new Error(`Node encountered an unknown event: '${payload.type}'`);
                this.riffy.emit("nodeError", this, error);
                break;
        }
    }

    public trackStart(player: Player, track: Track, payload: {
        encodedTrack?: string;
        track?: string;
        guildId?: string;
        op?: string;
        type?: string;
    }) {
        this.playing = true;
        this.paused = false;
        this.riffy.emit("trackStart", player, track, payload);
    }

    public trackEnd(player: Player, track: Track, payload: {
        encodedTrack?: string;
        track?: string;
        reason?: string;
        guildId?: string;
        op?: string;
        type?: string;
    }) {
        this.previous = track;
        if (this.loop === "track") {
            player.queue.unshift(this.previous);
            this.riffy.emit("trackEnd", player, track, payload);
            return player.play();
        }

        else if (track && this.loop === "queue") {
            player.queue.push(this.previous);
            this.riffy.emit("trackEnd", player, track, payload);
            return player.play();
        }

        if (player.queue.length === 0) {
            this.playing = false;
            return this.riffy.emit("queueEnd", player);
        }

        else if (player.queue.length > 0) {
            this.riffy.emit("trackEnd", player, track, payload);
            return player.play();
        }

        this.playing = false;
        this.riffy.emit("queueEnd", player);
    }

    public trackError(player: Player, track: Track, payload: {
        track?: string;
        exception?: {
            message?: string;
            severity?: string;
            cause?: string;
        }
    }) {
        this.riffy.emit("trackError", player, track, payload);
        this.stop();
    }

    public trackStuck(player: Player, track: Track, payload: {
        track?: string;
        thresholdMs?: number;
    }) {
        this.riffy.emit("trackStuck", player, track, payload);
        this.stop();
    }

    public socketClosed(player: Player, payload: {
        guildId?: string;
        code: number;
        reason?: string;
        byRemote?: boolean;
        op?: string;
    }) {
        if ([4015, 4009].includes(payload.code)) {
            this.send({
                guild_id: payload.guildId,
                channel_id: this.voiceChannel,
                self_mute: this.mute,
                self_deaf: this.deaf,
            });
        }

        this.riffy.emit("socketClosed", player, payload);
        this.pause(true);
        this.riffy.emit("debug", this.guildId, "Player paused, channel deleted, Or Client was kicked");
    }

    public set(key: string, value: any) {
        return this.data[key] = value;
    }

    public get(key: string) {
        return this.data[key];
    }

    public send(data: any) {
        this.riffy.send({ op: 4, d: data });
    }
}