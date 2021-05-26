//process.env.DEBUG = 'minecraft-protocol'

const discord = require('discord.js');
const dsclient = new discord.Client();
const {Client} = require('bedrock-protocol');
const query = require('minecraft-server-util');

let clients = [];

dsclient.login("").catch(() => {
    console.error("The bot token was incorrect.");
    process.exit();
});

dsclient.on("ready", async () => {
    await dsclient.user.setStatus('online');
    await dsclient.user.setActivity("Minecraft");

    console.log("Bot ready and online!");
});

dsclient.on('message', async message => {
    if (message.author.bot || !message.content.startsWith("*")) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const channel = message.channel;

    switch (command) {
        case "help":
            await channel.send(makeEmbed("**Command List**\n\n○ *query <string: address> <int: port></string:>\n○ *join <string: address> <int: port> <string: mcversion>\n○ *chat <string: message>\n○ *form <int: form button id>\n○ *disconnect"));
            break;
        case "query":
            if (args.length > 0) {
                await channel.send(":signal_strength: Getting query info...")
                ping(channel, args[0], isNaN(args[1]) ? 19132 : args[1]);
            } else {
                await channel.send("[Usage] *query <address> <port>\nExample: *query play.hypixel.net 25565");
            }
            break;
        case "connect":
        case "join":
            if (args.length > 0) {
                connect(channel, args[0], isNaN(args[1]) ? 19132 : args[1], args[2] ?? "1.16.220");
            } else {
                await channel.send("[Usage] *connect <address> <port> <version>");
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

        clients[channel].client = client;

        client.on('start_game', (packet) => {
            this.runtime_id = packet.runtime_id;
            this.runtime_entity_id = packet.runtime_entity_id;

            client.queue('set_local_player_as_initialized', {runtime_entity_id: this.runtime_entity_id});
            channel.send(":signal_strength: Successfully connected to the server!~");
        });

        client.on('modal_form_request', (packet) => {
            const jsonData = JSON.parse(packet.data);
            const string = "abcdefgklmr0123456789"; // minecraft color

            clients[channel].formId = packet.form_id;

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
                sendModalResponse(channel, "0"); // unhandled
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
            channel.send(":octagonal_sign: Disconnected: Client closed!");
        });

    }).catch((error) => {
        delete clients[channel];
        channel.send(":octagonal_sign: Unable to connect to [" + address + "]/" + port + ". " + error.message);
    });
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
    clients[channel]['client'].close()
    channel.send(":octagonal_sign: Disconnected succesfully!");
}
