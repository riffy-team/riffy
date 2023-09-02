const undici = require("undici")

async function getImageUrl(info) {
    if (info.sourceName === "spotify") {
        try {
            const match = info.uri.match(/track\/([a-zA-Z0-9]+)/);
            if (match) {
                const res = await undici.fetch(`https://open.spotify.com/oembed?url=${info.uri}`);
                const json = await res.json();

                return json.thumbnail_url
            }
        } catch (error) {
            return null;
        }
    }

    if (info.sourceName === "soundcloud") {
        try {
            const res = await undici.fetch(`https://soundcloud.com/oembed?format=json&url=${info.uri}`);
            const json = await res.json();
            const thumbnailUrl = json.thumbnail_url;

            return thumbnailUrl;
        } catch (error) {
            return null;
        }
    }

    if (info.sourceName === "youtube") {
        const maxResUrl = `https://img.youtube.com/vi/${info.identifier}/maxresdefault.jpg`;
        const hqDefaultUrl = `https://img.youtube.com/vi/${info.identifier}/hqdefault.jpg`;
        const mqDefaultUrl = `https://img.youtube.com/vi/${info.identifier}/mqdefault.jpg`;
        const defaultUrl = `https://img.youtube.com/vi/${info.identifier}/default.jpg`;

        try {
            const maxResResponse = await undici.fetch(maxResUrl);

            if (maxResResponse.ok) {
                return maxResUrl;
            } else {
                const hqDefaultResponse = await undici.fetch(hqDefaultUrl);

                if (hqDefaultResponse.ok) {
                    return hqDefaultUrl;
                } else {
                    const mqDefaultResponse = await undici.fetch(mqDefaultUrl);

                    if (mqDefaultResponse.ok) {
                        return mqDefaultUrl;
                    } else {
                        const defaultResponse = await undici.fetch(defaultUrl);

                        if (defaultResponse.ok) {
                            return defaultUrl;
                        } else {
                            return null;
                        }
                    }
                }
            }
        } catch (error) {
            return null;
        }
    }
    return null;
}

module.exports = { getImageUrl };