package com.vote.controller;

import com.vote.common.Result;
import com.vote.dto.StartVoteReq;
import com.vote.dto.VoteRoundPushReq;
import com.vote.entity.VoteRound;
import com.vote.service.VoteRoundService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 投票轮次控制接口
 * 对应前端 /voteRound/* 接口
 */
@RestController
@RequestMapping("/voteRound")
@RequiredArgsConstructor
public class VoteRoundController {

    private final VoteRoundService voteRoundService;

    /**
     * 获取当前进行中的投票轮次
     * GET/POST /voteRound/current
     * 返回: { code:200, data: VoteRound }
     */
    @GetMapping("/current")
    public Result<VoteRound> currentGet() {
        return Result.ok(voteRoundService.getCurrentRound());
    }

    @PostMapping("/current")
    public Result<VoteRound> currentPost() {
        return Result.ok(voteRoundService.getCurrentRound());
    }

    /**
     * 开始投票
     * POST /voteRound/start
     * Body: { isFirst: true/false }
     */
    @PostMapping("/start")
    public Result<Void> start(@RequestBody(required = false) StartVoteReq req) {
        if (req == null) req = new StartVoteReq();
        String msg = voteRoundService.startVote(req);
        return Result.ok(msg);
    }

    /**
     * 结束投票
     * POST /voteRound/stop
     */
    @PostMapping("/stop")
    public Result<Void> stop() {
        String msg = voteRoundService.stopVote();
        return Result.ok(msg);
    }

    /**
     * 重置投票
     * POST /voteRound/resetting
     */
    @PostMapping("/resetting")
    public Result<Void> resetting() {
        String msg = voteRoundService.resetVote();
        return Result.ok(msg);
    }

    /**
     * 委员提交投票
     * POST /voteRound/push
     * Body: { roundId, achievementId, voterId, voterName, voteOption, voteLevel }
     */
    @PostMapping("/push")
    public Result<Void> push(@RequestBody VoteRoundPushReq req) {
        String msg = voteRoundService.pushVote(req);
        return Result.ok(msg);
    }

    /**
     * 获取当前轮次已提交人数
     * GET/POST /voteRound/getRoundSubmitNum
     * [P1修复] 使用 @RequestParam 兼容空请求体和表单提交，避免 Content-Type 不匹配报错
     */
    @GetMapping("/getRoundSubmitNum")
    public Result<Map<String, Object>> getRoundSubmitNumGet(
            @RequestParam(value = "roundId", required = false) Long roundId) {
        return Result.ok(voteRoundService.getRoundSubmitNum(roundId));
    }

    @PostMapping("/getRoundSubmitNum")
    public Result<Map<String, Object>> getRoundSubmitNumPost(
            @RequestParam(value = "roundId", required = false) Long roundId) {
        return Result.ok(voteRoundService.getRoundSubmitNum(roundId));
    }

    /** 手动设置当前轮次应参与委员总数 */
    @PostMapping("/setTotalVoters")
    public Result<Integer> setTotalVoters(@RequestParam int totalVoters) {
        return Result.ok(voteRoundService.setTotalVoters(totalVoters));
    }
}
