package com.cqunews.config;

import javax.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;

@Component
public class DatabaseInitConfig {

    @Value("${spring.datasource.url}")
    private String datasourceUrl;

    @Value("${spring.datasource.username}")
    private String username;

    @Value("${spring.datasource.password}")
    private String password;

    @PostConstruct
    public void init() {
        String dbUrl = datasourceUrl.substring(0, datasourceUrl.lastIndexOf("/"));
        String dbName = datasourceUrl.substring(datasourceUrl.lastIndexOf("/") + 1, datasourceUrl.indexOf("?"));

        try (Connection conn = DriverManager.getConnection(dbUrl + "/?useSSL=false&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true", username, password);
             Statement stmt = conn.createStatement()) {

            stmt.executeUpdate("CREATE DATABASE IF NOT EXISTS " + dbName + " DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

            try (Connection dbConn = DriverManager.getConnection(datasourceUrl + "&useSSL=false&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true", username, password);
                 Statement dbStmt = dbConn.createStatement()) {

                dbStmt.executeUpdate("CREATE TABLE IF NOT EXISTS user (" +
                        "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                        "username VARCHAR(50) NOT NULL UNIQUE, " +
                        "password VARCHAR(100) NOT NULL, " +
                        "mobile VARCHAR(20), " +
                        "email VARCHAR(100), " +
                        "status TINYINT DEFAULT 1, " +
                        "is_del TINYINT DEFAULT 0, " +
                        "created_at DATETIME DEFAULT CURRENT_TIMESTAMP, " +
                        "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)");

                dbStmt.executeUpdate("CREATE TABLE IF NOT EXISTS history_task (" +
                        "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                        "user_id BIGINT NOT NULL, " +
                        "original_content TEXT NOT NULL, " +
                        "summary TEXT, " +
                        "titles TEXT, " +
                        "entities TEXT, " +
                        "fact_check_result TEXT, " +
                        "status TINYINT DEFAULT 1, " +
                        "is_del TINYINT DEFAULT 0, " +
                        "created_at DATETIME DEFAULT CURRENT_TIMESTAMP, " +
                        "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, " +
                        "INDEX idx_user_id (user_id), " +
                        "INDEX idx_created_at (created_at))");

                dbStmt.executeUpdate("INSERT IGNORE INTO user (username, password, mobile, status) VALUES ('admin', 'admin123', '13800138000', 1)");
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
}
