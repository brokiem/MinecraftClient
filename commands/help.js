import {slash} from "../index.js"
import discord from "discord.js"

export async function run(dsclient, interaction) {
    const helpEmbed1 = new discord.MessageEmbed()
        .setColor("BLURPLE")
        .setTitle(slash + " Command List\n\n")
        .setThumbnail("https://cdn.discordapp.com/attachments/833621011097845830/856845502104076289/856511320421302273.png")
        .addField("*query <address> <port>", "Query a Minecraft server (java or bedrock)")
        .addField("*join <address> <port> <version>", "Join to Minecraft server (bedrock)")
        .addField("*chat <message>", "Send chat to connected server")
        .addField("*enablechat", "Enable server chat to discord channel")
        .addField("*form <button id>", "Send form resp to connected server")
        .addField("*disconnect", "Disconnect from connected server")
        .addField("*invite", "Get bot invite link")

    interaction.reply({embeds: [helpEmbed1], allowedMentions: {repliedUser: false}})
}

export function getName() {
    return "help"
}