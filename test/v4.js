const { Client, GatewayDispatchEvents, AttachmentBuilder, EmbedBuilder } = require("discord.js");
const { Riffy } = require("../build/index");
const { inspect } = require("node:util");
const winston = require('winston');
/**
 * @type {import("discord.js").Client & { riffy: Riffy}}
 */
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
  // {
  //   name: "The-Failing-Node-0",
  //   host: "localhost",
  //   password: "youshallnotpass",
  //   port: 2333,
  //   secure: false,
  // },
  {
    name: "Migration-Node-0",
    host: "lava-v4.ajieblogs.eu.org",
    port: 443,
    password: "https://dsc.gg/ajidevserver",
    secure: true
  }
];

const logger = winston.createLogger({
  levels: winston.config.npm.levels,
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `[${timestamp}] ${level}: ${message}`;
        })
      )
    }),
    new winston.transports.File({ filename: 'riffy-test.log' })
  ]
});

// Add custom colors for different log levels
winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'gray'
});

client.riffy = new Riffy(client, nodes, {
  send: (payload) => {
    const guild = client.guilds.cache.get(payload.d.guild_id);
    if (guild) guild.shard.send(payload);
  },
  defaultSearchPlatform: "ytmsearch",
  restVersion: "v4",
});

client.on("ready", () => {
  client.riffy.init(client.user.id);
  logger.info(`[CLIENT] Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (!message.content.startsWith('.') || message.author.bot) return;

  const args = message.content.slice(1).trim().split(" ");
  const command = args.shift().toLowerCase();

  if (command === "search") {
    let searchQuery = args.join(" ");

    if (!/http(s)?:\/\//.test(searchQuery)) {
      // -> ['ytmsearch:the fat rat', 'ytmsearch:', 'the fat rat']
      searchQuery = /(?<source>.+:)(?<query>.+)/g.exec(searchQuery)
    }

    if (!searchQuery) return message.react("❎");

    const resolveTracks = await client.riffy.resolve({ query: `${searchQuery?.[2] || searchQuery}`, source: `${searchQuery?.[1]?.slice(0, searchQuery?.[1].length - 1)}`, requester: message.member });

    if (resolveTracks.loadType !== "error" || resolveTracks.loadType !== "empty") {
      const formattedTracks = resolveTracks.tracks.flatMap((track, i) => {

        return {
          name: `[${track.info.sourceName}] [${track.info.title}](${track.info.uri})`,
          value: `by ${track?.pluginInfo?.artistUrl ? `[${track.info.author}](${track.info.artistUrl})]` : track.info.author.substring(0, 20) + "..."} - \`${track.info.length}\``
        }
      })

      const embed = new EmbedBuilder()
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setColor("DarkButNotBlack")
        .setFields(formattedTracks.length > 25 ? formattedTracks.splice(24) : formattedTracks)

      return message.reply({ embeds: [embed] });
    } else {

      message.reply({ content: `No tracks found, loadType: \`${resolveTracks.loadType}\`` })

      return;
    }

  }

  if (command === "play") {
    const query = args.join(" ");

    const player = client.riffy.createConnection({
      guildId: message.guild.id,
      voiceChannel: message.member.voice.channel.id,
      textChannel: message.channel.id,
      deaf: true,
    });

    const resolve = await client.riffy.resolve({ query: query, requester: message.author });
    const { loadType, tracks, playlistInfo } = resolve;

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

  if (command === "autoplay" || command === "ap") {
    const player = client.riffy.players.get(message.guild.id);
    if (!player) return message.channel.send("No player found.");
    const state = args[0];

    if (!state || !["on", "off"].includes(state))
      return message.channel.send(
        "Please Provide an valid option: `on` or `off`"
      ).then((msg) => setTimeout(msg.delete, 5_000))

    if (state === "on") {
      player.isAutoplay = player.autoplay;
    }

    player.isAutoplay = (state === "on");
    player.set("autoplay_state", state === "on")
    message.channel.send("Player's autoplay is set to `" + state + "`")
  }

  if (command === "nowplaying") {
    const player = client.riffy.players.get(message.guild.id);
    if (!player) return message.channel.send("No player found.");

    logger.debug(`[NOWPLAYING] Player data: ${inspect(player)}`);
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
    if (!loop || !["queue", "track"].includes(loop))
      return message.channel.send(
        "Please provide a valid loop option: `queue` or `track`."
      );

    const toggleLoop = () => {
      const loopType = player.loop === loop ? "none" : loop;
      player.setLoop(loopType);
      message.channel.send(
        `${loop.charAt(0).toUpperCase() + loop.slice(1)} loop is now ${loopType === "none" ? "disabled" : "enabled"
        }.`
      );
    };

    toggleLoop();
  }

  if (command === "shuffle") {
    const player = client.riffy.players.get(message.guild.id);
    if (!player) return message.channel.send("No player found.");

    player.queue.shuffle();
    message.channel.send("Shuffled the queue.");
  }

  if (command === "remove") {
    const player = client.riffy.players.get(message.guild.id);
    if (!player) return message.channel.send("No player found.");

    const index = parseInt(args[0]);
    if (!index || isNaN(index))
      return message.channel.send("Please provide a valid number.");

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

    const filterActions = {
      "8d": { method: "set8D", message: "8D filter enabled." },
      bassboost: {
        method: "setBassboost",
        message: "Bassboost filter enabled.",
      },
      channelmix: {
        method: "setChannelMix",
        message: "Channelmix filter enabled.",
      },
      distortion: {
        method: "setDistortion",
        message: "Distortion filter enabled.",
      },
      karaoke: { method: "setKaraoke", message: "Karaoke filter enabled." },
      lowpass: { method: "setLowPass", message: "Lowpass filter enabled." },
      nightcore: {
        method: "setNightcore",
        message: "Nightcore filter enabled.",
      },
      rotate: { method: "setRotation", message: "Rotate filter enabled." },
      slowmode: { method: "setSlowmode", message: "Slowmode filter enabled." },
      timescale: {
        method: "setTimescale",
        message: "Timescale filter enabled.",
      },
      tremolo: { method: "setTremolo", message: "Tremolo filter enabled." },
      vaporwave: {
        method: "setVaporwave",
        message: "Vaporwave filter enabled.",
      },
      vibrato: { method: "setVibrato", message: "Vibrato filter enabled." },
    };

    const action = filterActions[filter];
    if (action) {
      player.filters[action.method](true);
      message.channel.send(action.message);
    } else {
      message.channel.send("Please provide a valid filter option.");
    }

    // console.log(player.filters);
  }

  if (command === "dfilter") {
    const player = client.riffy.players.get(message.guild.id);
    if (!player) return message.channel.send("No player found.");

    const filter = args[0];

    const filterActions = {
      "8d": { method: "set8D", message: "8D filter disabled." },
      bassboost: {
        method: "setBassboost",
        message: "Bassboost filter disabled.",
      },
      channelmix: {
        method: "setChannelMix",
        message: "Channelmix filter disabled.",
      },
      distortion: {
        method: "setDistortion",
        message: "Distortion filter disabled.",
      },
      karaoke: { method: "setKaraoke", message: "Karaoke filter disabled." },
      lowpass: { method: "setLowPass", message: "Lowpass filter disabled." },
      nightcore: {
        method: "setNightcore",
        message: "Nightcore filter disabled.",
      },
      rotate: { method: "setRotation", message: "Rotate filter disabled." },
      slowmode: { method: "setSlowmode", message: "Slowmode filter disabled." },
      timescale: {
        method: "setTimescale",
        message: "Timescale filter disabled.",
      },
      tremolo: { method: "setTremolo", message: "Tremolo filter disabled." },
      vaporwave: {
        method: "setVaporwave",
        message: "Vaporwave filter disabled.",
      },
      vibrato: { method: "setVibrato", message: "Vibrato filter disabled." },
    };

    const action = filterActions[filter];
    if (action) {
      player.filters[action.method](false);
      message.channel.send(action.message);
    } else {
      message.channel.send("Please provide a valid filter option.");
    }

    // console.log(player.filters);
  }

  if (command === "livelyrics" || command === "ll") {
    const player = client.riffy.players.get(message.guild.id);
    if (!player) return message.channel.send("No player found.");

    const toggle = args[0];

    if (!["on", "off"].includes(toggle)) {
      return message.reply("Please specify `on` or `off` i.e `<prefix>livelyrics on`")
    }

    if (toggle === "on") await player.node.rest.makeRequest("POST", `/v4/sessions/${player.node.sessionId}/players/${player.guildId}/lyrics/subscribe?skipTrackSource=true`)
    else if (toggle === "off") await player.node.rest.makeRequest("DELETE", `/v4/sessions/${player.node.sessionId}/players/${player.guildId}/lyrics/subscribe?skipTrackSource=true`)

    player.set("liveLyrics", true);

    return message.reply({ content: `Live lyric is ${player.get('liveLyrics') ? "✅" : "❌"}` })
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

client.riffy.on("nodeConnect", (node) => {
  logger.info(`[NODE] Node "${node.name}" connected, with sessionId ${node.sessionId}`);
});

client.riffy.on("nodeError", (node, error) => {
  logger.error(`[NODE] Node "${node.name}" encountered an error: ${error.message || error}`);
});

client.riffy.on("nodeReconnect", (node) => {
  logger.info(`[NODE] Node "${node.name}" reconnecting.`);
});

client.riffy.on("trackStart", async (player, track) => {
  const channel = client.channels.cache.get(player.textChannel);

  channel.send(`\`${track.info.title} by ${track.info.author}\``)
});

client.riffy.on("queueEnd", async (player) => {
  const channel = client.channels.cache.get(player.textChannel);

  // const autoplay = player.get("autoplay_state") ?? false;
  // logger.debug(`[QUEUE] QUEUE END :: player :: ${inspect(player, false, 2, true)}, isAutoplay=${player.isAutoplay}, autoplay=${player.autoplay}`);

  if (player.isAutoplay) {
    player.autoplay(player);
  } else {
    player.destroy();
    channel.send("Queue has ended.");
  }
});

client.riffy.on("raw", (type, payload) => {
  if (!["LyricsFoundEvent", "LyricsNotFoundEvent", "LyricsLineEvent"].includes(payload.type)) return;

  logger.debug(`[RAW] :: ${type} :: payload: ${inspect(payload)}`);
})

process.on("uncaughtException", (err, origin) =>
  logger.error(`[EXCEPTION] [UNCAUGHT ERRORS Reporting - Exception] >> origin: ${origin} | Error: ${err.stack ?? err}`)
);
process.on("unhandledRejection", (err, _) =>
  logger.error(`[EXCEPTION] [unhandled ERRORS Reporting - Rejection] >> ${err}, Promise: ignored/not included`)
);

client.on("raw", (d) => {
  if (![GatewayDispatchEvents.VoiceStateUpdate, GatewayDispatchEvents.VoiceServerUpdate,].includes(d.t)) return;
  client.riffy.updateVoiceState(d);
});

client.riffy.on("debug", (...m) => { logger.debug(`[RIFFY] ${m.join(' ')}`) });

client.login("<DISCORD-TOKEN>");