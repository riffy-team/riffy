class Connection {
    /**
     * @param {import("../index").Player} player
     */
    constructor(player) {
        this.player = player;
        this.sessionId = null;
        this.voice = {
            sessionId: null,
            event: null,
            endpoint: null,
        };
        this.region = null;
        this.self_deaf = false;
        this.self_mute = false;
        this.voiceChannel = player.voiceChannel;

        // Tracks the promise for the initial connection (credentials)
        this.deferred = null;
        // Tracks the promise for the active REST update to the Node
        this.pendingUpdate = null;
        // Tracks if we have sent credentials and are waiting for Node confirmation
        this.establishing = false;
    }

    /**
     * Checks if we have all necessary voice credentials.
     */
    get isReady() {
      return this.voice.sessionId && this.voice.endpoint && this.voice.token;
    }

    /**
    * Waits for the connection to be ready and for any active voice updates to the Node to complete.
    * Optimization: Returns immediately if ready and idle to save resources.
    */
    async resolve() {
        // Case 1: Fully ready and no active updates. Return instantly (no Promise created).
        if (this.isReady && !this.pendingUpdate) return;

        // Case 2: Credentials present, but we are waiting for Node to acknowledge the voice update.
        if (this.pendingUpdate) {
            await this.pendingUpdate;
            return;
        }

        // Case 3: Waiting for Discord credentials. Create a deferred promise if one doesn't exist.
        if (!this.deferred) {
            let resolveFn;
            const promise = new Promise((resolve) => {
                resolveFn = resolve;
            });
            this.deferred = { promise, resolve: resolveFn };
        }

        return this.deferred.promise;
    }

    /**
    * Checks if ready, performs the update, and manages the resolution flow.
    */
    async checkAndSend() {
        if (this.isReady) {
            // Track the active update request
            this.pendingUpdate = this.updatePlayerVoiceData();

            try {
                // Wait for the Node to acknowledge the update
                await this.pendingUpdate;
            } catch (error) {
                this.player.riffy.emit("debug", `[Player ${this.player.guildId} - CONNECTION] Voice update failed: ${error.message}`);
            } finally {
                // Clear the pending flag
                this.pendingUpdate = null;

                // If play() was waiting on the deferred promise, resolve it now
                if (this.deferred) {
                    this.deferred.resolve();
                    this.deferred = null;
                }
            }
        }
    }


    setServerUpdate(data) {
        const { endpoint, token } = data;
        if (!endpoint) throw new Error(`Missing 'endpoint' property in VOICE_SERVER_UPDATE packet/payload, Wait for some time Or Disconnect the Bot from Voice Channel and Try Again.`);

        const previousVoiceRegion = this.region;

        this.voice.endpoint = endpoint;
        this.voice.token = token;
        this.region = endpoint.split(".").shift()?.replace(/[0-9]/g, "") || null;

        this.player.riffy.emit("debug", `[Player ${this.player.guildId} - CONNECTION] Received voice server, ${previousVoiceRegion !== null ? `Changed Voice Region from(oldRegion) ${previousVoiceRegion} to(newRegion) ${this.region}` : `Voice Server: ${this.region}`}, Updating Node's Voice Data.`)

        if (this.player.paused) {
            this.player.riffy.emit(
                "debug",
                this.player.node.name,
                `unpaused ${this.player.guildId} player, expecting it was paused while the player moved to ${this.voiceChannel}`
            );
            this.player.pause(false);
        }

        this.checkAndSend();
    }

    setStateUpdate(data) {
        const { session_id, channel_id, self_deaf, self_mute } = data;

        this.player.riffy.emit("debug", `[Player ${this.player.guildId} - CONNECTION] Received Voice State Update Informing the player ${channel_id !== null ? `Connected to ${this.voiceChannel}` : `Disconnected from ${this.voiceChannel}`}`)

        // If player is manually disconnected from VC
        if(channel_id == null) {
            this.player.destroy();
            this.player.riffy.emit("playerDestroy", this.player);
        }

        if (this.player.voiceChannel && channel_id && this.player.voiceChannel !== channel_id) {
            this.player.riffy.emit("playerMove", this.player.voiceChannel, channel_id)
            this.player.voiceChannel = channel_id;
            this.voiceChannel = channel_id
        }

        this.self_deaf = self_deaf;
        this.self_mute = self_mute;
        this.voice.sessionId = session_id || null;

        this.checkAndSend();
    }

    updatePlayerVoiceData() {
        this.establishing = true;

        this.player.riffy.emit("debug", this.player.node.name, `[Rest Manager] Sending an Update Player request with data: ${JSON.stringify({ voice: this.voice })}`)
        return this.player.node.rest.updatePlayer({
            guildId: this.player.guildId,
            data: Object.assign({
                voice: this.voice,
                /**
                 * Need a better way so that we don't the volume each time.
                 */
                volume: this.player.volume,
             }),
        });
    }
}

module.exports = { Connection };
