package com.TestSpringBoot.TestSpringBoot.api;

import com.TestSpringBoot.TestSpringBoot.model.entities.User;
import com.TestSpringBoot.TestSpringBoot.service.UserServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
public class UsersApiImpl {

    @Autowired
    UserServiceImpl userService;

    @PostMapping("/addUser")
    String signUp(@RequestBody User user) {
        return userService.addUser(user);
    }
}
