const { Client } = require('bedrock-protocol');

class MinecraftClient {

    async start() {
        const options = {
            host: 'localhost',      // Server address to connect
            port: 19132,            // Server port
            username: 'MClient890', // Minecraft username (Gamertag)
            offline: false,         // Offline mode. set false if you want enable xbox auth
            version: "1.16.220"     // Client version (1.16.201, 1.16.210, 1.16.220)
        }

        const client = new Client(options);
        await client.connect();
        this.info("Connecting...")

        client.on('packet', () => {
            this.handlePacket(client)
        });
    }

    handlePacket(client) {
        client.on('text', (packet) => console.log("[TextPacket] > " + packet.message));

        client.on('start_game', (packet) => {
            client.queue('set_local_player_as_initialized', {runtime_entity_id: packet.runtime_entity_id});
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
            client.queue('request_chunk_radius', {chunk_radius: 8});
            client.queue('tick_sync', {request_time: BigInt(Date.now()), response_time: 0n});
        });
    }

    info(text) {
        console.log("[MinecraftClient / INFO] " + text)
    }
}

(new MinecraftClient()).start()