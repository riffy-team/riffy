const { getImageUrl } = require("../functions/fetchImage");
const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

class Track {
    constructor(data, requester, node) {
        const info = data?.info ?? {};
        this.rawData = data;
        this.track = data?.encoded ?? null;
        this.encoded = data?.encoded ?? null;
        this.info = {
            identifier: info.identifier ?? null,
            seekable: info.isSeekable ?? false,
            author: info?.author,
            length: info?.length,
            stream: info.isStream ?? false,
            position: info.position ?? 0,
            title: info.title ?? null,
            uri: info?.uri,
            requester,
            sourceName: info.sourceName ?? null,
            isrc: info?.isrc || null,
            _cachedThumbnail: info.thumbnail ?? null,
            get thumbnail() {
                if (this._cachedThumbnail) return this._cachedThumbnail;
                if (info.thumbnail) return info.thumbnail;

                if (node.rest.version === "v4" && info.artworkUrl) {
                    this._cachedThumbnail = info.artworkUrl;
                    return this._cachedThumbnail ?? null;
                }

                this._cachedThumbnail = getImageUrl(this);
                return this._cachedThumbnail ?? null;
            }
        };


        this.pluginInfo = data?.pluginInfo
        this.userData = data?.userData
        this.isAutoplay = false;
    }

    async resolve(riffy) {
        const query = [this.info.author, this.info.title].filter((x) => !!x).join(" - ");
        const result = await riffy.resolve({ query, source: riffy.options.defaultSearchPlatform, requester: this.info.requester });

        if (!result || !result.tracks.length) {
            return;
        }

        const authorRegexes = [this.info.author, `${this.info.author} - Topic`]
            .map(name => new RegExp(`^${escapeRegExp(name)}$`, "i"));
        const titleRegex = new RegExp(`^${escapeRegExp(this.info.title)}$`, "i");

        const officialAudio = result.tracks.find((track) => {
            return authorRegexes.some(rx => rx.test(track.info.author)) ||
                titleRegex.test(track.info.title);
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
