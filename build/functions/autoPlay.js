const undici = require('undici');
const { JSDOM } = require('jsdom');
const crypto = require('crypto');

async function scAutoPlay(url) {
    const res = await undici.fetch(`${url}/recommended`);

    if (res.status !== 200) {
        throw new Error(`Failed to fetch URL. Status code: ${res.status}`);
    }

    const html = await res.text();

    const dom = new JSDOM(html);
    const document = dom.window.document;

    const secondNoscript = document.querySelectorAll('noscript')[1];
    const sectionElement = secondNoscript.querySelector('section');
    const articleElements = sectionElement.querySelectorAll('article');

    articleElements.forEach(articleElement => {
        const h2Element = articleElement.querySelector('h2[itemprop="name"]');

        const aElement = h2Element.querySelector('a[itemprop="url"]');
        const href = `https://soundcloud.com${aElement.getAttribute('href')}`

        return href;
    });
}

async function spAutoPlay(track_id) {
    const TOTP_SECRET = new Uint8Array([53,53,48,55,49,52,53,56,53,51,52,56,55,52,57,57,53,57,50,50,52,56,54,51,48,51,50,57,51,52,55]);

    const hmac = crypto.createHmac('sha1', TOTP_SECRET);

    function generateTotp() {
        const counter = Math.floor(Date.now() / 30000);
        const counterBuffer = Buffer.alloc(8);
        counterBuffer.writeBigInt64BE(BigInt(counter));
        
        hmac.update(counterBuffer);
        const hmacResult = hmac.digest();
        
        const offset = hmacResult[hmacResult.length - 1] & 15;
        const truncatedValue = 
            ((hmacResult[offset] & 127) << 24) |
            ((hmacResult[offset + 1] & 255) << 16) |
            ((hmacResult[offset + 2] & 255) << 8) |
            (hmacResult[offset + 3] & 255);
        
        const totp = (truncatedValue % 1000000).toString().padStart(6, '0');
        return [totp, counter * 30000];
    }

    const [totp, timestamp] = generateTotp();
    const params = {
        "reason": "init",
        "productType": "web-player",
        "totp": totp,
        "totpVer": 5,
        "ts": timestamp,
    }

    const data = await undici.fetch("https://open.spotify.com/api/token?" + new URLSearchParams(params).toString());

    const body = await data.json();

    const res = await undici.fetch(`https://api.spotify.com/v1/recommendations?limit=10&seed_tracks=${track_id}`, {
        headers: {
            Authorization: `Bearer ${body.accessToken}`,
            'Content-Type': 'application/json',
        },
    })

    const json = await res.json();

    return json.tracks[Math.floor(Math.random() * json.tracks.length)].id
}

module.exports = { scAutoPlay, spAutoPlay };
