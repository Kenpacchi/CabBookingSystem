package com.TestSpringBoot.TestSpringBoot.api;


import com.TestSpringBoot.TestSpringBoot.model.entities.User;
import com.TestSpringBoot.TestSpringBoot.repository.UsersRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users")
public class UsersApiImpl {

    @Autowired
    UsersRepository usersRepository;

    @PostMapping("/add")
    public String addUser(@RequestBody User user) {
        usersRepository.save(user);
        return "User saved successfully!";
    }

    @GetMapping("/getAllUsers")
    public List<User> getAllUsers() {
        return usersRepository.findAll();
    }
}
