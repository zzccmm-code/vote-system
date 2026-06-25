package com.vote.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * 投票结果实体
 * 对应数据库表: vote_result
 */
@Data
@TableName("vote_result")
public class VoteResult {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 所属轮次ID */
    private Long roundId;

    /** 成果ID */
    private Long achievementId;

    /** 同意票数 */
    private Integer agree;

    /** 不同意票数 */
    private Integer disagree;

    /** 弃权票数 */
    private Integer abstain;

    /** 参与投票总人数 */
    private Integer totalVoters;

    /** 最终授奖等级 */
    private String voteLevel;

    /** 是否已发布：0=未发布 1=已发布 */
    private Integer isPublished;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
