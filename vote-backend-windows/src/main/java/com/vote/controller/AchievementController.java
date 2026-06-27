package com.vote.controller;

import com.vote.common.Result;
import com.vote.common.PageResult;
import com.vote.dto.AchievementPageReq;
import com.vote.dto.DeleteReq;
import com.vote.dto.UpdateStatusReq;
import com.vote.entity.Achievement;
import com.vote.service.AchievementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/**
 * 成果管理接口
 */
@RestController
@RequestMapping("/achievement")
@RequiredArgsConstructor
public class AchievementController {

    private final AchievementService achievementService;

    /**
     * 分页查询成果列表
     * GET/POST /achievement/page
     */
    @GetMapping("/page")
    public Result<PageResult<Achievement>> pageGet(
            @RequestParam(required = false, defaultValue = "1") Integer pageNum,
            @RequestParam(required = false, defaultValue = "10") Integer pageSize,
            @RequestParam(required = false) String achievementCategory,
            @RequestParam(required = false) String expertLevel,
            @RequestParam(required = false) String achievementName) {
        AchievementPageReq req = new AchievementPageReq();
        req.setPageNum(pageNum);
        req.setPageSize(pageSize);
        req.setAchievementCategory(achievementCategory);
        req.setExpertLevel(expertLevel);
        req.setAchievementName(achievementName);
        return Result.ok(achievementService.page(req));
    }

    @PostMapping("/page")
    public Result<PageResult<Achievement>> page(@RequestBody AchievementPageReq req) {
        return Result.ok(achievementService.page(req));
    }

    /**
     * 新增成果（支持 multipart/form-data 上传附件）
     * POST /achievement/add
     */
    @PostMapping(value = "/add", consumes = {"multipart/form-data"})
    public Result<Void> add(
            @RequestParam String achievementName,
            @RequestParam String achievementCategory,
            @RequestParam(required = false) String creationUnits,
            @RequestParam(required = false) String expertLevel,
            @RequestParam(required = false) String extraInfo,
            @RequestParam(required = false) String fileSrc,
            @RequestParam(required = false, defaultValue = "1") Integer status,
            @RequestParam(required = false) Integer orderNum,
            @RequestParam(required = false) String evalResult,
            @RequestPart(value = "file", required = false) MultipartFile file) throws IOException {

        Achievement achievement = new Achievement();
        achievement.setAchievementName(achievementName);
        achievement.setAchievementCategory(achievementCategory);
        achievement.setCreationUnits(creationUnits);
        achievement.setExpertLevel(expertLevel);
        achievement.setExtraInfo(extraInfo);
        achievement.setFileSrc(fileSrc);
        achievement.setStatus(status);
        achievement.setOrderNum(orderNum);
        achievement.setEvalResult(evalResult);

        achievementService.add(achievement, file);
        return Result.ok("新增成功");
    }

    /**
     * 编辑成果（支持 multipart/form-data 上传附件）
     * POST /achievement/update
     */
    @PostMapping(value = "/update", consumes = {"multipart/form-data"})
    public Result<Void> update(
            @RequestParam(required = false) Long id,
            @RequestParam(required = false) String achievementName,
            @RequestParam(required = false) String achievementCategory,
            @RequestParam(required = false) String creationUnits,
            @RequestParam(required = false) String expertLevel,
            @RequestParam(required = false) String extraInfo,
            @RequestParam(required = false) String fileSrc,
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) Integer orderNum,
            @RequestParam(required = false) String evalResult,
            @RequestPart(value = "file", required = false) MultipartFile file) throws IOException {

        Achievement achievement = new Achievement();
        achievement.setId(id);
        achievement.setAchievementName(achievementName);
        achievement.setAchievementCategory(achievementCategory);
        achievement.setCreationUnits(creationUnits);
        achievement.setExpertLevel(expertLevel);
        achievement.setExtraInfo(extraInfo);
        achievement.setFileSrc(fileSrc);
        achievement.setStatus(status);
        achievement.setOrderNum(orderNum);
        achievement.setEvalResult(evalResult);

        achievementService.update(achievement, file);
        return Result.ok("修改成功");
    }

    /**
     * 也支持 JSON 格式的 add/update（向后兼容）
     */
    @PostMapping(value = "/add", consumes = {"application/json"})
    public Result<Void> addJson(@RequestBody Achievement achievement) {
        try {
            achievementService.add(achievement, null);
        } catch (IOException e) {
            throw new RuntimeException("新增成果失败", e);
        }
        return Result.ok("新增成功");
    }

    @PostMapping(value = "/update", consumes = {"application/json"})
    public Result<Void> updateJson(@RequestBody Achievement achievement) {
        try {
            achievementService.update(achievement, null);
        } catch (IOException e) {
            throw new RuntimeException("更新成果失败", e);
        }
        return Result.ok("修改成功");
    }

    /**
     * 删除成果（支持批量）
     * POST /achievement/delete
     */
    @PostMapping("/delete")
    public Result<Void> delete(@RequestBody DeleteReq req) {
        achievementService.delete(req);
        return Result.ok("删除成功");
    }

    /**
     * 批量更新状态
     * POST /achievement/updateStatus
     */
    @PostMapping("/updateStatus")
    public Result<Void> updateStatus(@RequestBody UpdateStatusReq req) {
        achievementService.updateStatus(req);
        return Result.ok("状态更新成功");
    }

    /**
     * 下载 Excel 导入模板
     * GET /achievement/template
     */
    @GetMapping("/template")
    public ResponseEntity<byte[]> downloadTemplate() throws IOException {
        return achievementService.downloadTemplate();
    }

    /**
     * 批量导入成果（Excel）
     * POST /achievement/import
     * form-data: file=xxx.xlsx
     */
    @PostMapping("/import")
    public Result<Map<String, Object>> batchImport(@RequestParam("file") MultipartFile file) throws IOException {
        return Result.ok(achievementService.batchImport(file));
    }
}
