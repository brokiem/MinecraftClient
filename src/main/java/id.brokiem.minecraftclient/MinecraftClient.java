package id.brokiem.minecraftclient;

import com.nukkitx.protocol.bedrock.BedrockClient;
import com.nukkitx.protocol.bedrock.BedrockClientSession;
import com.nukkitx.protocol.bedrock.packet.LoginPacket;
import com.nukkitx.protocol.bedrock.packet.TextPacket;
import com.nukkitx.protocol.bedrock.v431.Bedrock_v431;
import io.netty.util.AsciiString;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.InetSocketAddress;
import java.security.KeyPair;
import java.util.concurrent.ThreadLocalRandom;

public class MinecraftClient {

    public static boolean debug = true;
    public static boolean isConnected;
    public int playerId;
    private BedrockClient client;
    public KeyPair keyPair;
    private BedrockClientSession session;
    private static MinecraftClient instance;
    private static boolean isRunning;

    public static MinecraftClient getInstance() {
        if (instance == null) {
            instance = new MinecraftClient();
        }

        return instance;
    }

    public static void main(String[] args) {
        MainLogger.info("Starting MinecraftClient...");
        MinecraftClient minecraftClient = new MinecraftClient();

        MainLogger.info("MinecraftClient started successfully");

        minecraftClient.input();

        isRunning = true;
        minecraftClient.loop();
    }

    public void setConnected(boolean b) {
        isConnected = b;
        this.input();
    }

    private void loop() {
        while (isRunning) {
            try {
                synchronized (this) {
                    this.wait();
                }
            } catch (InterruptedException ignored) {
            }
        }
    }

    public void input() {
        MainLogger.info("Creating client...");
        this.makeClient();

        try {
            BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
            MainLogger.info("---------- Please enter the ip ----------");
            String ip = reader.readLine();
            MainLogger.info("---------- Please enter the port too ----------");
            int port = Integer.parseInt(reader.readLine());

            if (ip != null) {
                this.connect(ip, port);
            }
        } catch (IOException ignored) { }
    }

    public void makeClient() {
        int port = ThreadLocalRandom.current().nextInt(20000, 60000);
        InetSocketAddress address = new InetSocketAddress("0.0.0.0", port);
        BedrockClient client = new BedrockClient(address);

        client.bind().join();
        this.client = client;
        MainLogger.info("Client created succesfully");
    }

    public BedrockClient getClient(){
        return this.client;
    }

    public void connect(String ip, int port) throws IOException {
        MainLogger.info("Connecting to " + ip + " with port " + port + "...");

        InetSocketAddress address = new InetSocketAddress(ip, port);
        this.client.connect(address).whenComplete((session, throwable) -> {
            if (throwable != null) {
                MainLogger.error(throwable.getMessage());
                return;
            }

            this.session = session;

            session.setPacketCodec(Bedrock_v431.V431_CODEC);
            session.addDisconnectHandler((reason) -> this.input());
            session.addDisconnectHandler((reason) -> System.out.println("Disconnected from the server. " + reason.toString()));
            session.setPacketHandler(new InitialPacketHandler(session, this));

            session.sendPacketImmediately(this.getLoginPacket());
        }).join();
    }

    public void chat(String message) {
        TextPacket pk = new TextPacket();
        pk.setType(TextPacket.Type.CHAT);
        pk.setNeedsTranslation(false);
        pk.setSourceName(message);
        this.session.sendPacket(pk);
    }

    public LoginPacket getLoginPacket(){
        AsciiString chainData = AsciiString.of(""); // TODO
        AsciiString skinData = AsciiString.of(""); // TODO

        LoginPacket pk = new LoginPacket();
        pk.setProtocolVersion(431);
        pk.setChainData(chainData);
        pk.setSkinData(skinData);

        return pk;
    }
}