import { Node, Riffy, Track } from ".."

export interface RestOptions {
    host: string;
    port: number;
    secure: boolean;
    sessionId: string;
    password: string;
    restVersion: string;
}

export class Rest {
    public riffy: Riffy;
    public url: string;
    public sessionId: string;
    public password: string;
    public version: string;
    public calls: number;
    public leastUsedNodes: Node[] | any = [];

    constructor(riffy: Riffy, options: RestOptions | any) {
        this.riffy = riffy;
        this.url = `http${options.secure ? "s" : ""}://${options.host}:${options.port}`;
        this.sessionId = options.sessionId;
        this.password = options.password;
        this.version = options.restVersion;
        this.calls = 0;
    }

    setSessionId(sessionId: string) {
        this.sessionId = sessionId;
    }

    async makeRequest(method: string, endpoint: string, body: object | any = null): Promise<object | any> {
        const headers = {
            "Content-Type": "application/json",
            Authorization: this.password,
        };

        const requestOptions = {
            method,
            headers,
            body: body ? JSON.stringify(body) : null,
        };

        const response = await fetch(this.url + endpoint, requestOptions);

        this.calls++

        if (response.status === 204) {
            return null;
        }

        try {
            const data = await response.json();
            return data;
        } catch (e) {
            return null;
        }
    }

    async getPlayers() {
        return this.makeRequest("GET", `/${this.version}/sessions/${this.sessionId}/players`);
    }

    async updatePlayer(options: {
        guildId: string;
        data: object | any;
    }) {
        return this.makeRequest("PATCH", `/${this.version}/sessions/${this.sessionId}/players/${options.guildId}?noReplace=false`, options.data).then((res) => {
            this.riffy.emit("res", options.guildId, res);
        })
    }

    async destroyPlayer(guildId: string) {
        return this.makeRequest("DELETE", `/${this.version}/sessions/${this.sessionId}/players/${guildId}`);
    }

    async getTracks(identifier: string) {
        return this.makeRequest("GET", `/${this.version}/loadtracks?identifier=${encodeURIComponent(identifier)}`).then((res) => {
            this.riffy.emit("res", identifier, res);
        })
    }

    async decodeTrack(track: any, node: Node) {
        if (!node) node = this.leastUsedNodes[0];
        return this.makeRequest(`GET`, `/${this.version}/decodetrack?encodedTrack=${encodeURIComponent(track)}`);
    }

    async decodeTracks(track: Track) {
        return await this.makeRequest(`POST`, `/${this.version}/decodetracks`, track);
    }

    async getStats() {
        return this.makeRequest("GET", `/${this.version}/stats`);
    }

    async getInfo() {
        return this.makeRequest("GET", `/${this.version}/info`);
    }

    async getRoutePlannerStatus() {
        return await this.makeRequest(`GET`, `/${this.version}/routeplanner/status`);
    }
    async getRoutePlannerAddress(address: string | any) {
        return this.makeRequest(`POST`, `/${this.version}/routeplanner/free/address`, { address });
    }

    async parseResponse(req: Request) {
        try {
            this.riffy.emit("riffyRaw", "Rest", await req.json());
            return await req.json();
        }
        catch (e) {
            return null;
        }
    }
}