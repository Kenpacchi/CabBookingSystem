package com.TestSpringBoot.TestSpringBoot.service;

import com.TestSpringBoot.TestSpringBoot.model.entities.User;
import com.TestSpringBoot.TestSpringBoot.repository.UsersRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
public class UserServiceImpl {

    @Autowired
    UsersRepository usersRepository;

    public String addUser(User user) {
        String mobileNumber = user.getPhoneNumber();

        boolean isUserExists = usersRepository.getUserByMobileNumber(mobileNumber) != null;

        if (isUserExists) {
            return "Try Login";
        } else {
            usersRepository.save(user);
        }
        return "Success!!";
    }
}
