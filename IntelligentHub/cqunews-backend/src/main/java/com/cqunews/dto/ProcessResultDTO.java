package com.cqunews.dto;

import lombok.Data;

import java.util.List;

@Data
public class ProcessResultDTO {

    private String summary;

    private List<String> titles;

    private List<EntityDTO> entities;

    private FactCheckResult factCheck;
}
