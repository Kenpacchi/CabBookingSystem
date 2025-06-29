package com.TestSpringBoot.cbs.model.dto;

import com.TestSpringBoot.cbs.model.enums.VehicleTypeEnum;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;
import org.springframework.stereotype.Service;

@Data
@Getter
@Setter
public class OtpVerificationRequest {
    private Long driverId;
    private Integer otp;
    private VehicleTypeEnum vehicleType;
}
