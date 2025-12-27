class Connection {
    #lastSentVoice = null;
    /**
-   * @param {import("../index").Player} player
-   */
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
        // Track what credentials we last sent to avoid duplicates
        this.#lastSentVoice = null;
    }

    /**
-    * Checks if we have all necessary voice credentials.
-    */
    get isReady() {
        return this.voice.sessionId && this.voice.endpoint && this.voice.token;
    }

    /**
     * Check if current credentials differ from what we last sent
     */
    _credentialsChanged() {
        if (!this.#lastSentVoice) return true;

        return this.#lastSentVoice.sessionId !== this.voice.sessionId ||
            this.#lastSentVoice.endpoint !== this.voice.endpoint ||
            this.#lastSentVoice.token !== this.voice.token;
    }

    /**
     * Waits for the connection to be ready and for any active voice updates to the Node to complete.
     * Optimization: Returns immediately if ready and idle to save resources.
b    */
    async resolve() {
        // Case 1: Fully ready and no active updates. Return instantly (no Promise created).
        if (this.isReady && !this.pendingUpdate) return;

        const playerTimeoutMs = this.player?.connectionTimeout || 10000;

        // Helper to race a promise against a timeout
        const waitFor = (promise, label, timeoutMs) => {
            let timer;
            return Promise.race([
                promise,
                new Promise((_, reject) => {
                    timer = setTimeout(() => reject(new Error(`Connection timed out (${timeoutMs}ms) waiting for ${label}`)), timeoutMs);
                })
            ]).finally(() => clearTimeout(timer));
        }

        // Case 2: Credentials present, but we are waiting for Node to acknowledge the voice update.
        if (this.pendingUpdate) {
            await waitFor(this.pendingUpdate, "Node to acknowledge the voice update", playerTimeoutMs);
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

        return waitFor(this.deferred.promise, "Discord voice credentials to arrive", playerTimeoutMs);
    }

    async checkAndSend() {
        if (!this.isReady) return;

        // CRITICAL: Check if credentials actually changed
        if (!this._credentialsChanged()) {
            this.player.riffy.emit("debug", `[Player ${this.player.guildId} - CONNECTION] Credentials unchanged, skipping redundant update`);
            return;
        }

        // Wait for any existing update to complete first
        if (this.pendingUpdate) {
            this.player.riffy.emit("debug", `[Player ${this.player.guildId} - CONNECTION] New credentials received, waiting for previous update to complete`);
            try {
                await this.pendingUpdate;
            } catch (error) {
                this.player.riffy.emit("debug", `[Player ${this.player.guildId} - CONNECTION] Previous update failed: ${error.message}`);
            }

            // Re-check after waiting - credentials might have changed again or already been sent
            if (!this._credentialsChanged()) {
                this.player.riffy.emit("debug", `[Player ${this.player.guildId} - CONNECTION] Credentials already sent while waiting, skipping`);
                return;
            }
        }

        // Capture the credentials we're about to send
        const voiceToSend = {
            sessionId: this.voice.sessionId,
            endpoint: this.voice.endpoint,
            token: this.voice.token,
        };

        this.player.riffy.emit("debug", this.player.node.name, `[Rest Manager] Sending Update Player request with voice data: ${JSON.stringify(voiceToSend)}`);

        this.pendingUpdate = this.updatePlayerVoiceData(voiceToSend);

        try {
            await this.pendingUpdate;
            // Only update lastSentVoice after successful send
            this.#lastSentVoice = voiceToSend;
            this.player.riffy.emit("debug", `[Player ${this.player.guildId} - CONNECTION] Successfully sent voice update`);
        } catch (error) {
            this.player.riffy.emit("debug", `[Player ${this.player.guildId} - CONNECTION] Voice update failed: ${error.message}`);
            // If update failed, reset establishing flag
            this.establishing = false;
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

    async setServerUpdate(data) {
        const { endpoint, token } = data;
        if (!endpoint) throw new Error(`Missing 'endpoint' property in VOICE_SERVER_UPDATE packet/payload, Wait for some time Or Disconnect the Bot from Voice Channel and Try Again.`);

        const previousVoiceRegion = this.region;

        this.voice.endpoint = endpoint;
        this.voice.token = token;
        this.region = endpoint.split(".").shift()?.replace(/[0-9]/g, "") || null;

        this.player.riffy.emit("debug", `[Player ${this.player.guildId} - CONNECTION] Received voice server, ${previousVoiceRegion !== null ? `Changed Voice Region from(oldRegion) ${previousVoiceRegion} to(newRegion) ${this.region}` : `Voice Server: ${this.region}`}, Updating Node's Voice Data.`)

        console.log("Paused Data", this.player.paused)
        if (this.player.paused) {
            this.player.riffy.emit(
                "debug",
                this.player.node.name,
                `unpaused ${this.player.guildId} player, expecting it was paused while the player moved to ${this.voiceChannel}`
            );
            await this.player.pause(false);
        }

        this.checkAndSend();
    }

    setStateUpdate(data) {
        const { session_id, channel_id, self_deaf, self_mute } = data;

        this.player.riffy.emit("debug", `[Player ${this.player.guildId} - CONNECTION] Received Voice State Update Informing the player ${channel_id !== null ? `Connected to ${this.voiceChannel}` : `Disconnected from ${this.voiceChannel}`}`)

        // If player is manually disconnected from VC
        if (channel_id == null) {
            this.player.destroy();
            this.player.riffy.emit("playerDestroy", this.player);
            return;
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

    updatePlayerVoiceData(voiceData) {
        this.establishing = true;

        const updatePlayerBody = {
            voice: voiceData,
            /**
-            * FIXME: Need a better way so that we don't the volume each time.
-            */
            volume: this.player.volume,
        }

        // Just In case...
        if (this.player.paused) {
            this.player.riffy.emit(
                "debug",
                this.player.node.name,
                `unpaused ${this.player.guildId} player, expecting it was paused while the player moved to ${this.voiceChannel}`
            )
            updatePlayerBody["paused"] = false;
        }


        return this.player.node.rest.updatePlayer({
            guildId: this.player.guildId,
            data: updatePlayerBody
        });
    }
}

module.exports = { Connection };
