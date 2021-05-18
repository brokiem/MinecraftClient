package id.brokiem.minecraftclient;

import com.nukkitx.protocol.bedrock.BedrockClientSession;
import com.nukkitx.protocol.bedrock.handler.BedrockPacketHandler;
import com.nukkitx.protocol.bedrock.packet.*;

public class ConnectedPacketHandler implements BedrockPacketHandler {

    private final BedrockClientSession session;

    public ConnectedPacketHandler(BedrockClientSession session) {
        this.session = session;
    }

    @Override
    public boolean handle(TextPacket packet) {
        System.out.println("[TextPacket] > " + packet.getMessage());
        return true;
    }

    @Override
    public boolean handle(PlayStatusPacket packet) {
        SetLocalPlayerAsInitializedPacket initializedPacket = new SetLocalPlayerAsInitializedPacket();
        initializedPacket.setRuntimeEntityId(MinecraftClient.getInstance().playerId);
        this.session.sendPacket(initializedPacket);

        return true;
    }

    @Override
    public boolean handle(DisconnectPacket packet) {
        MainLogger.info("Disconnected from server. " + packet.getKickMessage());
        return true;
    }
}
