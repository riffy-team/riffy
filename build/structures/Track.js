const { getImageUrl } = require("../functions/fetchImage");
const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

class Track {
    constructor(data, requester, node) {
        this.track = data.encoded
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
        };

        if (node.rest.version === "v4") {
            this.info.isrc = data.info.isrc

            if (data.info.thumbnail) {
                this.info.thumbnail = data.info.thumbnail
            } else {
                this.info.thumbnail = getImageUrl(this.info)
            }
        } else {
            this.info.thumbnail = getImageUrl(this.info)
        }
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
