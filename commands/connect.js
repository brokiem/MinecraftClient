import {connect, makeEmbed, settings, sup_versions} from "../index.js"

export async function run(dsclient, interaction) {
    const address = interaction.options.get("address")['value']
    const port = interaction.options.get("port")['value']
    const version = interaction.options.get("version")

    if (version === null) version['value'] = null

    if (!sup_versions.includes(version['value'])) {
        interaction.reply({
            embeds: [makeEmbed(settings + " Supported versions: " + sup_versions.join(", "))],
            allowedMentions: {repliedUser: false}
        })
        return
    }

    connect(interaction, address, isNaN(port) ? 19132 : port, version['value'] ?? "auto")
}

export function getName() {
    return "connect"
}