package com.vote.dto;

import lombok.Data;

/**
 * 开始投票请求
 */
@Data
public class StartVoteReq {
    /** 是否为第一轮（isFirst=true 时，前端特殊标记） */
    private Boolean isFirst;
    private String mainTitle;
    private String subTitle;
    private String ruleJson;
}
