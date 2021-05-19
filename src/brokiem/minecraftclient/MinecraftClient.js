process.env.DEBUG = 'minecraft-protocol'

const { Client } = require('bedrock-protocol');

class MinecraftClient {
    async connect(address, port, username = "MClient890", online = true, version = "1.16.220") {
        const client = new Client({
            host: address,
            port: port,
            username: username,
            offline: !online,
            version: version,
            authTitle: Client.MinecraftNintendoSwitch
        });

        await client.connect();

        client.on('start_game', (packet) => {
            this.rid = packet.runtime_id;
            this.eid = packet.runtime_entity_id;
            client.queue('set_local_player_as_initialized', {runtime_entity_id: packet.runtime_entity_id});
        });

        client.on('mob_equipment', (packet) => {
            client.queue('mob_equipment', {
                runtime_entity_id: this.eid,
                item: packet.item,
                slot: packet.slot,
                selected_slot: packet.selected_slot,
                window_id: packet.window_id
            })
        })

        client.on('modal_form_request', (packet) => {
            console.log(packet)
            client.queue('modal_form_response', {
                form_id: packet.form_id,
                data: "0"
            })
        })

        client.on('move_player', (packet) => {
            client.queue('move_player', {
                runtime_id: this.rid,
                position: packet.position,
                pitch: packet.pitch,
                yaw: packet.yaw,
                head_yaw: packet.head_yaw,
                mode: packet.mode,
                on_ground: true,
                teleport: packet.teleport,
                tick: packet.tick,
                ridden_runtime_id: packet.ridden_runtime_id
            });
        });

        client.once('resource_packs_info', () => {
            client.write('resource_pack_client_response', {
                response_status: 'completed',
                resourcepackids: []
            });

            client.once('resource_pack_stack', () => {
                client.write('resource_pack_client_response', {
                    response_status: 'completed',
                    resourcepackids: []
                });
            });

            client.queue('client_cache_status', {enabled: false});
            client.queue('request_chunk_radius', {chunk_radius: 2});
            client.queue('tick_sync', {request_time: BigInt(Date.now()), response_time: 0n});
        });
    }
}

(new MinecraftClient).connect("localhost", 19132);