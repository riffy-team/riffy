const { getImageUrl } = require("../functions/fetchImage");

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
}

module.exports = { Track };
