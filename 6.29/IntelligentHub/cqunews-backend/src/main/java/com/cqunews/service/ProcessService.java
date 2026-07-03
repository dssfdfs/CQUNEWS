package com.cqunews.service;

import com.cqunews.dto.*;
import com.cqunews.entity.HistoryTask;
import com.cqunews.mapper.HistoryTaskMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ProcessService {

    private final DeepSeekApiService deepSeekApiService;
    private final HistoryTaskMapper historyTaskMapper;
    private final ObjectMapper objectMapper;

    public ProcessService(DeepSeekApiService deepSeekApiService, HistoryTaskMapper historyTaskMapper, ObjectMapper objectMapper) {
        this.deepSeekApiService = deepSeekApiService;
        this.historyTaskMapper = historyTaskMapper;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ProcessResultDTO processSingle(ProcessRequestDTO dto, Long userId) {
        String content = dto.getContent();
        String summaryType = dto.getSummaryType();

        String summary = deepSeekApiService.doSummary(content, summaryType);
        List<String> titles = deepSeekApiService.doTitles(content);
        List<EntityDTO> entities = deepSeekApiService.doNER(content);
        FactCheckResult factCheck = deepSeekApiService.doFactCheck(content, summary);

        HistoryTask task = new HistoryTask();
        task.setUserId(userId);
        task.setOriginalContent(content);
        task.setSummary(summary);
        try {
            task.setTitles(objectMapper.writeValueAsString(titles));
            task.setEntities(objectMapper.writeValueAsString(entities));
            task.setFactCheckResult(objectMapper.writeValueAsString(factCheck));
        } catch (JsonProcessingException e) {
            task.setTitles("[]");
            task.setEntities("[]");
            task.setFactCheckResult("{}");
        }
        task.setStatus(1);
        task.setCreatedAt(LocalDateTime.now());
        task.setUpdatedAt(LocalDateTime.now());

        historyTaskMapper.insert(task);

        ProcessResultDTO result = new ProcessResultDTO();
        result.setSummary(summary);
        result.setTitles(titles);
        result.setEntities(entities);
        result.setFactCheck(factCheck);

        return result;
    }
}
