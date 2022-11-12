import {disconnect} from "../index.js"

export async function run(dsclient, interaction) {
    disconnect(interaction)
}

export function getName() {
    return "disconnect"
}