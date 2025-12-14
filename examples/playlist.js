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

    if (command === 'playlist') {
        const query = args.join(' ');
        if (!query) return message.reply('Please provide a playlist URL or name.');

        const player = riffy.createConnection({
            guildId: message.guild.id,
            voiceChannel: message.member.voice.channel.id,
            textChannel: message.channel.id,
        });

        const result = await riffy.resolve({ query, requester: message.author });
        if (result.loadType !== 'playlist') {
            return message.reply('Not a valid playlist.');
        }

        result.tracks.forEach(track => player.queue.add(track));
        if (!player.playing) player.play();

        message.reply(`Added ${result.tracks.length} tracks from playlist: ${result.playlistInfo.name}`);
    }
});

client.login('YOUR_BOT_TOKEN');