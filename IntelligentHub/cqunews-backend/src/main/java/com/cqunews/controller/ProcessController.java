package com.cqunews.controller;

import com.cqunews.dto.ProcessRequestDTO;
import com.cqunews.dto.ProcessResultDTO;
import com.cqunews.dto.Result;
import com.cqunews.service.ProcessService;
import com.cqunews.service.UserService;
import javax.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/process")
public class ProcessController {

    private final ProcessService processService;
    private final UserService userService;

    public ProcessController(ProcessService processService, UserService userService) {
        this.processService = processService;
        this.userService = userService;
    }

    @PostMapping("/single")
    public Result<ProcessResultDTO> processSingle(@Valid @RequestBody ProcessRequestDTO dto,
                                                  @RequestHeader("Authorization") String token) {
        Long userId = userService.getUserIdByToken(token.replace("Bearer ", ""));
        ProcessResultDTO result = processService.processSingle(dto, userId);
        return Result.success(result);
    }
}
