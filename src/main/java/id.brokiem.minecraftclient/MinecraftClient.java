package id.brokiem.minecraftclient;

import com.nukkitx.protocol.bedrock.BedrockClient;
import com.nukkitx.protocol.bedrock.v431.Bedrock_v431;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.InetSocketAddress;

public class MinecraftClient {

    public static void main(String[] args) throws IOException {
        System.out.println("Starting MinecraftClient...");

        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
        String input = reader.readLine();

        System.out.println("Connecting to " + input + " with port 19132...");
        connect(input, 19132);
    }

    public static void connect(String ip, int port) {
        InetSocketAddress address = new InetSocketAddress(ip, port);
        BedrockClient client = new BedrockClient(address);

        client.bind().join();
        client.connect(address).whenComplete((session, throwable) -> {
            if (throwable != null) {
                System.out.println(throwable.getMessage());
                return;
            }

            session.setPacketCodec(Bedrock_v431.V431_CODEC);
            session.addDisconnectHandler((reason) -> System.out.println("Disconnected from the server"));
            session.setPacketHandler(new PacketHandler());
        }).join();
    }
}