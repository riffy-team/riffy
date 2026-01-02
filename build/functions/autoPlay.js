const undici = require('undici');
const { JSDOM } = require('jsdom');

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function autoPlay(url, source) {
    if (source === "sound-cloud") {
        return await soundcloud(url);
    } else if (source === "spotify") {
        return await spotify(url);
    } else if (source === "apple-music") {
        return await appleMusic(url);
    } else {
        throw new Error("Unsupported source for autoPlay");
    }
}

async function soundcloud(url) {
    const res = await undici.fetch(`${url}/recommended`, {
        headers: {
            'User-Agent': USER_AGENT
        }
    });

    if (res.status !== 200) {
        throw new Error(`Failed to fetch URL. Status code: ${res.status}`);
    }

    const html = await res.text();

    const dom = new JSDOM(html);
    const document = dom.window.document;

    const noscripts = document.querySelectorAll('noscript');
    const tracks = [];

    if (noscripts.length > 1) {
        const secondNoscript = noscripts[1];
        const section = secondNoscript.querySelector('section');

        if (section) {
            const articles = section.querySelectorAll('article');
            articles.forEach(article => {
                const h2 = article.querySelector('h2[itemprop="name"]');
                if (h2) {
                    const a = h2.querySelector('a[itemprop="url"]');
                    if (a) {
                        const href = a.getAttribute('href');
                        if (href) {
                            tracks.push(`https://soundcloud.com${href}`);
                        }
                    }
                }
            });
        }
    }

    return tracks.length > 0 ? tracks[Math.floor(Math.random() * tracks.length)] : "";
}

async function spotify(url) {
    const res = await undici.fetch(url);
    if (res.status !== 200) {
        throw new Error(`Failed to fetch URL. Status code: ${res.status}`);
    }

    const html = await res.text();

    const dom = new JSDOM(html);
    const document = dom.window.document;

    const recommender = document.querySelector('div[data-testid="track-internal-link-recommender"]');
    const tracks = [];

    if (recommender) {
        const anchors = recommender.querySelectorAll('a');
        anchors.forEach(a => {
            const href = a.getAttribute('href');
            if (href && href.startsWith('/track/')) {
                tracks.push(`https://open.spotify.com${href}`);
            }
        });
    }

    return tracks.length > 0 ? tracks[Math.floor(Math.random() * tracks.length)] : "";
}

async function appleMusic(url) {
    const res = await undici.fetch(url);
    if (res.status !== 200) {
        throw new Error(`Failed to fetch URL. Status code: ${res.status}`);
    }

    const html = await res.text();

    const dom = new JSDOM(html);
    const document = dom.window.document;

    const sections = document.querySelectorAll('div[data-testid="section-container"]');
    const tracks = [];

    sections.forEach(section => {
        const ariaLabel = section.getAttribute('aria-label');
        if (ariaLabel && ariaLabel.startsWith('More By')) {
            const shelfContent = section.querySelector('ul[slot="shelf-content"]');
            if (shelfContent) {
                const lockups = shelfContent.querySelectorAll('div[data-testid="lockup-control"]');
                lockups.forEach(lockup => {
                    const a = lockup.querySelector('a');
                    if (a) {
                        const href = a.getAttribute('href');
                        if (href) {
                            tracks.push(href.startsWith('http') ? href : `https://music.apple.com${href}`);
                        }
                    }
                });
            }
        }
    });

    return tracks.length > 0 ? tracks[Math.floor(Math.random() * tracks.length)] : "";
}

module.exports = { autoPlay };