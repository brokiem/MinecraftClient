//process.env.DEBUG = 'minecraft-protocol'

require("dotenv").config();

const discord = require("discord.js");
const dsclient = new discord.Client({intents: [discord.Intents.FLAGS.GUILDS, discord.Intents.FLAGS.GUILD_MESSAGES]});
const {Client} = require("bedrock-protocol");
const query = require("minecraft-server-util");
const Filter = require('bad-words');
const filter = new Filter();

let clients = [];
let connectedClient = 0;
let debug = false;

const mcversion = '1.1.0'

const x = "<:brokiem_x:849486576727097384>";
const e = "<:enter:849493018910261259>";
const auth = "<:auth:849493635820158977>"
const signal = "<:stage:849498188096077834>";
const reply = "<:reply:849498663956774942>";
const barrier = "<:barrier:849501525596438539>";
const slash = "<:slash:856511320421302273>";
const botdev = "<:botdev:856511739972550666>";
const settings = "<:settings:856517667128999947>";

const activities = [
    "*invite",
    "Minecraft",
    "*help"
];

const sup_versions = [
    "1.17.0",
    "1.16.220"
];

dsclient.login().catch(() => {
    console.error("The bot token was incorrect.");
});

dsclient.on("ready", () => {
    dsclient.user.setStatus("online");

    let i = 0;
    setInterval(() => {
        if (activities[i] !== undefined) {
            dsclient.user.setActivity(activities[i]);
        }

        i <= activities.length ? ++i : i = 0;
    }, 30000);

    console.log("Bot ready and online!\n");

    console.log("RAM Usage: " + Math.round(process.memoryUsage().rss / 10485.76) / 100 + " MB")
    // console.log("Servers: (" + dsclient.guilds.cache.size + ")\n - " + dsclient.guilds.cache.array().join("\n - "))
});

dsclient.on("message", async message => {
    if (!message.guild.me.permissions.has("SEND_MESSAGES")) {
        return;
    }

    try {
        if (message.content.includes(dsclient.user.id) && message.channel.type === "text" && !message.author.bot) {
            message.channel.send({embeds: [makeEmbed(slash + " My prefix is * (Asterisk) | *help")]}).then(msg => {
                setTimeout(function () {
                    msg.delete();
                }, 10000);
            });
            return;
        }

        if (message.author.bot || !message.content.startsWith("*") || message.channel.type !== "text") return;

        const args = message.content.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        const channel = message.channel;

        //console.log("Command '" + command + "' by " + message.author.tag + " on " + message.guild.name + " | " + new Date().toLocaleString());

        switch (command) {
            case "debug":
                if (message.author.id === "548120702373593090") {
                    debug = !debug;
                    await channel.send("Debug successfully " + (debug ? "enabled" : "disabled"));
                }
                break;
            case "help":
                const helpEmbed1 = new discord.MessageEmbed()
                    .setColor("BLURPLE")
                    .setTitle(slash + " Command List\n\n")
                    .setThumbnail("https://cdn.discordapp.com/attachments/833621011097845830/856845502104076289/856511320421302273.png")
                    .addField("*query <address> <port>", "Query a Minecraft server (java or bedrock)")
                    .addField("*join <address> <port> <version>", "Join to Minecraft server (bedrock)")
                    .addField("*chat <message>", "Send chat to connected server")
                    .addField("*enablechat <value>", "Enable server chat to discord channel")
                    .addField("*form <button id>", "Send form resp to connected server")
                    .addField("*disconnect", "Disconnect from connected server")
                    .addField("*invite", "Get bot invite link");

                await channel.send({embeds: [helpEmbed1]});
                break;
            case "query":
                if (args.length > 0) {
                    await channel.send(signal + " Getting query info...");
                    await ping(channel, args[0], isNaN(args[1]) ? 19132 : args[1]);
                } else {
                    await channel.send({embeds: [makeEmbed(slash + " **Usage:** *query <address> <port>")]});
                }
                break;
            case "connect":
            case "join":
                if (args.length > 0) {
                    if (args[2] !== undefined && !sup_versions.includes(args[2])) {
                        await channel.send({embeds: [makeEmbed(settings + " Supported versions: " + sup_versions.join(", "))]});
                        return;
                    }

                    connect(channel, args[0], isNaN(args[1]) ? 19132 : args[1], args[2] ?? "auto");
                } else {
                    await channel.send({embeds: [makeEmbed(slash + " **Usage:** *connect <address> <port> <version>")]});
                }
                break;
            case "chat":
            case "message":
                if (isConnected(channel)) {
                    if (args.length > 0) {
                        if (args.join(" ").charAt(0) === "/") {
                            sendCommand(channel, args.join(" "));
                            await channel.send(reply + " Sending command...");
                        } else {
                            chat(channel, args.join(" "));
                            await channel.send(reply + " Sending message...");
                        }
                    } else {
                        await channel.send({embeds: [makeEmbed(slash + " **Usage:** *chat <message>")]});
                    }
                } else {
                    await channel.send(x + " I haven't connected to any server yet!");
                }
                break;
            /*case "hotbar":
            case "slot":
                if (isConnected(channel)) {
                    if (args.length > 0) {
                        hotbar(channel, args.join(" "));
                        channel.send(reply + " Set hotbar to slot " + args.join(" "));
                    } else {
                        channel.send(x + " Please enter the slot number!");
                    }
                } else {
                    channel.send(x + " I haven't connected to any server yet!");
                }
                break;
            case "interact":
                interact(channel);
                break;*/
            case "move":
            case "walk":
                if (isConnected(channel)) {
                    move(channel);
                } else {
                    await channel.send(x + " I haven't connected to any server yet!");
                }
                break;
            case "form":
                if (isConnected(channel)) {
                    if (clients[channel]["formId"] !== undefined) {
                        if (args.length > 0) {
                            await channel.send(reply + " Sending modal form response");
                            sendModalResponse(channel, args.join(" "));
                            clients[channel]["formId"] = undefined;
                        }
                    } else {
                        await channel.send(x + " No ModalFormRequestPacket found!");
                    }
                } else {
                    await channel.send(x + " I haven't connected to any server yet!");
                }
                break;
            case "enablechat":
                if (isConnected(channel)) {
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
                disconnect(channel);
                break;
            case "invite":
            case "stats":
            case "status":
                const invite = new discord.MessageButton().setStyle("LINK").setLabel("Invite")
                    .setURL("https://discord.com/oauth2/authorize?client_id=" + dsclient.user.id + "&permissions=3072&scope=bot");
                const vote = new discord.MessageButton().setStyle("LINK").setLabel("Vote")
                    .setURL("https://top.gg/bot/844733770581803018/vote");

                const row = new discord.MessageActionRow().addComponents(invite).addComponents(vote);

                await channel.send({
                    components: [row],
                    embeds: [makeEmbed("" +
                        botdev + " **MinecraftClient** - v" + mcversion + "\n\n" +

                        "RAM Usage: " + Math.round(process.memoryUsage().rss / 10485.76) / 100 + " MB\n" +
                        "Uptime: " + getUptime() + "\n\n" +

                        "Clients: " + connectedClient + "/20\n" +
                        "Guilds: " + dsclient.guilds.cache.size + "\n\n" +

                        "Developer: brokiem#7919\n" +
                        "Language: JavaScript\n" +
                        "Library: discord.js v13-dev"
                    ).setColor("BLURPLE")]
                });
                break;
            case "servers":
                if (message.author.id === "548120702373593090") {
                    await channel.send("Servers: (" + dsclient.guilds.cache.size + ")\n - " + dsclient.guilds.cache.array().join("\n - "));
                }
                break;
        }
    } catch (e) {
        await message.channel.send(x + " **An error occurred:** " + e.toString());

        console.log("Error: " + e);
    }
})

async function ping(channel, address, port = "19132") {
    if (parseInt(port) === 25565) {
        await pingJava(channel, address, 25565);
        return;
    }

    query.statusBedrock(address, {
        port: parseInt(port), enableSRV: true, timeout: 3000
    }).then((response) => {
        channel.send({embeds: [makeEmbed("**Query information**\n\n**MOTD**: " + response.motdLine1.descriptionText + "\n**Version**: " + response.version + "\n**Players**: " + response.onlinePlayers + "/" + response.maxPlayers)]});
    }).catch(() => {
        if (parseInt(port) === 19132) {
            pingJava(channel, address, 25565);
        }
    })
}

async function pingJava(channel, address, port) {
    query.status(address, {
        port: parseInt(port), enableSRV: true, timeout: 5000
    }).then((response) => {
        channel.send({embeds: [makeEmbed("**Query information**\n\n**MOTD**: " + response.description.descriptionText + "\n**Version**: " + response.version + "\n**Players**: " + response.onlinePlayers + "/" + response.maxPlayers)]});
    }).catch((err) => {
        channel.send({embeds: [makeEmbed("Query failed: " + err)]});
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

    if (clients[channel.guild] !== undefined) {
        ++clients[channel.guild];
    } else {
        clients[channel.guild] = 1;
    }
    clients[channel] = {'connected': false, 'enableChat': true, 'hotbar_slot': 0, 'cachedFilteredTextPacket': []}

    query.statusBedrock(address, {
        port: parseInt(port), enableSRV: true, timeout: 5000
    }).then(() => {
        let client = new Client({
            host: address,
            port: parseInt(port),
            offline: false,
            authTitle: '00000000441cc96b',
            skipPing: true
        });

        if (version !== "auto") {
            client = new Client({
                host: address,
                port: parseInt(port),
                version: version,
                offline: false,
                authTitle: '00000000441cc96b',
                skipPing: true
            });
        }

        client.connect();
        channel.send(":newspaper: Started packet reading...");
        clients[channel]["connectTimeout"] = setTimeout(function () {
            if (!clients[channel]["connected"]) {
                channel.send(x + " Server didn't respond in 10 seconds. Something wrong happened\n" + e + " Maybe this problem happened because: Incompatible version/protocol, packet processing error or connection problem");
                disconnect(channel, false);
            }
        }, 10000);

        clients[channel]["intervalChat"] = setInterval(function () {
            sendCachedTextPacket(channel);
        }, 5000);
        clients[channel]["maxTimeConnectedTimeout"] = setTimeout(function () {
            if (isConnected(channel, false)) {
                channel.send(x + " Disconnected because automatically disconnected every 20 minutes")
                disconnect(channel, false);
            }
        }, 1200000);

        clients[channel]["client"] = client;
        connectedClient++;

        client.on("start_game", (packet) => {
            clients[channel]["runtime_id"] = packet.runtime_id;
            clients[channel]["runtime_entity_id"] = packet.runtime_entity_id;
            clients[channel]["player_position"] = packet.spawn_position;
            clients[channel]["player_position"].y += 1.62;

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
                });

                channel.send({embeds: [makeEmbed(text + "```" + buttons.join("\n") + "```" + "\nType ( *form <button id> ) to response")]});
            } else {
                channel.send(x + " I can't handle custom form yet, Use ' *form null ' to close the form");
            }

            if (debug) {
                console.log(packet);
            }
        });

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
        });

        client.on("transfer", (packet) => {
            channel.send({embeds: [makeEmbed(e + "  **TransferPacket received**\n\nAddress: " + packet.server_address + "\nPort: " + packet.port)]})
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

        client.once("kick", (packet) => {
            channel.send(x + " Disconnected from server:\n```" + packet.message + "```");
        });

        client.once("close", () => {
            if (isConnected(channel)) {
                disconnect(channel, false);
            }

            channel.send(x + " Disconnected: Client closed!");
        });
    }).catch((error) => {
        if (clients[channel.guild] !== undefined) {
            --clients[channel.guild];

            if (clients[channel.guild] <= 0) {
                delete clients[channel.guild];
            }
        }

        delete clients[channel];

        channel.send(x + " Unable to connect to " + address + " " + port + ": " + error.message);
    });
}

function checkMaxClient(channel) {
    if (connectedClient >= 20) {
        channel.send({embeds: [makeEmbed("All Clients are busy! Please try again later.")]});
        return true;
    }

    if (clients[channel.guild] !== undefined && clients[channel.guild] >= 2) {
        channel.send({embeds: [makeEmbed(`Oof, this Guild has reached the limit of connected clients (${clients[channel.guild]})!`)]});
        return true;
    }

    return false;
}

function sendCachedTextPacket(channel) {
    if (isConnected(channel, false) && (clients[channel]["cachedFilteredTextPacket"].length > 0) && (clients[channel] !== undefined) && clients[channel]["enableChat"]) {
        channel.send({embeds: [makeEmbed(clients[channel]["cachedFilteredTextPacket"].join("\n\n"))]})
        clients[channel]["cachedFilteredTextPacket"] = [];
    }
}

function makeEmbed(string) {
    return new discord.MessageEmbed().setDescription(string);
}

function sendModalResponse(channel, string) {
    clients[channel]["client"].queue("modal_form_response", {
        form_id: clients[channel]["formId"],
        data: string
    });
}

function hotbar(channel, slot) {
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

function interact(channel) {
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

function move(channel) {
    if (clients[channel]["player_position"] === undefined) {
        channel.send(x + " Please wait for the server to send the client position")
        return;
    }

    if (clients[channel]["walking"] !== undefined && clients[channel]["walking"]) {
        channel.send(x + " Please wait 3 seconds before walking again!");
        return;
    }

    channel.send(reply + " Walking...");

    clients[channel]["walking"] = true;

    setTimeout(function () {
        clients[channel]["walking"] = false;
    }, 3000)

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

    channel.send({embeds: [makeEmbed(":ski: Walking randomly to X:" + clients[channel]["player_position"].x + " Y:" + clients[channel]["player_position"].y + " Z:" + clients[channel]["player_position"].z)]})
}

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chat(channel, string) {
    clients[channel]["client"].queue("text", {
        type: 'chat',
        needs_translation: false,
        source_name: "MClient890",
        message: filter.clean(string),
        paramaters: undefined,
        xuid: '',
        platform_chat_id: ''
    });
}

function sendCommand(channel, string) {
    clients[channel]["client"].queue("command_request", {
        command: string,
        origin: {
            type: "player",
            uuid: "",
            request_id: ""
        }
    });
}

function isConnected(channel, checkConnected = true) {
    if (checkConnected) {
        return clients[channel] !== undefined && clients[channel]["connected"];
    }

    return clients[channel] !== undefined;
}

function disconnect(channel, showMessage = true) {
    if (!isConnected(channel, false)) {
        channel.send(x + " I haven't connected to any server yet!\n");
        return;
    }

    let client = clients[channel]["client"];

    clearInterval(clients[channel]["intervalChat"]);
    clearTimeout(clients[channel]["maxTimeConnectedTimeout"]);

    if (clients[channel.guild] !== undefined) {
        --clients[channel.guild];

        if (clients[channel.guild] <= 0) {
            delete clients[channel.guild];
        }
    }

    connectedClient--;
    delete clients[channel];

    client.close();
    client = null;

    if (showMessage) {
        channel.send(auth + " Disconnected succesfully!");
    }
}

function getUptime() {
    let totalSeconds = (dsclient.uptime / 1000);
    let days = Math.floor(totalSeconds / 86400);
    let hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;

    return /*((0 < days) ? (days + " day, ") : "") + */hours + "h, " + minutes + "m and " + seconds.toFixed(0) + "s";
}