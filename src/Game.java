public class Game {

    private int id;
    private String name;
    private String steamAppId;

    public Game(
            int id,
            String name,
            String steamAppId
    ) {

        this.id = id;
        this.name = name;
        this.steamAppId = steamAppId;
    }

    public int getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getSteamAppId() {
        return steamAppId;
    }
}