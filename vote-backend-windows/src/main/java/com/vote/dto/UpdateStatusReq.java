package com.vote.dto;

import lombok.Data;
import java.util.List;

/**
 * 成果状态批量更新请求
 */
@Data
public class UpdateStatusReq {
    private List<Long> ids;
    private Integer status;
}
