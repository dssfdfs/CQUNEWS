package com.cqunews.dto;

import lombok.Data;

@Data
public class FactCheckResult {

    private Boolean passed;

    private String riskLevel;

    private String message;
}
