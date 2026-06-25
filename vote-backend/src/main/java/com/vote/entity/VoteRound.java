package com.vote.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * 投票轮次实体
 * 对应数据库表: vote_round
 */
@Data
@TableName("vote_round")
public class VoteRound {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 轮次编号 */
    private Integer roundNum;

    /** 主标题 */
    private String mainTitle;

    /** 副标题 */
    private String subTitle;

    /** 投票规则（JSON格式，含 subTitle 等字段） */
    private String ruleJson;

    /** 状态：not_started / running / finished */
    private String status;

    /** 是否为第一轮 */
    private Integer isFirst;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}
