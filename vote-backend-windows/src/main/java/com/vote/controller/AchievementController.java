package com.vote.controller;

import com.vote.common.Result;
import com.vote.common.PageResult;
import com.vote.dto.AchievementPageReq;
import com.vote.dto.DeleteReq;
import com.vote.dto.UpdateStatusReq;
import com.vote.entity.Achievement;
import com.vote.service.AchievementService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * 成果管理接口
 * 对应前端调用的所有 /achievement/* 接口
 */
@RestController
@RequestMapping("/achievement")
@RequiredArgsConstructor
public class AchievementController {

    private final AchievementService achievementService;

    /**
     * 分页查询成果列表
     * POST /achievement/page
     * Body: { pageNum, pageSize, achievementCategory, expertLevel, achievementName }
     * 返回: { code:200, data:{ total, records:[...] } }
     */
    @PostMapping("/page")
    public Result<PageResult<Achievement>> page(@RequestBody AchievementPageReq req) {
        return Result.ok(achievementService.page(req));
    }

    /**
     * 新增成果
     * POST /achievement/add
     * Body: Achievement JSON
     */
    @PostMapping("/add")
    public Result<Void> add(@RequestBody Achievement achievement) {
        achievementService.add(achievement);
        return Result.ok("新增成功");
    }

    /**
     * 编辑成果
     * POST /achievement/update
     */
    @PostMapping("/update")
    public Result<Void> update(@RequestBody Achievement achievement) {
        achievementService.update(achievement);
        return Result.ok("修改成功");
    }

    /**
     * 删除成果（支持批量）
     * POST /achievement/delete
     * Body: { objectIds: [1,2,3] }
     */
    @PostMapping("/delete")
    public Result<Void> delete(@RequestBody DeleteReq req) {
        achievementService.delete(req);
        return Result.ok("删除成功");
    }

    /**
     * 批量更新状态
     * POST /achievement/updateStatus
     * Body: { ids:[1,2], status:1 }
     */
    @PostMapping("/updateStatus")
    public Result<Void> updateStatus(@RequestBody UpdateStatusReq req) {
        achievementService.updateStatus(req);
        return Result.ok("状态更新成功");
    }
}
