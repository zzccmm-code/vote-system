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
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;

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

    // ==================== 批量导入 ====================

    /** 成果类别可选值 */
    private static final Set<String> VALID_CATEGORIES = new HashSet<>(Arrays.asList("专利奖", "科技进步奖", "技术发明奖"));

    /** 专家推荐等级可选值 */
    private static final Set<String> VALID_LEVELS = new HashSet<>(Arrays.asList("一等奖", "二等奖", "三等奖", "不推荐"));

    /**
     * 下载 Excel 导入模板
     */
    public ResponseEntity<byte[]> downloadTemplate() throws IOException {
        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("成果导入模板");

        // 样式
        CellStyle headerStyle = workbook.createCellStyle();
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerFont.setFontHeightInPoints((short) 11);
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(IndexedColors.LIGHT_BLUE.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        headerStyle.setBorderBottom(BorderStyle.THIN);
        headerStyle.setBorderTop(BorderStyle.THIN);
        headerStyle.setBorderLeft(BorderStyle.THIN);
        headerStyle.setBorderRight(BorderStyle.THIN);

        CellStyle exampleStyle = workbook.createCellStyle();
        exampleStyle.setFillForegroundColor(IndexedColors.LIGHT_YELLOW.getIndex());
        exampleStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        exampleStyle.setBorderBottom(BorderStyle.THIN);
        exampleStyle.setBorderTop(BorderStyle.THIN);
        exampleStyle.setBorderLeft(BorderStyle.THIN);
        exampleStyle.setBorderRight(BorderStyle.THIN);

        CellStyle noteStyle = workbook.createCellStyle();
        Font noteFont = workbook.createFont();
        noteFont.setColor(IndexedColors.RED.getIndex());
        noteStyle.setFont(noteFont);

        // 表头
        String[] headers = {"成果名称*", "成果类别*", "申报单位", "专家推荐等级", "附加信息", "排序号"};
        Row headerRow = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
            sheet.setColumnWidth(i, 18 * 256);
        }

        // 示例数据
        Row exampleRow = sheet.createRow(1);
        exampleRow.createCell(0).setCellValue("示例：基于AI的智能评审系统");
        exampleRow.createCell(1).setCellValue("科技进步奖");
        exampleRow.createCell(2).setCellValue("XX科技有限公司");
        exampleRow.createCell(3).setCellValue("一等奖");
        exampleRow.createCell(4).setCellValue("该项目实现了...");
        exampleRow.createCell(5).setCellValue(1);
        for (int i = 0; i < 6; i++) {
            exampleRow.getCell(i).setCellStyle(exampleStyle);
        }

        // 填写说明
        Row noteRow = sheet.createRow(3);
        Cell noteCell = noteRow.createCell(0);
        noteCell.setCellValue("说明：带*为必填；成果类别可选：专利奖/科技进步奖/技术发明奖；专家推荐等级可选：一等奖/二等奖/三等奖/不推荐（可留空）");
        noteCell.setCellStyle(noteStyle);
        sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(3, 3, 0, 5));

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        workbook.write(baos);
        workbook.close();

        String filename = URLEncoder.encode("成果导入模板.xlsx", StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + filename)
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(baos.toByteArray());
    }

    /**
     * 批量导入成果
     * @return 导入结果 Map：total（总数）、success（成功数）、fail（失败数）、errors（错误详情列表）
     */
    public Map<String, Object> batchImport(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("请选择要上传的 Excel 文件");
        }

        String filename = file.getOriginalFilename();
        if (filename == null || (!filename.endsWith(".xlsx") && !filename.endsWith(".xls"))) {
            throw new IllegalArgumentException("仅支持 .xlsx 或 .xls 格式的 Excel 文件");
        }

        List<Map<String, String>> errors = new ArrayList<>();
        int success = 0;
        List<Map<String, Object>> created = new ArrayList<>();

        try (InputStream is = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            int lastRow = sheet.getLastRowNum();

            if (lastRow < 1) {
                throw new IllegalArgumentException("Excel 文件中没有数据行");
            }

            List<Achievement> batch = new ArrayList<>();

            for (int i = 1; i <= lastRow; i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                // 跳过空行和说明行
                String name = getCellString(row, 0);
                if (name == null || name.trim().isEmpty()) continue;
                if (name.startsWith("说明：") || name.startsWith("示例：")) continue;

                try {
                    Achievement a = new Achievement();
                    a.setAchievementName(name.trim());

                    // 成果类别（必填）
                    String category = getCellString(row, 1);
                    if (category == null || category.trim().isEmpty()) {
                        errors.add(buildError(i + 1, "成果类别不能为空"));
                        continue;
                    }
                    category = category.trim();
                    if (!VALID_CATEGORIES.contains(category)) {
                        errors.add(buildError(i + 1, "成果类别 '" + category + "' 无效，可选：专利奖/科技进步奖/技术发明奖"));
                        continue;
                    }
                    a.setAchievementCategory(category);

                    // 申报单位
                    String units = getCellString(row, 2);
                    if (units != null && !units.trim().isEmpty()) {
                        a.setCreationUnits(units.trim());
                    }

                    // 专家推荐等级
                    String level = getCellString(row, 3);
                    if (level != null && !level.trim().isEmpty()) {
                        level = level.trim();
                        if (!VALID_LEVELS.contains(level)) {
                            errors.add(buildError(i + 1, "专家推荐等级 '" + level + "' 无效，可选：一等奖/二等奖/三等奖/不推荐"));
                            continue;
                        }
                        a.setExpertLevel(level);
                    }

                    // 附加信息
                    String extra = getCellString(row, 4);
                    if (extra != null && !extra.trim().isEmpty()) {
                        a.setExtraInfo(extra.trim());
                    }

                    // 排序号
                    String orderNum = getCellString(row, 5);
                    if (orderNum != null && !orderNum.trim().isEmpty()) {
                        try {
                            a.setOrderNum(Integer.parseInt(orderNum.trim()));
                        } catch (NumberFormatException e) {
                            a.setOrderNum(success + 1);
                        }
                    } else {
                        a.setOrderNum(success + 1);
                    }

                    a.setStatus(1); // 默认已提交
                    batch.add(a);
                    success++;

                } catch (Exception e) {
                    errors.add(buildError(i + 1, "解析错误: " + e.getMessage()));
                }
            }

            // 批量插入
            if (!batch.isEmpty()) {
                for (Achievement a : batch) {
                    achievementMapper.insert(a);
                    // 返回创建后的成果信息（含自增ID），供前端展示PDF上传
                    Map<String, Object> item = new HashMap<>();
                    item.put("id", a.getId());
                    item.put("achievementName", a.getAchievementName());
                    item.put("achievementCategory", a.getAchievementCategory());
                    item.put("fileSrc", a.getFileSrc());
                    created.add(item);
                }
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("total", success + errors.size());
        result.put("success", success);
        result.put("fail", errors.size());
        result.put("errors", errors);
        result.put("created", created);
        return result;
    }

    private String getCellString(Row row, int col) {
        Cell cell = row.getCell(col);
        if (cell == null) return null;
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                double d = cell.getNumericCellValue();
                if (d == Math.floor(d) && !Double.isInfinite(d)) {
                    return String.valueOf((long) d);
                }
                return String.valueOf(d);
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                try {
                    return cell.getStringCellValue();
                } catch (Exception e) {
                    return String.valueOf(cell.getNumericCellValue());
                }
            default:
                return null;
        }
    }

    private Map<String, String> buildError(int row, String msg) {
        Map<String, String> err = new HashMap<>();
        err.put("row", String.valueOf(row));
        err.put("message", msg);
        return err;
    }
}
