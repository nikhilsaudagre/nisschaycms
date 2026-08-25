package com.nisschay.cms.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;

@Configuration
@Slf4j
public class DataSourceConfig {

    @Value("${spring.datasource.url:#{null}}")
    private String propDbUrl;

    @Value("${spring.datasource.username:postgres}")
    private String propUsername;

    @Value("${spring.datasource.password:}")
    private String propPassword;

    @Bean
    @Primary
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();

        // 1. Check System Environment variables first (Render, Railway, Supabase)
        String envUrl = System.getenv("SPRING_DATASOURCE_URL");
        if (envUrl == null || envUrl.isBlank()) {
            envUrl = System.getenv("DATABASE_URL");
        }
        if (envUrl == null || envUrl.isBlank()) {
            envUrl = System.getenv("POSTGRES_URL");
        }
        if (envUrl == null || envUrl.isBlank()) {
            envUrl = System.getenv("JDBC_DATABASE_URL");
        }

        // 2. Fall back to application.properties if no cloud env var is found
        String rawUrl = (envUrl != null && !envUrl.isBlank()) ? envUrl : propDbUrl;
        if (rawUrl == null || rawUrl.isBlank()) {
            rawUrl = "jdbc:postgresql://localhost:5432/nisschay_cms?sslmode=disable";
        }

        log.info("Configuring Database DataSource with Raw URL prefix: {}", 
            rawUrl.contains("@") ? rawUrl.substring(0, rawUrl.indexOf("@")) + "@..." : rawUrl);

        // 3. Handle standard Render/Heroku PostgreSQL URI format (postgresql://user:pass@host:port/db)
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
                    config.setPassword(this.propPassword);
                } else {
                    config.setUsername(this.propUsername);
                    config.setPassword(this.propPassword);
                }

                int port = dbUri.getPort() > 0 ? dbUri.getPort() : 5432;
                String path = dbUri.getPath();
                if (path != null && path.startsWith("/")) {
                    path = path.substring(1);
                }
                String query = dbUri.getQuery();
                String jdbcUrl = "jdbc:postgresql://" + dbUri.getHost() + ":" + port + "/" + path + (query != null && !query.isBlank() ? "?" + query : "");
                config.setJdbcUrl(jdbcUrl);
                log.info("Converted PostgreSQL URI to JDBC URL: jdbc:postgresql://{}:{}/{}", dbUri.getHost(), port, path);
            } catch (Exception e) {
                log.error("Failed to parse PostgreSQL URI: {}", e.getMessage());
                config.setJdbcUrl(rawUrl);
                config.setUsername(this.propUsername);
                config.setPassword(this.propPassword);
            }
        } else {
            // Already starts with jdbc:postgresql://
            config.setJdbcUrl(rawUrl);
            config.setUsername(System.getenv("SPRING_DATASOURCE_USERNAME") != null ? System.getenv("SPRING_DATASOURCE_USERNAME") : this.propUsername);
            config.setPassword(System.getenv("SPRING_DATASOURCE_PASSWORD") != null ? System.getenv("SPRING_DATASOURCE_PASSWORD") : this.propPassword);
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
