const undici = require('undici');

/**
 * 
 * @param {string} url soundcloud song url without parameters
 * @returns 
 */

async function soundcloud(url) {
    const res = await undici.fetch(`https://riffy.unburn.tech/api/soundcloud`, {
        method: "POST",
        body: JSON.stringify({
            "url": url
        })
    });

    const output = await res.json();

    if (output.status !== 200) {
        throw new Error(`Failed to fetch URL. Status code: ${output.status}`);
    }

    return output;
}

/**
 * 
 * @param {string} track_id spotify song track id
 * @returns 
 */

async function spotify(track_id) {
    const res = await undici.fetch(`https://riffy.unburn.tech/api/spotify`, {
        method: "POST",
        body: JSON.stringify({
            "track_id": track_id
        })
    });

    const output = await res.json();

    if (output.status !== 200) {
        throw new Error(`Failed to fetch URL. Status code: ${output.status}`);
    }

    return output;
}

module.exports = { soundcloud, spotify };