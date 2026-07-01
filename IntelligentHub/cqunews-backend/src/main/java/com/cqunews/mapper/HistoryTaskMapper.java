package com.cqunews.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.cqunews.entity.HistoryTask;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.Date;

@Mapper
public interface HistoryTaskMapper extends BaseMapper<HistoryTask> {

    @Select("SELECT * FROM history_task WHERE user_id = #{userId} AND is_del = 0 ORDER BY created_at DESC")
    IPage<HistoryTask> selectPageByUserId(Page<HistoryTask> page, @Param("userId") Long userId);
}
