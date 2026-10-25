import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import java.util.List;

public class Main {

    private static final HttpClient CLIENT =
            HttpClient.newHttpClient();

    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("MM/dd/yyyy h:mm a");


    public static void main(String[] args) {

        System.out.println("=== Game Loyalty Tracker ===");
        System.out.println();

        // Make sure Supabase is reachable first
        if (!Database.testConnection()) {

            System.out.println(
                    "Collector stopped because the database connection failed."
            );

            // Useful later for Docker/Azure to know the job failed
            System.exit(1);
        }

        // Run ONE collection cycle
        collectAllGames();

        System.out.println();
        System.out.println("Collection complete.");

        // Program ends here.
        // Azure will start it again on the next scheduled run.
    }


    public static void collectAllGames() {

        List<Game> games =
                Database.getActiveGames();

        if (games.isEmpty()) {

            System.out.println(
                    "No active games found."
            );

            return;
        }

        LocalDateTime collectionStart =
                LocalDateTime.now();

        System.out.println(
                "Starting collection for "
                        + games.size()
                        + " games."
        );

        System.out.println(
                "Started: "
                        + collectionStart.format(FORMATTER)
        );

        System.out.println();

        int successful = 0;
        int failed = 0;

        for (Game game : games) {

            boolean result =
                    collectPlayerCount(game);

            if (result) {
                successful++;
            } else {
                failed++;
            }
        }

        System.out.println("----------------------------------");
        System.out.println("Successful: " + successful);
        System.out.println("Failed: " + failed);
        System.out.println("----------------------------------");
    }


    public static boolean collectPlayerCount(
            Game game
    ) {

        String url =
                "https://api.steampowered.com/"
                        + "ISteamUserStats/"
                        + "GetNumberOfCurrentPlayers/v1/"
                        + "?appid="
                        + game.getSteamAppId();

        try {

            HttpRequest request =
                    HttpRequest.newBuilder()
                            .uri(URI.create(url))
                            .build();

            HttpResponse<String> response =
                    CLIENT.send(
                            request,
                            HttpResponse.BodyHandlers.ofString()
                    );

            if (response.statusCode() != 200) {

                Database.logCollection(
                        game.getId(),
                        "FAILED",
                        "Steam API returned HTTP "
                                + response.statusCode()
                );

                System.out.println(
                        game.getName()
                                + ": Steam API request failed."
                );

                return false;
            }

            String body =
                    response.body();

            int marker =
                    body.indexOf("\"player_count\":");

            if (marker == -1) {

                Database.logCollection(
                        game.getId(),
                        "FAILED",
                        "Steam response did not contain player_count"
                );

                System.out.println(
                        game.getName()
                                + ": No player count found."
                );

                return false;
            }

            int start =
                    marker
                            + "\"player_count\":".length();

            int end =
                    body.indexOf(",", start);

            if (end == -1) {
                end = body.indexOf("}", start);
            }

            String playerCount =
                    body.substring(
                            start,
                            end
                    ).trim();

            int count =
                    Integer.parseInt(playerCount);

            boolean saved =
                    Database.savePlayerCount(
                            game.getId(),
                            count
                    );

            if (!saved) {

                Database.logCollection(
                        game.getId(),
                        "FAILED",
                        "Steam count retrieved, but database save failed"
                );

                System.out.println(
                        game.getName()
                                + ": Database save failed."
                );

                return false;
            }

            Database.logCollection(
                    game.getId(),
                    "SUCCESS",
                    "Player count saved: " + count
            );

            String collectedAt =
                    LocalDateTime.now()
                            .format(FORMATTER);

            System.out.println(
                    "Game: " + game.getName()
            );

            System.out.printf(
                    "Current Players: %,d%n",
                    count
            );

            System.out.println(
                    "Collected: " + collectedAt
            );

            System.out.println(
                    "Status: Saved successfully"
            );

            System.out.println();

            return true;

        } catch (Exception e) {

            Database.logCollection(
                    game.getId(),
                    "FAILED",
                    "Collection error: "
                            + e.getMessage()
            );

            System.out.println(
                    game.getName()
                            + ": Collection failed."
            );

            e.printStackTrace();

            return false;
        }
    }
}