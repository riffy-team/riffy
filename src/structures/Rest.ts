import { Node, Riffy, Track } from "..";
import { RestOptions } from "./Riffy";

export class Rest {
    public riffy: Riffy;
    public url: string;
    public sessionId?: string;
    public password: string;
    public version?: string;
    public calls: number;
    public leastUsedNodes: Node[] = [];

    constructor(riffy: Riffy, options: RestOptions) {
        this.riffy = riffy;
        this.url = `http${options.secure ? "s" : ""}://${options.host}${options.port ? `:${options.port}` : ""}`;
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

        try {
            const response = await fetch(this.url + endpoint, requestOptions);
            this.calls++;

            if (response.status === 204) {
                return null;
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Error making request:", error);
            return null;
        }
    }

    async getPlayers() {
        return this.makeRequest("GET", `/${this.version}/sessions/${this.sessionId}/players`);
    }

    async updatePlayer(options: { guildId: string; data: object | any }) {
        const res = await this.makeRequest("PATCH", `/${this.version}/sessions/${this.sessionId}/players/${options.guildId}?noReplace=false`, options.data);
        this.riffy.emit("res", options.guildId, res);
        return res;
    }

    async destroyPlayer(guildId: string) {
        return this.makeRequest("DELETE", `/${this.version}/sessions/${this.sessionId}/players/${guildId}`);
    }

    async getTracks(identifier: string) {
        return this.makeRequest("GET", `/${this.version}/loadtracks?identifier=${encodeURIComponent(identifier)}`);
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
            this.riffy.emit("raw", "Rest", await req.json());
            return await req.json();
        } catch (error) {
            console.error("Error parsing response:", error);
            return null;
        }
    }
}
