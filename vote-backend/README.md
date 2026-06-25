# 科技奖评审表决系统 - 后端服务

## 项目结构

```
vote-backend/
├── pom.xml                          # Maven 构建配置
├── src/main/
│   ├── java/com/vote/
│   │   ├── VoteApplication.java     # 启动入口
│   │   ├── common/                  # 公共组件（响应封装、异常处理、Web配置）
│   │   ├── entity/                  # 数据库实体
│   │   ├── mapper/                  # MyBatis-Plus Mapper
│   │   ├── dto/                     # 请求参数 DTO
│   │   ├── service/                 # 业务逻辑
│   │   └── controller/              # REST 接口
│   └── resources/
│       ├── application.yml          # 配置文件
│       └── db/init.sql              # 数据库初始化 SQL
```

## 接口总览

| 接口 | 说明 |
|------|------|
| POST /achievement/page | 成果分页查询 |
| POST /achievement/add | 新增成果 |
| POST /achievement/update | 编辑成果 |
| POST /achievement/delete | 删除成果 |
| POST /achievement/updateStatus | 批量更新状态 |
| POST /api/upload | 文件上传 |
| GET  /api/files/{filename} | 文件访问 |
| POST /voteRound/current | 获取当前轮次 |
| POST /voteRound/start | 开始投票 |
| POST /voteRound/stop | 结束投票 |
| POST /voteRound/resetting | 重置投票 |
| POST /voteRound/push | 委员提交投票 |
| POST /voteRound/getRoundSubmitNum | 获取已提交人数 |
| POST /voteResult/page | 投票结果分页 |
| POST /voteResult/update | 更新结果 |
| POST /voteResult/push | 一键发布结果 |
| POST /voteResult/getRoundList | 获取轮次列表 |
| POST /voteResult/eachRoundSituation | 每轮得票统计 |
| POST /voteResult/finalResult | 最终结果 |
| POST /voteResult/additionalPage | 附加分页 |
| POST /voteResult/exportStatistics | 导出 Excel |

## 构建方法

### 1. 环境要求
- JDK 17+
- Maven 3.6+
- MySQL 5.7+ / MariaDB 10.4+

### 2. 初始化数据库
```sql
CREATE DATABASE vote_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'vote'@'localhost' IDENTIFIED BY 'vote123456';
GRANT ALL ON vote_db.* TO 'vote'@'localhost';
FLUSH PRIVILEGES;
-- 然后执行:
-- mysql -u vote -p vote_db < src/main/resources/db/init.sql
```

### 3. 修改配置
编辑 `src/main/resources/application.yml`，修改数据库密码等配置。

### 4. 打包
```bash
mvn clean package -DskipTests
```
生成文件：`target/vote-system-1.0.0.jar`

### 5. 运行
```bash
java -jar target/vote-system-1.0.0.jar
```
服务启动在 http://localhost:7003

## 在 Termux（安卓）上构建

```bash
pkg install openjdk-17 maven -y
cd ~/vote-app/vote-backend
mvn clean package -DskipTests
java -jar target/vote-system-1.0.0.jar &
```
