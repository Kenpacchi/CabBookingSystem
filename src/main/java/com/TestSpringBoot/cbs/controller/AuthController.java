package com.TestSpringBoot.cbs.controller;

import com.TestSpringBoot.cbs.model.dto.LoginRequest;
import com.TestSpringBoot.cbs.model.dto.SignupRequest;
import com.TestSpringBoot.cbs.model.entities.User;
import com.TestSpringBoot.cbs.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserService userService;

    @PostMapping("/signup")
    public User signup(@RequestBody SignupRequest request) {
        return userService.signup(request);
    }

    @PostMapping("/login")
    public User login(@RequestBody LoginRequest request) {
        return userService.login(request);
    }
}
