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

    const trackLinks = [];
    articleElements.forEach(articleElement => {
        const h2Element = articleElement.querySelector('h2[itemprop="name"]');
        if (h2Element) {
            const aElement = h2Element.querySelector('a[itemprop="url"]');
            if (aElement) {
                const href = aElement.getAttribute('href');
                if (href) {
                    trackLinks.push(`https://soundcloud.com${href}`);
                }
            }
        }
    });

    if (trackLinks.length === 0) {
        return null;
    }

    return trackLinks[Math.floor(Math.random() * trackLinks.length)];
}



/**
 * Fetches an access token from the Spotify API using the Client Credentials Flow.
 * @returns {Promise<string>} A Spotify access token.
 */
async function getSpotifyAccessToken() {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Spotify Client ID or Secret not found in environment variables.');
    }

    const response = await undici.fetch("https://accounts.spotify.com/api/token", {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to get Spotify access token. Status: ${response.status}. Body: ${errorBody}`);
    }

    const data = await response.json();
    return data.access_token;
}

/**
 * Fetches a random recommended Spotify track ID using related artists and their top tracks.
 * This version uses the official Spotify API authentication method.
 * @param {string} track_id - The starting Spotify track ID.
 * @returns {Promise<string>} A recommended Spotify track ID.
 */
async function spAutoPlay(track_id) {
    try {
        const accessToken = await getSpotifyAccessToken();
        const authHeaders = { Authorization: `Bearer ${accessToken}` };

        const trackDetailsResponse = await undici.fetch(`https://api.spotify.com/v1/tracks/${track_id}`, {
            headers: authHeaders,
        });
        if (!trackDetailsResponse.ok) {
            const errorText = await trackDetailsResponse.text().catch(() => `Status: ${trackDetailsResponse.status}`);
            throw new Error(`Failed to fetch track details for ${track_id}. ${errorText}`);
        }
        const trackDetails = await trackDetailsResponse.json();
        if (!trackDetails.artists || trackDetails.artists.length === 0) {
            throw new Error(`No artists found for input track ${track_id}.`);
        }
        const primaryArtistId = trackDetails.artists[0].id;
        const market = (trackDetails.available_markets && trackDetails.available_markets.length > 0) ? trackDetails.available_markets[0] : 'US';

        let artistToQueryId = primaryArtistId;
        const relatedArtistsResponse = await undici.fetch(`https://api.spotify.com/v1/artists/${primaryArtistId}/related-artists`, {
            headers: authHeaders,
        });

        if (relatedArtistsResponse.ok) {
            const relatedArtistsData = await relatedArtistsResponse.json().catch(() => null);
            if (relatedArtistsData && relatedArtistsData.artists && relatedArtistsData.artists.length > 0) {
                artistToQueryId = relatedArtistsData.artists[Math.floor(Math.random() * relatedArtistsData.artists.length)].id;
            }
        }

        let topTracksResponse = await undici.fetch(`https://api.spotify.com/v1/artists/${artistToQueryId}/top-tracks?market=${market}`, {
            headers: authHeaders,
        });

        if (!topTracksResponse.ok && artistToQueryId !== primaryArtistId) {
            topTracksResponse = await undici.fetch(`https://api.spotify.com/v1/artists/${primaryArtistId}/top-tracks?market=${market}`, {
                headers: authHeaders,
            });
            artistToQueryId = primaryArtistId;
        }

        if (!topTracksResponse.ok) {
            const errorText = await topTracksResponse.text().catch(() => `Status: ${topTracksResponse.status}`);
            throw new Error(`Failed to fetch top tracks for artist ${artistToQueryId}. ${errorText}`);
        }

        const topTracksData = await topTracksResponse.json();
        if (!topTracksData.tracks || topTracksData.tracks.length === 0) {
            throw new Error(`No top tracks found for artist ${artistToQueryId} in market ${market}.`);
        }

        return topTracksData.tracks[Math.floor(Math.random() * topTracksData.tracks.length)].id;

    } catch (err) {
        throw new Error(`spAutoPlay error: ${err.message}`);
    }
}

module.exports = { scAutoPlay, spAutoPlay };
