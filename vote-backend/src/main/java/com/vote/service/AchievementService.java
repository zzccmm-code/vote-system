package com.vote.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.vote.common.PageResult;
import com.vote.dto.AchievementPageReq;
import com.vote.dto.DeleteReq;
import com.vote.dto.UpdateStatusReq;
import com.vote.entity.Achievement;
import com.vote.mapper.AchievementMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;

import javax.annotation.PostConstruct;

@Service
@RequiredArgsConstructor
public class AchievementService {

    private final AchievementMapper achievementMapper;

    @Value("${app.upload-dir:./uploads}")
    private String uploadDir;

    /** 解析为绝对路径后的上传目录 */
    private File uploadDirFile;

    @PostConstruct
    public void init() {
        // 将相对路径解析为绝对路径，避免 Spring Boot fat JAR 中 user.dir 指向临时目录
        Path path = Paths.get(uploadDir).toAbsolutePath().normalize();
        uploadDirFile = path.toFile();
        if (!uploadDirFile.exists()) {
            uploadDirFile.mkdirs();
        }
    }

    /**
     * 分页查询成果列表
     */
    public PageResult<Achievement> page(AchievementPageReq req) {
        LambdaQueryWrapper<Achievement> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(req.getAchievementCategory())) {
            wrapper.eq(Achievement::getAchievementCategory, req.getAchievementCategory());
        }
        if (StringUtils.hasText(req.getExpertLevel())) {
            wrapper.eq(Achievement::getExpertLevel, req.getExpertLevel());
        }
        if (StringUtils.hasText(req.getAchievementName())) {
            wrapper.like(Achievement::getAchievementName, req.getAchievementName());
        }
        wrapper.orderByAsc(Achievement::getOrderNum)
               .orderByDesc(Achievement::getCreateTime);

        Page<Achievement> page = achievementMapper.selectPage(
                new Page<>(req.getPageNum(), req.getPageSize()), wrapper);
        return PageResult.of(page.getTotal(), page.getRecords());
    }

    /**
     * 新增成果（含文件上传）
     */
    public void add(Achievement achievement, MultipartFile file) throws IOException {
        if (file != null && !file.isEmpty()) {
            String filename = saveFile(file);
            achievement.setFileSrc(filename);
        }
        if (achievement.getStatus() == null) {
            achievement.setStatus(1);
        }
        achievementMapper.insert(achievement);
    }

    /**
     * 新增成果（不含文件）
     */
    public void add(Achievement achievement) {
        try {
            add(achievement, null);
        } catch (IOException e) {
            throw new RuntimeException("文件保存失败", e);
        }
    }

    /**
     * 编辑成果（含文件上传）
     * [P1修复] 使用 LambdaUpdateWrapper 只更新非null字段，防止空值覆盖已有数据
     */
    public void update(Achievement achievement, MultipartFile file) throws IOException {
        if (file != null && !file.isEmpty()) {
            // 删除旧文件
            Achievement old = achievementMapper.selectById(achievement.getId());
            if (old != null && old.getFileSrc() != null && !old.getFileSrc().isEmpty()) {
                try {
                    File oldFile = new File(uploadDirFile, old.getFileSrc());
                    if (oldFile.exists()) {
                        oldFile.delete();
                    }
                } catch (Exception ignored) {}
            }
            String filename = saveFile(file);
            achievement.setFileSrc(filename);
        }

        // [P1修复] 只更新非null字段，防止未传字段被覆盖为null
        LambdaUpdateWrapper<Achievement> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(Achievement::getId, achievement.getId());
        if (achievement.getAchievementName() != null) wrapper.set(Achievement::getAchievementName, achievement.getAchievementName());
        if (achievement.getAchievementCategory() != null) wrapper.set(Achievement::getAchievementCategory, achievement.getAchievementCategory());
        if (achievement.getCreationUnits() != null) wrapper.set(Achievement::getCreationUnits, achievement.getCreationUnits());
        if (achievement.getExpertLevel() != null) wrapper.set(Achievement::getExpertLevel, achievement.getExpertLevel());
        if (achievement.getExtraInfo() != null) wrapper.set(Achievement::getExtraInfo, achievement.getExtraInfo());
        if (achievement.getFileSrc() != null) wrapper.set(Achievement::getFileSrc, achievement.getFileSrc());
        if (achievement.getStatus() != null) wrapper.set(Achievement::getStatus, achievement.getStatus());
        if (achievement.getOrderNum() != null) wrapper.set(Achievement::getOrderNum, achievement.getOrderNum());
        if (achievement.getEvalResult() != null) wrapper.set(Achievement::getEvalResult, achievement.getEvalResult());
        achievementMapper.update(null, wrapper);
    }

    /**
     * 编辑成果（不含文件）
     */
    public void update(Achievement achievement) {
        try {
            update(achievement, null);
        } catch (IOException e) {
            throw new RuntimeException("文件保存失败", e);
        }
    }

    /**
     * 删除成果（批量）
     */
    public void delete(DeleteReq req) {
        if (req.getObjectIds() == null || req.getObjectIds().isEmpty()) {
            throw new IllegalArgumentException("请选择要删除的成果");
        }
        List<Achievement> achievements = achievementMapper.selectBatchIds(req.getObjectIds());
        for (Achievement a : achievements) {
            if (a.getFileSrc() != null && !a.getFileSrc().isEmpty()) {
                try {
                    File file = new File(uploadDirFile, a.getFileSrc());
                    if (file.exists()) {
                        file.delete();
                    }
                } catch (Exception ignored) {}
            }
        }
        achievementMapper.deleteBatchIds(req.getObjectIds());
    }

    /**
     * 批量更新状态
     */
    public void updateStatus(UpdateStatusReq req) {
        if (req.getIds() == null || req.getIds().isEmpty()) {
            throw new IllegalArgumentException("请选择要操作的成果");
        }
        Achievement update = new Achievement();
        update.setStatus(req.getStatus());
        LambdaQueryWrapper<Achievement> wrapper = new LambdaQueryWrapper<>();
        wrapper.in(Achievement::getId, req.getIds());
        achievementMapper.update(update, wrapper);
    }

    /**
     * 文件上传
     */
    public String uploadFile(MultipartFile file) throws IOException {
        return saveFile(file);
    }

    /** [P2修复] 允许上传的文件扩展名白名单 */
    private static final Set<String> ALLOWED_EXTENSIONS = new HashSet<>(Arrays.asList(
            ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
            ".jpg", ".jpeg", ".png", ".gif", ".bmp",
            ".txt", ".zip", ".rar"
    ));

    /** [P2修复] 单文件最大大小: 20MB */
    private static final long MAX_FILE_SIZE = 20 * 1024 * 1024;

    /**
     * 保存文件到磁盘
     * [P2修复] 增加文件类型和大小校验
     */
    private String saveFile(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("文件不能为空");
        }

        // [P2修复] 文件大小校验
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("文件大小不能超过20MB");
        }

        String original = file.getOriginalFilename();
        String ext = "";
        if (original != null && original.contains(".")) {
            ext = original.substring(original.lastIndexOf(".")).toLowerCase();
        }

        // [P2修复] 文件类型白名单校验
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw new IllegalArgumentException("不支持的文件类型: " + ext + "，允许的类型: " + String.join(", ", ALLOWED_EXTENSIONS));
        }

        String filename = UUID.randomUUID().toString().replace("-", "") + ext;

        if (!uploadDirFile.exists()) {
            uploadDirFile.mkdirs();
        }
        File dest = new File(uploadDirFile, filename);
        file.transferTo(dest);
        return filename;
    }

    /**
     * 查询全部已提交成果（用于投票）
     */
    public List<Achievement> listSubmitted() {
        LambdaQueryWrapper<Achievement> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Achievement::getStatus, 1)
               .orderByAsc(Achievement::getOrderNum);
        return achievementMapper.selectList(wrapper);
    }
}
