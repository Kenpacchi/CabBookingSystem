package com.TestSpringBoot.cbs.repository;

import com.TestSpringBoot.cbs.model.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByPhoneNumber(String phoneNumber);

    //JPQL
//    @Query("SELECT u FROM User u WHERE u.phoneNumber = :mobileNumber")
//    User findUserByPhoneNumber(@Param("mobileNumber") String mobileNumber);

    //NATIVE QUERY (NORMAL SQL QUERY)
    @Query(value = "SELECT * FROM users WHERE phone_number = :mobileNumber", nativeQuery = true)
    User findUserByPhoneNumber(@Param("mobileNumber") String mobileNumber);

}