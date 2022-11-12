import {clients, isConnected, x} from "../index.js"

export async function run(dsclient, interaction) {
    const channel = interaction.channel

    if (isConnected(channel)) {
        clients[channel]["enableChat"] = !clients[channel]["enableChat"]
        await interaction.reply(":ballot_box_with_check: Chat from server successfully " + (clients[channel]["enableChat"] ? "enabled" : "disabled"))
    } else {
        await interaction.reply({
            content: x + " I haven't connected to any server yet!",
            allowedMentions: {repliedUser: false}
        })
    }
}

export function getName() {
    return "enablechat"
}