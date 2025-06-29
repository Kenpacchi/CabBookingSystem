package com.TestSpringBoot.cbs.model.entities;

import com.TestSpringBoot.cbs.model.enums.FlagTypeEnum;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "phone_number", nullable = false, unique = true)
    private String phoneNumber;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column
    private Integer x;

    @Column
    private Integer y;

    @Column
    private Integer otp;

    @Enumerated(EnumType.STRING)
    @Column(name = "is_riding")
    private FlagTypeEnum isRiding;
}
