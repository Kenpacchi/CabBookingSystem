package com.TestSpringBoot.cbs.common;

import com.TestSpringBoot.cbs.model.entities.User;
import com.TestSpringBoot.cbs.model.enums.FlagTypeEnum;

public interface Methods {

    static boolean checkIfUserAlreadyBookedRide(User user) {
        return user.getIsRiding().equals(FlagTypeEnum.Y);
    }
}
