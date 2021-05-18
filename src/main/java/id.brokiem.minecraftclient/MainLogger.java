package id.brokiem.minecraftclient;

public class MainLogger {

    public static void log(String text){ System.out.println("[MinecraftClient / LOG] " + text); }

    public static void notice(String text){
        System.out.println("[MinecraftClient / NOTICE] " + text);
    }

    public static void error(String text){
        System.out.println("[MinecraftClient / ERROR] " + text);
    }

    public static void debug(String text){
        if (MinecraftClient.debug) {
            System.out.println("[MinecraftClient / DEBUG] " + text);
        }
    }
}
