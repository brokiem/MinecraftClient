import {makeEmbed, signal} from "../index.js"

export async function run(dsclient, interaction) {
    const latency = dsclient.ws.ping
    const embed = makeEmbed(signal + " Discord API Latency: " + latency + "ms")

    if (latency <= 74) {
        embed.setColor("GREEN")
    } else if (latency >= 75 && latency <= 200) {
        embed.setColor("YELLOW")
    } else {
        embed.setColor("RED")
    }

    await interaction.reply({
        embeds: [embed],
        allowedMentions: {repliedUser: false}
    })
}

export function getName() {
    return "ping"
}