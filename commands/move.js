import {isConnected, move, reply, x} from "../index.js"

export async function run(dsclient, interaction) {
    const channel = interaction.channel

    if (isConnected(channel)) {
        await interaction.reply({
            content: reply + " Moving bot...",
            allowedMentions: {repliedUser: false}
        })
        move(channel)
    } else {
        await interaction.reply({
            content: x + " I haven't connected to any server yet!",
            allowedMentions: {repliedUser: false}
        })
    }
}

export function getName() {
    return "move"
}