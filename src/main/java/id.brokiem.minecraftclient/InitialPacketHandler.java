package id.brokiem.minecraftclient;

import com.nimbusds.jwt.SignedJWT;
import com.nukkitx.protocol.bedrock.BedrockClientSession;
import com.nukkitx.protocol.bedrock.handler.BedrockPacketHandler;
import com.nukkitx.protocol.bedrock.packet.*;
import com.nukkitx.protocol.bedrock.util.EncryptionUtils;

import javax.crypto.SecretKey;
import java.net.URI;
import java.security.interfaces.ECPublicKey;
import java.util.Base64;
import java.util.concurrent.ThreadLocalRandom;

public class InitialPacketHandler implements BedrockPacketHandler {

    private final BedrockClientSession session;
    private final MinecraftClient minecraftClient;

    public InitialPacketHandler(BedrockClientSession session, MinecraftClient minecraftClient) {
        this.session = session;
        this.minecraftClient = minecraftClient;
    }

    @Override
    public boolean handle(LoginPacket packet) {
        PlayStatusPacket status = new PlayStatusPacket();
        status.setStatus(PlayStatusPacket.Status.LOGIN_SUCCESS);
        this.session.sendPacket(status);
        return true;
    }

    @Override
    public final boolean handle(ServerToClientHandshakePacket packet) {
        try {
            SignedJWT saltJwt = SignedJWT.parse(packet.getJwt());
            URI x5u = saltJwt.getHeader().getX509CertURL();
            ECPublicKey serverKey = EncryptionUtils.generateKey(x5u.toASCIIString());
            SecretKey key = EncryptionUtils.getSecretKey(
                    minecraftClient.keyPair.getPrivate(),
                    serverKey,
                    Base64.getDecoder().decode(saltJwt.getJWTClaimsSet().getStringClaim("salt"))
            );
            this.session.enableEncryption(key);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        ClientToServerHandshakePacket clientToServerHandshake = new ClientToServerHandshakePacket();
        this.session.sendPacket(clientToServerHandshake);
        return true;
    }

    @Override
    public final boolean handle(ResourcePacksInfoPacket packet) {
        ResourcePackClientResponsePacket response = new ResourcePackClientResponsePacket();
        response.setStatus(ResourcePackClientResponsePacket.Status.HAVE_ALL_PACKS);
        this.session.sendPacketImmediately(response);
        return true;
    }

    @Override
    public boolean handle(ResourcePackStackPacket packet) {
        ResourcePackClientResponsePacket response = new ResourcePackClientResponsePacket();
        response.setStatus(ResourcePackClientResponsePacket.Status.COMPLETED);
        this.session.sendPacketImmediately(response);
        return true;
    }

    @Override
    public boolean handle(PlayStatusPacket packet) {
        ResourcePackClientResponsePacket response = new ResourcePackClientResponsePacket();
        response.setStatus(ResourcePackClientResponsePacket.Status.HAVE_ALL_PACKS);
        this.session.sendPacketImmediately(response);

        return true;
    }

    @Override
    public final boolean handle(StartGamePacket packet) {
        int id = ThreadLocalRandom.current().nextInt(10000, 15000);

        this.minecraftClient.playerId = id;
        packet.setRuntimeEntityId(id);
        packet.setUniqueEntityId(id);

        MainLogger.info("Connected to the server!");
        this.session.setPacketHandler(new ConnectedPacketHandler(this.session));
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
