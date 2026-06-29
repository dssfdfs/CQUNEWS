package com.cqunews.service;

import com.cqunews.dto.LoginRequestDTO;
import com.cqunews.dto.LoginResponseDTO;
import com.cqunews.entity.User;
import com.cqunews.mapper.UserMapper;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class UserService {

    private final UserMapper userMapper;
    private final Map<String, Long> tokenStore = new ConcurrentHashMap<>();

    public UserService(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    public LoginResponseDTO login(LoginRequestDTO dto) {
        User user = userMapper.selectByUsername(dto.getUsername());
        if (user == null) {
            throw new RuntimeException("账号不存在");
        }
        if (!user.getPassword().equals(dto.getPassword())) {
            throw new RuntimeException("密码错误");
        }
        if (user.getStatus() != 1) {
            throw new RuntimeException("账号已禁用");
        }

        String token = UUID.randomUUID().toString().replace("-", "");
        tokenStore.put(token, user.getId());

        LoginResponseDTO response = new LoginResponseDTO();
        response.setToken(token);
        response.setUserId(user.getId());
        response.setUsername(user.getUsername());
        response.setMobile(user.getMobile());

        return response;
    }

    public Long getUserIdByToken(String token) {
        Long userId = tokenStore.get(token);
        if (userId == null) {
            throw new RuntimeException("登录已过期，请重新登录");
        }
        return userId;
    }

    public void logout(String token) {
        tokenStore.remove(token);
    }
}
