package com.cqunews.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.cqunews.entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface UserMapper extends BaseMapper<User> {

    @Select("SELECT * FROM user WHERE username = #{username} AND is_del = 0")
    User selectByUsername(String username);
}
