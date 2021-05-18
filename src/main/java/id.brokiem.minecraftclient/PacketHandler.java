package id.brokiem.minecraftclient;

import com.nukkitx.protocol.bedrock.BedrockClientSession;
import com.nukkitx.protocol.bedrock.handler.BedrockPacketHandler;
import com.nukkitx.protocol.bedrock.packet.LoginPacket;

public class PacketHandler implements BedrockPacketHandler {

    private final BedrockClientSession session;

    public PacketHandler(BedrockClientSession session) {
        this.session = session;
    }

    @Override
    public boolean handle(LoginPacket packet) {
        MainLogger.notice("LoginPacket");
        return BedrockPacketHandler.super.handle(packet);
    }
}
