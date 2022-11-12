import {connectedClient, getUptime, makeEmbed, mcversion} from "../index.js"
import discord from "discord.js"
import os from "os"

export async function run(dsclient, interaction) {
    const channel = interaction.channel

    const invite = new discord.MessageButton().setStyle("LINK").setLabel("Invite")
        .setURL("https://discord.com/oauth2/authorize?client_id=" + dsclient.user.id + "&permissions=3072&scope=bot%20applications.commands")
    const vote = new discord.MessageButton().setStyle("LINK").setLabel("Vote")
        .setURL("https://top.gg/bot/844733770581803018/vote")

    const row = new discord.MessageActionRow().addComponents(invite).addComponents(vote)

    await interaction.reply({
        components: [row],
        embeds: [makeEmbed("" +
            "**❯  Minecraft Client** - v" + mcversion +
            "\n\n" +
            "• CPU Usage: " + os.loadavg().toString().split(",")[0] + "%\n" +
            "• RAM Usage: " + (Math.round(process.memoryUsage().rss / 10485.76) / 100) + " MB/" + (Math.round(os.totalmem() / 10485.76) / 100).toString().charAt(0) + " GB\n" +
            "\n" +
            "• Uptime: " + await getUptime() + "\n" +
            "• Latency: " + dsclient.ws.ping + "ms\n" +
            "• Guilds: " + dsclient.guilds.cache.size + "\n" +
            "• Clients: " + connectedClient + "/20\n" +
            "\n" +
            "• Developer: [brokiem](https://github.com/brokiem)\n" +
            "• Library: discord.js v13\n" +
            "• Github: [MinecraftClient](https://github.com/brokiem/MinecraftClient)"
        ).setColor("BLURPLE")],
        allowedMentions: {repliedUser: false}
    })
}

export function getName() {
    return "invite"
}