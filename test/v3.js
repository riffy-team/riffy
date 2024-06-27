const { Client, GatewayDispatchEvents, AttachmentBuilder } = require("discord.js");
const { Riffy } = require("../build/index.js");
const { inspect } = require("node:util")

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
        host: "node.raidenbot.xyz",
        port: 5500,
        password: "pwd",
        secure: false
    }
];

client.riffy = new Riffy(client, nodes, {
    send: (payload) => {
        const guild = client.guilds.cache.get(payload.d.guild_id);
        if (guild) guild.shard.send(payload);
    },
    defaultSearchPlatform: "ytmsearch",
    restVersion: "v3"
});

client.on("ready", () => {
    client.riffy.init(client.user.id);
    console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
    if (!message.content.startsWith('.') || message.author.bot) return;

    const args = message.content.slice(1).trim().split(" ");
    const command = args.shift().toLowerCase();

    if (command === "play") {
        const query = args.join(" ");

        const player = client.riffy.createConnection({
            guildId: message.guild.id,
            voiceChannel: message.member.voice.channel.id,
            textChannel: message.channel.id,
            deaf: true
        });

        const resolve = await client.riffy.resolve({ query: query, requester: message.author });
        const { loadType, tracks, playlistInfo } = resolve;
        console.log(resolve)
        if (loadType === 'PLAYLIST_LOADED') {
            for (const track of resolve.tracks) {
                track.info.requester = message.author;
                player.queue.add(track);
            }

            message.channel.send(`Added: \`${tracks.length} tracks\` from \`${playlistInfo.name}\``,);
            if (!player.playing && !player.paused) return player.play();
        } else if (loadType === 'SEARCH_RESULT' || loadType === 'TRACK_LOADED') {
            const track = tracks.shift();
            track.info.requester = message.author;

            player.queue.add(track);
            message.channel.send(`Added: \`${track.info.title}\``);
            if (!player.playing && !player.paused) return player.play();
        } else {
            return message.channel.send('There are no results found.');
        }
    }

    if (command === "autoplay") {
        const player = client.riffy.players.get(message.guild.id);
        if (!player) return message.channel.send("No player found.");

        if (player.isAutoplay == false) await player.autoplay(player);
        else await player.autoplay(null);

        message.channel.send(`Autoplay is now ${player.isAutoplay ? "enabled" : "disabled"}.`);
    }

    if (command === "skip") {
        const player = client.riffy.players.get(message.guild.id);
        if (!player) return message.channel.send("No player found.");

        player.stop();
        message.channel.send("Skipped the current song.");
    }

    if (command === "stop") {
        const player = client.riffy.players.get(message.guild.id);
        if (!player) return message.channel.send("No player found.");

        player.destroy();
        message.channel.send("Stopped the player.");
    }

    if (command === "pause") {
        const player = client.riffy.players.get(message.guild.id);
        if (!player) return message.channel.send("No player found.");

        player.pause(true);
        message.channel.send("Paused the player.");
    }

    if (command === "resume") {
        const player = client.riffy.players.get(message.guild.id);
        if (!player) return message.channel.send("No player found.");

        player.pause(false);
        message.channel.send("Resumed the player.");
    }

    if (command === "volume") {
        const player = client.riffy.players.get(message.guild.id);
        if (!player) return message.channel.send("No player found.");

        const volume = parseInt(args[0]);
        if (!volume || isNaN(volume)) return message.channel.send("Please provide a valid number.");

        player.setVolume(volume);
        message.channel.send(`Set the player volume to: \`${volume}\`.`);
    }

    if (command === "queue") {
        const player = client.riffy.players.get(message.guild.id);
        if (!player) return message.channel.send("No player found.");

        const queue = player.queue;
        if (!queue.length) return message.channel.send("No songs in queue.");

        const embed = {
            title: "Queue",
            description: queue.map((track, i) => {
                return `${i + 1}) ${track.info.title} | ${track.info.author}`;
            }).join("\n")
        };

        message.channel.send({ embeds: [embed] });
    }

    if (command === "nowplaying") {
        const player = client.riffy.players.get(message.guild.id);
        if (!player) return message.channel.send("No player found.");

        const track = player.current;

        if (!track) return message.channel.send("No song currently playing.");

        const embed = {
            title: "Now Playing",
            description: `${track.info.title} | ${track.info.author}`
        };

        message.channel.send({ embeds: [embed] });
    }

    if (command === "loop") {
        const player = client.riffy.players.get(message.guild.id);
        if (!player) return message.channel.send("No player found.");

        const loop = args[0];
        if (!loop) return message.channel.send("Please provide a valid loop option.");

        if (loop === "queue") {
            if (player.loop === "queue") {
                player.setLoop("none")
                message.channel.send(`Queue loop is now disabled.`);
            } else {
                player.setLoop("queue")
                message.channel.send(`Queue loop is now enabled.`);
            }
        } else if (loop === "track") {
            if (player.loop === "track") {
                player.setLoop("none")
                message.channel.send(`Track loop is now disabled.`);
            } else {
                player.setLoop("track")
                message.channel.send(`Track loop is now enabled.`);
            }
        } else {
            return message.channel.send("Please provide a valid loop option.");
        }
    }

    if (command === "shuffle") {
        const player = client.riffy.players.get(message.guild.id);
        if (!player) return message.channel.send("No player found.");

        player.queue.shuffle();
        message.channel.send("Shuffled the queue.");
    }

    if (command === '8d') {
        const player = client.riffy.players.get(message.guild.id);
        if (!player) return message.channel.send("No player found.");

        player.filters.setBassboost(true);
    }

    if (command === "remove") {
        const player = client.riffy.players.get(message.guild.id);
        if (!player) return message.channel.send("No player found.");

        const index = parseInt(args[0]);
        if (!index || isNaN(index)) return message.channel.send("Please provide a valid number.");

        const removed = player.queue.remove(index);
        message.channel.send(`Removed: \`${removed.info.title}\` from the queue.`);
    }

    if (command === "clear") {
        const player = client.riffy.players.get(message.guild.id);
        if (!player) return message.channel.send("No player found.");

        player.queue.clear();
        message.channel.send("Cleared the queue.");
    }

    if (command === "filter") {
        const player = client.riffy.players.get(message.guild.id);
        if (!player) return message.channel.send("No player found.");

        const filter = args[0];

        if (filter === "8d") {
            player.filters.set8D(true)
            message.channel.send("8D filter enabled.")
        } else if (filter === "bassboost") {
            player.filters.setBassboost(true)
            message.channel.send("Bassboost filter enabled.")
        } else if (filter === "channelmix") {
            player.filters.setChannelMix(true)
            message.channel.send("Channelmix filter enabled.")
        } else if (filter === "distortion") {
            player.filters.setDistortion(true)
            message.channel.send("Distortion filter enabled.")
        } else if (filter === "karaoke") {
            player.filters.setKaraoke(true)
            message.channel.send("Karaoke filter enabled.")
        } else if (filter === "lowpass") {
            player.filters.setLowPass(true)
            message.channel.send("Lowpass filter enabled.")
        } else if (filter === "nightcore") {
            player.filters.setNightcore(true)
            message.channel.send("Nightcore filter enabled.")
        } else if (filter === "rotate") {
            player.filters.setRotation(true)
            message.channel.send("Rotate filter enabled.")
        } else if (filter === "slowmode") {
            player.filters.setSlowmode(true)
            message.channel.send("Slowmode filter enabled.")
        } else if (filter === "timescale") {
            player.filters.setTimescale(true)
            message.channel.send("Timescale filter enabled.")
        } else if (filter === "tremolo") {
            player.filters.setTremolo(true)
            message.channel.send("Tremolo filter enabled.")
        } else if (filter === "vaporwave") {
            player.filters.setVaporwave(true)
            message.channel.send("Vaporwave filter enabled.")
        } else if (filter === "vibrato") {
            player.filters.setVibrato(true)
            message.channel.send("Vibrato filter enabled.")
        } else {
            return message.channel.send("Please provide a valid filter option.");
        }

        console.log(player.filters)
    }

    if (command === "dfilter") {
        const player = client.riffy.players.get(message.guild.id);
        if (!player) return message.channel.send("No player found.");

        const filter = args[0];

        if (filter === "8d") {
            player.filters.set8D(false)
            message.channel.send("8D filter disabled.")
        } else if (filter === "bassboost") {
            player.filters.setBassboost(false)
            message.channel.send("Bassboost filter disabled.")
        } else if (filter === "channelmix") {
            player.filters.setChannelMix(false)
            message.channel.send("Channelmix filter disabled.")
        } else if (filter === "distortion") {
            player.filters.setDistortion(false)
            message.channel.send("Distortion filter disabled.")
        } else if (filter === "karaoke") {
            player.filters.setKaraoke(false)
            message.channel.send("Karaoke filter disabled.")
        } else if (filter === "lowpass") {
            player.filters.setLowPass(false)
            message.channel.send("Lowpass filter disabled.")
        } else if (filter === "nightcore") {
            player.filters.setNightcore(false)
            message.channel.send("Nightcore filter disabled.")
        } else if (filter === "rotate") {
            player.filters.setRotation(false)
            message.channel.send("Rotate filter disabled.")
        } else if (filter === "slowmode") {
            player.filters.setSlowmode(false)
            message.channel.send("Slowmode filter disabled.")
        } else if (filter === "timescale") {
            player.filters.setTimescale(false)
            message.channel.send("Timescale filter disabled.")
        } else if (filter === "tremolo") {
            player.filters.setTremolo(false)
            message.channel.send("Tremolo filter disabled.")
        } else if (filter === "vaporwave") {
            player.filters.setVaporwave(false)
            message.channel.send("Vaporwave filter disabled.")
        } else if (filter === "vibrato") {
            player.filters.setVibrato(false)
            message.channel.send("Vibrato filter disabled.")
        } else {
            return message.channel.send("Please provide a valid filter option.");
        }

        console.log(player.filters)
    }
    if (command === "eval" && args[0]) {
        try {
          let evaled = await eval(args.join(" "));
          let string = inspect(evaled);
    
          if (string.includes(client.token))
            return message.reply("No token grabbing.");
    
          if (string.length > 2000) {
            let output = new AttachmentBuilder(Buffer.from(string), {
              name: "result.js",
            });
            return message.channel.send({ files: [output] });
          }
    
          message.channel.send(`\`\`\`js\n${string}\n\`\`\``);
        } catch (error) {
          message.reply(`\`\`\`js\n${error}\n\`\`\``);
        }
      }
})

client.riffy.on("nodeConnect", node => {
    console.log(`Node "${node.name}" connected.`)
})

client.riffy.on("nodeError", (node, error) => {
    console.log(`Node "${node.name}" encountered an error: ${error}`)
})

client.riffy.on("nodeReconnect", (node) => {
    console.log(`Node "${node.name}" reconnecting.`)
})

client.riffy.on("trackStart", async (player, track) => {
    const channel = client.channels.cache.get(player.textChannel);

    channel.send(`Now playing: \`${track.info.title}\` by \`${track.info.author}\`.`);
});

client.riffy.on("debug", console.log)

client.riffy.on("queueEnd", async (player) => {
    const channel = client.channels.cache.get(player.textChannel);

    if (player.isAutoplay) {
        player.autoplay(player)
    } else {
        player.destroy();
        channel.send("Queue has ended.");
    }
})

client.on("raw", (d) => {
    if (![GatewayDispatchEvents.VoiceStateUpdate, GatewayDispatchEvents.VoiceServerUpdate,].includes(d.t)) return;
    client.riffy.updateVoiceState(d);
});

client.login("<DISCORD TOKEN>");