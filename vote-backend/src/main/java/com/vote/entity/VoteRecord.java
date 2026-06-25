package com.vote.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * 投票记录实体（每个委员每个成果的一次投票）
 * 对应数据库表: vote_record
 */
@Data
@TableName("vote_record")
public class VoteRecord {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 轮次ID */
    private Long roundId;

    /** 成果ID */
    private Long achievementId;

    /** 投票人标识（IP 或设备ID） */
    private String voterId;

    /** 投票人姓名 */
    private String voterName;

    /** 投票选项：agree / disagree / abstain */
    private String voteOption;

    /** 投票等级：一等奖 / 二等奖 / 三等奖 / 不推荐 */
    private String voteLevel;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}
