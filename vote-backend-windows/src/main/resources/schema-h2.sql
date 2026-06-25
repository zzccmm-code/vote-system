-- ================================================
-- 科技奖评审表决系统 H2 数据库建表脚本
-- H2 使用 MySQL 兼容模式，首次启动自动执行
-- ================================================

-- 成果表
CREATE TABLE IF NOT EXISTS achievement (
  id                   BIGINT       NOT NULL AUTO_INCREMENT,
  achievement_name     VARCHAR(200) NOT NULL,
  achievement_category VARCHAR(50)  NOT NULL,
  creation_units       VARCHAR(300),
  expert_level         VARCHAR(20),
  extra_info           TEXT,
  file_src             VARCHAR(500),
  status               INT          NOT NULL DEFAULT 0,
  order_num            INT,
  eval_result          VARCHAR(50),
  create_time          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- 投票轮次表
CREATE TABLE IF NOT EXISTS vote_round (
  id          BIGINT      NOT NULL AUTO_INCREMENT,
  round_num   INT         NOT NULL,
  main_title  VARCHAR(200),
  sub_title   VARCHAR(200),
  rule_json   TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'not_started',
  is_first    INT         NOT NULL DEFAULT 0,
  create_time TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uk_round_num UNIQUE (round_num)
);

-- 投票结果表
CREATE TABLE IF NOT EXISTS vote_result (
  id             BIGINT      NOT NULL AUTO_INCREMENT,
  round_id       BIGINT      NOT NULL,
  achievement_id BIGINT      NOT NULL,
  agree          INT         NOT NULL DEFAULT 0,
  disagree       INT         NOT NULL DEFAULT 0,
  abstain        INT         NOT NULL DEFAULT 0,
  total_voters   INT         NOT NULL DEFAULT 0,
  vote_level     VARCHAR(20),
  is_published   INT         NOT NULL DEFAULT 0,
  create_time    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uk_round_achievement UNIQUE (round_id, achievement_id)
);

-- 投票记录表（每位委员的投票记录）
-- [P0修复] 添加唯一约束防止重复投票
CREATE TABLE IF NOT EXISTS vote_record (
  id             BIGINT       NOT NULL AUTO_INCREMENT,
  round_id       BIGINT       NOT NULL,
  achievement_id BIGINT       NOT NULL,
  voter_id       VARCHAR(100) NOT NULL,
  voter_name     VARCHAR(100),
  vote_option    VARCHAR(20)  NOT NULL,
  vote_level     VARCHAR(20),
  create_time    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uk_round_achievement_voter UNIQUE (round_id, achievement_id, voter_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_round_voter ON vote_record (round_id, voter_id);
