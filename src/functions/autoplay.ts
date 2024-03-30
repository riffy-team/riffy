import undici from "undici"

export interface Song {
    status: number;
    songs?: string;
    error?: string;
}

// soundcloud.ts
async function Soundcloud(url: string): Promise<Song> {
    try {
        const res = await undici.fetch(`${url}/recommended`);

        if (res.status !== 200) {
            return Response.json(`Failed to fetch URL. Status code: ${res.status}`)
        }

        const html = await res.text();

        const hrefs = [];
        const regex = /<section\b[^>]*>([\s\S]*?)<\/section>/g;
        const sectionMatch = regex.exec(html);

        if (sectionMatch) {
            const sectionContent = sectionMatch[1];
            const aRegex = /<a\s+[^>]*itemprop="url"\s+[^>]*href="([^"]*)"/g;

            let match;
            while ((match = aRegex.exec(sectionContent)) !== null) {
                hrefs.push(`https://soundcloud.com${match[1]}`);
            }
        }

        return { status: 200, songs: hrefs[0] }

    } catch (error) {
        return { status: 400, error: "Something went wrong. Please check the URL and try again." }
    }
}

// spotify.ts
async function Spotify(track_id: string): Promise<Song> {
    try {
        const data = await undici.fetch("https://open.spotify.com/get_access_token?reason=transport&productType=embed");
        const body: any = await data.json();

        const res: any = await undici.fetch(`https://api.spotify.com/v1/recommendations?limit=2&seed_tracks=${track_id}`, {
            headers: {
                Authorization: `Bearer ${body.accessToken}`,
                'Content-Type': 'application/json'
            },
        })

        const json = await res.json();

        return { status: 200, songs: json.tracks[Math.floor(Math.random() * json.tracks.length)].id }
    } catch (error) {
        return { status: 400, error: "Something went wrong. Please check the URL and try again." }
    }
}

export { Soundcloud, Spotify }