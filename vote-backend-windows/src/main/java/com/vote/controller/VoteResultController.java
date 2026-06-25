package com.vote.controller;

import com.vote.common.PageResult;
import com.vote.common.Result;
import com.vote.dto.EachRoundReq;
import com.vote.dto.VoteResultReq;
import com.vote.entity.VoteResult;
import com.vote.entity.VoteRound;
import com.vote.service.VoteResultService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

/**
 * 投票结果接口
 * 对应前端 /voteResult/* 接口
 */
@RestController
@RequestMapping("/voteResult")
@RequiredArgsConstructor
public class VoteResultController {

    private final VoteResultService voteResultService;

    /**
     * 分页查询投票结果
     * POST /voteResult/page
     */
    @PostMapping("/page")
    public Result<PageResult<VoteResultService.VoteResultVO>> page(@RequestBody VoteResultReq req) {
        return Result.ok(voteResultService.page(req));
    }

    /**
     * 更新投票结果（修改授奖等级）
     * POST /voteResult/update
     */
    @PostMapping("/update")
    public Result<Void> update(@RequestBody VoteResult voteResult) {
        voteResultService.update(voteResult);
        return Result.ok("更新成功");
    }

    /**
     * 一键发布所有结果
     * POST /voteResult/push
     */
    @PostMapping("/push")
    public Result<Void> push() {
        String msg = voteResultService.push();
        return Result.ok(msg);
    }

    /**
     * 获取所有轮次列表（用于下拉筛选）
     * POST /voteResult/getRoundList
     */
    @PostMapping("/getRoundList")
    public Result<List<VoteRound>> getRoundList() {
        return Result.ok(voteResultService.getRoundList());
    }

    /**
     * 每轮得票情况（含同意票数、占比等）
     * POST /voteResult/eachRoundSituation
     * Params: roundId, achievementCategory
     */
    @PostMapping("/eachRoundSituation")
    public Result<List<VoteResultService.RoundSituationVO>> eachRoundSituation(
            @RequestBody(required = false) EachRoundReq req) {
        // [P1修复] 统一使用 @RequestBody 接收参数，移除 @ModelAttribute 隐式绑定
        if (req == null) req = new EachRoundReq();
        return Result.ok(voteResultService.eachRoundSituation(req));
    }

    /**
     * 最终结果
     * POST /voteResult/finalResult
     */
    @PostMapping("/finalResult")
    public Result<List<VoteResultService.RoundSituationVO>> finalResult(
            @RequestBody(required = false) VoteResultReq req) {
        if (req == null) req = new VoteResultReq();
        return Result.ok(voteResultService.finalResult(req));
    }

    /**
     * 附加分页（二次表决等）
     * POST /voteResult/additionalPage
     */
    @PostMapping("/additionalPage")
    public Result<PageResult<VoteResultService.VoteResultVO>> additionalPage(
            @RequestBody VoteResultReq req) {
        return Result.ok(voteResultService.additionalPage(req));
    }

    /**
     * 导出统计 Excel
     * POST /voteResult/exportStatistics
     */
    @PostMapping("/exportStatistics")
    public ResponseEntity<byte[]> exportStatistics(
            @RequestBody(required = false) VoteResultReq req) throws IOException {
        if (req == null) req = new VoteResultReq();
        return voteResultService.exportStatistics(req);
    }
}
