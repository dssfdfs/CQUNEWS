package com.cqunews.controller;

import com.cqunews.dto.LoginRequestDTO;
import com.cqunews.dto.LoginResponseDTO;
import com.cqunews.dto.Result;
import com.cqunews.service.UserService;
import javax.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/login")
    public Result<LoginResponseDTO> login(@Valid @RequestBody LoginRequestDTO dto) {
        LoginResponseDTO response = userService.login(dto);
        return Result.success(response);
    }

    @PostMapping("/logout")
    public Result<Void> logout(@RequestHeader("Authorization") String token) {
        userService.logout(token.replace("Bearer ", ""));
        return Result.success(null);
    }
}
