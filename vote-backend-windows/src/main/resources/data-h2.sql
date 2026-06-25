-- 初始数据：插入第一轮投票轮次
-- H2 使用 MERGE 语法实现 "存在则跳过"
MERGE INTO vote_round (round_num, main_title, sub_title, rule_json, status, is_first)
KEY (round_num)
VALUES (1, '2024年度科学技术奖拟授奖项目', '第一轮投票', '{"subTitle":"第一轮"}', 'not_started', 1);
