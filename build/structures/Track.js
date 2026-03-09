const { getImageUrl } = require("../functions/fetchImage");
const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isFiniteLength = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;

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


        this.pluginInfo = data.pluginInfo
        this.userData = data.userData
        this.isAutoplay = false;
    }

    async resolve(riffy) {
        const query = [this.info.author, this.info.title].filter((x) => !!x).join(" - ");
        const result = await riffy.resolve({ query, source: riffy.options.defaultSearchPlatform, requester: this.info.requester });

        if (!result || !result.tracks.length) {
            return;
        }

        const authorRegexes = [this.info.author, `${this.info.author} - Topic`]
            .filter(Boolean)
            .map(name => new RegExp(`^${escapeRegExp(name)}$`, "i"));
        const titleRegex = this.info.title
            ? new RegExp(`^${escapeRegExp(this.info.title)}$`, "i")
            : null;

        const officialAudio = result.tracks.find((track) => {
            const authorMatches = authorRegexes.length > 0 && authorRegexes.some(rx => rx.test(track.info.author));
            const titleMatches = titleRegex ? titleRegex.test(track.info.title) : false;
            return authorMatches && titleMatches;
        });

        if (officialAudio) {
            this.info.identifier = officialAudio.info.identifier;
            this.track = officialAudio.track;
            return this;
        }

        if (isFiniteLength(this.info.length)) {
            const sameDurationAndTitle = result.tracks.find((track) => titleRegex && titleRegex.test(track.info.title) && isFiniteLength(track.info.length) && Math.abs(track.info.length - this.info.length) <= 2000);

            if (sameDurationAndTitle) {
                this.info.identifier = sameDurationAndTitle.info.identifier;
                this.track = sameDurationAndTitle.track;
                return this;
            }

            const sameDuration = result.tracks.find((track) => isFiniteLength(track.info.length) && Math.abs(track.info.length - this.info.length) <= 2000);

            if (sameDuration) {
                this.info.identifier = sameDuration.info.identifier;
                this.track = sameDuration.track;
                return this;
            }
        }

        this.info.identifier = result.tracks[0].info.identifier;
        this.track = result.tracks[0].track;
        return this;
    }
}

module.exports = { Track };
