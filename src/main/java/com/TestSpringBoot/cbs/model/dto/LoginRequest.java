package com.TestSpringBoot.cbs.model.dto;


import lombok.Data;

@Data
public class LoginRequest {
    private String phoneNumber;
    private String password;
}