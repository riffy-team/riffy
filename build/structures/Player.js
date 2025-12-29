const { EventEmitter, once } = require("events");
const { Connection } = require("./Connection");
const { Filters } = require("./Filters");
const { Queue } = require("./Queue");
const { spAutoPlay, scAutoPlay } = require('../functions/autoPlay');
const { inspect } = require("util");

class Player extends EventEmitter {
    constructor(riffy, node, options) {
        super();
        this.riffy = riffy;
        this.node = node;
        this.options = options;
        this.guildId = options.guildId;
        this.textChannel = options.textChannel;
        this.voiceChannel = options.voiceChannel;
        this.connection = new Connection(this);
        this.filters = new Filters(this);
        this.mute = options.mute ?? false;
        this.deaf = options.deaf ?? false;
        this.volume = options.defaultVolume ?? 100;
        this.loop = options.loop ?? "none";
        this.data = {};
        this.queue = new Queue();
        this.position = 0;
        this.current = null;
        this.previousTracks = new Array();
        this.playing = false;
        this.paused = false;
        this.connected = false;
        this.timestamp = 0;
        this.ping = 0;
        this.isAutoplay = false;
        this.migrating = false;
        this.fadeInterval = null;

        Object.defineProperty(this, "connectionTimeout", {
            value: 10000,
            configurable: false,
            writable: false,
            enumerable: false
        });

        this.on("playerUpdate", (packet) => {
            (this.connected = packet.state.connected),
                (this.position = packet.state.position),
                (this.ping = packet.state.ping);
            this.timestamp = packet.state.time;

            if (this.connection.establishing && packet.state.connected) {
                this.connection.establishing = false;
                this.riffy.emit("debug", this.node.name, `[Player ${this.guildId}] (received Confirmation) Successfully established voice Connectivity with Node (playerUpdate connected = ${packet.state.connected})`);
                this.emit("connectionRestored", "connected");
            }

            this.riffy.emit("playerUpdate", this, packet);
        });

        this.on("event", (data) => {
            this.handleEvent(data)
        });
    }
    /**
     * @description gets the Previously played Track
     */
    get previous() {
        return this.previousTracks?.[0]
    }

    /**
     * @description Returns whether the player is currently playing
     */
    get isPlaying() {
        return this.playing;
    }

    /**
     * @description Returns whether the player is paused
     */
    get isPaused() {
        return this.paused;
    }

    /**
     * @description Shuffles the queue
     * @returns {this}
     */
    shuffle() {
        this.queue.shuffle();
        return this;
    }

    /**
     * @description Clears the queue
     * @returns {this}
     */
    clearQueue() {
        this.queue.clear();
        return this;
    }

    /**
     * @description Jumps to a specific track in the queue
     * @param {number} index The index to jump to
     * @returns {this}
     */
    jump(index) {
        if (typeof index !== 'number') throw new TypeError("Index must be a number");
        
        // Remove tracks before the target index
        this.queue.remove(0, index);
        
        return this.stop();
    }

    /**
     * @description Removes a track from the queue
     * @param {number} index The index of the track to remove
     * @returns {Track} The removed track
     */
    remove(index) {
        return this.queue.remove(index);
    }

    /**
     * @private
     */
    addToPreviousTrack(track) {
        if (Number.isInteger(this.riffy.options.multipleTrackHistory) && this.previousTracks.length >= this.riffy.options.mutipleTrackHistory) {
            this.previousTracks.splice(this.riffy.options.multipleTrackHistory, this.previousTracks.length)
        }
        // If its falsy Save Only last Played Track.
        else if (!this.riffy.options.multipleTrackHistory) {
            this.previousTracks[0] = track;
            return;
        }

        this.previousTracks.unshift(track)
    }


    async play() {
        // Waits for Discord credentials AND for the Node to acknowledge the voice update.
        // Returns immediately if everything is already set up.
        try {
            await this.connection.resolve();
        } catch (error) {
            // If resolve times out, we cannot play.
            this.connected = false;
            this.riffy.emit("debug", `[Player ${this.guildId} - play() CONNECTION CHECK Error] ${error.message}`);
        }
        // Handle Node Connection State (Node (Lavalink/Nodelink) WebSocket)
        // If not connected, but we are in the middle of establishing, wait for it.
        if (!this.connected && this.connection.establishing) {
            this.riffy.emit("debug", `[Player ${this.guildId}] Waiting for Node voice connection to stabilize...`);

            try {
                await once(this, "connectionRestored", { signal: AbortSignal.timeout(this.connectionTimeout) });
            } catch (error) {
                // No need to emit debug message if connection is already restored,
                // And we didn't receive the notifying event for some reason.
                !this.connected && this.riffy.emit("debug", `[Player ${this.guildId}] Timed out waiting (${this.connectionTimeout} ms) for Node voice connection to stabilize.`);
                if (!this.connected) {
                    this.destroy();
                    throw new Error(`Connection timed out. Player destroyed.`);
                }
            }
        }

        // Final check: if still not connected, throw error.
        if (!this.connected) throw new Error("Player connection is not initiated. Kindly use Riffy.createConnection() and establish a connection, TIP: Check if Guild Voice States intent is set/provided & 'updateVoiceState' is used in the raw(Gateway Raw) event");
        if (!this.queue.length) throw new Error(`Unable to play for Player with Guild Id ${this.guildId}, Queue is empty (length: ${this.queue.length})!`);

        this.current = this.queue.shift();

        if (!this.current.track) {
            this.current = await this.current.resolve(this.riffy);
        }

        this.playing = true;
        this.position = 0;

        const { track } = this.current;

        this.node.rest.updatePlayer({
            guildId: this.guildId,
            data: {
                track: {
                    encoded: track,
                },
            },
        });

        return this;
    }

    /**
     *
     * @param {this} player
     * @returns
     */
    async autoplay(player) {
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

        // If ran on queueEnd event
        if (player.previous) {
            if (!this.playedIdentifiers) {
                this.playedIdentifiers = new Set();
            }
            const previousIdentifier = player.previous.info.identifier || player.previous.info.uri;
            this.playedIdentifiers.add(previousIdentifier);
            if (this.playedIdentifiers.size > 50) {
                const firstItem = this.playedIdentifiers.values().next().value;
                this.playedIdentifiers.delete(firstItem);
            }
            this.riffy.emit("debug", `[Player ${this.guildId}] Autoplay initiated. Previous Source: ${player.previous.info.sourceName}`);

            if (player.previous.info.sourceName === "youtube") {
                try {
                    let data = `https://www.youtube.com/watch?v=${player.previous.info.identifier}&list=RD${player.previous.info.identifier}`;

                    let response = await this.riffy.resolve({ query: data, source: "ytmsearch", requester: player.previous.info.requester });

                    if (!this.isAutoplayResponseValid(response)) return this.stop();

                    // Filter tracks that have never been played
                    let availableTracks = response.tracks.filter(track => {
                        const trackId = track.info.identifier || track.info.uri;
                        return !this.playedIdentifiers.has(trackId);
                    });

                    // If all tracks have been played, reset and use all tracks.
                    if (availableTracks.length === 0) {
                        availableTracks = response.tracks;
                    }
                    let track = availableTracks[Math.floor(Math.random() * availableTracks.length)];
                    this.queue.push(track);
                    this.play();
                    return this;
                } catch (e) {
                    return this.stop();
                }
            } else if (player.previous.info.sourceName === "soundcloud") {
                try {
                    const data = await scAutoPlay(player.previous.info.uri);
                    
                    if (!data) return this.stop();

                    let response = await this.riffy.resolve({ query: data, source: "scsearch", requester: player.previous.info.requester });

                    if (!this.isAutoplayResponseValid(response)) return this.stop();

                    // Filter tracks that have never been played
                    let availableTracks = response.tracks.filter(track => {
                        const trackId = track.info.identifier || track.info.uri;
                        return !this.playedIdentifiers.has(trackId);
                    });

                    // If all tracks have been played, reset and use all tracks. If all tracks have been played, reset and use all tracks.
                    if (availableTracks.length === 0) {
                        availableTracks = response.tracks;
                    }

                    let track = availableTracks[Math.floor(Math.random() * availableTracks.length)];

                    this.queue.push(track);
                    this.play();
                    return this;
                } catch (e) {
                    this.riffy.emit("debug", `[Player ${this.guildId}] SoundCloud Autoplay Error: ${e.message}`);
                    return this.stop();
                }
            } else if (player.previous.info.sourceName === "spotify") {
                try {
                    // First, search for the Spotify track on YouTube
                    const ytQuery = `${player.previous.info.title} ${player.previous.info.author} official video`;

                    const ytResponse = await this.riffy.resolve({ query: ytQuery, source: "ytsearch", requester: player.previous.info.requester });

                    if (!this.isAutoplayResponseValid(ytResponse)) return this.stop();

                    const ytTrack = ytResponse.tracks[0]; // Pick the first result

                    // Use YouTube's RD list to get recommendations
                    const rdUrl = `https://www.youtube.com/watch?v=${ytTrack.info.identifier}&list=RD${ytTrack.info.identifier}`;
                    const rdResponse = await this.riffy.resolve({ query: rdUrl, source: "ytsearch", requester: player.previous.info.requester });

                    if (!this.isAutoplayResponseValid(rdResponse)) return this.stop();

                    const recommendedTrack = rdResponse.tracks[Math.floor(Math.random() * Math.floor(rdResponse.tracks.length))];

                    let songTitle = recommendedTrack.info.title || "";
                    let artist = recommendedTrack.info.author || "";

                    // If title looks like "Artist - Title" or "ARTIST - TITLE", prefer parsing that
                    const dashMatch = songTitle.match(/^\s*(.+?)\s*-\s*(.+)\s*$/);
                    if (dashMatch) {
                        // If author is generic (like channel name), use parsed artist
                        const parsedArtist = dashMatch[1].trim();
                        const parsedTitle = dashMatch[2].trim();
                        // Use parsed values but only if parsedArtist is not the same as parsedTitle
                        if (parsedArtist && parsedTitle && parsedArtist.toLowerCase() !== parsedTitle.toLowerCase()) {
                            artist = parsedArtist;
                            songTitle = parsedTitle;
                        }
                    }

                    // Normalize separators and remove common noisy suffixes
                    // Remove content in parentheses/brackets anywhere in the title (e.g., (Official Video), [Lyrics])
                    songTitle = songTitle.replace(/\s*[\[(][^\])]+[\])]/g, "").trim();

                    // Remove common descriptors like 'official music video', 'official video', 'lyrics', 'audio', 'hd', 'mv', 'clip'
                    songTitle = songTitle.replace(/\b(official\s+music\s+video|official\s+video|official|music\s+video|lyrics|lyric|audio|hd|mv|clip)\b/ig, "").trim();

                    // Remove stray separators like '|' or ':' and trailing text after them (keep left-most segment)
                    if (songTitle.includes("|") || songTitle.includes(":")) {
                        songTitle = songTitle.split(/\||:/)[0].trim();
                    }

                    // Collapse multiple spaces
                    songTitle = songTitle.replace(/\s{2,}/g, " ");

                    const spotifyQuery = `${songTitle} ${artist}`.trim();

                    // Search for the recommended track on Spotify
                    const response = await this.riffy.resolve({ query: spotifyQuery, source: "spsearch", requester: player.previous.info.requester });

                    if (!this.isAutoplayResponseValid(response)) return this.stop();

                    // Filter out very short tracks and tracks that have already been played.
                    let validTracks = response.tracks.filter(track => {
                        const duration = track.info.length || track.info.duration || 0;
                        const trackId = track.info.identifier || track.info.uri;
                        return duration >= 60000 && !this.playedIdentifiers.has(trackId);
                    });

                    // If there are no valid tracks, try without the identifier filter.
                    if (validTracks.length === 0) {
                        validTracks = response.tracks.filter(track => {
                            const duration = track.info.length || track.info.duration || 0;
                            return duration >= 60000;
                        });
                    }

                    if (validTracks.length === 0) {
                        return this.stop();
                    }

                    let track = validTracks[0]; // Pick the most relevant result instead of random
                    this.queue.push(track);
                    this.play();
                    return this;
                } catch (e) {
                    this.riffy.emit("debug", `[Player ${this.guildId}] Spotify Autoplay Error: ${e.stack || e.message}`);
                    return this.stop();
                }
            }
        } else return this;
    }

    /**
     * Checks if the autoplay response is valid and contains tracks
     * @param {Object} response The response from the node
     * @returns {boolean}
     */
    isAutoplayResponseValid(response) {
        if (!response || !response.tracks) return false;

        const invalidTypes = this.node.rest.version === "v4"
            ? ["error", "empty"]
            : ["LOAD_FAILED", "NO_MATCHES"];

        return !invalidTypes.includes(response.loadType);
    }

    connect(options = this) {
        const { guildId, voiceChannel, deaf = true, mute = false } = options;
        this.send({
            guild_id: guildId,
            channel_id: voiceChannel,
            self_deaf: deaf,
            self_mute: mute,
        });

        this.connected = true

        this.riffy.emit("debug", `[Player ${this.guildId}] Player has informed the Discord Gateway to Establish Voice Connectivity in ${voiceChannel} Voice Channel, Awaiting Confirmation(Via Voice State Update & Voice Server Update events)`);
    }

    stop() {
        this.position = 0;
        this.playing = false;
        this.node.rest.updatePlayer({
            guildId: this.guildId,
            data: { track: { encoded: null } },
        });

        return this;
    }

    async pause(toggle = true) {
        this.node.rest.updatePlayer({
            guildId: this.guildId,
            data: { paused: toggle },
        });

        this.playing = this.playing ? false : this.playing;
        this.paused = toggle;

        return this;
    }

    seek(position) {
        const trackLength = this.current.info.length;
        this.position = Math.max(0, Math.min(trackLength, position));

        this.node.rest.updatePlayer({ guildId: this.guildId, data: { position } });
    }

    setVolume(volume) {
        if (volume < 0 || volume > 1000) {
            throw new Error("[Volume] Volume must be between 0 to 1000");
        }

        this.node.rest.updatePlayer({ guildId: this.guildId, data: { volume } });
        this.volume = volume;
        return this;
    }

    /**
     * Fades the volume to a target level over a duration
     * @param {number} targetVolume The target volume level
     * @param {number} duration The duration of the fade in milliseconds
     * @returns {this}
     */
    fade(targetVolume, duration) {
        if (typeof targetVolume !== 'number') throw new TypeError('Volume must be a number.');
        if (typeof duration !== 'number') throw new TypeError('Duration must be a number.');

        if (this.fadeInterval) clearInterval(this.fadeInterval);
        this.fadeInterval = null;
        
        const startVolume = this.volume;
        const startTime = Date.now();
        
        this.fadeInterval = setInterval(() => {
            const elapsedTime = Date.now() - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            
            const newVolume = Math.round(startVolume + (targetVolume - startVolume) * progress);
            
            this.setVolume(newVolume);
            
            if (progress >= 1) {
                clearInterval(this.fadeInterval);
                this.fadeInterval = null;
            }
        }, 50);
        
        return this;
    }

    setLoop(mode) {
        if (!mode) {
            throw new Error("You must provide the loop mode as an argument for setLoop");
        }

        if (!["none", "track", "queue"].includes(mode)) {
            throw new Error("setLoop arguments must be 'none', 'track', or 'queue'");
        }

        this.loop = mode;
        return this;
    }

    setTextChannel(channel) {
        if (typeof channel !== "string") throw new TypeError("Channel must be a non-empty string.");
        this.textChannel = channel;
        return this;
    }

    setVoiceChannel(channel, options) {
        if (typeof channel !== "string") throw new TypeError("Channel must be a non-empty string.");

        if (this.connected && channel === this.voiceChannel) {
            throw new ReferenceError(`Player is already connected to ${channel}`);
        }

        // Well, Don't Update it here, So that Riffy can detect the Voice Channel change based off VoiceState received from Discord and update it accordingly.
        // this.voiceChannel = channel;

        if (options) {
            this.mute = options.mute ?? this.mute;
            this.deaf = options.deaf ?? this.deaf;
        }

        this.connect({
            deaf: this.deaf,
            guildId: this.guildId,
            voiceChannel: channel,
            textChannel: this.textChannel,
            mute: this.mute,
        });

        return this;
    }

    disconnect() {
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

    destroy() {
        this.disconnect();

        this.node.rest.destroyPlayer(this.guildId);

        this.riffy.emit("playerDisconnect", this);
        this.riffy.emit("debug", `[Player ${this.guildId}] Destroyed!`);

        this.riffy.players.delete(this.guildId);
    }

    async handleEvent(payload) {
        if (this.migrating) {
            this.riffy.emit("debug", `Player (${this.guildId}) is migrating, ignoring event: ${payload.type}`);
            return;
        }

        const player = this.riffy.players.get(payload.guildId);
        if (!player) return;

        const track = this.current;

        // if (this.node.rest.version === "v4") {
        //     track.info.thumbnail = await track.info.thumbnail;
        // } else {
        //     track.info.thumbnail = await track.info.thumbnail;
        // }

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

    trackStart(player, track, payload) {
        this.playing = true;
        this.paused = false;
        this.riffy.emit(`debug`, `Player (${player.guildId}) has started playing ${track.info.title} by ${track.info.author}`);
        this.riffy.emit("trackStart", player, track, payload);
    }

    trackEnd(player, track, payload) {
        this.addToPreviousTrack(track)
        const previousTrack = this.previous;
        // By using lower case We handle both Lavalink Versions(v3, v4) Smartly 😎,
        // If reason is replaced do nothing expect User do something hopefully else RIP.
        if (payload.reason.toLowerCase() === "replaced") return this.riffy.emit("trackEnd", player, track, payload);

        // Replacing & to lower case it Again Smartly 😎, Handled Both Lavalink Versions.
        // This avoids track that got cleaned-up or failed to load to be played again (Via Loop Mode).
        if (["loadfailed", "cleanup"].includes(payload.reason.replace("_", "").toLowerCase())) {

            if (player.queue.length === 0) {
                this.playing = false;
                this.riffy.emit("debug", `Player (${player.guildId}) Track-Ended(${track.info.title}) with reason: ${payload.reason}, emitting queueEnd instead of trackEnd as queue is empty/finished`);
                return this.riffy.emit("queueEnd", player);
            }

            this.riffy.emit("trackEnd", player, track, payload);
            return player.play();
        }

        this.riffy.emit("debug", `Player (${player.guildId}) has the track ${track.info.title} by ${track.info.author} ended with reason: ${payload.reason}`);

        if (this.loop === "track") {
            player.queue.unshift(previousTrack);
            this.riffy.emit("debug", `Player (${player.guildId}) looped track ${track.info.title} by ${track.info.author}, as loop mode is set to 'track'`);
            this.riffy.emit("trackEnd", player, track, payload);
            return player.play();
        }

        else if (track && this.loop === "queue") {
            player.queue.push(previousTrack);
            this.riffy.emit("debug", `Player (${player.guildId}) looping Queue, as loop mode is set to 'queue'`);
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

    trackError(player, track, payload) {
        this.riffy.emit("debug", `Player (${player.guildId}) has an exception/error while playing ${track.info.title} by ${track.info.author} this track, exception received: ${inspect(payload.exception)}`);
        this.riffy.emit("trackError", player, track, payload);
        this.stop();
    }

    trackStuck(player, track, payload) {
        this.riffy.emit("trackStuck", player, track, payload);
        this.riffy.emit("debug", `Player (${player.guildId}) has been stuck track ${track.info.title} by ${track.info.author} for ${payload.thresholdMs}ms, skipping track...`);
        this.stop();
    }

    async socketClosed(player, payload) {
        if ([4015, 4009].includes(payload.code)) {
            this.send({
                guild_id: payload.guildId,
                channel_id: this.voiceChannel,
                self_mute: this.mute,
                self_deaf: this.deaf,
            });
        }

        this.riffy.emit("socketClosed", player, payload);
        if (!this.connection?.establishing) await this.pause(true);
        this.riffy.emit("debug", `Player (${player.guildId}) Voice Connection has been closed with code: ${payload.code}, Player might be paused(to any avoid track playing). some possible causes: Voice channel deleted, Or Client(Bot) was kicked`);
    }


    send(data) {
        this.riffy.send({ op: 4, d: data });
    }

    set(key, value) {
        return this.data[key] = value;
    }

    get(key) {
        return this.data[key];
    }

    /**
    * @description clears All custom Data set on the Player
    */
    clearData() {
        for (const key in this.data) {
            if (this.data.hasOwnProperty(key)) {
                delete this.data[key];
            }
        }
        return this;
    }

    /**
     * Moves the player to a new node.
     * @param {import("./Node").Node} newNode The node to move the player to.
     * @throws {TypeError} If no `newNode` is provided.
     * @throws {Error} If `newNode` provided is not connected.
     * @throws {Error} If `newNode` provided is same as the Player's current Node.
     */
    async moveTo(newNode) {
        if (!newNode) throw new TypeError("You must provide a node to move to.");
        if (!newNode.connected) throw new Error("The node you provided is not connected.");
        if (this.node === newNode) throw new Error("Player is already connected to this node.");

        this.migrating = true;

        try {
            const oldNode = this.node;

            const { player, ...filterData } = this.filters;

            const state = {
                track: this.current,
                position: this.position,
                volume: this.volume,
                paused: this.paused,
                filters: filterData,
                voice: {
                    token: this.connection.voice.token,
                    endpoint: this.connection.voice.endpoint,
                    sessionId: this.connection.voice.sessionId,
                }
            };

            if (oldNode.connected) {
                await oldNode.rest.destroyPlayer(this.guildId);
            }

            this.node = newNode;

            await this.node.rest.updatePlayer({
                guildId: this.guildId,
                data: {
                    voice: state.voice
                }
            });

            if (state.track) {
                await this.node.rest.updatePlayer({
                    guildId: this.guildId,
                    data: {
                        track: {
                            encoded: state.track.track,
                        },
                        position: state.position,
                        volume: state.volume,
                        paused: state.paused,
                        filters: state.filters
                    }
                });
            }
        } finally {
            this.migrating = false;
        }

        return this;
    }
}

module.exports = { Player };
