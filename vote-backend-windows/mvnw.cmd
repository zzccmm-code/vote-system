@REM ----------------------------------------------------------------------------
@REM Maven Start Up Batch script
@REM ----------------------------------------------------------------------------

@echo off
chcp 65001 >nul 2>&1

set "MAVEN_PROJECTBASEDIR=%~dp0"
set "MAVEN_HOME=%MAVEN_PROJECTBASEDIR%.mvn\wrapper"

set "JAVA_HOME=%JAVA_HOME%"

if not exist "%MAVEN_HOME%\maven-wrapper.jar" (
    echo [错误] 未找到 maven-wrapper.jar
    exit /b 1
)

set "MAVEN_CMD_LINE_ARGS=%*"

java -classpath "%MAVEN_HOME%\maven-wrapper.jar" org.apache.maven.wrapper.MavenWrapperMain %MAVEN_CMD_LINE_ARGS%
