package com.vote.common;

import lombok.Data;
import java.util.List;

/**
 * 分页结果
 */
@Data
public class PageResult<T> {
    private Long total;
    private List<T> records;

    public static <T> PageResult<T> of(Long total, List<T> records) {
        PageResult<T> p = new PageResult<>();
        p.setTotal(total);
        p.setRecords(records);
        return p;
    }
}
