// Database.java

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

import java.util.ArrayList;
import java.util.List;

public class Database {

    private static final String URL =
            "jdbc:postgresql://aws-0-us-west-2.pooler.supabase.com:5432/postgres?sslmode=require";

    private static final String USER =
            "postgres.cqbuexehszxvecujejth";

    private static final String PASSWORD =
            System.getenv("SUPABASE_DB_PASSWORD");


    public static boolean savePlayerCount(
            int gameId,
            int playerCount
    ) {

        String sql = """
                INSERT INTO player_counts (
                    game_id,
                    player_count
                )
                VALUES (?, ?)
                """;

        try (
                Connection connection =
                        DriverManager.getConnection(
                                URL,
                                USER,
                                PASSWORD
                        );

                PreparedStatement statement =
                        connection.prepareStatement(sql)
        ) {

            statement.setInt(1, gameId);
            statement.setInt(2, playerCount);

            statement.executeUpdate();

            return true;

        } catch (Exception e) {

            System.out.println(
                    "Could not save player count."
            );

            e.printStackTrace();

            return false;
        }
    }


    public static void logCollection(
            int gameId,
            String status,
            String message
    ) {

        String sql = """
                INSERT INTO collection_logs (
                    game_id,
                    status,
                    message
                )
                VALUES (?, ?, ?)
                """;

        try (
                Connection connection =
                        DriverManager.getConnection(
                                URL,
                                USER,
                                PASSWORD
                        );

                PreparedStatement statement =
                        connection.prepareStatement(sql)
        ) {

            statement.setInt(1, gameId);
            statement.setString(2, status);
            statement.setString(3, message);

            statement.executeUpdate();

        } catch (Exception e) {

            System.out.println(
                    "Could not write collection log."
            );

            e.printStackTrace();
        }
    }


    public static List<Game> getActiveGames() {

        List<Game> games = new ArrayList<>();

        String sql = """
                SELECT
                    id,
                    game_name,
                    steam_app_id
                FROM games
                WHERE active = TRUE
                ORDER BY id
                """;

        try (
                Connection connection =
                        DriverManager.getConnection(
                                URL,
                                USER,
                                PASSWORD
                        );

                PreparedStatement statement =
                        connection.prepareStatement(sql);

                ResultSet results =
                        statement.executeQuery()
        ) {

            while (results.next()) {

                int id =
                        results.getInt("id");

                String gameName =
                        results.getString("game_name");

                String steamAppId =
                        results.getString("steam_app_id");

                games.add(
                        new Game(
                                id,
                                gameName,
                                steamAppId
                        )
                );
            }

        } catch (Exception e) {

            System.out.println(
                    "Could not load active games."
            );

            e.printStackTrace();
        }

        return games;
    }


    public static boolean testConnection() {

        if (PASSWORD == null || PASSWORD.isBlank()) {

            System.out.println(
                    "SUPABASE_DB_PASSWORD is missing."
            );

            return false;
        }

        try (
                Connection connection =
                        DriverManager.getConnection(
                                URL,
                                USER,
                                PASSWORD
                        )
        ) {

            System.out.println(
                    "Connected to Supabase successfully."
            );

            return true;

        } catch (Exception e) {

            System.out.println(
                    "Could not connect to Supabase."
            );

            e.printStackTrace();

            return false;
        }
    }
}