import {chat, isConnected, reply, sendCommand} from "../index.js"

export async function run(dsclient, interaction) {
    const message = interaction.options.get("message")['value']
    const channel = interaction.channel

    if (isConnected(channel)) {
        if (message.charAt(0) === "/") {
            sendCommand(interaction.channel, message)
            await interaction.reply(reply + " Sending command...")
        } else {
            chat(channel, message)
            await interaction.reply(reply + " Sending message...")
        }
    } else {
        await interaction.reply({
            content: x + " I haven't connected to any server yet!",
            allowedMentions: {repliedUser: false}
        })
    }
}

export function getName() {
    return "chat"
}