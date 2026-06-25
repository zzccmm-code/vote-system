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
}
