# 科技奖评审表决系统 — 程序员交接文档

> 最后更新：2026-06-28
> 系统名称：国网四川省电力公司科技奖励评审系统

---

## 一、系统概览

| 项目 | 说明 |
|------|------|
| **用途** | 科技成果评审表决：成果录入→附件上传→多轮投票→结果发布→数据导出 |
| **架构** | 单页前后端分离：Vue2 + Element UI 前端，Spring Boot 2.7 后端，H2 内嵌数据库 |
| **前端端口** | 3000（Node.js 静态文件服务器 + API 代理） |
| **后端端口** | 7003（Spring Boot） |
| **数据库** | H2 内嵌（`~/vote_db` 文件数据库，无需安装 MySQL） |
| **运行环境** | Java 17 + Node.js 22 |

---

## 二、文件结构

```
评审表决_files/
├── index.html                    ← 主页面（SPA入口）
├── import.html                   ← 批量导入Excel页面
├── server.js                     ← Node.js静态文件服务器+API代理（端口3000）
├── options.js                    ← 前端全局配置（base_url、下拉选项）
│
├── 【前端管理台（原生HTML/CSS/JS，已重写，主维护对象）】
│   ├── assets/css/admin.css      ← 科技风暗色主题样式
│   └── assets/js/admin.js       ← 全部前端逻辑（成果/投票/结果三标签页）
│
├── 【已弃用（保留不删，请勿再维护）】
│   ├── chunk-vendors.*.js / app.*.js / app.*.css  ← 旧 Vue 编译产物，index.html 不再引用
│   ├── batch-delete.js / pdf-inject.js / hide-time-col.js / expert-column.js / inline-import.js
│   │                                 ← 旧运行期注入脚本，功能已由 admin.js 原生实现
│
├── 【平板投票端（独立页面，保持不变）】
│   ├── table-vote.html           ← 鸿蒙/安卓平板投票页（PWA）
│   ├── manifest.json / sw.js     ← PWA 清单与 Service Worker
│
├── 【后端源码（需要时可编译）】
│   └── vote-backend-windows/
│       ├── pom.xml               ← Maven 配置
│       ├── src/main/java/com/vote/
│       │   ├── VoteApplication.java
│       │   ├── controller/        ← API 控制器（见第四节）
│       │   ├── service/           ← 业务逻辑
│       │   ├── entity/            ← 数据实体
│       │   ├── mapper/            ← MyBatis-Plus Mapper
│       │   ├── dto/               ← 请求/响应 DTO
│       │   └── common/            ← 全局异常/分页/CORS配置
│       └── src/main/resources/
│           ├── application.properties ← 配置（H2连接串等）
│           └── schema.sql         ← H2 建表脚本
│
├── 【部署文档】
│   ├── Windows版部署流程说明书.html
│   ├── 安卓平板部署教程.html
│   └── 平板版部署流程说明书.html
│
└── .git/                          ← Git 仓库（70+ 提交记录）
```

---

## 三、数据库表结构

### 3.1 `achievement` — 成果表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 自增主键 |
| achievement_name | VARCHAR(200) | 成果名称（唯一去重依据） |
| achievement_category | VARCHAR(50) | 成果类别：专利奖/科技进步奖/技术发明奖 |
| creation_units | VARCHAR(300) | 推荐单位（部门） |
| expert_level | VARCHAR(20) | 专家推荐等级：一等奖/二等奖/三等奖/不推荐 |
| extra_info | TEXT | 附加信息 |
| file_src | VARCHAR(500) | PDF附件文件名 |
| status | INT | 0=待提交 1=已提交 |
| order_num | INT | 排序号 |
| eval_result | VARCHAR(50) | 最终评审结果 |
| create_time | TIMESTAMP | 创建时间 |
| update_time | TIMESTAMP | 更新时间 |

### 3.2 `vote_round` — 投票轮次表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 自增主键 |
| round_num | INT UNIQUE | 轮次编号 |
| main_title | VARCHAR(200) | 主标题 |
| sub_title | VARCHAR(200) | 副标题 |
| rule_json | TEXT | 投票规则 JSON |
| status | VARCHAR(20) | not_started / running / finished |
| is_first | INT | 是否第一轮 |

### 3.3 `vote_result` — 投票结果表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | |
| round_id | BIGINT | 所属轮次 |
| achievement_id | BIGINT | 成果ID |
| agree / disagree / abstain | INT | 票数 |
| total_voters | INT | 总投票人 |
| vote_level | VARCHAR(20) | 最终授奖等级 |
| is_published | INT | 0=未发布 1=已发布 |

### 3.4 `vote_record` — 投票记录表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | |
| round_id / achievement_id | BIGINT | 关联 |
| voter_id | VARCHAR(100) | 投票人标识 |
| voter_name | VARCHAR(100) | 投票人姓名 |
| vote_option | VARCHAR(20) | agree / disagree / abstain |
| vote_level | VARCHAR(20) | 投票等级 |

唯一约束：`(round_id, achievement_id, voter_id)` 防重复投票

---

## 四、API 接口清单

### 4.1 成果管理 — `/achievement/*`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/achievement/page` | 分页查询成果 |
| POST | `/achievement/create` | 新增成果 |
| POST | `/achievement/update` | 更新成果（含 fileSrc） |
| POST | `/achievement/delete` | 批量删除 `{objectIds:[...]}` |
| POST | `/achievement/updateStatus` | 批量修改状态 |
| GET | `/achievement/template` | 下载 Excel 导入模板 |
| POST | `/achievement/import` | 上传 Excel 批量导入（含成果名称去重） |

### 4.2 投票轮次 — `/voteRound/*`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/voteRound/current` | 获取当前投票轮次 |
| POST | `/voteRound/start` | 开始投票 |
| POST | `/voteRound/stop` | 结束投票 |
| POST | `/voteRound/resetting` | 重置投票（清空当前轮） |
| POST | `/voteRound/push` | 委员提交投票 |
| GET/POST | `/voteRound/getRoundSubmitNum` | 已提交人数 |

### 4.3 投票结果 — `/voteResult/*`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/voteResult/page` | 分页查询结果 |
| GET/POST | `/voteResult/getRoundList` | 所有轮次列表 |
| GET/POST | `/voteResult/eachRoundSituation` | 每轮得票情况 |
| GET/POST | `/voteResult/finalResult` | 最终结果展示 |
| POST | `/voteResult/update` | 修改授奖等级 |
| POST | `/voteResult/push` | 一键发布 |
| POST | `/voteResult/exportStatistics` | 导出Excel |

### 4.4 文件上传 — `/api/*`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/upload` | 上传PDF附件（FormData, name=file） |
| GET | `/api/files/{filename}` | 下载PDF文件 |

---

## 五、注入脚本详细说明（已弃用）

> **注意：** 以下 5 个注入脚本与旧 Vue 编译产物（`app.*.js` 等）自前端重写后**已不再被 `index.html` 引用**，其功能已由 `assets/js/admin.js` 原生实现。仅作历史存档，请勿再维护。

旧版因无法修改 Vue 前端源码（仅有编译产物 `app.b1193a83.js`），所有 UI 改造通过 JS 脚本注入实现。

### 5.1 `batch-delete.js` — 全选+批量删除+表头对齐

**注入位置：** `index.html` 中 `<script>` 标签加载

**核心逻辑：**
- 在表格 `colgroup`/`thead`/`tbody` 中注入勾选框列（36px宽）
- 用 `getBoundingClientRect()` 测量 header 各列实际像素宽度，逐列同步到 body colgroup/td
- 跳过 Element UI 的 gutter 列（滚动条补偿列），防止列偏移
- 拦截 `fetch` 和 `XMLHttpRequest` 获取成果数据用于 ID 回填
- 在页面顶部显示红色批量删除条，跟踪已选数量
- 调用 `POST /achievement/delete` 执行批量删除

**执行间隔：** 每 2 秒（`setInterval`）

### 5.2 `pdf-inject.js` — PDF上传/查看按钮

**注入位置：** 每行操作列的 `.cell` div 内部

**核心逻辑：**
- 调用 `POST /achievement/page` 获取成果列表，建立 `name → id` 映射
- 在操作列注入 `<span class="wb-attach">`：
  - 无附件：红色边框"上传附件"，点击弹出文件选择器
  - 有附件：蓝色"查看附件"链接，`target="_blank"` 打开 PDF
- 上传流程：`POST /api/upload` → `POST /achievement/update`（关联 fileSrc）
- 使用 `renderBtn()` 刷新按钮状态

**执行间隔：** 每 3 秒

### 5.3 `hide-time-col.js` — 隐藏上传时间列

**核心逻辑：**
- 在 header th 上标记 `data-hide-col="1"`
- 注入全局 `<style>`：th/td `display: none`，col `visibility: collapse`
- 每 1.5 秒同步 body td 和 colgroup 的标记

**注意：** 使用 `visibility: collapse`（而非 `display: none`）对 col 元素，避免 `table-layout: fixed` 下列偏移

### 5.4 `expert-column.js` — 专家评审推荐列改名

**核心逻辑：**
- 在表头 `.cell` 中查找"专家组推荐等级"→ 改为"专家评审推荐"
- 将"申报单位"/"创建单位"→ 改为"推荐单位(部门)"
- 将搜索栏标签"专家组推荐等级："→ 改为"推荐等级："

**注意：** 不做数据填充，Vue 已通过 `prop:"expertLevel"` 自动绑定数据

**执行间隔：** 每 2 秒

### 5.5 `inline-import.js` — 工具栏改造

**核心逻辑：**
- 找到 Vue 渲染的工具栏（包含"成果新增"+"开始投票"的 div）
- 在末尾注入绿色 `<a class="el-button--success">导入数据</a>`，`href="import.html"`
- 隐藏原右下角浮动导入按钮
- 设置工具栏 `display: flex` 一行排列
- 三个操作按钮统一宽 110px，margin 清零消除 Vue 默认间距
- 搜索框压缩至 55px，推荐等级下拉框额外缩至 28px

**执行间隔：** 每 1.5 秒

---

## 六、启动与部署

### 6.1 开发启动（localhost）

```bash
# 1. 启动后端
cd vote-backend-windows
java -jar vote-system-windows.jar --server.port=7003

# 2. 启动前端（另开终端）
node server.js
# → 访问 http://localhost:3000
```

### 6.2 生产部署（局域网）

1. 修改 `options.js`：将 `_$base_url` 改为后端实际 IP（如 `http://192.168.2.188:7003`）
2. 启动后端：`java -jar vote-system-windows.jar --server.port=7003`
3. 启动前端：`node server.js`
4. 其他设备通过 `http://[服务器IP]:3000` 访问

### 6.3 重新编译后端

```bash
cd vote-backend-windows
mvnw package -DskipTests
# JAR 输出：target/vote-system-windows.jar
```

---

## 七、重要注意事项

### 7.1 Element UI 双表结构

Element UI 将表格渲染为**两张独立的 `<table>`**：
- `.el-table__header-wrapper table` — 表头
- `.el-table__body-wrapper table` — 数据

两张表各有独立的 `colgroup`。任何列宽修改必须同步两张表，否则表头和数据错位。`batch-delete.js` 通过 `getBoundingClientRect()` 像素级同步解决了此问题。

### 7.2 MutationObserver 死循环风险

曾因 `MutationObserver` 回调中修改 DOM 导致无限递归卡死页面。**已全部移除**，所有脚本改用 `setInterval` 定时轮询方式。

### 7.3 `gutter` 列

Element UI 在 header 表可能插入 `name="gutter"` 的列来补偿 body 滚动条宽度。列宽同步时需要跳过此列，否则 body 列整体偏移一位。

### 7.4 `nth-child` 索引偏移

`batch-delete.js` 在表格最前面插入全选列后，所有列索引 +1。任何使用 `nth-child` 选择器的地方必须考虑此偏移。`hide-time-col.js` 已改为 `data-hide-col` 属性标记方式，不再依赖索引。

### 7.5 导入去重

`POST /achievement/import` 根据**成果名称**做去重：
- 导入前查询库中已有名称
- 同一 Excel 批次内也去重
- 重复项计入 `skipped` 统计，不报错

### 7.6 数据库文件位置

H2 数据库文件存储在用户主目录 `~/vote_db.mv.db`。如需重置数据，删除此文件并重启后端即可。

### 7.7 Git 仓库

项目根目录有完整 Git 仓库（70+ 提交），记录了所有修改历史。常用 `git revert` 回退不需要的改动。

---

## 八、已知问题 & 待优化

1. **列顺序无法完美重排**：Vue 编译产物中列定义是硬编码的，通过 DOM 操作重排列顺序与 Vue 响应式冲突，当前采用"不改顺序、只改名改样式"策略
2. **表格对齐**：尽管已通过像素同步大幅改善，极端情况（超宽内容）下仍有微小偏差
3. **后端无认证机制**：投票通过 IP/自定义 voterId 标识，无登录体系
4. **H2 单机限制**：多实例同时运行时数据库文件锁定，需改用 MySQL 部署

---

## 九、常用维护命令

```bash
# 回到最近一个稳定版本
git log --oneline -20
git reset --hard <commit-hash>

# 强制重启后端
taskkill /F /IM java.exe
java -jar vote-backend-windows/vote-system-windows.jar --server.port=7003 &

# 检查服务状态
curl -s http://localhost:7003/voteRound/current
curl -s http://localhost:3000 | head -5

# 重置数据库
del /q %USERPROFILE%\vote_db.mv.db
```
