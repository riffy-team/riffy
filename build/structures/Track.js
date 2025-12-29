const { getImageUrl } = require("../functions/fetchImage");
const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

class Track {
    constructor(data, requester, node) {
        this.rawData = data;
        this.track = data.encoded;
        this.info = {
            identifier: data.info.identifier,
            seekable: data.info.isSeekable,
            author: data.info.author,
            length: data.info.length,
            stream: data.info.isStream,
            position: data.info.position,
            title: data.info.title,
            uri: data.info.uri,
            requester,
            sourceName: data.info.sourceName,
            isrc: data.info?.isrc || null,
            _cachedThumbnail: data.info.thumbnail ?? null,
            get thumbnail() {
                if (this._cachedThumbnail) return this._cachedThumbnail;
                if (data.info.thumbnail) return data.info.thumbnail;

                if (node.rest.version === "v4") {
                    if (data.info.artworkUrl) {
                        this._cachedThumbnail = data.info.artworkUrl;
                        return data.info.artworkUrl
                    } else {
                        return !this._cachedThumbnail ? (this._cachedThumbnail = getImageUrl(this)) : this._cachedThumbnail ?? null
                    }
                } else {
                    return !this._cachedThumbnail
                        ? (this._cachedThumbnail = getImageUrl(this))
                        : this._cachedThumbnail ?? null;
                }
            }
        };


        this.pluginInfo = data.pluginInfo || {};
        this.userData = data.userData || {};
    }

    /**
     * @description Formats the track duration into a string (e.g. "05:23", "01:02:30")
     * @returns {string}
     */
    get formattedDuration() {
        if (!this.info.length) return "00:00";
        
        const milliseconds = this.info.length;
        const seconds = Math.floor((milliseconds / 1000) % 60);
        const minutes = Math.floor((milliseconds / (1000 * 60)) % 60);
        const hours = Math.floor((milliseconds / (1000 * 60 * 60)) % 24);

        const parts = [];
        if (hours > 0) parts.push(hours.toString().padStart(2, '0'));
        parts.push(minutes.toString().padStart(2, '0'));
        parts.push(seconds.toString().padStart(2, '0'));

        return parts.join(':');
    }

    async resolve(riffy) {
        const query = [this.info.author, this.info.title].filter((x) => !!x).join(" - ");
        const result = await riffy.resolve({ query, source: riffy.options.defaultSearchPlatform, requester: this.info.requester });

        if (!result || !result.tracks.length) {
            return;
        }

        const officialAudio = result.tracks.find((track) => {
            const author = [this.info.author, `${this.info.author} - Topic`];
            return author.some((name) => new RegExp(`^${escapeRegExp(name)}$`, "i").test(track.info.author)) ||
                new RegExp(`^${escapeRegExp(this.info.title)}$`, "i").test(track.info.title);
        });

        if (officialAudio) {
            this.info.identifier = officialAudio.info.identifier;
            this.track = officialAudio.track;
            return this;
        }

        if (this.info.length) {
            const sameDuration = result.tracks.find((track) => track.info.length >= (this.info.length ? this.info.length : 0) - 2000 &&
                track.info.length <= (this.info.length ? this.info.length : 0) + 2000);

            if (sameDuration) {
                this.info.identifier = sameDuration.info.identifier;
                this.track = sameDuration.track;
                return this;
            }

            const sameDurationAndTitle = result.tracks.find((track) => track.info.title === this.info.title && track.info.length >= (this.info.length ? this.info.length : 0) - 2000 && track.info.length <= (this.info.length ? this.info.length : 0) + 2000);

            if (sameDurationAndTitle) {
                this.info.identifier = sameDurationAndTitle.info.identifier;
                this.track = sameDurationAndTitle.track;
                return this;
            }
        }

        this.info.identifier = result.tracks[0].info.identifier;
        this.track = result.tracks[0].track;
        return this;
    }
}

module.exports = { Track };
