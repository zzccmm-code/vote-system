package com.vote.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
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
     * 完全重置投票：删除全部轮次、投票记录、投票结果，恢复到初始状态
     * 不论是否已发布、是否在运行中，全部清空
     */
    @Transactional
    public String resetVote() {
        // 删除全部投票记录
        voteRecordMapper.delete(new QueryWrapper<>());
        // 删除全部投票结果
        voteResultMapper.delete(new QueryWrapper<>());
        // 删除全部轮次
        voteRoundMapper.delete(new QueryWrapper<>());

        clearTotalVotersCache();
        return "投票已完全重置，所有轮次、记录、结果已清空";
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
     * [P0修复] total 返回应参与投票的委员总数
     * [P1修复] 使用 SQL COUNT(DISTINCT) 避免全表加载内存
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

        // [P1修复] 使用 SQL COUNT(DISTINCT voter_id) 避免全表加载
        QueryWrapper<VoteRecord> wrapper = new QueryWrapper<>();
        wrapper.eq("round_id", actualRoundId)
               .select("COUNT(DISTINCT voter_id) AS cnt");
        // MyBatis-Plus 的 selectCount 不支持聚合函数，改用 selectMaps
        List<Map<String, Object>> maps = voteRecordMapper.selectMaps(wrapper);
        long submitNum = 0;
        if (maps != null && !maps.isEmpty()) {
            Object cnt = maps.get(0).get("cnt");
            if (cnt != null) {
                submitNum = Long.parseLong(cnt.toString());
            }
        }

        long total = getTotalVoters();

        Map<String, Object> result = new HashMap<>();
        result.put("submitNum", submitNum);
        result.put("total", total);
        return result;
    }

    /**
     * 获取应参与投票的委员总数
     * 优先使用手动设置的值，若未设置则取配置 app.total-voters，若再未配则取历史最大投票人数
     * [P2修复] 增加内存缓存，避免每次调用都全表扫描
     */
    private int getTotalVoters() {
        // 优先使用当前轮次手动设置的值
        VoteRound current = getCurrentRound();
        if (current != null && current.getTotalVoters() != null && current.getTotalVoters() > 0) {
            return current.getTotalVoters();
        }
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

    /** 设置当前轮次的应参与委员总数（手动输入） */
    public int setTotalVoters(int totalVoters) {
        VoteRound current = getCurrentRound();
        if (current == null) {
            throw new RuntimeException("没有进行中的投票轮次，无法设置委员总数");
        }
        current.setTotalVoters(totalVoters);
        voteRoundMapper.updateById(current);
        clearTotalVotersCache();
        return totalVoters;
    }

    /** 检查指定姓名是否已在当前轮次中投过票 */
    public boolean hasVoterVoted(String voterName) {
        VoteRound current = getCurrentRound();
        if (current == null) return false;
        QueryWrapper<VoteRecord> wrapper = new QueryWrapper<>();
        wrapper.eq("round_id", current.getId())
               .eq("voter_name", voterName);
        return voteRecordMapper.selectCount(wrapper) > 0;
    }
}
