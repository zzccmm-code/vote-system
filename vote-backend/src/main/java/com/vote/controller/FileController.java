package com.vote.controller;

import com.vote.common.Result;
import com.vote.service.AchievementService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * 文件上传接口
 * POST /api/upload  → 上传文件，返回文件名
 * GET  /api/files/{filename}  → 由 WebConfig 静态资源映射处理
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FileController {

    private final AchievementService achievementService;

    /**
     * 文件上传
     * POST /api/upload
     * form-data: file=...
     * 返回: { code:200, data:"xxxx.pdf" }
     */
    @PostMapping("/upload")
    public Result<String> upload(@RequestParam("file") MultipartFile file) throws IOException {
        String filename = achievementService.uploadFile(file);
        return Result.ok(filename);
    }
}
