package com.vote.common;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.File;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

/**
 * Web 配置：跨域 + 静态资源映射
 * [P2修复] CORS 不再使用 allowCredentials(*) + allowedOriginPatterns(*)，改为可配置的域名列表
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.upload-dir:./uploads}")
    private String uploadDir;

    /** [P2修复] 允许的跨域来源，逗号分隔，不配置则使用本地开发默认值 */
    @Value("${app.cors.allowed-origins:}")
    private String allowedOriginsConfig;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        List<String> origins = new ArrayList<>();

        if (allowedOriginsConfig != null && !allowedOriginsConfig.trim().isEmpty()) {
            // 使用配置的域名列表
            for (String origin : allowedOriginsConfig.split(",")) {
                String trimmed = origin.trim();
                if (!trimmed.isEmpty()) {
                    origins.add(trimmed);
                }
            }
        } else {
            // [P2修复] 默认只允许本地开发地址和局域网访问
            origins.add("http://localhost:3000");
            origins.add("http://localhost:8080");
            origins.add("http://127.0.0.1:3000");
            origins.add("http://127.0.0.1:8080");
        }

        String[] originArray = origins.toArray(new String[0]);
        registry.addMapping("/**")
                .allowedOriginPatterns(originArray)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 映射上传文件目录，通过 /api/files/{filename} 访问
        // 解析为绝对路径，避免 Spring Boot fat JAR 中相对路径指向临时目录
        File dir = Paths.get(uploadDir).toAbsolutePath().normalize().toFile();
        if (!dir.exists()) {
            dir.mkdirs();
        }
        registry.addResourceHandler("/api/files/**")
                .addResourceLocations("file:" + dir.getAbsolutePath() + "/");
    }
}
