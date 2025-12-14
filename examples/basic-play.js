const { Client, GatewayIntentBits } = require('discord.js');
const { Riffy } = require('riffy');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
    ],
});

const riffy = new Riffy(client, [
    {
        name: 'Main Node',
        host: 'localhost',
        port: 2333,
        password: 'youshallnotpass',
        secure: false,
    },
], {
    send: (payload) => {
        const guild = client.guilds.cache.get(payload.d.guild_id);
        if (guild) guild.shard.send(payload);
    },
    defaultSearchPlatform: 'ytmsearch',
});

client.on('ready', () => {
    riffy.init(client.user.id);
    console.log('Bot is ready!');
});

client.on('messageCreate', async (message) => {
    if (!message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'play') {
        const query = args.join(' ');
        if (!query) return message.reply('Please provide a song to play.');

        const player = riffy.createConnection({
            guildId: message.guild.id,
            voiceChannel: message.member.voice.channel.id,
            textChannel: message.channel.id,
        });

        const result = await riffy.resolve({ query, requester: message.author });
        if (result.loadType === 'empty' || result.loadType === 'error') {
            return message.reply('No results found.');
        }

        if (result.loadType === 'playlist') {
            result.tracks.forEach(track => player.queue.add(track));
        } else {
            player.queue.add(result.tracks[0]);
        }

        if (!player.playing) player.play();
        message.reply(`Playing: ${result.tracks[0].info.title}`);
    }
});

client.login('YOUR_BOT_TOKEN');