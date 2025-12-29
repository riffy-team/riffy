// destructured, named undiciFetch for Better readability
const { fetch: undiciFetch, Response } = require("undici");

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

    const jsonBody = body ? JSON.stringify(body) : null;
    const finalEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

    const requestOptions = {
      method,
      headers,
      body: jsonBody,
    };

    let response;
    let attempt = 0;
    const maxRetries = 3;
    const retryDelay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    while (attempt <= maxRetries) {
      try {
        response = await undiciFetch(this.url + finalEndpoint, requestOptions);

        if (response.ok || response.status === 204 || response.status < 500) {
          break; // Success or client error (which shouldn't be retried)
        }

        throw new Error(`Status ${response.status}: ${response.statusText}`);
      } catch (e) {
        attempt++;
        if (attempt > maxRetries) {
          throw new Error(
            `Failed to make request to ${method} ${this.url}${finalEndpoint} after ${maxRetries} attempts. Last error: ${e.message}`,
            { cause: e }
          );
        }

        const delay = 500 * Math.pow(2, attempt - 1);
        this.riffy.emit("debug", `[Rest] Request failed (Attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms... Error: ${e.message}`);
        await retryDelay(delay);
      }
    }
    
    this.calls++;

    // Parses The Request
    const data = await this.parseResponse(response);

    // Emit apiResponse event with important data and Response
    this.riffy.emit("apiResponse", finalEndpoint, response);

    this.riffy.emit(
      "debug",
      `[Rest] ${requestOptions.method} ${finalEndpoint} ${jsonBody ? `body: ${jsonBody}` : ""} -> \n Status Code: ${
        response.status
      }(${response.statusText}) \n Response(body): ${JSON.stringify(data)} \n Headers: ${
        JSON.stringify(Object.fromEntries(response.headers.entries()))
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

  async decodeTrack(track) {
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
      const contentType = req.headers.get("Content-Type");
      return await req[contentType && contentType.includes("text/plain") ? "text" : "json"]();
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
