//process.env.DEBUG = 'minecraft-protocol'

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

        function chat(client, str) {
            client.queue('text', {
                type: 'chat',
                needs_translation: false,
                source_name: str,
                message: str,
                paramaters: undefined,
                xuid: '0',
                platform_chat_id: '0'
            })
        }

        client.on('start_game', (packet) => {
            this.runtime_id = packet.runtime_id;
            this.runtime_entity_id = packet.runtime_entity_id;

            client.queue('set_local_player_as_initialized', {runtime_entity_id: this.runtime_entity_id});
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