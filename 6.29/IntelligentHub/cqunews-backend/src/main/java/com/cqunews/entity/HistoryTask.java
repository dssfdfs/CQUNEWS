package com.cqunews.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("history_task")
public class HistoryTask {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private String originalContent;

    private String summary;

    private String titles;

    private String entities;

    private String factCheckResult;

    private Integer status;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
