package com.vote.dto;

import lombok.Data;

/**
 * 查询每轮得票情况的请求参数（通过 params 传递）
 */
@Data
public class EachRoundReq {
    private Long roundId;
    private String achievementCategory;
    /** [P1修复] 新增：是否只查已发布的结果 */
    private Integer isPublished;
}
