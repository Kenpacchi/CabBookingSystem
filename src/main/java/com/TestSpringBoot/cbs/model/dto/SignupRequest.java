package com.TestSpringBoot.cbs.model.dto;

import lombok.Data;

@Data
public class SignupRequest {
    private String name;
    private String phoneNumber;
    private String email;
    private String password;
    private int x;
    private int y;
}