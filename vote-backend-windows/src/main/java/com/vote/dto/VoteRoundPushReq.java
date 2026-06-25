package com.vote.dto;

import lombok.Data;

/**
 * 投票 push 请求（委员提交投票）
 */
@Data
public class VoteRoundPushReq {
    private Long roundId;
    private Long achievementId;
    private String voterId;
    private String voterName;
    private String voteOption;   // agree / disagree / abstain
    private String voteLevel;    // 一等奖 / 二等奖 / 三等奖 / 不推荐
}
