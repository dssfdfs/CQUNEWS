package com.cqunews.dto;

import javax.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ProcessRequestDTO {

    @NotBlank(message = "新闻内容不能为空")
    private String content;

    private String summaryType;
}
