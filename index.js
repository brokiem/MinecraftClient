//process.env.DEBUG = 'minecraft-protocol'

require('dotenv').config();

const discord = require('discord.js');
const dsclient = new discord.Client();
const {Client} = require('bedrock-protocol');
const query = require('minecraft-server-util');

let clients = [];
let connectedClient = 0;

dsclient.login().catch(() => {
    console.error("The bot token was incorrect.");
    process.exit();
});

dsclient.on("ready",  () => {
    dsclient.user.setStatus('idle');
    dsclient.user.setActivity("Minecraft");

    console.log("Bot ready and online!\n");

    console.log("RAM Usage: " + Math.round(process.memoryUsage().rss / 10485.76) / 100 + " MB")
    console.log("Servers: (" + dsclient.guilds.cache.size + ")\n - " + dsclient.guilds.cache.array().join("\n - "))
});

dsclient.on('message', async message => {
    if (message.author.bot || !message.content.startsWith("*")) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const channel = message.channel;

    console.log("Command '" + command + "' by " + message.author.tag + " on " + message.guild.name + " | " + new Date().toLocaleString());

    switch (command) {
        case "help":
            await channel.send(makeEmbed("**Command List**\n\n○ *query <address> <port>  **--**  Query a Minecraft server\n○ *join <address> <port>  **--**  Join to Minecraft server\n○ *chat <message>  **--**  Send chat to connected server\n○ *enablechat <value>\n○ *form <button id>  **--**  Send form resp to connected server\n○ *disconnect  **--**  Disconnect from connected server\n○ *invite  **--**  Get bot invite link\n\n**Command Example**\n\n○ *query play.hypixel.net 25565\n○ *join play.nethergames.org 19132\n○ *chat hello world!\n○ *enablechat false\n○ *form 0"));
            break;
        case "query":
            if (args.length > 0) {
                await channel.send(":arrows_counterclockwise: Getting query info...")
                ping(channel, args[0], isNaN(args[1]) ? 19132 : args[1]);
            } else {
                await channel.send("[Usage] *query <address> <port>\nExample: *query play.hypixel.net 25565");
            }
            break;
        case "connect":
        case "join":
            if (args.length > 0) {
                connect(channel, args[0], isNaN(args[1]) ? 19132 : args[1]);
            } else {
                await channel.send("[Usage] *connect <address> <port>");
            }
            break;
        case "chat":
        case "message":
            if (isConnected(channel)) {
                if (args.length > 0) {
                    chat(channel, args.join(" "));
                    await channel.send(":small_red_triangle: Send message success!");
                } else {
                    await channel.send(":octagonal_sign: Please enter the message!");
                }
            } else {
                await channel.send(":octagonal_sign: I haven't connected to any server yet!\n");
            }
            break;
        case "form":
            if (isConnected(channel)) {
                if (clients[channel]['formId'] !== undefined) {
                    if (args.length > 0) {
                        await channel.send(":small_red_triangle: Sending modal form response");
                        sendModalResponse(channel, args.join(" "));
                    }
                } else {
                    await channel.send(":octagonal_sign: No ModalFormRequestPacket found!");
                }
            } else {
                await channel.send(":octagonal_sign: I haven't connected to any server yet!\n");
            }
            break;
        case "enablechat":
            if (isConnected(channel)) {
                if (args.length > 0) {
                    if (args[0] === "true") {
                        clients[channel]['enableChat'] = true;
                        await channel.send(":ballot_box_with_check: Chat successfully enabled");
                    } else if (args[0] === "false") {
                        clients[channel]['enableChat'] = false;
                        await channel.send(":ballot_box_with_check: Chat successfully disabled");
                    }
                }
            }
            break;
        case "close":
        case "disconnect":
            disconnect(channel);
            break;
        case "invite":
        case "stats":
        case "status":
            await channel.send(makeEmbed("Bot Invite Link: [Click here](https://discord.com/api/oauth2/authorize?client_id=844733770581803018&permissions=2048&scope=bot)\n\nRAM Usage: " + Math.round(process.memoryUsage().rss / 10485.76) / 100 + " MB\nUptime: " + getUptime() + "\n\nClient Connected: " + connectedClient + "\nServer Invited: " + dsclient.guilds.cache.size));
            break;
    }
})

function ping(channel, address, port = 19132) {
    query.statusBedrock(address, {
        port: parseInt(port), enableSRV: true, timeout: 3000
    }).then((response) => {
        channel.send(makeEmbed("**Query information**\n\n**MOTD**: " + response.motdLine1.descriptionText + "\n**Version**: " + response.version + "\n**Players**: " + response.onlinePlayers + "/" + response.maxPlayers))
    }).catch(() => {
        if (port === 19132) {
            port = 25565
        }

        query.status(address, {
            port: parseInt(port), enableSRV: true, timeout: 5000
        }).then((response) => {
            channel.send(makeEmbed("**Query information**\n\n**MOTD**: " + response.description.descriptionText + "\n**Version**: " + response.version + "\n**Players**: " + response.onlinePlayers + "/" + response.maxPlayers))
        }).catch((err) => {
            channel.send(makeEmbed("Query failed: " + err))
        })
    })
}

function connect(channel, address, port, version = "1.16.220") {
    if (isConnected(channel)) {
        channel.send(":octagonal_sign: I've connected!");
        return;
    }

    if (checkMaxClient(channel)) {
        return;
    }

    channel.send(":airplane: Connecting to " + address + " on port " + port);

    clients[channel] = {'enableChat': true, 'cachedFilteredTextPacket': []}

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

        channel.send(":newspaper: Started packet reading...");
        client.connect();

        clients[channel]['intervalChat'] = setInterval(function () {
            sendCachedTextPacket(channel)
        }, 5000);
        clients[channel]['maxTimeConnectedTimeout'] = setTimeout(function () {
            if (isConnected(channel)) {
                channel.send(":octagonal_sign: Disconnected because automatically disconnected every 20 minutes")
                disconnect(channel);
            }
        }, 1200000)

        clients[channel]['client'] = client;
        connectedClient++;

        client.on('start_game', (packet) => {
            this.runtime_id = packet.runtime_id;
            this.runtime_entity_id = packet.runtime_entity_id;

            client.queue('set_local_player_as_initialized', {runtime_entity_id: this.runtime_entity_id});
            channel.send(":signal_strength: Successfully connected to the server!~");
        });

        client.on('modal_form_request', (packet) => {
            const jsonData = JSON.parse(packet.data);
            const string = "abcdefgklmr0123456789"; // minecraft color

            clients[channel]['formId'] = packet.form_id;

            if (jsonData.type === 'form') {
                let filteredText = jsonData.content;
                for (let i = 0; i < jsonData.content.length; i++) {
                    filteredText = filteredText.split('§' + string[i]).join('');
                }

                let text = ":arrow_lower_right: **ModalFormRequestPacket received**\n\nForm ID: " + packet.form_id + "\n\n           " + jsonData.title + "\n" + filteredText + "\n\n";
                let buttonId = 0;
                let buttons = [];
                jsonData.buttons.forEach((fn) => {
                    buttons.push("ID: " + buttonId + " | Button: " + fn.text + "");

                    buttonId++;
                })

                channel.send(makeEmbed(text + "```" + buttons.join("\n") + "```" + "\nType ( *form <button id> ) to response"));
            } else {
                channel.send(":octagonal_sign: I can't handle custom form yet :(");
                channel.send(packet)
                //sendModalResponse(channel, "0"); // unhandled
            }
        })

        client.on('text', (packet) => {
            if (clients[channel]['enableChat']) {
                const string = "abcdefgklmr0123456789";

                clients[channel]['filteredTextPacket'] = packet.message;
                if (clients[channel]['filteredTextPacket'] !== undefined) {
                    for (let i = 0; i < string.length; i++) {
                        clients[channel]['filteredTextPacket'] = clients[channel]['filteredTextPacket'].split('§' + string[i]).join('').replace('discord', 'shit');
                    }
                    clients[channel]['cachedFilteredTextPacket'].push(clients[channel]['filteredTextPacket']);
                }
            }
        })

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
            delete clients[channel];
            channel.send(":octagonal_sign: Disconnected from server:\n```" + packet.message + "```");
        });

        client.once('close', () => {
            delete clients[channel];
			connectedClient--;
            channel.send(":octagonal_sign: Disconnected: Client closed!");
        });
    }).catch((error) => {
        delete clients[channel];
        channel.send(":octagonal_sign: Unable to connect to [" + address + "/" + port + "]. " + error.message);
    });
}

function checkMaxClient(channel) {
    if (connectedClient > 10) {
        channel.send(makeEmbed("Clients are too busy! Please try again later."));
        return true;
    }

    return false;
}

function sendCachedTextPacket(channel) {
    if (isConnected(channel) && (clients[channel]['cachedFilteredTextPacket'].length > 0) && (clients[channel] !== undefined) && clients[channel]['enableChat']) {
        channel.send(makeEmbed(clients[channel]['cachedFilteredTextPacket'].join("\n\n")))
        clients[channel]['cachedFilteredTextPacket'] = [];
    }
}

function makeEmbed(string) {
    return new discord.MessageEmbed().setDescription(string);
}

function sendModalResponse(channel, string) {
    clients[channel]['client'].queue('modal_form_response', {
        form_id: clients[channel]['formId'],
        data: string
    });
}

function chat(channel, string) {
    clients[channel]['client'].queue('text', {
        type: 'chat',
        needs_translation: false,
        source_name: string,
        message: string,
        paramaters: undefined,
        xuid: '',
        platform_chat_id: ''
    });
}

function isConnected(channel) {
    return clients[channel] !== undefined;
}

function disconnect(channel) {
    if (!isConnected(channel)) {
        channel.send(":octagonal_sign: I haven't connected to any server yet!\n");
        return;
    }

    clearInterval(clients[channel]['intervalChat'])
    clearTimeout(clients[channel]['maxTimeConnectedTimeout'])
    clients[channel]['client'].close()
    channel.send(":octagonal_sign: Disconnected succesfully!");
}

function getUptime() {
    let totalSeconds = (dsclient.uptime / 1000);
    let days = Math.floor(totalSeconds / 86400);
    let hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;

    return ((0 < days) ? (days + " day, ") : "") + hours + "h, " + minutes + "m and " + seconds.toFixed(0) + "s";
}
