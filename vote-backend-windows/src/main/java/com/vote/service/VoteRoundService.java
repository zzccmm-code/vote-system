package com.vote.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.vote.dto.StartVoteReq;
import com.vote.dto.VoteRoundPushReq;
import com.vote.entity.Achievement;
import com.vote.entity.VoteRecord;
import com.vote.entity.VoteResult;
import com.vote.entity.VoteRound;
import com.vote.mapper.AchievementMapper;
import com.vote.mapper.VoteRecordMapper;
import com.vote.mapper.VoteResultMapper;
import com.vote.mapper.VoteRoundMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class VoteRoundService {

    private final VoteRoundMapper voteRoundMapper;
    private final VoteResultMapper voteResultMapper;
    private final VoteRecordMapper voteRecordMapper;
    private final AchievementMapper achievementMapper;

    @Value("${app.total-voters:0}")
    private int configuredTotalVoters;

    /** [P2修复] 缓存：计算出的委员总数 */
    private volatile int cachedTotalVoters = -1;
    /** [P2修复] 缓存时间戳 */
    private volatile long cachedTotalVotersTime = 0;
    /** [P2修复] 缓存有效期（毫秒），30秒 */
    private static final long CACHE_TTL_MS = 30_000;

    /**
     * 获取当前投票轮次（状态为 running 的）
     */
    public VoteRound getCurrentRound() {
        LambdaQueryWrapper<VoteRound> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(VoteRound::getStatus, "running")
               .last("LIMIT 1");
        return voteRoundMapper.selectOne(wrapper);
    }

    /**
     * 开始投票（创建新轮次）
     * isFirst=true 时，系统将所有已提交成果纳入本轮投票
     */
    @Transactional
    public String startVote(StartVoteReq req) {
        // 检查是否已有进行中的轮次
        VoteRound running = getCurrentRound();
        if (running != null) {
            throw new IllegalArgumentException("当前已有进行中的投票轮次，请先结束再开始新轮次");
        }

        // 计算新轮次编号
        Long count = voteRoundMapper.selectCount(null);
        int nextRoundNum = count.intValue() + 1;

        VoteRound round = new VoteRound();
        round.setRoundNum(nextRoundNum);
        round.setStatus("running");
        round.setIsFirst(Boolean.TRUE.equals(req.getIsFirst()) ? 1 : 0);
        if (req.getMainTitle() != null) round.setMainTitle(req.getMainTitle());
        if (req.getSubTitle() != null) round.setSubTitle(req.getSubTitle());
        if (req.getRuleJson() != null) round.setRuleJson(req.getRuleJson());
        voteRoundMapper.insert(round);

        // 为已提交的成果初始化投票结果记录
        LambdaQueryWrapper<Achievement> aw = new LambdaQueryWrapper<>();
        aw.eq(Achievement::getStatus, 1);
        List<Achievement> achievements = achievementMapper.selectList(aw);
        for (Achievement a : achievements) {
            VoteResult vr = new VoteResult();
            vr.setRoundId(round.getId());
            vr.setAchievementId(a.getId());
            vr.setAgree(0);
            vr.setDisagree(0);
            vr.setAbstain(0);
            vr.setTotalVoters(0);
            vr.setIsPublished(0);
            voteResultMapper.insert(vr);
        }

        // [P2修复] 清除委员总数缓存，下次查询时重新计算
        clearTotalVotersCache();

        return "投票已开始，第 " + nextRoundNum + " 轮";
    }

    /**
     * 结束当前投票轮次
     */
    @Transactional
    public String stopVote() {
        VoteRound running = getCurrentRound();
        if (running == null) {
            throw new IllegalArgumentException("当前没有进行中的投票");
        }
        running.setStatus("finished");
        voteRoundMapper.updateById(running);
        // [P2修复] 清除委员总数缓存
        clearTotalVotersCache();
        return "投票已结束";
    }

    /**
     * 重置投票（清空当前轮次数据）
     * [P2修复] 增加发布状态检查，防止误删已发布结果
     */
    @Transactional
    public String resetVote() {
        VoteRound running = getCurrentRound();
        if (running == null) {
            // 也允许重置最近一轮已结束的
            LambdaQueryWrapper<VoteRound> w = new LambdaQueryWrapper<>();
            w.orderByDesc(VoteRound::getId).last("LIMIT 1");
            running = voteRoundMapper.selectOne(w);
        }
        if (running == null) {
            return "没有可重置的投票轮次";
        }

        Long roundId = running.getId();

        // [P2修复] 检查该轮次是否已有发布的投票结果
        LambdaQueryWrapper<VoteResult> pubCheck = new LambdaQueryWrapper<>();
        pubCheck.eq(VoteResult::getRoundId, roundId)
                .eq(VoteResult::getIsPublished, 1);
        Long pubCount = voteResultMapper.selectCount(pubCheck);
        if (pubCount > 0) {
            throw new IllegalArgumentException("该轮次投票结果已发布，不能重置。如需重置，请先撤回发布");
        }

        // 删除投票记录
        LambdaQueryWrapper<VoteRecord> rw = new LambdaQueryWrapper<>();
        rw.eq(VoteRecord::getRoundId, roundId);
        voteRecordMapper.delete(rw);

        // 删除投票结果
        LambdaQueryWrapper<VoteResult> rv = new LambdaQueryWrapper<>();
        rv.eq(VoteResult::getRoundId, roundId);
        voteResultMapper.delete(rv);

        // 删除轮次
        voteRoundMapper.deleteById(roundId);

        return "投票已重置";
    }

    /**
     * 委员提交投票
     * [P0修复] 增加重复投票校验
     */
    @Transactional
    public String pushVote(VoteRoundPushReq req) {
        if (req.getRoundId() == null || req.getAchievementId() == null) {
            throw new IllegalArgumentException("参数不完整");
        }

        String voterId = req.getVoterId() != null ? req.getVoterId() : "anonymous";

        // [P0修复] 检查同一委员是否已对该成果投过票
        LambdaQueryWrapper<VoteRecord> dupCheck = new LambdaQueryWrapper<>();
        dupCheck.eq(VoteRecord::getRoundId, req.getRoundId())
                .eq(VoteRecord::getAchievementId, req.getAchievementId())
                .eq(VoteRecord::getVoterId, voterId)
                .last("LIMIT 1");
        Long existCount = voteRecordMapper.selectCount(dupCheck);
        if (existCount > 0) {
            throw new IllegalArgumentException("您已对该成果投过票，不能重复投票");
        }

        // 保存投票记录
        VoteRecord record = new VoteRecord();
        record.setRoundId(req.getRoundId());
        record.setAchievementId(req.getAchievementId());
        record.setVoterId(voterId);
        record.setVoterName(req.getVoterName());
        record.setVoteOption(req.getVoteOption());
        record.setVoteLevel(req.getVoteLevel());
        voteRecordMapper.insert(record);

        // 更新汇总投票结果
        LambdaQueryWrapper<VoteResult> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(VoteResult::getRoundId, req.getRoundId())
               .eq(VoteResult::getAchievementId, req.getAchievementId())
               .last("LIMIT 1");
        VoteResult vr = voteResultMapper.selectOne(wrapper);
        if (vr == null) {
            vr = new VoteResult();
            vr.setRoundId(req.getRoundId());
            vr.setAchievementId(req.getAchievementId());
            vr.setAgree(0);
            vr.setDisagree(0);
            vr.setAbstain(0);
            vr.setTotalVoters(0);
            vr.setIsPublished(0);
            voteResultMapper.insert(vr);
        }

        // [P0修复] 使用SQL原子更新，防止并发投票导致计数丢失
        String opt = req.getVoteOption();
        LambdaUpdateWrapper<VoteResult> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.eq(VoteResult::getId, vr.getId());
        if ("agree".equals(opt)) {
            updateWrapper.setSql("agree = agree + 1");
        } else if ("disagree".equals(opt)) {
            updateWrapper.setSql("disagree = disagree + 1");
        } else {
            updateWrapper.setSql("abstain = abstain + 1");
        }
        updateWrapper.setSql("total_voters = total_voters + 1");
        voteResultMapper.update(null, updateWrapper);

        return "投票成功";
    }

    /**
     * 获取当前轮次已提交的委员人数
     * [P0修复] total 返回应参与投票的委员总数，而非等于 submitNum
     */
    public Map<String, Object> getRoundSubmitNum(Long roundId) {
        Long actualRoundId = roundId;
        if (actualRoundId == null) {
            VoteRound current = getCurrentRound();
            if (current == null) {
                Map<String, Object> empty = new HashMap<>();
                empty.put("submitNum", 0);
                empty.put("total", getTotalVoters());
                return empty;
            }
            actualRoundId = current.getId();
        }

        // 统计已提交投票的委员人数（按 voterId 去重）
        LambdaQueryWrapper<VoteRecord> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(VoteRecord::getRoundId, actualRoundId)
               .select(VoteRecord::getVoterId);
        List<VoteRecord> records = voteRecordMapper.selectList(wrapper);
        long submitNum = records.stream()
                .map(VoteRecord::getVoterId)
                .filter(id -> id != null && !id.isEmpty())
                .distinct()
                .count();

        // [P0修复] total = 应参与投票的委员总数
        long total = getTotalVoters();

        Map<String, Object> result = new HashMap<>();
        result.put("submitNum", submitNum);
        result.put("total", total);
        return result;
    }

    /**
     * 获取应参与投票的委员总数
     * 优先使用配置的 app.total-voters，若未配置则取历史最大投票人数
     * [P2修复] 增加内存缓存，避免每次调用都全表扫描
     */
    private int getTotalVoters() {
        if (configuredTotalVoters > 0) {
            return configuredTotalVoters;
        }

        // [P2修复] 缓存未过期时直接返回
        long now = System.currentTimeMillis();
        if (cachedTotalVoters >= 0 && (now - cachedTotalVotersTime) < CACHE_TTL_MS) {
            return cachedTotalVoters;
        }

        // 缓存过期，重新计算
        LambdaQueryWrapper<VoteRecord> w = new LambdaQueryWrapper<>();
        w.select(VoteRecord::getVoterId);
        List<VoteRecord> allRecords = voteRecordMapper.selectList(w);
        long maxVoters = allRecords.stream()
                .map(VoteRecord::getVoterId)
                .filter(id -> id != null && !id.isEmpty())
                .distinct()
                .count();

        cachedTotalVoters = (int) Math.max(maxVoters, 0);
        cachedTotalVotersTime = now;
        return cachedTotalVoters;
    }

    /**
     * [P2修复] 清除委员总数缓存（投票开始/结束时调用，确保数据实时性）
     */
    public void clearTotalVotersCache() {
        cachedTotalVoters = -1;
        cachedTotalVotersTime = 0;
    }
}
