package com.vote.dto;

import lombok.Data;

/**
 * 成果分页查询请求
 */
@Data
public class AchievementPageReq {
    private Integer pageNum = 1;
    private Integer pageSize = 10;
    private String achievementCategory;
    private String expertLevel;
    private String achievementName;
    /** 所属投票轮次（1-10），null 时不按轮次过滤（兼容旧调用） */
    private Integer roundNum;
}
