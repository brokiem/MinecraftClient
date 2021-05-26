process.env.DEBUG = 'minecraft-protocol'

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

    switch (command) {
        case "connect":
        case "join":
            if (args.length > 0) {
                connect(message.channel, args[0], isNaN(args[1]) ? 19132 : args[1], args[2] ?? "1.16.220");
            } else {
                await message.channel.send("[Usage] *connect <address> <port> <version>");
            }
            break;
        case "chat":
        case "message":
            if (isConnected()) {
                if (args.length > 0) {
                    chat(args.join(" "));
                    await message.channel.send(":small_red_triangle: Send message success!");
                } else {
                    await message.channel.send(":octagonal_sign: Please enter the message!");
                }
            } else {
                await message.channel.send(":octagonal_sign: I haven't connected to any server yet!\n");
            }
            break;
        case "form":
            if (isConnected()) {
                if (formId !== undefined) {
                    if (args.length > 0) {
                        await message.channel.send(":small_red_triangle: Sending modal form response");
                        sendModalResponse(args.join(" "));
                    }
                } else {
                    await message.channel.send(":octagonal_sign: No ModalFormRequestPacket found!");
                }
            } else {
                await message.channel.send(":octagonal_sign: I haven't connected to any server yet!\n");
            }
            break;
        case "enablechat":
            if (isConnected()) {
                if (args.length > 0) {
                    if (args[0] === "true") {
                        enableChat = true;
                        await message.channel.send(":ballot_box_with_check: Chat successfully enabled");
                    } else if (args[0] === "false") {
                        enableChat = false;
                        await message.channel.send(":ballot_box_with_check: Chat successfully disabled");
                    }
                }
            }
            break;
        case "close":
        case "disconnect":
            disconnect(message.channel);
            break;
    }
})

let enableChat = true;
let formId;
function connect(channel, address, port = 19132, version = "1.16.220") {
    if (isConnected()) {
        channel.send(":octagonal_sign: I've connected to the server in <#" + this.channelId + "> !");
        return;
    }

    channel.send(":airplane: Connecting to " + address + " on port " + port);

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

        channel.send(":newspaper: Started packet reading...");
        client.connect();

        setInterval(function(){sendCachedTextPacket(channel)}, 5000);

        this.connClient = client;

        client.on('start_game', (packet) => {
            this.runtime_id = packet.runtime_id;
            this.runtime_entity_id = packet.runtime_entity_id;

            client.queue('set_local_player_as_initialized', {runtime_entity_id: this.runtime_entity_id});
            channel.send(":signal_strength: Successfully connected to the server!~");
        });

        client.on('modal_form_request', (packet) => {
            const jsonData = JSON.parse(packet.data);
            const string = "abcdefgklmr0123456789"; // minecraft color

            formId = packet.form_id;

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
                sendModalResponse("0"); // unhandled
            }
        })

        this.cachedFilteredTextPacket = [];
        let filteredTextPacket;
        client.on('text', (packet) => {
            if (enableChat) {
                const string = "abcdefgklmr0123456789";

                filteredTextPacket = packet.message;
                if (filteredTextPacket !== undefined) {
                    for (let i = 0; i < string.length; i++) {
                        filteredTextPacket = filteredTextPacket.split('§' + string[i]).join('').replace('discord', 'shit');
                    }
                    this.cachedFilteredTextPacket.push(filteredTextPacket);
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
            this.channelId = undefined;
            channel.send(":octagonal_sign: Disconnected from server:\n```" + packet.message + "```");
        });

        client.once('close', () => {
            this.channelId = undefined;
            channel.send(":octagonal_sign: Disconnected: Client closed!");
        });

    }).catch((error) => {
        this.channelId = undefined;
        channel.send(":octagonal_sign: Unable to connect to [" + address+ "]/"+port+". " + error.message);
    });
}

function sendCachedTextPacket(channel) {
    if ((this.cachedFilteredTextPacket.length > 0) && this.channelId !== undefined && enableChat) {
        channel.send(makeEmbed(this.cachedFilteredTextPacket.join("\n\n")))
        this.cachedFilteredTextPacket = [];
    }
}

function makeEmbed(string) {
    return new discord.MessageEmbed().setDescription(string);
}

function sendModalResponse(string) {
    this.connClient.queue('modal_form_response', {
        form_id: formId,
        data: string
    });
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
    });
}

function isConnected() {
    return this.connClient !== undefined && this.channelId !== undefined;
}

function disconnect(channel) {
    if (!isConnected()) {
        channel.send(":octagonal_sign: I haven't connected to any server yet!\n");
        return;
    }

    if (this.channelId === channel.id) {
        this.connClient.close()
        this.connClient = undefined;

        channel.send(":octagonal_sign: Disconnected succesfully!");
    } else {
        channel.send(":octagonal_sign: I am connected to the server in <#"+ this.channelId +"> !");
    }
}
