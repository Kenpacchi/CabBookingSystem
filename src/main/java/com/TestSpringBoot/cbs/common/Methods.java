package com.TestSpringBoot.cbs.common;

import com.TestSpringBoot.cbs.model.entities.User;
import com.TestSpringBoot.cbs.model.enums.FlagTypeEnum;

public interface Methods {

    /**
     * Returns true if the user is currently on an active ride.
     * Safely handles null isRiding (treated as not riding).
     */
    static boolean checkIfUserAlreadyBookedRide(User user) {
        return FlagTypeEnum.Y.equals(user.getIsRiding());
    }
}
