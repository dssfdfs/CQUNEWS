package com.cqunews.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.cqunews.dto.Result;
import com.cqunews.entity.HistoryTask;
import com.cqunews.mapper.HistoryTaskMapper;
import com.cqunews.service.UserService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/history")
public class HistoryController {

    private final HistoryTaskMapper historyTaskMapper;
    private final UserService userService;

    public HistoryController(HistoryTaskMapper historyTaskMapper, UserService userService) {
        this.historyTaskMapper = historyTaskMapper;
        this.userService = userService;
    }

    @GetMapping("/list")
    public Result<IPage<HistoryTask>> getHistory(@RequestHeader("Authorization") String token,
                                                  @RequestParam(defaultValue = "1") Integer page,
                                                  @RequestParam(defaultValue = "10") Integer size) {
        Long userId = userService.getUserIdByToken(token.replace("Bearer ", ""));
        Page<HistoryTask> pageParam = new Page<>(page, size);
        IPage<HistoryTask> result = historyTaskMapper.selectPageByUserId(pageParam, userId);
        return Result.success(result);
    }

    @GetMapping("/{id}")
    public Result<HistoryTask> getById(@RequestHeader("Authorization") String token,
                                        @PathVariable Long id) {
        userService.getUserIdByToken(token.replace("Bearer ", ""));
        HistoryTask task = historyTaskMapper.selectById(id);
        return Result.success(task);
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@RequestHeader("Authorization") String token,
                                @PathVariable Long id) {
        userService.getUserIdByToken(token.replace("Bearer ", ""));
        HistoryTask task = new HistoryTask();
        task.setId(id);
        task.setIsDel(1);
        historyTaskMapper.updateById(task);
        return Result.success(null);
    }
}
