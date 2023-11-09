## **About**
**Riffy** is a lavalink client for node.js. It is designed to be simple and easy to use, with a focus on stablity and more features.

## **Installation**
```
npm install riffy
```

## **Features**
- Supports v3 and v4 of the lavalink protocols.
- Autoplay support for youtube, soundcloud & spotify.
- Works with all discord libraries (discord.js, eris, etc..)
- All working filters (bassboost, nightcore, etc..)

## **Example Project**
- [Riffy Music Bot](https://github.com/riffy-team/riffy-music-bot)

## **Documentation**
- [Documentation](https://riffy.js.org)
- [Discord Server](https://discord.gg/TvjrWtEuyP)

#### **1. Lavalink Node**
First thing first, you need to have a lavalink node running. You can download the latest version of lavalink from [here](https://github.com/lavalink-devs/Lavalink), or you can use [this]() for free.

#### **2. Creating a Project**
We are using [discord.js](https://discord.js.org) for this example, but you can use any discord library you want.

Import the `Riffy` from the package.
```js
const { Riffy } = require("riffy");
```

Below is the example for basic discord music bot, using discord.js _(used lavalink v4)_

```js
// [index.js]

const { Client, GatewayDispatchEvents } = require("discord.js");
const { Riffy } = require("riffy");

const client = new Client({
    intents: [
        "Guilds",
        "GuildMessages",
        "GuildVoiceStates",
        "GuildMessageReactions",
        "MessageContent",
        "DirectMessages"
    ]
});

const nodes = [
    {
        host: "localhost",
        password: "youshallnotpass",
        port: 2333,
        secure: false
    },
];

client.riffy = new Riffy(client, nodes, {
    send: (payload) => {
        const guild = client.guilds.cache.get(payload.d.guild_id);
        if (guild) guild.shard.send(payload);
    },
    defaultSearchPlatform: "ytmsearch",
    restVersion: "v4" // or v3 based on your lavalink version
});

client.on("ready", () => {
    client.riffy.init(client.user.id);
    console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
    if (!message.content.startsWith('!') || message.author.bot) return;

    const args = message.content.slice(1).trim().split(" ");
    const command = args.shift().toLowerCase();

    if (command === "play") {
        const query = args.join(" ");

		// Create a player.
        const player = client.riffy.createConnection({
            guildId: message.guild.id,
            voiceChannel: message.member.voice.channel.id,
            textChannel: message.channel.id,
            deaf: true
        });

        const resolve = await client.riffy.resolve({ query: query, requester: message.author });
        const { loadType, tracks, playlistInfo } = resolve;

		/**
		 * Important: If you are using Lavalink V3, here are the changes you need to make:
		 * 
		 * 1. Replace "playlist" with "PLAYLIST_LOADED"
		 * 2. Replace "search" with "SEARCH_RESULT"
		 * 3. Replace "track" with "TRACK_LOADED" 
		 */

        if (loadType === 'playlist') {
            for (const track of resolve.tracks) {
                track.info.requester = message.author;
                player.queue.add(track);
            }

            message.channel.send(`Added: \`${tracks.length} tracks\` from \`${playlistInfo.name}\``,);
            if (!player.playing && !player.paused) return player.play();

        } else if (loadType === 'search' || loadType === 'track') {
            const track = tracks.shift();
            track.info.requester = message.author;

            player.queue.add(track);
            message.channel.send(`Added: \`${track.info.title}\``);
            if (!player.playing && !player.paused) return player.play();
        } else {
            return message.channel.send('There are no results found.');
        }
    }
})

// This will send log when the lavalink node is connected.
client.riffy.on("nodeConnect", node => {
    console.log(`Node "${node.name}" connected.`)
})

// This will send log when the lavalink node faced an error.
client.riffy.on("nodeError", (node, error) => {
    console.log(`Node "${node.name}" encountered an error: ${error.message}.`)
})

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
        player.autoplay(player)
    } else {
        player.destroy();
        channel.send("Queue has ended.");
    }
})

// This will update the voice state of the player.
client.on("raw", (d) => {
    if (![GatewayDispatchEvents.VoiceStateUpdate, GatewayDispatchEvents.VoiceServerUpdate,].includes(d.t)) return;
    client.riffy.updateVoiceState(d);
});

client.login("Discord-Bot-Token-Here");
```

#### **3. Running our Discord bot**
Now that we have created our project, we can run our bot by typing __node index.js__ in the terminal.

When the bot is running, you can use the __!play song_name__ command to play music.

#### **Conclusion**
That's it! You have successfully created a discord music bot using riffy. If you have any questions, feel free to join our [discord server](https://discord.gg/TvjrWtEuyP).

We have set this example by keeping in mind that you know the basics of discord.js or any other discord library you are using.

## **Our Team**
🟪 Elitex
- Github: [@Elitex](https://github.com/Elitex07)
- Discord: @elitex

🟥 FlameFace
- Github: [@FlameFace](https://github.com/flam3face)
- Discord: @flameface

🟦 UnschooledGamer
- Github: [@UnschooledGamer](https://github.com/UnschooledGamer)
- Discord: @unschooledgamer

## **License**
This project is licensed under the [MIT License](./LICENSE)