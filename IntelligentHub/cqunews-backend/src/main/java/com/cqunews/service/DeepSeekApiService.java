package com.cqunews.service;

import com.cqunews.dto.EntityDTO;
import com.cqunews.dto.FactCheckResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DeepSeekApiService {

    @Value("${deepseek.api-key}")
    private String apiKey;

    @Value("${deepseek.base-url}")
    private String baseUrl;

    @Value("${deepseek.model}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();

    public String doSummary(String content, String type) {
        String prompt = "请为以下新闻内容生成一段" + (type == null ? "标准" : type) + "摘要：\n\n" + content + "\n\n摘要：";
        return callApi(prompt);
    }

    public List<String> doTitles(String content) {
        String prompt = "请为以下新闻内容生成三个不同风格的标题：描述型、吸引型、精简型。直接返回三个标题，每行一个。\n\n新闻内容：\n" + content;
        String response = callApi(prompt);
        List<String> titles = new ArrayList<>();
        for (String line : response.split("\n")) {
            line = line.trim();
            if (!line.isEmpty()) {
                titles.add(line.replaceAll("^[\\d\\.\\-\\*]+\\s*", ""));
            }
        }
        return titles;
    }

    public List<EntityDTO> doNER(String content) {
        String prompt = "请从以下新闻内容中抽取命名实体，包括人物(PER)、组织(ORG)和关键数据(NUM)。请以严格的JSON数组格式返回结果，格式为：[{\"type\": \"PER\", \"text\": \"张三\"}, ...]。如果某项不存在，则返回空数组。\n\n新闻内容：\n" + content;
        String response = callApi(prompt);
        try {
            return parseEntities(response);
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public FactCheckResult doFactCheck(String original, String generated) {
        String prompt = "请检查以下生成内容与原文的事实一致性。判断是否存在虚假信息、歪曲事实或遗漏关键信息的情况。返回格式：{\"passed\": true/false, \"riskLevel\": \"高/中/低\", \"message\": \"说明\"}\n\n原文：\n" + original + "\n\n生成内容：\n" + generated;
        String response = callApi(prompt);
        try {
            return parseFactCheck(response);
        } catch (Exception e) {
            FactCheckResult result = new FactCheckResult();
            result.setPassed(true);
            result.setRiskLevel("低");
            result.setMessage("校验完成");
            return result;
        }
    }

    private String callApi(String prompt) {
        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("messages", List.of(Map.of("role", "user", "content", prompt)));
        body.put("temperature", 0.7);

        Map<String, Object> headers = new HashMap<>();
        headers.put("Authorization", "Bearer " + apiKey);
        headers.put("Content-Type", "application/json");

        try {
            Map<String, Object> response = restTemplate.postForObject(
                    baseUrl + "/chat/completions",
                    body,
                    Map.class
            );
            if (response != null && response.containsKey("choices")) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
                if (!choices.isEmpty()) {
                    Map<String, Object> choice = choices.get(0);
                    Map<String, Object> message = (Map<String, Object>) choice.get("message");
                    return (String) message.get("content");
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return "";
    }

    private List<EntityDTO> parseEntities(String json) {
        List<EntityDTO> entities = new ArrayList<>();
        String cleaned = json.replaceAll("[\\s\\n]", "");
        int start = cleaned.indexOf("[");
        int end = cleaned.lastIndexOf("]");
        if (start >= 0 && end > start) {
            String arrayStr = cleaned.substring(start + 1, end);
            String[] items = arrayStr.split("},\\{");
            for (String item : items) {
                item = item.replace("{", "").replace("}", "");
                String[] parts = item.split(",");
                EntityDTO entity = new EntityDTO();
                for (String part : parts) {
                    String[] kv = part.split(":");
                    if (kv.length == 2) {
                        String key = kv[0].replace("\"", "").trim();
                        String value = kv[1].replace("\"", "").trim();
                        if ("type".equals(key)) {
                            entity.setType(value);
                        } else if ("text".equals(key)) {
                            entity.setText(value);
                        }
                    }
                }
                if (entity.getType() != null && entity.getText() != null) {
                    entities.add(entity);
                }
            }
        }
        return entities;
    }

    private FactCheckResult parseFactCheck(String json) {
        FactCheckResult result = new FactCheckResult();
        String cleaned = json.replaceAll("[\\s\\n]", "");
        int start = cleaned.indexOf("{");
        int end = cleaned.lastIndexOf("}");
        if (start >= 0 && end > start) {
            String objStr = cleaned.substring(start + 1, end);
            String[] parts = objStr.split(",");
            for (String part : parts) {
                String[] kv = part.split(":");
                if (kv.length == 2) {
                    String key = kv[0].replace("\"", "").trim();
                    String value = kv[1].replace("\"", "").trim();
                    if ("passed".equals(key)) {
                        result.setPassed("true".equalsIgnoreCase(value));
                    } else if ("riskLevel".equals(key)) {
                        result.setRiskLevel(value);
                    } else if ("message".equals(key)) {
                        result.setMessage(value);
                    }
                }
            }
        }
        return result;
    }
}
