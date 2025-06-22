package com.TestSpringBoot.cbs.service;
import com.TestSpringBoot.cbs.model.dto.Location;
import com.TestSpringBoot.cbs.model.dto.RideBookingResponse;
import com.TestSpringBoot.cbs.model.entities.User;
import com.TestSpringBoot.cbs.model.enums.FlagTypeEnum;
import com.TestSpringBoot.cbs.model.enums.VehicleTypeEnum;
import com.TestSpringBoot.cbs.repository.BikeDriverRepository;
import com.TestSpringBoot.cbs.repository.CabDriverRepository;
import com.TestSpringBoot.cbs.repository.ThreeWheelerDriverRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Service
public class BookingService {

    @Autowired
    private CabDriverRepository cabRepo;
    @Autowired
    private BikeDriverRepository bikeRepo;
    @Autowired
    private ThreeWheelerDriverRepository autoRepo;

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    public RideBookingResponse bookRide(User user, Location drop, VehicleTypeEnum vehicleType) {
        long cost = (Math.abs(user.getX() - drop.getX()) + Math.abs(user.getY() - drop.getY())) * 10L;
        RideBookingResponse bookingResponse;

        return switch (vehicleType) {
            case CAB -> bookNearestCab(user, cost);
            case BIKE -> bookNearestBike(user, cost);
            case AUTO -> bookNearestAuto(user, cost);
            default -> {
                bookingResponse = new RideBookingResponse();
                bookingResponse.setMessage("Invalid vehicle type");
                yield bookingResponse;
            }
        };
    }

    private RideBookingResponse bookNearestCab(User user, long cost) {
        long cabCost = 3 * cost;
        return cabRepo.findAll().stream()
                .filter(d -> d.getIsAvailable() == FlagTypeEnum.Y && Boolean.TRUE.equals(d.getAccept())).min(Comparator.comparingInt(d -> manhattan(user.getX(), user.getY(), d.getX(), d.getY())))
                .map(d -> {
                    d.setIsAvailable(FlagTypeEnum.N);
                    cabRepo.save(d);
                    scheduleDriverAvailable(() -> {
                        d.setIsAvailable(FlagTypeEnum.Y);
                        cabRepo.save(d);
                    });
                    RideBookingResponse bookingResponse = new RideBookingResponse();
                    bookingResponse.setCost(cabCost);
                    bookingResponse.setDriverName(d.getName());
                    bookingResponse.setDriverMobileNumber(d.getMobileNumber());
                    bookingResponse.setVehicleNumber(d.getVehicle().getVehicleNumber());
                    bookingResponse.setMessage("SUCCESS!!");
                    return bookingResponse;
                })
                .orElse(null);
    }

    private RideBookingResponse bookNearestBike(User user, long cost) {
        return bikeRepo.findAll().stream()
                .filter(d -> d.getIsAvailable() == FlagTypeEnum.Y && Boolean.TRUE.equals(d.getAccept())).min(Comparator.comparingInt(d -> manhattan(user.getX(), user.getY(), d.getX(), d.getY())))
                .map(d -> {
                    d.setIsAvailable(FlagTypeEnum.N);
                    bikeRepo.save(d);
                    scheduleDriverAvailable(() -> {
                        d.setIsAvailable(FlagTypeEnum.Y);
                        bikeRepo.save(d);
                    });
                    RideBookingResponse bookingResponse = new RideBookingResponse();
                    bookingResponse.setCost(cost);
                    bookingResponse.setDriverName(d.getName());
                    bookingResponse.setDriverMobileNumber(d.getMobileNumber());
                    bookingResponse.setVehicleNumber(d.getVehicle().getVehicleNumber());
                    bookingResponse.setMessage("SUCCESS!!");
                    return bookingResponse;
                })
                .orElse(null);
    }

    private RideBookingResponse bookNearestAuto(User user, long cost) {
        long autoCost = cost * 2;
        return autoRepo.findAll().stream()
                .filter(d -> d.getIsAvailable() == FlagTypeEnum.Y && Boolean.TRUE.equals(d.getAccept())).min(Comparator.comparingInt(d -> manhattan(user.getX(), user.getY(), d.getX(), d.getY())))
                .map(d -> {
                    d.setIsAvailable(FlagTypeEnum.N);
                    autoRepo.save(d);
                    scheduleDriverAvailable(() -> {
                        d.setIsAvailable(FlagTypeEnum.Y);
                        autoRepo.save(d);
                    });
                    RideBookingResponse bookingResponse = new RideBookingResponse();
                    bookingResponse.setCost(autoCost);
                    bookingResponse.setDriverName(d.getName());
                    bookingResponse.setDriverMobileNumber(d.getMobileNumber());
                    bookingResponse.setVehicleNumber(d.getVehicle().getVehicleNumber());
                    bookingResponse.setMessage("SUCCESS!!");
                    return bookingResponse;
                })
                .orElse(null);
    }

    private int manhattan(int ux, int uy, int dx, int dy) {
        return Math.abs(ux - dx) + Math.abs(uy - dy);
    }

    private void scheduleDriverAvailable(Runnable task) {
        scheduler.schedule(task, 10, TimeUnit.SECONDS); // or desired delay
    }
}
