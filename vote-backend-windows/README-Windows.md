# 科技奖评审表决系统 - Windows 后端部署指南

## 与平板版的区别

| 对比项 | 平板版 (vote-backend) | Windows版 (vote-backend-windows) |
|--------|----------------------|--------------------------------|
| 数据库 | MySQL（需安装） | H2 内嵌（无需安装，自动创建） |
| 运行环境 | Termux + JDK 17 | Windows + JDK 17 |
| 数据存储 | MySQL 数据目录 | `./data/` 文件夹（便携） |
| 启动方式 | 命令行 `java -jar` | 双击 `启动服务.bat` |
| 构建方式 | 需 Maven | 已预编译 JAR，开箱即用 |

---

## 快速开始（3步上线）

### 第1步：安装 JDK 17

如果电脑上已有 JDK 17 或以上版本，跳过此步。

**方式一：下载安装包（推荐新手）**
1. 访问 https://learn.microsoft.com/zh-cn/java/openjdk/download
2. 下载 `microsoft-jdk-17-windows-x64.msi`
3. 双击安装，一路"下一步"即可

**方式二：下载免安装版**
1. 下载 https://aka.ms/download-jdk/microsoft-jdk-17.0.11-windows-x64.zip
2. 解压到 `C:\jdk-17`
3. 将 `C:\jdk-17\bin` 添加到系统环境变量 PATH

**验证安装：** 打开命令提示符，输入 `java -version`，看到版本号即成功。

### 第2步：启动后端服务

1. 将 `vote-backend-windows` 文件夹复制到电脑任意位置（如桌面）
2. 双击 `启动服务.bat`
3. 看到以下输出表示启动成功：
   ```
   Tomcat started on port(s): 7003 (http)
   Started VoteApplication in 3.xxx seconds
   ```

### 第3步：配置前端连接

前端仍运行在安卓平板上，只需修改平板上的 `options.js` 文件，将后端地址指向 Windows 电脑的 IP：

```javascript
// 取消注释并修改为 Windows 电脑的局域网 IP
_$base_url = "http://192.168.1.100:7003";  // 替换为你的电脑IP
```

**查看电脑 IP 的方法：** 打开命令提示符，输入 `ipconfig`，找到"IPv4 地址"。

---

## 文件说明

```
vote-backend-windows/
├── vote-system-windows.jar    ← 预编译JAR包（直接运行）
├── 启动服务.bat                ← 双击启动后端
├── 停止服务.bat                ← 双击停止后端
├── 重新构建.bat                ← 修改源码后重新编译（可选）
├── pom.xml                     ← Maven 依赖配置
├── mvnw.cmd                    ← Maven Wrapper（免安装Maven）
├── .mvn/wrapper/               ← Maven Wrapper 文件
├── src/                        ← Java 源代码
│   └── main/
│       ├── java/com/vote/      ← 后端代码
│       └── resources/
│           ├── application.yml ← 配置文件（端口/数据库）
│           ├── schema-h2.sql   ← H2 建表脚本
│           └── data-h2.sql     ← 初始数据
├── data/                       ← H2数据库文件（启动后自动生成）
└── uploads/                    ← 上传文件目录（启动后自动生成）
```

---

## 配置说明

### 修改端口

编辑 `src/main/resources/application.yml`（需重新构建JAR）或在启动时指定：

```
java -jar vote-system-windows.jar --server.port=8080
```

### 数据库管理

H2 数据库自带 Web 控制台，启动服务后访问：

```
http://localhost:7003/h2-console
```

连接参数：
- **JDBC URL:** `jdbc:h2:file:./data/vote_db;MODE=MySQL`
- **User:** `sa`
- **Password:** （留空）

### 备份数据

直接复制 `data/` 文件夹即可。恢复时将备份文件夹放回原位。

---

## 常见问题

### Q1: 双击"启动服务.bat"闪退
**原因：** 未安装 JDK 或未配置环境变量。
**解决：** 打开命令提示符输入 `java -version`，如果提示"不是内部命令"，说明 JDK 未安装或未配置 PATH。

### Q2: 提示"端口 7003 已被占用"
**解决：** 双击 `停止服务.bat` 关闭旧进程，再重新启动。

### Q3: 平板无法连接到电脑后端
**排查步骤：**
1. 确认平板和电脑在同一 WiFi 网络
2. 确认电脑 IP 地址正确（`ipconfig` 查看）
3. 检查 Windows 防火墙是否放行 7003 端口：
   - 控制面板 → Windows Defender 防火墙 → 高级设置
   - 入站规则 → 新建规则 → 端口 → TCP 7003 → 允许
4. 在平板浏览器访问 `http://电脑IP:7003/voteRound/current` 测试

### Q4: 数据丢失了
**原因：** H2 数据库文件在 `data/` 文件夹中，删除该文件夹会丢失所有数据。
**解决：** 定期备份 `data/` 文件夹。

### Q5: 修改了源代码怎么生效
1. 双击 `重新构建.bat`（需要已安装 JDK 17）
2. 构建成功后，双击 `启动服务.bat` 即可

### Q6: 如何切换到 MySQL 数据库
编辑 `src/main/resources/application.yml`，将 H2 配置注释掉，启用 MySQL 配置：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/vote_db?useUnicode=true&characterEncoding=utf8&useSSL=false&serverTimezone=Asia/Shanghai
    username: vote
    password: vote123456
    driver-class-name: com.mysql.cj.jdbc.Driver
  sql:
    init:
      mode: never   # 关闭自动建表
```

然后重新构建 JAR。

---

## API 接口列表

| 模块 | 接口 | 方法 |
|------|------|------|
| 成果管理 | /achievement/page | POST |
| | /achievement/add | POST |
| | /achievement/update | POST |
| | /achievement/delete | POST |
| | /achievement/updateStatus | POST |
| 文件 | /api/upload | POST (multipart) |
| | /api/files/{filename} | GET |
| 投票轮次 | /voteRound/current | POST |
| | /voteRound/start | POST |
| | /voteRound/stop | POST |
| | /voteRound/resetting | POST |
| | /voteRound/push | POST |
| | /voteRound/getRoundSubmitNum | POST |
| 投票结果 | /voteResult/page | POST |
| | /voteResult/update | POST |
| | /voteResult/push | POST |
| | /voteResult/getRoundList | POST |
| | /voteResult/eachRoundSituation | POST |
| | /voteResult/finalResult | POST |
| | /voteResult/additionalPage | POST |
| | /voteResult/exportStatistics | POST |
