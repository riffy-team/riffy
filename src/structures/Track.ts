import { Node, Riffy } from "..";
import { getImageUrl } from "../functions/fetchImage"

const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export interface TrackData {
    encoded: string;
    info: {
        identifier: string;
        isSeekable: boolean;
        author: string;
        length: number;
        isStream: boolean;
        position: number;
        title: string;
        uri: string;
        requester: string;
        sourceName: string;
        isrc?: string;
        thumbnail?: string;
    }
}

export class Track {
    [x: string]: any;
    track: string;
    info: {
        identifier: string;
        seekable: boolean;
        author: string;
        length: number;
        stream: boolean;
        position: number;
        title: string;
        uri: string;
        requester: string | null,
        sourceName: string;
        isrc?: string | any;
        thumbnail?: string | any;
    }

    constructor(data: TrackData, requester?: string) {
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
            requester: requester ? requester : null,
            sourceName: data.info.sourceName,
            thumbnail: data.info.thumbnail ? data.info.thumbnail : getImageUrl(data.info),
            isrc: data.info.isrc ? data.info.isrc : null
        };
    }

    async resolve(riffy: Riffy) {
        const query = [this.info.author, this.info.title].filter((x) => !!x).join(" - ");
        const result = await riffy.resolve({ query, source: riffy.options.defaultSearchPlatform, requester: this.info.requester });

        if (!result || !result.tracks.length) {
            return;
        }

        const officialAudio = result.tracks.find((track: this) => {
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
            const sameDuration = result.tracks.find((track: this) => track.info.length >= (this.info.length ? this.info.length : 0) - 2000 &&
                track.info.length <= (this.info.length ? this.info.length : 0) + 2000);

            if (sameDuration) {
                this.info.identifier = sameDuration.info.identifier;
                this.track = sameDuration.track;
                return this;
            }

            const sameDurationAndTitle = result.tracks.find((track: this) => track.info.title === this.info.title && track.info.length >= (this.info.length ? this.info.length : 0) - 2000 && track.info.length <= (this.info.length ? this.info.length : 0) + 2000);

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