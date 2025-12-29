const undici = require('undici');
const { JSDOM } = require('jsdom');

async function scAutoPlay(url) {
    try {
        const res = await undici.fetch(`${url}/recommended`);

        if (res.status !== 200) {
            throw new Error(`Failed to fetch URL. Status code: ${res.status}`);
        }

        const html = await res.text();

        const dom = new JSDOM(html);
        const document = dom.window.document;

        const noscripts = document.querySelectorAll('noscript');
        // SoundCloud usually puts content in the second noscript tag for SEO
        const secondNoscript = noscripts[1]; 
        
        if (!secondNoscript) return null;

        const sectionElement = secondNoscript.querySelector('section');
        if (!sectionElement) return null;

        const articleElements = sectionElement.querySelectorAll('article');

        for (const articleElement of articleElements) {
            const h2Element = articleElement.querySelector('h2[itemprop="name"]');
            if (!h2Element) continue;

            const aElement = h2Element.querySelector('a[itemprop="url"]');
            if (aElement) {
                const href = aElement.getAttribute('href');
                if (href) {
                    return `https://soundcloud.com${href}`;
                }
            }
        }
        return null;
    } catch (e) {
        console.error(`[Riffy scAutoPlay] Error: ${e.message}`);
        return null;
    }
}

async function spAutoPlay(track_id) {
    // Since Spotify's recommendations API is deprecated and unreliable,
    // This approach is more reliable and it uses official YT recommendations API.
    
    // This function is currently a placeholder as the logic is handled in Player.js
    // using YouTube search fallback.
    return null;
}

module.exports = { scAutoPlay, spAutoPlay };
