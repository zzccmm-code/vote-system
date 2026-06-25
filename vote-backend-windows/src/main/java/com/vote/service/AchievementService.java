package com.vote.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
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
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;

@Service
@RequiredArgsConstructor
public class AchievementService {

    private final AchievementMapper achievementMapper;

    @Value("${app.upload-dir:./uploads}")
    private String uploadDir;

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
     * 新增成果
     */
    public void add(Achievement achievement) {
        achievementMapper.insert(achievement);
    }

    /**
     * 编辑成果
     */
    public void update(Achievement achievement) {
        achievementMapper.updateById(achievement);
    }

    /**
     * 删除成果（批量）
     * [P2修复] 删除成果时同步清理关联的上传文件
     */
    public void delete(DeleteReq req) {
        if (req.getObjectIds() == null || req.getObjectIds().isEmpty()) {
            throw new IllegalArgumentException("请选择要删除的成果");
        }
        // [P2修复] 先查询成果信息，获取关联文件路径
        List<Achievement> achievements = achievementMapper.selectBatchIds(req.getObjectIds());
        for (Achievement a : achievements) {
            if (a.getFileSrc() != null && !a.getFileSrc().isEmpty()) {
                try {
                    File file = new File(uploadDir, a.getFileSrc());
                    if (file.exists()) {
                        file.delete();
                    }
                } catch (Exception ignored) {
                    // 文件删除失败不影响成果删除
                }
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
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("文件不能为空");
        }
        String original = file.getOriginalFilename();
        String ext = "";
        if (original != null && original.contains(".")) {
            ext = original.substring(original.lastIndexOf("."));
        }
        String filename = UUID.randomUUID().toString().replace("-", "") + ext;

        File dir = new File(uploadDir);
        if (!dir.exists()) {
            dir.mkdirs();
        }
        File dest = new File(dir, filename);
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
