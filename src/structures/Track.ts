import { Riffy } from "..";
import { getImageUrl } from "../functions/fetchImage";

const escapeRegExp = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
        artworkUrl?: string;
        requester: string;
        sourceName: string;
        isrc?: string;
        thumbnail?: string;
    };
}

export class Track {
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
        requester: string | null;
        sourceName: string;
        isrc?: string | any;
        _cachedThumbnail: Awaited<string | null>;
        thumbnail?: string | any;
    };

    constructor(data: TrackData, requester?: string) {
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
            requester: requester || null,
            sourceName: data.info.sourceName,
            _cachedThumbnail: data.info.thumbnail ?? null,
            get thumbnail() {
                if (data.info.thumbnail) return data.info.thumbnail;

                if (data.info.artworkUrl) {
                    this._cachedThumbnail = data.info.artworkUrl;
                    return data.info.artworkUrl
                } else {
                    return !this._cachedThumbnail
                        ? (this._cachedThumbnail = getImageUrl(this) as unknown as string | null)
                        : this._cachedThumbnail ?? null;
                }
            },
            isrc: data.info.isrc
        };
    }

    async resolve(riffy: Riffy): Promise<this | undefined> {
        try {
            const query = [this.info.author, this.info.title].filter(Boolean).join(" - ");
            const result = await riffy.resolve({ query, source: riffy.options.defaultSearchPlatform, requester: this.info.requester });

            if (!result || result.tracks.length === 0) {
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
                const sameDuration = result.tracks.find((track) => Math.abs(track.info.length - (this.info.length || 0)) <= 2000);

                if (sameDuration) {
                    this.info.identifier = sameDuration.info.identifier;
                    this.track = sameDuration.track;
                    return this;
                }

                const sameDurationAndTitle = result.tracks.find((track) => track.info.title === this.info.title && Math.abs(track.info.length - (this.info.length || 0)) <= 2000);

                if (sameDurationAndTitle) {
                    this.info.identifier = sameDurationAndTitle.info.identifier;
                    this.track = sameDurationAndTitle.track;
                    return this;
                }
            }

            this.info.identifier = result.tracks[0].info.identifier;
            this.track = result.tracks[0].track;
            return this;
        } catch (error) {
            console.error("Error resolving track:", error);
            return;
        }
    }
}
