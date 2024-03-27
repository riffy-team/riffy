import { Player } from "../index"

export class Connection {
    public player: Player;
    public sessionId: string | null;
    public region: string | null;
    public voice: {
        sessionId: string | null;
        token: string | null;
        endpoint: string | null;
    }
    public self_mute: boolean;
    public self_deaf: boolean;

    constructor(player: Player) {
        this.player = player;
        this.sessionId = null;
        this.voice = {
            sessionId: null,
            token: null,
            endpoint: null
        };
        this.region = null;
        this.self_deaf = false;
        this.self_mute = false;
    }

    public setServerUpdate(data: {
        guild_id: string;
        endpoint: string;
        token: string
    }): void {
        const { guild_id, endpoint, token } = data;

        if (!endpoint) throw new Error("Session ID has not been found.");

        this.voice.endpoint = endpoint;
        this.voice.token = token;
        this.region = endpoint.split(".").shift()?.replace(/[0-9]/g, "") || null;

        if (this.player.paused) {
            this.player.riffy.emit(
                `debug`,
                `${this.player.node.name}`,
                `Unpaused ${this.player.guildId} player, expecting it to be paused while the player moved to ${this.player.voiceChannel}`
            );
            this.player.pause(false);
        }

        this.updatePlayerVoiceData();
    }

    setStateUpdate(data: {
        member: {
            user: {
                username: string;
                public_flags: number;
                id: string;
                global_name: string;
                display_name: string;
                discriminator: string;
                bot: boolean;
                avatar_decoration_data: string;
                avatar: string;
            },
            roles: string[];
            premium_since: string;
            pending: boolean;
            nick: string;
            mute: boolean;
            joined_at: string;
            flags: number;
            deaf: boolean;
            communication_disabled_until: string;
            avatar: string;
        },
        user_id: string;
        suppress: boolean;
        session_id: string;
        self_video: boolean;
        self_mute: boolean;
        self_deaf: boolean;
        request_to_speak_timestamp: string;
        mute: boolean;
        guild_id: string;
        deaf: boolean;
        channel_id: string;
    }) {
        const { session_id, channel_id, self_deaf, self_mute } = data;

        if (channel_id == null) {
            this.player.destroy();
            this.player.emit("playerDestroy", this.player);
        }

        if (this.player.voiceChannel && channel_id && this.player.voiceChannel !== channel_id) {
            this.player.emit("playerMove", this.player.voiceChannel, channel_id)
            this.player.voiceChannel = channel_id;
            this.player.voiceChannel = channel_id
        }

        this.self_deaf = self_deaf;
        this.self_mute = self_mute;
        this.voice.sessionId = session_id || null;
    }

    updatePlayerVoiceData() {
        this.player.riffy.emit(
            `debug`,
            `${this.player.node.name}`,
            `Sending an update player request with data: ${JSON.stringify({ voice: this.voice })}`
        )

        this.player.node.rest.updatePlayer({
            guildId: this.player.guildId,
            data: { voice: this.voice },
        });
    }
}