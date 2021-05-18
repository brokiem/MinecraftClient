package id.brokiem.minecraftclient;

import com.nukkitx.protocol.bedrock.BedrockClient;
import com.nukkitx.protocol.bedrock.v431.Bedrock_v431;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.InetSocketAddress;
import java.util.concurrent.ThreadLocalRandom;

public class MinecraftClient {

    public static boolean debug = true;
    private BedrockClient client;

    public static void main(String[] args) throws IOException {
        MainLogger.notice("Starting MinecraftClient...");
        MinecraftClient minecraftClient = new MinecraftClient();

        MainLogger.notice("Creating client...");
        minecraftClient.makeClient();

        MainLogger.notice("MinecraftClient started successfully");

        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
        String inputIP = reader.readLine();

        minecraftClient.connect(inputIP, 19132);
    }

    public void makeClient() {
        int port = ThreadLocalRandom.current().nextInt(20000, 60000);
        InetSocketAddress address = new InetSocketAddress("0.0.0.0", port);
        BedrockClient client = new BedrockClient(address);

        client.bind().join();
        this.client = client;
    }

    public void connect(String ip, int port) {
        MainLogger.notice("Connecting to " + ip + " with port " + port + "...");

        InetSocketAddress address = new InetSocketAddress(ip, port);
        this.client.connect(address).whenComplete((session, throwable) -> {
            if (throwable != null) {
                MainLogger.error(throwable.getMessage());
                return;
            }

            session.setPacketCodec(Bedrock_v431.V431_CODEC);
            session.addDisconnectHandler((reason) -> System.out.println("Disconnected from the server"));
            session.setPacketHandler(new PacketHandler(session));
        }).join();
    }
}