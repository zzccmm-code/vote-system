package com.vote.dto;

import lombok.Data;

/**
 * 投票结果查询/更新请求
 */
@Data
public class VoteResultReq {
    private Integer pageNum = 1;
    private Integer pageSize = 10;
    private Long roundId;
    private Long achievementId;
    private String voteLevel;
    private Integer isPublished;
}
