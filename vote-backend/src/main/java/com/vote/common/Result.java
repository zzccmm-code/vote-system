package com.vote.common;

import lombok.Data;

/**
 * 统一响应结构
 * 前端判断: code === 200 时读 data，否则读 msg
 */
@Data
public class Result<T> {

    private Integer code;
    private String msg;
    private T data;

    public static <T> Result<T> ok(T data) {
        Result<T> r = new Result<>();
        r.setCode(200);
        r.setMsg("success");
        r.setData(data);
        return r;
    }

    public static <T> Result<T> ok(String msg) {
        Result<T> r = new Result<>();
        r.setCode(200);
        r.setMsg(msg);
        return r;
    }

    /** 明确以 data 形式返回字符串（避免与 ok(String msg) 歧义） */
    public static Result<String> okData(String data) {
        Result<String> r = new Result<>();
        r.setCode(200);
        r.setMsg("success");
        r.setData(data);
        return r;
    }

    public static <T> Result<T> fail(String msg) {
        Result<T> r = new Result<>();
        r.setCode(500);
        r.setMsg(msg);
        return r;
    }
}
