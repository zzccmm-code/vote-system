#!/bin/bash
# 构建脚本：在有 Maven 环境的机器上执行

set -e

echo "=== 科技奖评审表决系统后端构建 ==="

# 检查 Java
if ! command -v java &> /dev/null; then
    echo "[ERROR] 未找到 Java，请先安装 JDK 17"
    exit 1
fi

JAVA_VER=$(java -version 2>&1 | head -1 | grep -oP '"\K[^"]+')
echo "[OK] Java 版本: $JAVA_VER"

# 检查 Maven
if ! command -v mvn &> /dev/null; then
    echo "[ERROR] 未找到 Maven，请先安装 Maven 3.6+"
    exit 1
fi

echo "[OK] 开始构建..."
mvn clean package -DskipTests

echo ""
echo "=== 构建完成！==="
echo "JAR 文件位置: target/vote-system-1.0.0.jar"
echo ""
echo "启动命令: java -jar target/vote-system-1.0.0.jar"
echo "服务地址: http://localhost:7003"
