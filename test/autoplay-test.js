const assert = require("assert");
const { Player, Riffy, Track } = require("../build/index");

function createSpy(returnValue) {
    const spy = (...args) => {
        spy.called = true;
        spy.callCount++;
        spy.calls.push(args);
        return returnValue;
    };

    spy.called = false;
    spy.callCount = 0;
    spy.calls = [];
    return spy;
}

function createTrackData(overrides = {}) {
    return {
        encoded: overrides.encoded || "encoded-track",
        info: {
            identifier: "track-id",
            isSeekable: true,
            author: "Artist",
            length: 180000,
            isStream: false,
            position: 0,
            title: "Song",
            uri: "https://example.com/track",
            sourceName: "youtube",
            ...overrides.info
        },
        pluginInfo: {},
        userData: {}
    };
}

async function run() {
    const riffy = new Riffy({ user: { id: "client-id" } }, [], {
        send: () => { },
        restVersion: "v4",
        defaultSearchPlatform: "ytmsearch"
    });
    riffy.initiated = true;

    const node = {
        name: "Node-1",
        connected: true,
        rest: {
            version: "v4",
            updatePlayer: createSpy(Promise.resolve(null))
        }
    };

    const player = new Player(riffy, node, { guildId: "guild", voiceChannel: "voice" });
    player.connected = true;
    player.play = createSpy(Promise.resolve(player));

    const previous = new Track(createTrackData({ encoded: "prev-track", info: { identifier: "prev-id", title: "Previous", sourceName: "youtube" } }), { id: "requester" }, { rest: { version: "v4" } });
    player.previousTracks = [previous];
    player.playedIdentifiers = new Set(["played-id"]);

    const played = new Track(createTrackData({ encoded: "played-track", info: { identifier: "played-id", title: "Played" } }), {}, { rest: { version: "v4" } });
    const fresh = new Track(createTrackData({ encoded: "fresh-track", info: { identifier: "fresh-id", title: "Fresh" } }), {}, { rest: { version: "v4" } });

    riffy.resolve = async () => ({ loadType: "search", tracks: [played, fresh] });

    await player.autoplay(player);

    assert.strictEqual(player.queue.length, 1);
    assert.strictEqual(player.queue[0].track, "fresh-track");
    assert.strictEqual(player.queue[0].isAutoplay, true);
    assert.strictEqual(player.play.callCount, 1);
    console.log("autoplay tests passed");
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
