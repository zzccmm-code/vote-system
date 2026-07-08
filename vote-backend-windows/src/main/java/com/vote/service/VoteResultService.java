package com.vote.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.vote.common.PageResult;
import com.vote.dto.EachRoundReq;
import com.vote.dto.VoteResultReq;
import com.vote.entity.Achievement;
import com.vote.entity.VoteRecord;
import com.vote.entity.VoteResult;
import com.vote.entity.VoteRound;
import com.vote.mapper.AchievementMapper;
import com.vote.mapper.VoteRecordMapper;
import com.vote.mapper.VoteResultMapper;
import com.vote.mapper.VoteRoundMapper;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VoteResultService {

    private final VoteResultMapper voteResultMapper;
    private final VoteRoundMapper voteRoundMapper;
    private final AchievementMapper achievementMapper;
    private final VoteRecordMapper voteRecordMapper;

    /**
     * 分页查询投票结果
     */
    public PageResult<VoteResultVO> page(VoteResultReq req) {
        LambdaQueryWrapper<VoteResult> wrapper = new LambdaQueryWrapper<>();
        if (req.getRoundId() != null) {
            wrapper.eq(VoteResult::getRoundId, req.getRoundId());
        }
        if (req.getIsPublished() != null) {
            wrapper.eq(VoteResult::getIsPublished, req.getIsPublished());
        }
        wrapper.orderByAsc(VoteResult::getId);

        Page<VoteResult> page = voteResultMapper.selectPage(
                new Page<>(req.getPageNum(), req.getPageSize()), wrapper);

        List<VoteResultVO> voList = page.getRecords().stream()
                .map(this::toVO).collect(Collectors.toList());

        return PageResult.of(page.getTotal(), voList);
    }

    /**
     * 更新投票结果（修改授奖等级等）
     */
    public void update(VoteResult voteResult) {
        voteResultMapper.updateById(voteResult);
    }

    /**
     * 发布当前轮次的投票结果（一键发布）
     * [P1修复] 限制只发布当前进行中/最近结束的轮次，防止误发布历史数据
     */
    public String push() {
        VoteRound currentRound = voteRoundMapper.selectOne(
            new LambdaQueryWrapper<VoteRound>()
                .orderByDesc(VoteRound::getId)
                .last("LIMIT 1"));
        if (currentRound == null) {
            throw new IllegalArgumentException("没有可发布的投票轮次");
        }

        VoteResult update = new VoteResult();
        update.setIsPublished(1);
        LambdaQueryWrapper<VoteResult> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(VoteResult::getRoundId, currentRound.getId())
               .eq(VoteResult::getIsPublished, 0);
        voteResultMapper.update(update, wrapper);
        return "第" + currentRound.getRoundNum() + "轮结果已发布";
    }

    /**
     * 获取所有轮次列表
     */
    public List<VoteRound> getRoundList() {
        return voteRoundMapper.selectList(
                new LambdaQueryWrapper<VoteRound>().orderByAsc(VoteRound::getRoundNum));
    }

    /**
     * 每轮得票情况（按成果汇总，含同意票数、占比）
     */
    public List<RoundSituationVO> eachRoundSituation(EachRoundReq req) {
        LambdaQueryWrapper<VoteResult> wrapper = new LambdaQueryWrapper<>();
        if (req.getRoundId() != null) {
            wrapper.eq(VoteResult::getRoundId, req.getRoundId());
        }
        // [P1修复] 支持按发布状态过滤
        if (req.getIsPublished() != null) {
            wrapper.eq(VoteResult::getIsPublished, req.getIsPublished());
        }
        List<VoteResult> results = voteResultMapper.selectList(wrapper);

        // 加载成果信息
        Map<Long, Achievement> achievementMap = new HashMap<>();
        if (!results.isEmpty()) {
            List<Long> achievementIds = results.stream()
                    .map(VoteResult::getAchievementId).distinct().collect(Collectors.toList());
            achievementMapper.selectBatchIds(achievementIds)
                    .forEach(a -> achievementMap.put(a.getId(), a));
        }

        return results.stream().map(r -> {
            RoundSituationVO vo = new RoundSituationVO();
            vo.setId(r.getId());
            vo.setRoundId(r.getRoundId());
            vo.setAchievementId(r.getAchievementId());
            Achievement a = achievementMap.get(r.getAchievementId());
            if (a != null) {
                vo.setAchievementName(a.getAchievementName());
                vo.setAchievementCategory(a.getAchievementCategory());
                vo.setCreationUnits(a.getCreationUnits());
                vo.setExpertLevel(a.getExpertLevel());
            }
            vo.setAgree(r.getAgree());
            vo.setDisagree(r.getDisagree());
            vo.setAbstain(r.getAbstain());
            vo.setTotalVoters(r.getTotalVoters());
            vo.setVoteLevel(r.getVoteLevel());
            // 同意票占比
            if (r.getTotalVoters() != null && r.getTotalVoters() > 0) {
                double ratio = r.getAgree() * 100.0 / r.getTotalVoters();
                vo.setAgreeRatio(String.format("%.1f%%", ratio));
            } else {
                vo.setAgreeRatio("0%");
            }
            return vo;
        }).collect(Collectors.toList());
    }

    /**
     * 最终结果（已发布的）
     * [P1修复] 不再调用 page() 后丢弃结果，直接用 eachRoundSituation 过滤已发布
     */
    public List<RoundSituationVO> finalResult(VoteResultReq req) {
        EachRoundReq eReq = new EachRoundReq();
        eReq.setRoundId(req.getRoundId());
        eReq.setIsPublished(1);
        return this.eachRoundSituation(eReq);
    }

    /**
     * 导出统计 Excel
     */
    public ResponseEntity<byte[]> exportStatistics(VoteResultReq req) throws IOException {
        EachRoundReq eReq = new EachRoundReq();
        eReq.setRoundId(req.getRoundId());
        List<RoundSituationVO> data = this.eachRoundSituation(eReq);

        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("投票统计");

        // 标题行
        String[] headers = {"序号", "成果名称", "成果类别", "申报单位", "专家推荐等级",
                "同意票", "不同意票", "弃权票", "总投票数", "同意票占比", "最终授奖等级"};
        Row headerRow = sheet.createRow(0);
        CellStyle headerStyle = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        headerStyle.setFont(font);
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }

        // 数据行
        for (int i = 0; i < data.size(); i++) {
            RoundSituationVO vo = data.get(i);
            Row row = sheet.createRow(i + 1);
            row.createCell(0).setCellValue(i + 1);
            row.createCell(1).setCellValue(vo.getAchievementName() != null ? vo.getAchievementName() : "");
            row.createCell(2).setCellValue(vo.getAchievementCategory() != null ? vo.getAchievementCategory() : "");
            row.createCell(3).setCellValue(vo.getCreationUnits() != null ? vo.getCreationUnits() : "");
            row.createCell(4).setCellValue(vo.getExpertLevel() != null ? vo.getExpertLevel() : "");
            row.createCell(5).setCellValue(vo.getAgree() != null ? vo.getAgree() : 0);
            row.createCell(6).setCellValue(vo.getDisagree() != null ? vo.getDisagree() : 0);
            row.createCell(7).setCellValue(vo.getAbstain() != null ? vo.getAbstain() : 0);
            row.createCell(8).setCellValue(vo.getTotalVoters() != null ? vo.getTotalVoters() : 0);
            row.createCell(9).setCellValue(vo.getAgreeRatio() != null ? vo.getAgreeRatio() : "0%");
            row.createCell(10).setCellValue(vo.getVoteLevel() != null ? vo.getVoteLevel() : "");
        }

        // 自动列宽
        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        workbook.write(baos);
        workbook.close();

        String filename = "投票统计结果.xlsx";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + URLEncoder.encode(filename, StandardCharsets.UTF_8)
                                + "\"; filename*=UTF-8''" + URLEncoder.encode(filename, StandardCharsets.UTF_8))
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(baos.toByteArray());
    }

    // VO 转换
    private VoteResultVO toVO(VoteResult r) {
        VoteResultVO vo = new VoteResultVO();
        vo.setId(r.getId());
        vo.setRoundId(r.getRoundId());
        vo.setAchievementId(r.getAchievementId());
        vo.setAgree(r.getAgree());
        vo.setDisagree(r.getDisagree());
        vo.setAbstain(r.getAbstain());
        vo.setTotalVoters(r.getTotalVoters());
        vo.setVoteLevel(r.getVoteLevel());
        vo.setIsPublished(r.getIsPublished());
        return vo;
    }

    // ========== VO 类 ==========

    @Data
    public static class VoteResultVO {
        private Long id;
        private Long roundId;
        private Long achievementId;
        private Integer agree;
        private Integer disagree;
        private Integer abstain;
        private Integer totalVoters;
        private String voteLevel;
        private Integer isPublished;
    }

    @Data
    public static class RoundSituationVO {
        private Long id;
        private Long roundId;
        private Long achievementId;
        private String achievementName;
        private String achievementCategory;
        private String creationUnits;
        private String expertLevel;
        private Integer agree;
        private Integer disagree;
        private Integer abstain;
        private Integer totalVoters;
        private String agreeRatio;
        private String voteLevel;
    }
}
