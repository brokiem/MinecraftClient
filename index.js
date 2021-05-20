process.env.DEBUG = 'minecraft-protocol'

const discord = require('discord.js')
const dsclient = new discord.Client();
const {Client} = require('bedrock-protocol');
const query = require('minecraft-server-util')

dsclient.login("enteryourtokenhereokeditthisfieldandenteryourtokenidoot").catch(() => {
    console.error("The bot token was incorrect.")
    process.exit()
})

dsclient.on("ready", async () => {
    await dsclient.user.setStatus('online');
    await dsclient.user.setActivity("Minecraft");

    console.log("Bot ready and online!");
})

dsclient.on('message', async message => {
    if (message.author.bot || !message.content.startsWith("*")) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    switch (command) {
        case "connect":
        case "join":
            if (args.length > 0) {
                connect(message.channel, args[0], isNaN(args[1]) ? 19132 : args[1], args[2] ?? "1.16.220");
            } else {
                await message.channel.send("Usage!] *connect <address> <port> <version>")
            }
            break;
        case "chat":
        case "message":
            if (isConnected()) {
                if (args.length > 0) {
                    chat(args.join(" "));
                    await message.channel.send("> Send message success!")
                } else {
                    await message.channel.send("> Please enter the message!");
                }
            } else {
                await message.channel.send("> I haven't connected to any server yet!\n")
            }
            break;
        case "close":
        case "disconnect":
            disconnect(message.channel);
            break;
    }
})

function connect(channel, address, port = 19132, version = "1.16.220") {
    if (isConnected()) {
        channel.send("> I've connected to the server in <#" + this.channelId + "> !")
        return;
    }

    channel.send("> Connecting to " + address + " on port " + port)
    this.channelId = channel.id;

    query.statusBedrock(address, {
        port: parseInt(port), enableSRV: true, timeout: 5000
    }).then(() => {
        const client = new Client({
            host: address,
            port: parseInt(port),
            offline: false,
            version: version,
            authTitle: '00000000441cc96b'
        });

        channel.send("> Started packet reading...")
        client.connect();

        this.connClient = client;

        client.on('start_game', (packet) => {
            this.runtime_id = packet.runtime_id;
            this.runtime_entity_id = packet.runtime_entity_id;

            client.queue('set_local_player_as_initialized', {runtime_entity_id: this.runtime_entity_id});
            channel.send("> Successfully connected to the server!~");
        });

        this.cachedFilteredTextPacket = [];
        let filteredTextPacket;
        client.on('text', (packet) => {
            const string = "abcdefgklmr0123456789";

            filteredTextPacket = packet.message;
            for (let i = 0; i < string.length; i++) {
                filteredTextPacket = filteredTextPacket.split('§' + string[i]).join('').replace('discord', 'shit')
            }
            this.cachedFilteredTextPacket.push(filteredTextPacket);
        })

        setInterval(function(){sendCachedTextPacket(channel)}, 2500);

        client.once('resource_packs_info', () => {
            client.write('resource_pack_client_response', {
                response_status: 'completed',
                resourcepackids: []
            });

            client.once('resource_pack_stack', () => {
                client.write('resource_pack_client_response', {
                    response_status: 'completed',
                    resourcepackids: []
                });
            });

            client.queue('client_cache_status', {enabled: false});
            client.queue('request_chunk_radius', {chunk_radius: 2});
            client.queue('tick_sync', {request_time: BigInt(Date.now()), response_time: 0n});
        });

        client.once('disconnect', (packet) => {
            this.channelId = undefined;
            channel.send("> Disconnected from server:\n```" + packet.message + "```")
        })
    }).catch((error) => {
        this.channelId = undefined;
        channel.send("> Error when pingging the server: " + error.message)
    });
}

function sendCachedTextPacket(channel) {
    if (this.cachedFilteredTextPacket.length > 1) {
        channel.send("> TextPacket recieved\n```" + this.cachedFilteredTextPacket.join("\n") + "```")
        this.cachedFilteredTextPacket = [];
    }
}

function chat(string) {
    this.connClient.queue('text', {
        type: 'chat',
        needs_translation: false,
        source_name: string,
        message: string,
        paramaters: undefined,
        xuid: '',
        platform_chat_id: ''
    })
}

function isConnected() {
    return this.connClient !== undefined;
}

function disconnect(channel) {
    if (!isConnected()) {
        channel.send("> I haven't connected to any server yet!\n")
        return;
    }

    if (this.channelId === channel.id) {
        this.connClient.close()
        this.connClient = undefined;

        channel.send("> Disconnected succesfully!")
    } else {
        channel.send("> I am connected to the server in <#"+ this.channelId +"> !")
    }
}
