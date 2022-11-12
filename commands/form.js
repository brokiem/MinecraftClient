import {clients, isConnected, reply, sendModalResponse, x} from "../index.js"

export async function run(dsclient, interaction) {
    const channel = interaction.channel
    const button_id = interaction.options.get("button_id")['value']

    if (isConnected(channel)) {
        if (clients[channel]["formId"] !== undefined) {
            await interaction.reply(reply + " Sending modal form response")
            sendModalResponse(channel, button_id)
            clients[channel]["formId"] = undefined
        } else {
            await interaction.reply({
                content: x + " No ModalFormRequestPacket found!",
                allowedMentions: {repliedUser: false}
            })
        }
    } else {
        await interaction.reply({
            content: x + " I haven't connected to any server yet!",
            allowedMentions: {repliedUser: false}
        })
    }
}

export function getName() {
    return "form"
}