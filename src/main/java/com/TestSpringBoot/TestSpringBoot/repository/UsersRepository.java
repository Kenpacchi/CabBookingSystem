package com.TestSpringBoot.TestSpringBoot.repository;

import com.TestSpringBoot.TestSpringBoot.model.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UsersRepository extends JpaRepository<User, Long> {

    @Query(value = "SELECT * FROM users WHERE phone_number = :mobileNumber", nativeQuery = true)
    User getUserByMobileNumber(@Param("mobileNumber") String number);
}
