# Nodelink-Only Features

[Nodelink](https://nodelink.js.org) is a Lavalink-compatible server that Riffy treats as a superset of Lavalink. Riffy auto-detects it from `node.info.isNodelink` (populated from the `/info` response on WS `open`). Almost every Nodelink API is guarded so calling it on a plain Lavalink node throws a clear error.

Detection helpers: `node.info?.isNodelink` (boolean), `node.mixer.check()`, `node.sponserBlock.check()`, `node.lyrics.checkAvailable(...)`.

## Lyrics (`Node.lyrics`)
- `lyrics.checkAvailable(eitherOne=true, ...plugins)` — verifies required plugins are present on the node (`lavalyrics-plugin`, `java-lyrics-plugin`, `lyrics`). Throws `RangeError` if missing and node not connected.
- `lyrics.get(trackOrEncoded, skipTrackSource=false)` — v4 `/v4/lyrics?...`.
- `lyrics.getCurrentTrack(guildId, skipTrackSource, plugin)` — fetches lyrics for the active track, with fallback URL logic depending on which lyric plugins the node exposes.

These surface as `lyricsFound` / `lyricsNotFound` / `lyricsLine` events.

## Audio Mixer (`Node.mixer`)
Adds/removes/updates mix layers (overlapping audio) on a player — Nodelink's "Audio Mixer".
- `mixer.addMixLayer(guildId, { track, volume })` — `POST /v4/.../mix`.
- `mixer.getActiveMixLayers(guildId)` — `GET`.
- `mixer.updateMixLayerVolume(guildId, mixId, volume)` — `PATCH` (volume 0–1).
- `mixer.removeMixLayer(guildId, mixId)` — `DELETE`.
- All throw if `!isNodelink`. Surfaced via `mixStarted` / `mixEnded` events.

## SponsorBlock (`Node.sponsorBlock`)
Nodelink's segment-skip feature.
- `sponsorBlock.getCurrentBlock(guildId)` — `GET`.
- `sponsorBlock.updateSettings(guildId, options)` — `PATCH` with strict validation (categories array of strings, optional actionTypes, non-negative `skipMarginMs`).
- `sponsorBlock.setBlockSegments(guildId, segments)` — `PUT` (validates each segment: uuid, start/end, category, actionType, votes, locked, videoDuration, description).
- `sponsorBlock.clearSponsorBlock(guildId)` — `DELETE`.
- Surfaced via `sponsorBlockSegmentsLoaded` / `sponsorBlockSegmentSkipped` events.

## Direct streaming & PCM (`Node`)
Require corresponding server-side config flags on the Nodelink server.
- `fetchTrackStream(encodedTrackStr, itag=null)` — `GET /v4/trackstream?...` returns the source audio URL (not the bytes). Needs `enableTrackStreamEndpoint`.
- `fetchPCMStream(encodedTrackStr, volume, position, filters)` — `POST /v4/loadstream` returns a raw PCM `ReadableStream` for custom processing/recording. Needs `enableLoadStreamEndpoint`. Validates `volume` (0–1000), `position` (≥0).
- `loadChapters(encodedTrackStr)` — `GET /v4/loadchapters?...` returns YouTube chapter markers.

## Other Nodelink touches
- **Player `sendNextTrack(track)`** — preloads next track for gapless playback (`{ nextTrack: { encoded } }`).
- **Player `setFadings(enabled, fading)`** — high-fidelity volume fades (trackStart/trackEnd/trackStop/seek/ducking) with duration + curve.
- **v4 voice payload `channelId`** — added in v1.0.12 (`Connection.checkAndSend`) for upcoming Nodelink v4.2.0.

## Change guidance
- Any new Nodelink method must: (1) live on `Node` (or `Player` for player-scoped ones), (2) guard with `this.info?.isNodelink` / `*.check()`, (3) throw `TypeError` for invalid args matching the existing strict validation style, and (4) map emitted events in `Player.handleEvent` and `RiffyEvents` (`index.d.ts`).
- Nodelink search types use `searchType` (`track|album|playlist|artist`) in `Riffy.resolve`; the node filter `n.info.isNodelink` is applied when a `searchType` is requested.
