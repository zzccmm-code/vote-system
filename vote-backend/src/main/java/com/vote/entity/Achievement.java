package com.vote.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * 成果实体
 * 对应数据库表: achievement
 */
@Data
@TableName("achievement")
public class Achievement {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 成果名称 */
    private String achievementName;

    /** 成果类别：专利奖 / 科技进步奖 / 技术发明奖 */
    private String achievementCategory;

    /** 创建单位（部门） */
    private String creationUnits;

    /** 专家组推荐等级：一等奖 / 二等奖 / 三等奖 / 不推荐 */
    private String expertLevel;

    /** 附加信息 */
    private String extraInfo;

    /** 附件文件存储路径（相对于 uploads 目录） */
    private String fileSrc;

    /** 状态：0=待提交 1=已提交 */
    private Integer status;

    /** 排序号 */
    private Integer orderNum;

    /** 最终评审结果 */
    private String evalResult;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
