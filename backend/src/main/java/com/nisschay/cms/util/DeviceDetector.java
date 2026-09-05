package com.nisschay.cms.util;

import jakarta.servlet.http.HttpServletRequest;

public class DeviceDetector {

    public static String detectDevice(HttpServletRequest request) {
        if (request == null) return "Desktop / Unknown Device";
        String userAgent = request.getHeader("User-Agent");
        if (userAgent == null || userAgent.trim().isEmpty()) {
            return "Web Browser (Standard)";
        }

        String ua = userAgent.toLowerCase();

        // 1. Detect Device & Operating System
        String os = "Unknown Device";
        if (ua.contains("ipad") || (ua.contains("macintosh") && ua.contains("touch"))) {
            os = "Apple iPad";
        } else if (ua.contains("iphone")) {
            os = "Apple iPhone";
        } else if (ua.contains("android")) {
            os = "Android Mobile";
        } else if (ua.contains("windows nt 10.0") || ua.contains("windows nt 11.0")) {
            os = "Windows PC";
        } else if (ua.contains("windows")) {
            os = "Windows PC";
        } else if (ua.contains("macintosh") || ua.contains("mac os")) {
            os = "Apple Mac";
        } else if (ua.contains("linux")) {
            os = "Linux Workstation";
        }

        // 2. Detect Browser
        String browser = "Browser";
        if (ua.contains("edg/")) {
            browser = "Microsoft Edge";
        } else if (ua.contains("chrome/") && !ua.contains("edg/")) {
            browser = "Google Chrome";
        } else if (ua.contains("safari/") && !ua.contains("chrome/")) {
            browser = "Apple Safari";
        } else if (ua.contains("firefox/")) {
            browser = "Mozilla Firefox";
        } else if (ua.contains("opr/") || ua.contains("opera/")) {
            browser = "Opera";
        }

        return os + " • " + browser;
    }

    public static String extractClientIp(HttpServletRequest request) {
        if (request == null) return "127.0.0.1";
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.trim().isEmpty() && !"unknown".equalsIgnoreCase(xForwardedFor)) {
            return xForwardedFor.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.trim().isEmpty() && !"unknown".equalsIgnoreCase(xRealIp)) {
            return xRealIp.trim();
        }
        String remoteAddr = request.getRemoteAddr();
        if ("0:0:0:0:0:0:0:1".equals(remoteAddr) || "::1".equals(remoteAddr)) {
            return "127.0.0.1 (Localhost)";
        }
        return remoteAddr != null ? remoteAddr : "127.0.0.1";
    }
}
