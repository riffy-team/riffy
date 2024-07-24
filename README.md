# Riffy [![NPM version](https://img.shields.io/npm/v/riffy.svg?style=flat-square&color=informational)](https://npmjs.com/package/riffy)

A lavalink client for Node.JS, designed to be simple and easy to use. Compatible with all Discord libraries (discord.js, Eris, etc.).

## Installation

```shell
npm install riffy
```

## Features

-   Supports versions 3 and 4 of the Lavalink protocols.
-   Autoplay support for YouTube, SoundCloud, and Spotify.
-   Compatible with all Discord libraries (discord.js, Eris, etc.).
-   Works with all Lavalink filters.

## Example Project

-   [Riffy Music Bot](https://github.com/riffy-team/riffy-music-bot)

## Documentation

-   [Documentation](https://riffy.js.org)
-   [Discord Server](https://discord.gg/TvjrWtEuyP)

## Quick Start

First things first, you need to have a Lavalink node running. You can download the latest version of Lavalink from [here](https://github.com/lavalink-devs/Lavalink), or you can use [this nodes](https://riffy.js.org/resources) for free.

> [!NOTE]
> This project uses `MessageContent` intent, so make sure to enable it in your application settings.

### Creating a Project

We are using [discord.js](https://discord.js.org/) for this example, but you can use any Discord library you prefer.

Import the `Riffy` class from the `riffy` package.

```js
// For CommonJS
const { Riffy } = require("riffy");
// For ES6
import { Riffy } from "riffy";
```

Below is an example of a basic Discord music bot using Discord.js and Riffy. (Lavalink V4)

```js
// index.js

const { Client, GatewayDispatchEvents } = require("discord.js");
const { Riffy } = require("riffy");

const client = new Client({
    intents: [
        "Guilds",
        "GuildMessages",
        "GuildVoiceStates",
        "GuildMessageReactions",
        "MessageContent",
        "DirectMessages",
    ],
});

const nodes = [
    {
        host: "localhost",
        password: "youshallnotpass",
        port: 2333,
        secure: false,
    },
];

client.riffy = new Riffy(client, nodes, {
    send: (payload) => {
        const guild = client.guilds.cache.get(payload.d.guild_id);
        if (guild) guild.shard.send(payload);
    },
    defaultSearchPlatform: "ytmsearch",
    restVersion: "v4", // Or "v3" based on your Lavalink version.
});

client.on("ready", () => {
    client.riffy.init(client.user.id);
    console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
    if (!message.content.startsWith("!") || message.author.bot) return;

    const args = message.content.slice(1).trim().split(" ");
    const command = args.shift().toLowerCase();

    if (command === "play") {
        const query = args.join(" ");

        // Create a player.
        const player = client.riffy.createConnection({
            guildId: message.guild.id,
            voiceChannel: message.member.voice.channel.id,
            textChannel: message.channel.id,
            deaf: true,
        });

        const resolve = await client.riffy.resolve({
            query: query,
            requester: message.author,
        });
        const { loadType, tracks, playlistInfo } = resolve;

        /**
         * Important: If you are using Lavalink V3, here are the changes you need to make:
         *
         * 1. Replace "playlist" with "PLAYLIST_LOADED"
         * 2. Replace "search" with "SEARCH_RESULT"
         * 3. Replace "track" with "TRACK_LOADED"
         */

        if (loadType === "playlist") {
            for (const track of resolve.tracks) {
                track.info.requester = message.author;
                player.queue.add(track);
            }

            message.channel.send(
                `Added: \`${tracks.length} tracks\` from \`${playlistInfo.name}\``
            );
            if (!player.playing && !player.paused) return player.play();
        } else if (loadType === "search" || loadType === "track") {
            const track = tracks.shift();
            track.info.requester = message.author;

            player.queue.add(track);
            message.channel.send(`Added: \`${track.info.title}\``);
            if (!player.playing && !player.paused) return player.play();
        } else {
            return message.channel.send("There are no results found.");
        }
    }
});

// This will send log when the lavalink node is connected.
client.riffy.on("nodeConnect", (node) => {
    console.log(`Node "${node.name}" connected.`);
});

// This will send log when the lavalink node faced an error.
client.riffy.on("nodeError", (node, error) => {
    console.log(`Node "${node.name}" encountered an error: ${error.message}.`);
});

// This is the event handler for track start.
client.riffy.on("trackStart", async (player, track) => {
    const channel = client.channels.cache.get(player.textChannel);

    channel.send(`Now playing: \`${track.info.title}\` by \`${track.info.author}\`.`);
});

// This is the event handler for queue end.
client.riffy.on("queueEnd", async (player) => {
    const channel = client.channels.cache.get(player.textChannel);

    // Set this to true if you want to enable autoplay.
    const autoplay = false;

    if (autoplay) {
        player.autoplay(player);
    } else {
        player.destroy();
        channel.send("Queue has ended.");
    }
});

// This will update the voice state of the player.
client.on("raw", (d) => {
    if (
        ![
            GatewayDispatchEvents.VoiceStateUpdate,
            GatewayDispatchEvents.VoiceServerUpdate,
        ].includes(d.t)
    )
        return;
    client.riffy.updateVoiceState(d);
});

client.login("Discord-Bot-Token-Here");
```

### Running the Bot

Now that we have created our project, we can run our bot by typing the following command in the terminal.

```shell
# node.js
node index.js
# bun
bun run index.js
```

After running the bot, you can invite it to your server and use the `!play` command to play music.

### Conclusion

That's it! You have successfully created a discord music bot using riffy. If you have any questions, feel free to join our [discord server](https://discord.gg/TvjrWtEuyP).

We have set this example by keeping in mind that you know the basics of discord.js or any other discord library you are using.

## Our Team

🟪 Elitex

-   Github: [@Elitex](https://github.com/Elitex07)
-   Discord: @elitex

🟥 FlameFace

-   Github: [@FlameFace](https://github.com/flam3face)
-   Discord: @flameface

🟦 UnschooledGamer

-   Github: [@UnschooledGamer](https://github.com/UnschooledGamer)
-   Discord: @unschooledgamer

## License

This project is licensed under the [MIT License](./LICENSE)
