package com.TestSpringBoot.TestSpringBoot.model.entities;

import jakarta.persistence.Embeddable;
import lombok.*;

@Embeddable
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class Location {
    private int x;
    private int y;
}
