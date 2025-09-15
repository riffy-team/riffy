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

    const recommendedUrls = [];
    articleElements.forEach(articleElement => {
        const h2Element = articleElement.querySelector('h2[itemprop="name"]');

        const aElement = h2Element.querySelector('a[itemprop="url"]');
        const href = `https://soundcloud.com${aElement.getAttribute('href')}`

        recommendedUrls.push(href);
    });
    return recommendedUrls;
}

async function spAutoPlay(track_id) {
    // Since Spotify's recommendations API is deprecated and unreliable,
    // This approach is more reliable.

    try {
        // For now, return null to indicate we need track info from the player
        // The actual implementation will be handled in the Player.autoplay method
        return null;
    } catch (error) {
        console.error('Spotify autoplay error:', error);
        return null;
    }
}

module.exports = { scAutoPlay, spAutoPlay };