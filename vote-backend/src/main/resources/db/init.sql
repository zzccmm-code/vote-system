-- 科技奖评审表决系统 数据库初始化脚本
-- 执行前请先创建数据库: CREATE DATABASE vote_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE vote_db;

-- ==============================
-- 成果表
-- ==============================
CREATE TABLE IF NOT EXISTS `achievement` (
  `id`                   BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `achievement_name`     VARCHAR(200) NOT NULL COMMENT '成果名称',
  `achievement_category` VARCHAR(50)  NOT NULL COMMENT '成果类别（专利奖/科技进步奖/技术发明奖）',
  `creation_units`       VARCHAR(300)          COMMENT '创建单位（部门）',
  `completion_person`    VARCHAR(300)          COMMENT '完成人',
  `expert_level`         VARCHAR(20)           COMMENT '专家组推荐等级（一等奖/二等奖/三等奖/不推荐）',
  `extra_info`           TEXT                  COMMENT '附加信息',
  `file_src`             VARCHAR(500)          COMMENT '附件文件路径',
  `status`               TINYINT      NOT NULL DEFAULT 0 COMMENT '状态：0=待提交 1=已提交',
  `order_num`            INT                   COMMENT '排序号',
  `eval_result`          VARCHAR(50)           COMMENT '最终评审结果',
  `create_time`          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time`          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成果表';

-- ==============================
-- 投票轮次表
-- ==============================
CREATE TABLE IF NOT EXISTS `vote_round` (
  `id`          BIGINT      NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `round_num`   INT         NOT NULL COMMENT '轮次编号（1、2、3...）',
  `main_title`  VARCHAR(200)         COMMENT '主标题',
  `sub_title`   VARCHAR(200)         COMMENT '副标题',
  `rule_json`   TEXT                 COMMENT '投票规则（JSON格式）',
  `status`      VARCHAR(20) NOT NULL DEFAULT 'not_started' COMMENT '状态：not_started/running/finished',
  `is_first`    TINYINT     NOT NULL DEFAULT 0 COMMENT '是否为第一轮次',
  `create_time` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_round_num` (`round_num`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='投票轮次表';

-- ==============================
-- 投票结果表
-- ==============================
CREATE TABLE IF NOT EXISTS `vote_result` (
  `id`           BIGINT      NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `round_id`     BIGINT      NOT NULL COMMENT '所属轮次ID',
  `achievement_id` BIGINT    NOT NULL COMMENT '成果ID',
  `agree`        INT         NOT NULL DEFAULT 0 COMMENT '同意票数',
  `disagree`     INT         NOT NULL DEFAULT 0 COMMENT '不同意票数',
  `abstain`      INT         NOT NULL DEFAULT 0 COMMENT '弃权票数',
  `total_voters` INT         NOT NULL DEFAULT 0 COMMENT '参与投票总人数',
  `vote_level`   VARCHAR(20)          COMMENT '最终授奖等级',
  `is_published` TINYINT     NOT NULL DEFAULT 0 COMMENT '是否已发布：0=未发布 1=已发布',
  `create_time`  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time`  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_round_achievement` (`round_id`, `achievement_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='投票结果表';

-- ==============================
-- 投票记录表（每位委员的投票记录）
-- [P0修复] 添加唯一约束防止重复投票
-- ==============================
CREATE TABLE IF NOT EXISTS `vote_record` (
  `id`             BIGINT      NOT NULL AUTO_INCREMENT,
  `round_id`       BIGINT      NOT NULL COMMENT '轮次ID',
  `achievement_id` BIGINT      NOT NULL COMMENT '成果ID',
  `voter_id`       VARCHAR(100) NOT NULL COMMENT '投票人标识（可用设备ID或IP）',
  `voter_name`     VARCHAR(100)          COMMENT '投票人姓名',
  `vote_option`    VARCHAR(20) NOT NULL COMMENT '投票选项：agree/disagree/abstain',
  `vote_level`     VARCHAR(20)           COMMENT '投票等级（一等奖/二等奖/三等奖/不推荐）',
  `create_time`    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_round_achievement_voter` (`round_id`, `achievement_id`, `voter_id`),
  KEY `idx_round_voter` (`round_id`, `voter_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='投票记录表';

-- ==============================
-- 初始数据
-- ==============================
INSERT INTO `vote_round` (`round_num`, `main_title`, `sub_title`, `rule_json`, `status`, `is_first`)
VALUES (1, '2024年度科学技术奖拟授奖项目', '第一轮投票', '{"subTitle":"第一轮"}', 'not_started', 1)
ON DUPLICATE KEY UPDATE `main_title` = VALUES(`main_title`);
