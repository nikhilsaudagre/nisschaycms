package com.nisschay.cms.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;

@Configuration
public class DataSourceConfig {

    @Value("${spring.datasource.url}")
    private String dbUrl;

    @Value("${spring.datasource.username:postgres}")
    private String username;

    @Value("${spring.datasource.password:}")
    private String password;

    @Bean
    @Primary
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();

        String rawUrl = dbUrl;
        if (rawUrl == null || rawUrl.isBlank()) {
            rawUrl = System.getenv("DATABASE_URL");
        }
        if (rawUrl == null || rawUrl.isBlank()) {
            rawUrl = System.getenv("SPRING_DATASOURCE_URL");
        }
        if (rawUrl == null || rawUrl.isBlank()) {
            rawUrl = "jdbc:postgresql://localhost:5432/nisschay_cms?sslmode=disable";
        }

        // Handle standard Render/Heroku PostgreSQL URI format (postgresql://user:pass@host:port/db)
        if (rawUrl.startsWith("postgres://") || (rawUrl.startsWith("postgresql://") && !rawUrl.startsWith("jdbc:"))) {
            try {
                URI dbUri = new URI(rawUrl);
                String userInfo = dbUri.getUserInfo();
                if (userInfo != null && userInfo.contains(":")) {
                    String[] parts = userInfo.split(":", 2);
                    config.setUsername(parts[0]);
                    config.setPassword(parts[1]);
                } else if (userInfo != null) {
                    config.setUsername(userInfo);
                    config.setPassword(this.password);
                }

                int port = dbUri.getPort() > 0 ? dbUri.getPort() : 5432;
                String path = dbUri.getPath();
                if (path != null && path.startsWith("/")) {
                    path = path.substring(1);
                }
                String query = dbUri.getQuery();
                String jdbcUrl = "jdbc:postgresql://" + dbUri.getHost() + ":" + port + "/" + path + (query != null && !query.isBlank() ? "?" + query : "");
                config.setJdbcUrl(jdbcUrl);
            } catch (Exception e) {
                config.setJdbcUrl(rawUrl);
                config.setUsername(this.username);
                config.setPassword(this.password);
            }
        } else {
            // Already starts with jdbc:postgresql://
            config.setJdbcUrl(rawUrl);
            config.setUsername(this.username);
            config.setPassword(this.password);
        }

        config.setDriverClassName("org.postgresql.Driver");
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);
        config.setConnectionTimeout(30000);
        config.setIdleTimeout(600000);
        config.setMaxLifetime(1800000);

        return new HikariDataSource(config);
    }
}
