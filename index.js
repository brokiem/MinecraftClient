//process.env.DEBUG = "minecraft-protocol"

import discord from 'discord.js'
import {Client} from 'bedrock-protocol'
import query from 'minecraft-server-util'
import fs from 'fs'

const dsclient = new discord.Client({intents: [discord.Intents.FLAGS.GUILDS, discord.Intents.FLAGS.GUILD_MESSAGES]})

export let clients = []
export let connectedClient = 0
export let debug = false

const prefix = "*"
export const mcversion = "1.1.1"

export const x = "<:brokiem_x:849486576727097384>"
export const e = "<:enter:849493018910261259>"
export const auth = "<:auth:849493635820158977>"
export const signal = "<:stage:849498188096077834>"
export const reply = "<:reply:849498663956774942>"
export const barrier = "<:barrier:849501525596438539>"
export const slash = "<:slash:856511320421302273>"
export const botdev = "<:botdev:856511739972550666>"
export const settings = "<:settings:856517667128999947>"

const activities = [
    "*invite",
    "Minecraft",
    "*help"
]

export const sup_versions = [
    "1.18.0", "1.18.11", "1.18.30", "1.19.1",
    "1.19.10", "1.19.20", "1.19.21", "1.19.30",
    "1.19.40", "1.17.10", "1.17.0", "1.16.220"
]

dsclient.commands = new discord.Collection()

// Load all bot commands
const commands = fs.readdirSync("./commands").filter(file => file.endsWith(".js"))
for (const file of commands) {
    const commandName = file.split(".")[0]
    const command = import(`./commands/${file}`).then((cmd) => {
        console.log(`Loading command ${commandName}`)
        dsclient.commands.set(commandName, cmd)
    })
}

dsclient.login().catch((e) => {
    console.error("The bot token was incorrect.\n" + e)
})

dsclient.on("ready", () => {
    dsclient.user.setStatus("online")

    let i = 0
    setInterval(() => {
        if (activities[i] !== undefined) {
            dsclient.user.setActivity(activities[i])
        }

        i <= activities.length ? ++i : i = 0
    }, 30000)

    console.log("\nBot ready and online!\n")
    console.log("RAM Usage: " + Math.round(process.memoryUsage().rss / 10485.76) / 100 + " MB")
})

dsclient.on("messageCreate", async message => {
    if (!message.guild.me.permissions.has("SEND_MESSAGES")) {
        return
    }

    try {
        if (message.author.bot || !message.content.startsWith(prefix) || message.channel.type !== "text") return

        const args = message.content.slice(prefix.length).trim().split(/ +/)
        const command = args.shift().toLowerCase()
        const channel = message.channel

        switch (command) {
            case "servers":
                if (message.author.id === "548120702373593090") {
                    await channel.send("Servers: (" + dsclient.guilds.cache.size + ")\n - " + dsclient.guilds.cache.array().join("\n - "))
                }
                break
            case "restart":
                if (message.author.id === "548120702373593090") {
                    await message.reply({
                        embeds: [makeEmbed(settings + " Restarting...")],
                        allowedMentions: {repliedUser: false}
                    })
                    process.exit(1)
                }
                break
            case "eval":
                if (message.author.id === "548120702373593090") {
                    try {
                        const code = args.join(" ")
                        let evaled = eval(code)

                        if (typeof evaled !== "string") {
                            evaled = require("util").inspect(evaled)
                        }

                        await message.reply({
                            content: `\`\`\`${clean(evaled)}\`\`\``,
                            allowedMentions: {repliedUser: false}
                        })
                    } catch (e) {
                        await message.reply({
                            content: `Error: \`\`\`xl\n${clean(e)}\n\`\`\``,
                            allowedMentions: {repliedUser: false}
                        })
                    }
                }
                break
        }
    } catch (e) {
        await message.reply({
            content: x + " **An error occurred:** " + e.toString(),
            allowedMentions: {repliedUser: false}
        })

        console.log("Error: " + e)
    }
})

dsclient.on("guildCreate", async guild => {
    registerSlashCommands(guild.id)
})

function clean(text) {
    if (typeof (text) === "string") {
        return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203))
    } else {
        return text
    }
}

dsclient.on("interactionCreate", async interaction => {
    if (interaction.isCommand() && interaction.inGuild()) {
        const command = dsclient.commands.get(interaction.commandName)
        if (!command) return

        await command.run(dsclient, interaction)
    }
})

function registerSlashCommands(guild_id) {
    const commands = [
        {
            "name": "help",
            "type": 1,
            "description": "Show help command",
        },
        {
            "name": "query",
            "type": 1,
            "description": "Query minecraft server (java & bedrock)",
            "options": [
                {
                    "name": "address",
                    "description": "Server address (ex: play.hypixel.net)",
                    "type": 3,
                    "required": true
                },
                {
                    "name": "port",
                    "description": "Server port (ex: 25565)",
                    "type": 4,
                    "required": true
                }
            ]
        },
        {
            "name": "connect",
            "type": 1,
            "description": "Connect to minecraft server (bedrock only)",
            "options": [
                {
                    "name": "address",
                    "description": "Server address (ex: play.hypixel.net)",
                    "type": 3,
                    "required": true
                },
                {
                    "name": "port",
                    "description": "Server port (ex: 25565)",
                    "type": 4,
                    "required": true
                },
                {
                    "name": "version",
                    "description": "Client version (ex: 1.19.40)",
                    "type": 3,
                    "required": false
                }
            ]
        },
        {
            "name": "chat",
            "type": 1,
            "description": "Send chat to the minecraft server",
            "options": [
                {
                    "name": "message",
                    "description": "Chat message",
                    "type": 3,
                    "required": true
                }
            ]
        },
        {
            "name": "move",
            "type": 1,
            "description": "Send random movement to the server"
        },
        {
            "name": "form",
            "type": 1,
            "description": "Send form response to the server",
            "options": [
                {
                    "name": "button_id",
                    "description": "Form button id",
                    "type": 3,
                    "required": true
                }
            ]
        },
        {
            "name": "enablechat",
            "type": 1,
            "description": "Enable or disable chat from the server"
        },
        {
            "name": "disconnect",
            "type": 1,
            "description": "Disconnect client from minecraft server"
        },
        {
            "name": "ping",
            "type": 1,
            "description": "Get Discord bot latency"
        },
        {
            "name": "invite",
            "type": 1,
            "description": "Get Discord bot invite link"
        },
        {
            "name": "servers",
            "type": 1,
            "description": "Get connected servers"
        }
    ]

    for (const command of commands) {
        dsclient.guilds.cache.get(guild_id)?.commands.create(command)
    }
}

export async function ping(channel, address, port = "19132") {
    if (parseInt(port) === 25565) {
        await pingJava(channel, address, 25565)
        return
    }

    query.statusBedrock(address, {
        port: parseInt(port), enableSRV: true, timeout: 3000
    }).then((response) => {
        channel.send({embeds: [makeEmbed("**Query information**\n\n**MOTD**: " + response.motdLine1.descriptionText + "\n**Version**: " + response.version + "\n**Players**: " + response.onlinePlayers + "/" + response.maxPlayers)]})
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
        channel.send({embeds: [makeEmbed("**Query information**\n\n**MOTD**: " + response.description.descriptionText + "\n**Version**: " + response.version + "\n**Players**: " + response.onlinePlayers + "/" + response.maxPlayers)]})
    }).catch((err) => {
        channel.send({embeds: [makeEmbed("Query failed: " + err)]})
    })
}

export function connect(interaction, address, port, version = "auto") {
    const channel = interaction.channel

    if (isConnected(channel, false)) {
        interaction.reply({
            content: x + " I've connected on this channel!",
            allowedMentions: {repliedUser: false}
        })
        return
    }

    if (checkMaxClient(channel)) {
        return
    }

    console.log("Connecting to " + address + " on port " + port + " with version " + version)
    interaction.reply(signal + " Connecting to " + address + " on port " + port + " with version " + version)

    if (clients[channel.guild] !== undefined) {
        ++clients[channel.guild]
    } else {
        clients[channel.guild] = 1
    }
    clients[channel] = {"connected": false, "enableChat": true, "hotbar_slot": 0, "cachedFilteredTextPacket": []}

    query.statusBedrock(address, {
        port: parseInt(port), enableSRV: true, timeout: 5000
    }).then(() => {
        let client = new Client({
            host: address,
            port: parseInt(port),
            offline: false,
            skipPing: true
        })

        if (version !== "auto") {
            client = new Client({
                host: address,
                port: parseInt(port),
                version: version,
                offline: false,
                skipPing: true
            })
        }

        client.connect()
        channel.send(":newspaper: Started packet reading...")
        clients[channel]["connectTimeout"] = setTimeout(function () {
            if (!clients[channel]["connected"]) {
                channel.send(x + " Server didn't respond in 10 seconds. Something wrong happened\n" + e + " Maybe this problem happened because: Incompatible version/protocol, packet processing error or connection problem")
                disconnect(interaction, false)
            }
        }, 10000)

        clients[channel]["intervalChat"] = setInterval(function () {
            sendCachedTextPacket(channel)
        }, 5000)
        clients[channel]["maxTimeConnectedTimeout"] = setTimeout(function () {
            if (isConnected(channel, false)) {
                channel.send(x + " Disconnected because automatically disconnected every 20 minutes")
                disconnect(interaction, false)
            }
        }, 1200000)

        clients[channel]["client"] = client
        connectedClient++

        client.on("start_game", (packet) => {
            clients[channel]["runtime_id"] = packet.runtime_id
            clients[channel]["runtime_entity_id"] = packet.runtime_entity_id
            clients[channel]["player_position"] = packet.spawn_position
            clients[channel]["player_position"].y += 1.62

            clients[channel]["connected"] = true

            channel.send(":signal_strength: Successfully connected to the server!~")
            client.queue("set_local_player_as_initialized", {runtime_entity_id: clients[channel]["runtime_entity_id"]})

            if (clients[channel]["connectTimeout"] !== undefined) {
                clearTimeout(clients[channel]["connectTimeout"])
            }
        })

        client.on("play_status", (packet) => {
            let message = null
            switch (packet.status) {
                case "failed_client":
                case "failed_spawn":
                    message = "Incompatible version"
                    break
                case "failed_server_full":
                    message = "Server full!"
                    break
            }

            if (message !== null) {
                channel.send("Disconnected from the server: " + message)
                disconnect(message, false)
            }
        })

        client.on("modal_form_request", (packet) => {
            const jsonData = JSON.parse(packet.data)
            const string = "abcdefgklmr0123456789" // minecraft color

            clients[channel]["formId"] = packet.form_id

            if (jsonData.type === "form") {
                let filteredText = jsonData.content
                for (let i = 0; i < jsonData.content.length; i++) {
                    filteredText = filteredText.split("§" + string[i]).join("")
                }

                let text = e + "  **ModalFormRequestPacket received**\n\nForm ID: " + packet.form_id + "\n\n           " + jsonData.title + "\n" + filteredText + "\n\n"

                let buttonId = 0
                let buttons = []
                jsonData.buttons.forEach((fn) => {
                    buttons.push("ID: " + buttonId + " | Button: " + fn.text + "")

                    buttonId++
                })

                channel.send({embeds: [makeEmbed(text + "```" + buttons.join("\n") + "```" + "\nType ( *form <button id> ) to response")]})
            } else {
                channel.send(x + ` I can't handle custom form yet, Use " *form null " to close the form`)
            }

            if (debug) {
                console.log(packet)
            }
        })

        client.on("text", (packet) => {
            if (clients[channel]["enableChat"]) {
                const string = "abcdefgklmr0123456789"

                if (packet.type === "translation") {
                    packet.message = translateMessage(packet)
                }

                clients[channel]["filteredTextPacket"] = packet.message
                if (clients[channel]["filteredTextPacket"] !== undefined) {
                    for (let i = 0; i < string.length; i++) {
                        clients[channel]["filteredTextPacket"] = clients[channel]["filteredTextPacket"].split("§" + string[i]).join("").replace("discord", "shit")
                    }
                    clients[channel]["cachedFilteredTextPacket"].push(clients[channel]["filteredTextPacket"])
                }
            }
        })

        client.on("transfer", (packet) => {
            channel.send({embeds: [makeEmbed(e + "  **TransferPacket received**\n\nAddress: " + packet.server_address + "\nPort: " + packet.port)]})
            disconnect(interaction, false)
            connect(interaction, packet.server_address, packet.port)
        })

        client.once("resource_packs_info", () => {
            client.write("resource_pack_client_response", {
                response_status: "completed",
                resourcepackids: []
            })

            client.once("resource_pack_stack", () => {
                client.write("resource_pack_client_response", {
                    response_status: "completed",
                    resourcepackids: []
                })
            })

            client.queue("client_cache_status", {enabled: false})
            client.queue("request_chunk_radius", {chunk_radius: 2})
            client.queue("tick_sync", {request_time: BigInt(Date.now()), response_time: 0n})
        })

        client.once("kick", (packet) => {
            channel.send(x + " Disconnected from server:\n```" + packet.message + "```")
        })

        client.once("close", () => {
            if (isConnected(channel)) {
                disconnect(interaction, false)
            }

            channel.send(x + " Disconnected: Client closed!")
        })
    }).catch((error) => {
        if (clients[channel.guild] !== undefined) {
            --clients[channel.guild]

            if (clients[channel.guild] <= 0) {
                delete clients[channel.guild]
            }
        }

        delete clients[channel]

        channel.send(x + " Unable to connect to " + address + " " + port + ": " + error.message)
    })
}

function translateMessage(packet) {
    let message = '';

    switch (packet.message) {
        case "§d%chat.type.announcement":
            message = "[" + packet.paramaters[0] + "] " + packet.paramaters[1]
            break
        case "§e%multiplayer.player.joined":
            message = packet.paramaters[0] + " joined the game"
            break
    }

    return message
}

function checkMaxClient(channel) {
    if (connectedClient >= 20) {
        channel.send({
            embeds: [makeEmbed("All Clients are busy! Please try again later.")],
            allowedMentions: {repliedUser: false}
        })
        return true
    }

    if (clients[channel.guild] !== undefined && clients[channel.guild] >= 2) {
        channel.send({
            embeds: [makeEmbed(`Oof, this Guild has reached the limit of connected clients (${clients[channel.guild]})!`)],
            allowedMentions: {repliedUser: false}
        })
        return true
    }

    return false
}

function sendCachedTextPacket(channel) {
    if (isConnected(channel, false) && (clients[channel]["cachedFilteredTextPacket"].length > 0) && (clients[channel] !== undefined) && clients[channel]["enableChat"]) {
        channel.send({embeds: [makeEmbed(clients[channel]["cachedFilteredTextPacket"].join("\n\n"))]})
        clients[channel]["cachedFilteredTextPacket"] = []
    }
}

export function makeEmbed(string) {
    return new discord.MessageEmbed().setDescription(string)
}

export function sendModalResponse(channel, string) {
    let formData = {
        form_id: clients[channel]["formId"],
        has_response_data: true,
        data: string,
        has_cancel_reason: false,
        cancel_reason: 0
    }

    clients[channel]["client"].queue("modal_form_response", formData)
}

export function move(channel) {
    if (clients[channel]["player_position"] === undefined) {
        channel.send(x + " Please wait for the server to send the client position")
        return
    }

    if (clients[channel]["walking"] !== undefined && clients[channel]["walking"]) {
        channel.send(x + " Please wait 3 seconds before walking again!")
        return
    }

    channel.send(reply + " Walking...")

    clients[channel]["walking"] = true

    setTimeout(function () {
        clients[channel]["walking"] = false
    }, 3000)

    setTimeout(function () {
        clearInterval(clients[channel]["walkingIntervalID"])
    }, 2000)

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
            mode: "normal",
            on_ground: true,
            ridden_runtime_id: 0,
            teleport: {cause: "unknown", source_entity_type: 0},
            tick: 0n
        })
    }, 50)

    channel.send({embeds: [makeEmbed(":ski: Walking randomly to X:" + clients[channel]["player_position"].x + " Y:" + clients[channel]["player_position"].y + " Z:" + clients[channel]["player_position"].z)]})
}

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

export function chat(channel, string) {
    clients[channel]["client"].queue("text", {
        type: "chat",
        needs_translation: false,
        source_name: "MClient890",
        message: string,
        paramaters: undefined,
        xuid: "",
        platform_chat_id: ""
    })
}

export function sendCommand(channel, string) {
    clients[channel]["client"].queue("command_request", {
        command: string,
        origin: {
            type: "player",
            uuid: "",
            request_id: ""
        }
    })
}

export function isConnected(channel, checkConnected = true) {
    if (checkConnected) {
        return clients[channel] !== undefined && clients[channel]["connected"]
    }

    return clients[channel] !== undefined
}

export function disconnect(interaction, showMessage = true) {
    const channel = interaction.channel

    if (!isConnected(channel, false)) {
        interaction.reply({
            content: x + " I haven't connected to any server yet!\n",
            allowedMentions: {repliedUser: false}
        })
        return
    }

    let client = clients[channel]["client"]

    clearInterval(clients[channel]["intervalChat"])
    clearTimeout(clients[channel]["maxTimeConnectedTimeout"])

    if (clients[channel.guild] !== undefined) {
        --clients[channel.guild]

        if (clients[channel.guild] <= 0) {
            delete clients[channel.guild]
        }
    }

    connectedClient--
    delete clients[channel]

    client.close()
    client = null

    if (showMessage) {
        interaction.reply(auth + " Disconnected succesfully!")
    }
}

export async function getUptime() {
    let totalSeconds = (dsclient.uptime / 1000)
    let hours = Math.floor(totalSeconds / 3600)
    totalSeconds %= 3600
    let minutes = Math.floor(totalSeconds / 60)
    let seconds = totalSeconds % 60

    return hours + "h, " + minutes + "m and " + seconds.toFixed(0) + "s"
}