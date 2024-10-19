// destructured, named undiciFetch for Better readability
const { fetch: undiciFetch, Response } = require("undici");
const nodeUtil = require("node:util")

class Rest {
  constructor(riffy, options) {
    this.riffy = riffy;
    this.url = `http${options.secure ? "s" : ""}://${options.host}:${
      options.port
    }`;
    this.sessionId = options.sessionId;
    this.password = options.password;
    this.version = options.restVersion;
    this.calls = 0;
  }

  setSessionId(sessionId) {
    this.sessionId = sessionId;
  }

  async makeRequest(method, endpoint, body = null, includeHeaders = false) {
    const headers = {
      "Content-Type": "application/json",
      Authorization: this.password,
    };

    const requestOptions = {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    };
    
    const response = await undiciFetch(this.url + endpoint, requestOptions).catch((e) => {
      
      throw new Error(`There was an Error while Making Node Request(likely caused by Network Issue): ${method} ${this.url}${endpoint}`, { cause: e });
    })

    this.calls++;

    // Parses The Request
    const data = await this.parseResponse(response);

    // Emit apiResponse event with important data and Response
    this.riffy.emit("apiResponse", endpoint, response);

    this.riffy.emit(
      "debug",
      `[Rest] ${requestOptions.method} ${
        endpoint.startsWith("/") ? endpoint : `/${endpoint}`
      } ${body ? `body: ${JSON.stringify(body)}` : ""} -> \n Status Code: ${
        response.status
      }(${response.statusText}) \n Response(body): ${JSON.stringify(await data)} \n Headers: ${
        nodeUtil.inspect(response.headers)
      }`
    );

    return includeHeaders === true ? {
      data,
      headers: response.headers,
    } : data;
  }

  async getPlayers() {
    return this.makeRequest(
      "GET",
      `/${this.version}/sessions/${this.sessionId}/players`
    );
  }

  async updatePlayer(options) {
    // destructure data as requestBody for ease of use.
    let { data: requestBody } = options;

    if (
      (typeof requestBody.track !== "undefined" &&
        requestBody.track.encoded &&
        requestBody.track.identifier) ||
      (requestBody.encodedTrack && requestBody.identifier)
    )
      throw new Error(
        `${
          typeof requestBody.track !== "undefined"
            ? `encoded And identifier`
            : `encodedTrack And identifier`
        } are mutually exclusive (Can't be provided together) in Update Player Endpoint`
      );

    if (this.version === "v3" && options.data?.track) {
      const { track, ...otherRequestData } = requestBody;

      requestBody = { ...otherRequestData };

      Object.assign(
        options.data,
        typeof options.data.track.encoded !== "undefined"
          ? { encodedTrack: track.encoded }
          : { identifier: track.identifier }
      );
    }

    return this.makeRequest(
      "PATCH",
      `/${this.version}/sessions/${this.sessionId}/players/${options.guildId}?noReplace=false`,
      options.data
    );
  }

  async destroyPlayer(guildId) {
    return this.makeRequest(
      "DELETE",
      `/${this.version}/sessions/${this.sessionId}/players/${guildId}`
    );
  }

  async getTracks(identifier) {
    return this.makeRequest(
      "GET",
      `/${this.version}/loadtracks?identifier=${encodeURIComponent(identifier)}`
    );
  }

  async decodeTrack(track, node) {
    if (!node) node = this.leastUsedNodes[0];
    return this.makeRequest(
      `GET`,
      `/${this.version}/decodetrack?encodedTrack=${encodeURIComponent(track)}`
    );
  }

  async decodeTracks(tracks) {
    return this.makeRequest(
      `POST`,
      `/${this.version}/decodetracks`,
      tracks
    );
  }

  async getStats() {
    return this.makeRequest("GET", `/${this.version}/stats`);
  }

  async getInfo() {
    return this.makeRequest("GET", `/${this.version}/info`);
  }

  async getRoutePlannerStatus() {
    return this.makeRequest(
      `GET`,
      `/${this.version}/routeplanner/status`
    );
  }
  async getRoutePlannerAddress(address) {
    return this.makeRequest(
      `POST`,
      `/${this.version}/routeplanner/free/address`,
      { address }
    );
  }

  /**
   * @description Parses The Process Request and Performs necessary Checks(if statements)
   * @param {Response} req
   * @returns {object | null}
   */
  async parseResponse(req) {
    if (req.status === 204) {
      return null;
    }

    try {
      return await req[req.headers.get("Content-Type").includes("text/plain") ? "text" : "json"]();
    } catch (e) {
      this.riffy.emit(
        "debug",
        `[Rest - Error] There was an Error for ${
          new URL(req.url).pathname
        } ${e}`
      );
      return null;
    }
  }
}

module.exports = { Rest };
