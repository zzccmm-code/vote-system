package com.vote.dto;

import lombok.Data;
import java.util.List;

/**
 * 删除请求（使用 objectIds 字段，与前端一致）
 */
@Data
public class DeleteReq {
    private List<Long> objectIds;
}
