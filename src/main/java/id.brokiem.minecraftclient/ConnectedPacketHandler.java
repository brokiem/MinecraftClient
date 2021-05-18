package id.brokiem.minecraftclient;

import com.nukkitx.protocol.bedrock.BedrockClientSession;
import com.nukkitx.protocol.bedrock.handler.BedrockPacketHandler;
import com.nukkitx.protocol.bedrock.packet.DisconnectPacket;
import com.nukkitx.protocol.bedrock.packet.PacketViolationWarningPacket;
import com.nukkitx.protocol.bedrock.packet.SetLocalPlayerAsInitializedPacket;
import com.nukkitx.protocol.bedrock.packet.TextPacket;

public class ConnectedPacketHandler implements BedrockPacketHandler {

    private final BedrockClientSession session;

    public ConnectedPacketHandler(BedrockClientSession session) {
        this.session = session;

        SetLocalPlayerAsInitializedPacket initializedPacket = new SetLocalPlayerAsInitializedPacket();
        initializedPacket.setRuntimeEntityId(MinecraftClient.getInstance().playerId);
        this.session.sendPacket(initializedPacket);
    }

    @Override
    public boolean handle(PacketViolationWarningPacket packet) {
        MainLogger.notice("Received violation packet: " + packet.toString());
        return true;
    }

    @Override
    public boolean handle(TextPacket packet) {
        System.out.println("[TextPacket] > " + packet.getMessage());
        return true;
    }

    @Override
    public boolean handle(DisconnectPacket packet) {
        MainLogger.info("Disconnected from server. " + packet.getKickMessage());
        session.disconnect();

        MinecraftClient.getInstance().setConnected(false);
        return true;
    }
}
