package com.TestSpringBoot.cbs.service;
import com.TestSpringBoot.cbs.model.dto.Location;
import com.TestSpringBoot.cbs.model.entities.BikeDriver;
import com.TestSpringBoot.cbs.model.entities.CabDriver;
import com.TestSpringBoot.cbs.model.entities.ThreeWheelerDriver;
import com.TestSpringBoot.cbs.model.entities.User;
import com.TestSpringBoot.cbs.model.enums.VehicleTypeEnum;
import com.TestSpringBoot.cbs.repository.BikeDriverRepository;
import com.TestSpringBoot.cbs.repository.CabDriverRepository;
import com.TestSpringBoot.cbs.repository.ThreeWheelerDriverRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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

        switch (vehicleType) {
            case CAB:
                for (CabDriver d : cabRepo.findAll()) {
                    if (d.getIsAvailable() && Boolean.TRUE.equals(d.getAccept())) {
                        d.setIsAvailable(false);
                        cabRepo.save(d);
                        scheduleDriverAvailable(() -> {
                            d.setIsAvailable(true);
                            cabRepo.save(d);
                        });
                        return "Cab booked: " + d.getName() + " | Fare: Rs. " + cost;
                    }
                }
                break;

            case BIKE:
                for (BikeDriver d : bikeRepo.findAll()) {
                    if (d.getIsAvailable() && Boolean.TRUE.equals(d.getAccept())) {
                        d.setIsAvailable(false);
                        bikeRepo.save(d);
                        scheduleDriverAvailable(() -> {
                            d.setIsAvailable(true);
                            bikeRepo.save(d);
                        });
                        return "Bike booked: " + d.getName() + " | Fare: Rs. " + cost;
                    }
                }
                break;

            case AUTO:
                for (ThreeWheelerDriver d : autoRepo.findAll()) {
                    if (d.getIsAvailable() && Boolean.TRUE.equals(d.getAccept())) {
                        d.setIsAvailable(false);
                        autoRepo.save(d);
                        scheduleDriverAvailable(() -> {
                            d.setIsAvailable(true);
                            autoRepo.save(d);
                        });
                        return "Auto booked: " + d.getName() + " | Fare: Rs. " + cost;
                    }
                }
                break;
        }

        return "No available drivers right now";
    }

    private void scheduleDriverAvailable(Runnable task) {
        scheduler.schedule(task, 20, TimeUnit.SECONDS); // ride duration = 20 Seconds
    }
}
