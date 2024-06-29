const undici = require('undici');
const { JSDOM } = require('jsdom');

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
    const data = await undici.fetch("https://open.spotify.com/get_access_token?reason=transport&productType=embed");

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