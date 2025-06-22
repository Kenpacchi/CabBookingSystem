package com.TestSpringBoot.cbs.service;
import com.TestSpringBoot.cbs.model.dto.Location;
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

    public String bookRide(User user, Location drop, VehicleTypeEnum vehicleType) {
        int cost = (Math.abs(user.getX() - drop.getX()) + Math.abs(user.getY() - drop.getY())) * 10;

        return switch (vehicleType) {
            case CAB -> bookNearestCab(user, cost);
            case BIKE -> bookNearestBike(user, cost);
            case AUTO -> bookNearestAuto(user, cost);
            default -> "Invalid vehicle type";
        };
    }

    private String bookNearestCab(User user, int cost) {
        return cabRepo.findAll().stream()
                .filter(d -> d.getIsAvailable() == FlagTypeEnum.Y && Boolean.TRUE.equals(d.getAccept())).min(Comparator.comparingInt(d -> manhattan(user.getX(), user.getY(), d.getX(), d.getY())))
                .map(d -> {
                    d.setIsAvailable(FlagTypeEnum.N);
                    cabRepo.save(d);
                    scheduleDriverAvailable(() -> {
                        d.setIsAvailable(FlagTypeEnum.Y);
                        cabRepo.save(d);
                    });
                    return "Cab booked: " + d.getName() + " | Fare: Rs. " + cost;
                })
                .orElse("No available cab drivers right now");
    }

    private String bookNearestBike(User user, int cost) {
        return bikeRepo.findAll().stream()
                .filter(d -> d.getIsAvailable() == FlagTypeEnum.Y && Boolean.TRUE.equals(d.getAccept())).min(Comparator.comparingInt(d -> manhattan(user.getX(), user.getY(), d.getX(), d.getY())))
                .map(d -> {
                    d.setIsAvailable(FlagTypeEnum.N);
                    bikeRepo.save(d);
                    scheduleDriverAvailable(() -> {
                        d.setIsAvailable(FlagTypeEnum.Y);
                        bikeRepo.save(d);
                    });
                    return "Driver Name: " + d.getName() + " | Vehicle Number: " + d.getVehicle().getVehicleNumber() + " | Fare: Rs. " + cost;
                })
                .orElse("No available bike drivers right now");
    }

    private String bookNearestAuto(User user, int cost) {
        return autoRepo.findAll().stream()
                .filter(d -> d.getIsAvailable() == FlagTypeEnum.Y && Boolean.TRUE.equals(d.getAccept())).min(Comparator.comparingInt(d -> manhattan(user.getX(), user.getY(), d.getX(), d.getY())))
                .map(d -> {
                    d.setIsAvailable(FlagTypeEnum.N);
                    autoRepo.save(d);
                    scheduleDriverAvailable(() -> {
                        d.setIsAvailable(FlagTypeEnum.Y);
                        autoRepo.save(d);
                    });
                    return "Auto booked: " + d.getName() + " | Fare: Rs. " + cost;
                })
                .orElse("No available auto drivers right now");
    }

    private int manhattan(int ux, int uy, int dx, int dy) {
        return Math.abs(ux - dx) + Math.abs(uy - dy);
    }

    private void scheduleDriverAvailable(Runnable task) {
        scheduler.schedule(task, 20, TimeUnit.SECONDS); // or desired delay
    }
}
