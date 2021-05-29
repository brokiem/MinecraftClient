//process.env.DEBUG = 'minecraft-protocol'

require('dotenv').config();

const discord = require('discord.js');
const dsclient = new discord.Client();
const {Client} = require('bedrock-protocol');
const query = require('minecraft-server-util');

let clients = [];
let connectedClient = 0;
let debug = false;

dsclient.login().catch(() => {
    console.error("The bot token was incorrect.");
    process.exit();
});

dsclient.on("ready", () => {
    dsclient.user.setStatus('online');
    dsclient.user.setActivity("Minecraft");

    console.log("Bot ready and online!\n");

    console.log("RAM Usage: " + Math.round(process.memoryUsage().rss / 10485.76) / 100 + " MB")
    console.log("Servers: (" + dsclient.guilds.cache.size + ")\n - " + dsclient.guilds.cache.array().join("\n - "))
});

dsclient.on('message', message => {
    try {
        if (message.author.bot || !message.content.startsWith("*")) return;

        const args = message.content.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        const channel = message.channel;

        console.log("Command '" + command + "' by " + message.author.tag + " on " + message.guild.name + " | " + new Date().toLocaleString());

        switch (command) {
            case "debug":
                if (message.author.id === '548120702373593090') {
                    debug = !debug;
                    channel.send('Debug successfully ' + (debug ? "enabled" : "disabled"));
                }
                break;
            case "help":
                channel.send(makeEmbed("**Command List**\n\n○ *query <address> <port>  **--**  Query a Minecraft server\n○ *join <address> <port>  **--**  Join to Minecraft server\n○ *chat <message>  **--**  Send chat to connected server\n○ *enablechat <value>\n○ *form <button id>  **--**  Send form resp to connected server\n○ *disconnect  **--**  Disconnect from connected server\n○ *invite  **--**  Get bot invite link\n\n**Command Example**\n\n○ *query play.hypixel.net 25565\n○ *join play.nethergames.org 19132\n○ *chat hello world!\n○ *enablechat false\n○ *form 0"));
                break;
            case "query":
                if (args.length > 0) {
                    channel.send(":arrows_counterclockwise: Getting query info...")
                    ping(channel, args[0], isNaN(args[1]) ? 19132 : args[1]);
                } else {
                    channel.send("[Usage] *query <address> <port>\nExample: *query play.hypixel.net 25565");
                }
                break;
            case "connect":
            case "join":
                if (args.length > 0) {
                    connect(channel, args[0], isNaN(args[1]) ? 19132 : args[1]);
                } else {
                    channel.send("[Usage] *connect <address> <port>");
                }
                break;
            case "chat":
            case "message":
                if (isConnected(channel)) {
                    if (args.length > 0) {
                        chat(channel, args.join(" "));
                        channel.send(":small_red_triangle: Send message success!");
                    } else {
                        channel.send(":octagonal_sign: Please enter the message!");
                    }
                } else {
                    channel.send(":octagonal_sign: I haven't connected to any server yet!\n");
                }
                break;
            case "hotbar":
            case "slot":
                if (isConnected(channel)) {
                    if (args.length > 0) {
                        hotbar(channel, args.join(" "));
                        channel.send(":small_red_triangle: Set hotbar to slot " + args.join(" "));
                    } else {
                        channel.send(":octagonal_sign: Please enter the slot number!");
                    }
                } else {
                    channel.send(":octagonal_sign: I haven't connected to any server yet!\n");
                }
                break;
            case "interact":
                interact(channel)
                break;
            case "move":
            case "walk":
                if (isConnected(channel)) {
                    channel.send(":small_red_triangle: Walking...");
                    move(channel);
                } else {
                    channel.send(":octagonal_sign: I haven't connected to any server yet!\n");
                }
                break;
            case "form":
                if (isConnected(channel)) {
                    if (clients[channel]['formId'] !== undefined) {
                        if (args.length > 0) {
                            channel.send(":small_red_triangle: Sending modal form response");
                            sendModalResponse(channel, args.join(" "));
                            clients[channel]['formId'] = undefined;
                        }
                    } else {
                        channel.send(":octagonal_sign: No ModalFormRequestPacket found!");
                    }
                } else {
                    channel.send(":octagonal_sign: I haven't connected to any server yet!\n");
                }
                break;
            case "enablechat":
                if (isConnected(channel)) {
                    if (args.length > 0) {
                        if (args[0] === "true") {
                            clients[channel]['enableChat'] = true;
                            channel.send(":ballot_box_with_check: Chat successfully enabled");
                        } else if (args[0] === "false") {
                            clients[channel]['enableChat'] = false;
                            channel.send(":ballot_box_with_check: Chat successfully disabled");
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
                channel.send(makeEmbed("Bot Invite Link: [Click here](https://discord.com/api/oauth2/authorize?client_id=844733770581803018&permissions=3072&scope=bot)\n\nRAM Usage: " + Math.round(process.memoryUsage().rss / 10485.76) / 100 + " MB\nUptime: " + getUptime() + "\n\nClients: " + connectedClient + "/10\nServers: " + dsclient.guilds.cache.size));
                break;
        }
    } catch (e) {
        try {
            message.channel.send(":octagonal_sign: **An error occurred:** " + e)
        } catch (err) {}

        console.log("Error: " + e)
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
    if (isConnected(channel, false)) {
        channel.send(":octagonal_sign: I've connected!");
        return;
    }

    if (checkMaxClient(channel)) {
        return;
    }

    console.log("Connecting to " + address + " on port " + port)
    channel.send(":airplane: Connecting to " + address + " on port " + port);

    clients[channel] = {'connected': false, 'enableChat': true, 'hotbar_slot': 0, 'cachedFilteredTextPacket': []}

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
            if (isConnected(channel, false)) {
                channel.send(":octagonal_sign: Disconnected because automatically disconnected every 20 minutes")
                disconnect(channel);
            }
        }, 1200000);

        clients[channel]['client'] = client;
        connectedClient++;

        client.on('start_game', (packet) => {
            clients[channel]['runtime_id'] = packet.runtime_id;
            clients[channel]['runtime_entity_id'] = packet.runtime_entity_id;
            clients[channel]['player_position'] = packet.spawn_position;

            client.queue('set_local_player_as_initialized', {runtime_entity_id: clients[channel]['runtime_entity_id']});
            channel.send(":signal_strength: Successfully connected to the server!~");
            clients[channel]['connected'] = true;
        });

        client.on('mob_equipment', (packet) => {
            if (debug) {
                console.log(packet);
            }
        })

        client.on('inventory_transaction', (packet) => {
            if (debug) {
                console.log(packet);
            }
        })

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
                channel.send(":octagonal_sign: I can't handle custom form yet, you can use ' *form null ' to close the form");
            }

            if (debug) {
                console.log(packet)
            }
            //sendModalResponse(channel, "0"); // unhandled
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

        client.on('transfer', (packet) => {
            channel.send(makeEmbed(":arrow_lower_right: **TransferPacket received**\n\nAddress: " + packet.server_address + "\nPort: " + packet.port))
            disconnect(channel, false)
            connect(channel, packet.server_address, packet.port)
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
            channel.send(":octagonal_sign: Disconnected from server:\n```" + packet.message + "```");
        });

        client.once('close', () => {
            clearInterval(clients[channel]['intervalChat'])
            clearTimeout(clients[channel]['maxTimeConnectedTimeout'])

            connectedClient--;
            delete clients[channel];
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
    if (isConnected(channel, false) && (clients[channel]['cachedFilteredTextPacket'].length > 0) && (clients[channel] !== undefined) && clients[channel]['enableChat']) {
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

function hotbar(channel, slot) {
    clients[channel]['client'].queue('mob_equipment', {
        runtime_entity_id: clients[channel]['runtime_entity_id'],
        item: {
            network_id: 0,
            count: undefined,
            metadata: undefined,
            has_stack_id: undefined,
            stack_id: undefined,
            block_runtime_id: undefined,
            extra: { has_nbt: 0, nbt: undefined, can_place_on: [], can_destroy: [] }
        },
        slot: parseInt(slot),
        selected_slot: parseInt(slot),
        window_id: 'inventory'
    });
    clients[channel]['hotbar_slot'] = parseInt(slot)
}

function interact(channel) {
    clients[channel]['client'].queue('inventory_transaction', {
        legacy: {legacy_request_id: 0, legacy_transactions: 0},
        transaction_type: '2',
        actions: {
            value: 'world_interaction',
            slot: clients[channel]['hotbar_slot'],
            old_item: {
                network_id: 0,
                count: undefined,
                metadata: undefined,
                has_stack_id: undefined,
                stack_id: undefined,
                block_runtime_id: undefined,
                extra: { has_nbt: 0, nbt: undefined, can_place_on: [], can_destroy: [] }
            },
            new_item: {
                network_id: 0,
                count: undefined,
                metadata: undefined,
                has_stack_id: undefined,
                stack_id: undefined,
                block_runtime_id: undefined,
                extra: { has_nbt: 0, nbt: undefined, can_place_on: [], can_destroy: [] }
            }
        },
        transaction_data: 'item_use',
        transaction: {
            transaction_type: 'item_use',
            block_position: clients[channel]['player_position'],
            face: 0,
            hotbar_slot: clients[channel]['hotbar_slot'],
            held_item: 0,
            player_pos: clients[channel]['player_position'],
            click_pos: clients[channel]['player_position'],
            block_runtime_id: 0
        }
    });
}

function move(channel) {
    if (clients[channel]['player_position'] === undefined) {
        channel.send(":octagonal_sign: Please wait for the server to send the client position")
        return;
    }

    if (clients[channel]['walking'] !== undefined && clients[channel]['walking']) {
        channel.send(":octagonal_sign: Please wait 2 seconds before walking again!");
        return;
    }

    clients[channel]['walking'] = true;
    clients[channel]['player_position'] = {
        x: clients[channel]['player_position'].x + rand(-2, 2),
        y: clients[channel]['player_position'].y,
        z: clients[channel]['player_position'].z + rand(-2, 2)
    }

    channel.send(makeEmbed(":ski: Walking randomly to X:" + clients[channel]['player_position'].x + " Y:" + clients[channel]['player_position'].y + " Z:" + clients[channel]['player_position'].z))

    setTimeout(function () {
        clients[channel]['walking'] = false;
    }, 2000)

    clients[channel]['client'].queue('move_player', {
        runtime_id: clients[channel]['runtime_id'],
        position: clients[channel]['player_position'],
        pitch: 0,
        yaw: 0,
        head_yaw: 0,
        mode: 'normal',
        on_ground: true,
        ridden_runtime_id: 0,
        teleport: {cause: 'unknown', source_entity_type: 0},
        tick: 0n
    })
}

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
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

function isConnected(channel, check = true) {
    if (check) {
        return clients[channel] !== undefined && clients[channel]['connected']
    }

    return clients[channel] !== undefined;
}

function disconnect(channel, showMessage = true) {
    if (!isConnected(channel, false)) {
        channel.send(":octagonal_sign: I haven't connected to any server yet!\n");
        return;
    }

    clients[channel]['client'].close()

    if (showMessage) {
        channel.send(":octagonal_sign: Disconnected succesfully!");
    }
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