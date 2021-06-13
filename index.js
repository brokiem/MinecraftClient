//process.env.DEBUG = 'minecraft-protocol'

require("dotenv").config();

const discord = require("discord.js");
const dsclient = new discord.Client();
const {Client} = require("bedrock-protocol");
const query = require("minecraft-server-util");
const dsbutton = require("discord-buttons")(dsclient);
const Filter = require('bad-words');
const filter = new Filter();

let clients = [];
let connectedClient = 0;
let connectedClientGuild = [];
let debug = false;

const mcversion = '1.0.0'

const x = "<:brokiem_x:849486576727097384>";
const e = "<:enter:849493018910261259>";
const auth = "<:auth:849493635820158977>"
const signal = "<:stage:849498188096077834>";
const reply = "<:reply:849498663956774942>";
const barrier = "<:barrier:849501525596438539>";

const activities = [
    "*help",
    "*invite",
    "Minecraft"
];

const mcversions = [
    "1.17.0",
    "1.16.220"
];

dsclient.login().catch(() => {
    console.error("The bot token was incorrect.");
});

dsclient.on("ready", async () => {
    await dsclient.user.setStatus("online");

    let i = 0;
    setInterval(() => {
        dsclient.user.setActivity(activities[i]);

        i <= activities.length ? ++i : i = 0;
    }, 30000);

    console.log("Bot ready and online!\n");

    console.log("RAM Usage: " + Math.round(process.memoryUsage().rss / 10485.76) / 100 + " MB")
    // console.log("Servers: (" + dsclient.guilds.cache.size + ")\n - " + dsclient.guilds.cache.array().join("\n - "))
});

dsclient.on("message", async message => {
    try {
        if (message.content.includes(dsclient.user.id) && message.channel.type === "text" && !message.author.bot) {
            await message.channel.send(makeEmbed("My Prefix is  *")).then(msg => {
                try {
                    msg.delete({timeout: 8000});
                } catch (e) {
                }
            });
            return;
        }

        if (message.author.bot || !message.content.startsWith("*") || message.channel.type !== "text") return;

        const args = message.content.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        const channel = message.channel;

        console.log("Command '" + command + "' by " + message.author.tag + " on " + message.guild.name + " | " + new Date().toLocaleString());

        switch (command) {
            case "debug":
                if (message.author.id === "548120702373593090") {
                    debug = !debug;
                    await channel.send("Debug successfully " + (debug ? "enabled" : "disabled"));
                }
                break;
            case "help":
                await channel.send(makeEmbed("" +
                    "**Command List**\n\n○ " +
                    "``*query <address> <port>``  **~**  Query a Minecraft server\n○ " +
                    "``*join <address> <port> <version>`` **~**  Join to Minecraft server\n○ " +
                    "``*chat <message>``  **~**  Send chat to connected server\n○ " +
                    "``*enablechat <value>``\n○ " +
                    "``*form <button id>``  **~**  Send form resp to connected server\n○ " +
                    "``*disconnect``  **~**  Disconnect from connected server\n○ " +
                    "``*invite``  **~**  Get bot invite link\n\n" +

                    "**Command Example**\n\n○ " +

                    "*query play.hypixel.net 25565\n○ " +
                    "*join play.nethergames.org 19132\n○ " +
                    "*chat hello world!\n○ " +
                    "*enablechat false\n○ " +
                    "*form 0"));
                break;
            case "query":
                if (args.length > 0) {
                    await channel.send(signal + " Getting query info...")
                    await ping(channel, args[0], isNaN(args[1]) ? 19132 : args[1]);
                } else {
                    await channel.send("[Usage] *query <address> <port>\nExample: *query play.hypixel.net 25565");
                }
                break;
            case "connect":
            case "join":
                if (args.length > 0) {
                    if (args[2] !== undefined && !mcversions.includes(args[2])) {
                        await channel.send(makeEmbed("Supported versions: " + mcversions.join(", ")));
                        return;
                    }

                    connect(channel, args[0], isNaN(args[1]) ? 19132 : args[1], args[2] ?? "auto");
                } else {
                    await channel.send("**Usage:** *connect <address> <port> <version>");
                }
                break;
            case "chat":
            case "message":
                if (await isConnected(channel)) {
                    if (args.length > 0) {
                        if (args.join(" ").charAt(0) === "/") {
                            await sendCommand(channel, args.join(" "));
                            await channel.send(reply + " Sending command...");
                        } else {
                            await chat(channel, args.join(" "));
                            await channel.send(reply + " Sending message...");
                        }
                    } else {
                        await channel.send(barrier + " Please enter the message!");
                    }
                } else {
                    await channel.send(barrier + " I haven't connected to any server yet!");
                }
                break;
            case "hotbar":
            case "slot":
                if (await isConnected(channel)) {
                    if (args.length > 0) {
                        await hotbar(channel, args.join(" "));
                        await channel.send(reply + " Set hotbar to slot " + args.join(" "));
                    } else {
                        await channel.send(barrier + " Please enter the slot number!");
                    }
                } else {
                    await channel.send(x + " I haven't connected to any server yet!");
                }
                break;
            case "interact":
                await interact(channel)
                break;
            case "move":
            case "walk":
                if (await isConnected(channel)) {
                    await channel.send(reply + " Walking...");
                    await move(channel);
                } else {
                    await channel.send(x + " I haven't connected to any server yet!");
                }
                break;
            case "form":
                if (await isConnected(channel)) {
                    if (clients[channel]["formId"] !== undefined) {
                        if (args.length > 0) {
                            await channel.send(reply + " Sending modal form response");
                            await sendModalResponse(channel, args.join(" "));
                            clients[channel]["formId"] = undefined;
                        }
                    } else {
                        await channel.send(barrier + " No ModalFormRequestPacket found!");
                    }
                } else {
                    await channel.send(x + " I haven't connected to any server yet!");
                }
                break;
            case "enablechat":
                if (await isConnected(channel)) {
                    if (args.length > 0) {
                        if (args[0] === "true") {
                            clients[channel]["enableChat"] = true;
                            await channel.send(":ballot_box_with_check: Chat successfully enabled");
                        } else if (args[0] === "false") {
                            clients[channel]["enableChat"] = false;
                            await channel.send(":ballot_box_with_check: Chat successfully disabled");
                        }
                    }
                } else {
                    await channel.send(x + " I haven't connected to any server yet!");

                }
                break;
            case "close":
            case "disconnect":
                await disconnect(channel);
                break;
            case "invite":
            case "stats":
            case "status":
                const button = new dsbutton.MessageButton()
                    .setStyle("url")
                    .setLabel("Bot Invite Link")
                    .setURL("https://discord.com/api/oauth2/authorize?client_id=844733770581803018&permissions=3072&scope=bot");

                await channel.send({
                    button: button,
                    embed: makeEmbed("" +
                        "**MinecraftClient** - v" + mcversion + "\n\n" +

                        "RAM Usage: " + Math.round(process.memoryUsage().rss / 10485.76) / 100 + " MB\n" +
                        "Uptime: " + await getUptime() + "\n\n" +

                        "Clients: " + connectedClient + "/20\n" +
                        "Guilds: " + dsclient.guilds.cache.size + "\n\n" +

                        "Developer: brokiem#7919\n" +
                        "Language: JavaScript\n" +
                        "Library: discord.js v12"
                    )
                });
                break;
            case "servers":
                if (message.author.id === "548120702373593090") {
                    await channel.send("Servers: (" + dsclient.guilds.cache.size + ")\n - " + dsclient.guilds.cache.array().join("\n - "));
                }
                break;
        }
    } catch (e) {
        try {
            await message.channel.send(x + " **An error occurred:** " + e)
        } catch (err) {}

        console.log("Error: " + e)
    }
})

async function ping(channel, address, port = "19132") {
    if (parseInt(port) === 25565) {
        await pingJava(channel, address, 25565)
        return;
    }

    query.statusBedrock(address, {
        port: parseInt(port), enableSRV: true, timeout: 3000
    }).then((response) => {
        channel.send(makeEmbed("**Query information**\n\n**MOTD**: " + response.motdLine1.descriptionText + "\n**Version**: " + response.version + "\n**Players**: " + response.onlinePlayers + "/" + response.maxPlayers))
    }).catch(() => {
        if (parseInt(port) === 19132) {
            pingJava(channel, address, 25565)
        }
    })
}

async function pingJava(channel, address, port) {
    query.status(address, {
        port: parseInt(port), enableSRV: true, timeout: 5000
    }).then((response) => {
        channel.send(makeEmbed("**Query information**\n\n**MOTD**: " + response.description.descriptionText + "\n**Version**: " + response.version + "\n**Players**: " + response.onlinePlayers + "/" + response.maxPlayers))
    }).catch((err) => {
        channel.send(makeEmbed("Query failed: " + err))
    })
}

function connect(channel, address, port, version = "auto") {
    if (isConnected(channel, false)) {
        channel.send(x + " I've connected on this channel!");
        return;
    }

    if (checkMaxClient(channel)) {
        return;
    }

    console.log("Connecting to " + address + " on port " + port + " with version " + version)
    channel.send(signal + " Connecting to " + address + " on port " + port + " with version " + version);

    if (connectedClientGuild[channel.guild] !== undefined) {
        ++connectedClientGuild[channel.guild];
    } else {
        connectedClientGuild[channel.guild] = 1;
    }
    clients[channel] = {'connected': false, 'enableChat': true, 'hotbar_slot': 0, 'cachedFilteredTextPacket': []}

    query.statusBedrock(address, {
        port: parseInt(port), enableSRV: true, timeout: 5000
    }).then(() => {
        let client = null;

        if (version !== "auto") {
            client = new Client({
                host: address,
                port: parseInt(port),
                version: version,
                offline: false,
                authTitle: '00000000441cc96b',
                skipPing: true
            });
        } else {
            client = new Client({
                host: address,
                port: parseInt(port),
                offline: false,
                authTitle: '00000000441cc96b',
                skipPing: true
            });
        }

        client.connect();
        channel.send(":newspaper: Started packet reading...");
        clients[channel]["connectTimeout"] = setTimeout(function () {
            if (!clients[channel]["connected"]) {
                channel.send(x + " Server didn't respond in 10 seconds. Something wrong happened\n" + e + " Maybe this problem happened because: Incompatible version/protocol, Packet processing error or Connection problem");
                disconnect(channel, false);
            }
        }, 10000);

        clients[channel]["intervalChat"] = setInterval(function () {
            sendCachedTextPacket(channel)
        }, 5000);
        clients[channel]["maxTimeConnectedTimeout"] = setTimeout(function () {
            if (isConnected(channel, false)) {
                channel.send(x + " Disconnected because automatically disconnected every 20 minutes")
                disconnect(channel);
            }
        }, 1200000);

        clients[channel]["client"] = client;
        connectedClient++;

        client.on("start_game", (packet) => {
            clients[channel]["runtime_id"] = packet.runtime_id;
            clients[channel]["runtime_entity_id"] = packet.runtime_entity_id;
            clients[channel]["player_position"] = packet.spawn_position;

            channel.send(":signal_strength: Successfully connected to the server!~");
            clients[channel]["connected"] = true;
            client.queue("set_local_player_as_initialized", {runtime_entity_id: clients[channel]["runtime_entity_id"]});

            if (clients[channel]["connectTimeout"] !== undefined) {
                clearTimeout(clients[channel]["connectTimeout"]);
            }
        });

        client.on("play_status", (packet) => {
            let message = null;
            switch (packet.status) {
                case "failed_client":
                case "failed_spawn":
                    message = "Incompatible version";
                    break;
                case "failed_server_full":
                    message = "Server full!";
                    break;
            }

            if (message !== null) {
                channel.send("Disconnected from the server: " + message);
                disconnect(channel, false);
            }
        });

        client.on("mob_equipment", (packet) => {
            if (debug) {
                console.log(packet);
            }
        })

        client.on("move_entity", (packet) => {
            if (debug) {
                console.log(packet);
            }
        })

        client.on("move_player", (packet) => {
            if (debug) {
                console.log(packet);
            }
        })

        client.on("inventory_transaction", (packet) => {
            if (debug) {
                console.log(packet);
            }
        })

        client.on("modal_form_request", (packet) => {
            const jsonData = JSON.parse(packet.data);
            const string = "abcdefgklmr0123456789"; // minecraft color

            clients[channel]["formId"] = packet.form_id;

            if (jsonData.type === "form") {
                let filteredText = jsonData.content;
                for (let i = 0; i < jsonData.content.length; i++) {
                    filteredText = filteredText.split("§" + string[i]).join("");
                }

                let text = e + "  **ModalFormRequestPacket received**\n\nForm ID: " + packet.form_id + "\n\n           " + jsonData.title + "\n" + filteredText + "\n\n";

                let buttonId = 0;
                let buttons = [];
                jsonData.buttons.forEach((fn) => {
                    buttons.push("ID: " + buttonId + " | Button: " + fn.text + "");

                    buttonId++;
                })

                channel.send(makeEmbed(text + "```" + buttons.join("\n") + "```" + "\nType ( *form <button id> ) to response"));
            } else {
                channel.send(x + " I can't handle custom form yet, you can use ' *form null ' to close the form");
            }

            if (debug) {
                console.log(packet)
            }
            //sendModalResponse(channel, "0"); // unhandled
        })

        client.on("text", (packet) => {
            if (clients[channel]["enableChat"]) {
                const string = "abcdefgklmr0123456789";

                clients[channel]["filteredTextPacket"] = packet.message;
                if (clients[channel]["filteredTextPacket"] !== undefined) {
                    for (let i = 0; i < string.length; i++) {
                        clients[channel]["filteredTextPacket"] = clients[channel]["filteredTextPacket"].split("§" + string[i]).join("").replace("discord", "shit");
                    }
                    clients[channel]["cachedFilteredTextPacket"].push(clients[channel]["filteredTextPacket"]);
                }
            }
        })

        client.on("transfer", (packet) => {
            channel.send(makeEmbed(e + "  **TransferPacket received**\n\nAddress: " + packet.server_address + "\nPort: " + packet.port))
            disconnect(channel, false);
            connect(channel, packet.server_address, packet.port);
        });

        client.once("resource_packs_info", () => {
            client.write("resource_pack_client_response", {
                response_status: 'completed',
                resourcepackids: []
            });

            client.once("resource_pack_stack", () => {
                client.write("resource_pack_client_response", {
                    response_status: 'completed',
                    resourcepackids: []
                });
            });

            client.queue("client_cache_status", {enabled: false});
            client.queue("request_chunk_radius", {chunk_radius: 1});
            client.queue("tick_sync", {request_time: BigInt(Date.now()), response_time: 0n});
        });

        client.once("disconnect", (packet) => {
            channel.send(x + " Disconnected from server:\n```" + packet.message + "```");
        });

        client.once("close", () => {
            clearInterval(clients[channel]["intervalChat"])
            clearTimeout(clients[channel]["maxTimeConnectedTimeout"])

            if (connectedClientGuild[channel.guild] !== undefined) {
                --connectedClientGuild[channel.guild];

                if (connectedClientGuild[channel.guild] <= 0) {
                    delete connectedClientGuild[channel.guild];
                }
            }

            connectedClient--;
            delete clients[channel];
            channel.send(x + " Disconnected: Client closed!");
        });
    }).catch((error) => {
        delete clients[channel];
        channel.send(x + " Unable to connect to [" + address + "/" + port + "]. " + error.message);
    });
}

function checkMaxClient(channel) {
    if (connectedClient >= 20) {
        channel.send(makeEmbed("Clients are too busy! Please try again later."));
        return true;
    }

    if (connectedClientGuild[channel.guild] !== undefined && connectedClientGuild[channel.guild] >= 2) {
        channel.send(makeEmbed("Max 2 clients connected/discord guild"));
        return true;
    }

    return false;
}

function sendCachedTextPacket(channel) {
    if (isConnected(channel, false) && (clients[channel]["cachedFilteredTextPacket"].length > 0) && (clients[channel] !== undefined) && clients[channel]["enableChat"]) {
        channel.send(makeEmbed(clients[channel]["cachedFilteredTextPacket"].join("\n\n")))
        clients[channel]["cachedFilteredTextPacket"] = [];
    }
}

function makeEmbed(string) {
    return new discord.MessageEmbed().setDescription(string);
}

async function sendModalResponse(channel, string) {
    clients[channel]["client"].queue("modal_form_response", {
        form_id: clients[channel]["formId"],
        data: string
    });
}

async function hotbar(channel, slot) {
    clients[channel]["client"].queue("mob_equipment", {
        runtime_entity_id: clients[channel]["runtime_entity_id"],
        item: {
            network_id: 0,
            count: undefined,
            metadata: undefined,
            has_stack_id: undefined,
            stack_id: undefined,
            block_runtime_id: undefined,
            extra: {has_nbt: 0, nbt: undefined, can_place_on: [], can_destroy: []}
        },
        slot: parseInt(slot),
        selected_slot: parseInt(slot),
        window_id: 'inventory'
    });
    clients[channel]["hotbar_slot"] = parseInt(slot)
}

async function interact(channel) {
    clients[channel]["client"].queue("inventory_transaction", {
        legacy: {legacy_request_id: 0, legacy_transactions: 0},
        transaction_type: '2',
        actions: {
            value: 'world_interaction',
            slot: clients[channel]["hotbar_slot"],
            old_item: {
                network_id: 0,
                count: undefined,
                metadata: undefined,
                has_stack_id: undefined,
                stack_id: undefined,
                block_runtime_id: undefined,
                extra: {has_nbt: 0, nbt: undefined, can_place_on: [], can_destroy: []}
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
            block_position: clients[channel]["player_position"],
            face: 0,
            hotbar_slot: clients[channel]["hotbar_slot"],
            held_item: 0,
            player_pos: clients[channel]["player_position"],
            click_pos: clients[channel]["player_position"],
            block_runtime_id: 0
        }
    });
}

async function move(channel) {
    if (clients[channel]["player_position"] === undefined) {
        channel.send(x + " Please wait for the server to send the client position")
        return;
    }

    if (clients[channel]["walking"] !== undefined && clients[channel]["walking"]) {
        channel.send(x + " Please wait 2 seconds before walking again!");
        return;
    }

    clients[channel]["walking"] = true;
    /*clients[channel]["player_position"] = {
        x: clients[channel]["player_position"].x + await rand(-3, 3),
        y: clients[channel]["player_position"].y,
        z: clients[channel]["player_position"].z - await rand(-3, 3)
    }*/

    setTimeout(function () {
        clients[channel]["walking"] = false;
    }, 2000)

    setTimeout(function () {
        clearInterval(clients[channel]["walkingIntervalID"]);
    }, 2000);

    clients[channel]["walkingIntervalID"] = setInterval(function () {
        clients[channel]["client"].queue("move_player", {
            runtime_id: clients[channel]["runtime_id"],
            position: {
                x: clients[channel]["player_position"].x += 0.10000000000000,
                y: clients[channel]["player_position"].y,
                z: clients[channel]["player_position"].z += 0.10000000000000
            },
            pitch: rand(0, 12),
            yaw: rand(0, 12),
            head_yaw: rand(0, 12),
            mode: 'normal',
            on_ground: true,
            ridden_runtime_id: 0,
            teleport: {cause: "unknown", source_entity_type: 0},
            tick: 0n
        })
    }, 50);

    channel.send(makeEmbed(":ski: Walking randomly to X:" + clients[channel]["player_position"].x + " Y:" + clients[channel]["player_position"].y + " Z:" + clients[channel]["player_position"].z))
}

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


async function chat(channel, string) {
    clients[channel]["client"].queue("text", {
        type: 'chat',
        needs_translation: false,
        source_name: filter.clean(string),
        message: filter.clean(string),
        paramaters: undefined,
        xuid: '',
        platform_chat_id: ''
    });
}

async function sendCommand(channel, string) {
    clients[channel]["client"].queue("command_request", {
        command: string,
        origin: {
            type: "player",
            uuid: "",
            request_id: ""
        }
    });
}

function isConnected(channel, check = true) {
    if (check) {
        return clients[channel] !== undefined && clients[channel]["connected"]
    }

    return clients[channel] !== undefined;
}

function disconnect(channel, showMessage = true) {
    if (!isConnected(channel, false)) {
        channel.send(barrier + " I haven't connected to any server yet!\n");
        return;
    }

    clients[channel]["client"].close();

    if (showMessage) {
        channel.send(auth + " Disconnected succesfully!");
    }
}

async function getUptime() {
    let totalSeconds = (dsclient.uptime / 1000);
    let days = Math.floor(totalSeconds / 86400);
    let hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;

    return /*((0 < days) ? (days + " day, ") : "") + */hours + "h, " + minutes + "m and " + seconds.toFixed(0) + "s";
}