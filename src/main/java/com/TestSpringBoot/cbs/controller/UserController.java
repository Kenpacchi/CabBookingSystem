package com.TestSpringBoot.cbs.controller;

import com.TestSpringBoot.cbs.model.entities.User;
import com.TestSpringBoot.cbs.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    UserService userService;

    @GetMapping("/all")
    List<User> getAllUsers() {
        return userService.getAllUsers();
    }

    @GetMapping("/{mobileNumber}")
    User getUserByMobileNumber(@PathVariable String mobileNumber){
        return userService.getUserByMobileNumber(mobileNumber);
    }
}
