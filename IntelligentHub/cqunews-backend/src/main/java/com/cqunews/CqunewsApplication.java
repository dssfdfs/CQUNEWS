package com.cqunews;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.cqunews.mapper")
public class CqunewsApplication {

    public static void main(String[] args) {
        SpringApplication.run(CqunewsApplication.class, args);
    }
}
