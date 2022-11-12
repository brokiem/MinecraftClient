import {ping, signal} from "../index.js"

export async function run(dsclient, interaction) {
    const address = interaction.options.get("address")['value']
    const port = interaction.options.get("port")['value']

    interaction.reply(signal + " Getting query info...")
    await ping(interaction.channel, address, isNaN(port) ? 19132 : port)
}

export function getName() {
    return "query"
}