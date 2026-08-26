package com.TestSpringBoot.cbs.service;

import com.TestSpringBoot.cbs.model.entities.BikeDriver;
import com.TestSpringBoot.cbs.model.entities.CabDriver;
import com.TestSpringBoot.cbs.model.entities.ThreeWheelerDriver;
import com.TestSpringBoot.cbs.model.entities.User;
import com.TestSpringBoot.cbs.model.enums.FlagTypeEnum;
import com.TestSpringBoot.cbs.repository.BikeDriverRepository;
import com.TestSpringBoot.cbs.repository.CabDriverRepository;
import com.TestSpringBoot.cbs.repository.ThreeWheelerDriverRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
public class DriverService {

    @Autowired private CabDriverRepository cabRepo;
    @Autowired private BikeDriverRepository bikeRepo;
    @Autowired private ThreeWheelerDriverRepository autoRepo;
    @Autowired private DistanceService distanceService;

    /**
     * Returns up to 20 available cabs sorted by Haversine distance from the user.
     */
    public List<CabDriver> getNearbyCabs(User user) {
        return cabRepo.findAll().stream()
                .filter(d -> d.getIsAvailable() == FlagTypeEnum.Y
                        && d.getLatitude() != null && d.getLongitude() != null)
                .sorted(Comparator.comparingDouble(d ->
                        distanceService.haversineDistance(
                                user.getLatitude(), user.getLongitude(),
                                d.getLatitude(), d.getLongitude())))
                .limit(20)
                .toList();
    }

    /**
     * Returns up to 20 available bikes sorted by Haversine distance from the user.
     */
    public List<BikeDriver> getNearbyBikes(User user) {
        return bikeRepo.findAll().stream()
                .filter(d -> d.getIsAvailable() == FlagTypeEnum.Y
                        && d.getLatitude() != null && d.getLongitude() != null)
                .sorted(Comparator.comparingDouble(d ->
                        distanceService.haversineDistance(
                                user.getLatitude(), user.getLongitude(),
                                d.getLatitude(), d.getLongitude())))
                .limit(20)
                .toList();
    }

    /**
     * Returns up to 20 available autos sorted by Haversine distance from the user.
     */
    public List<ThreeWheelerDriver> getNearbyAutos(User user) {
        return autoRepo.findAll().stream()
                .filter(d -> d.getIsAvailable() == FlagTypeEnum.Y
                        && d.getLatitude() != null && d.getLongitude() != null)
                .sorted(Comparator.comparingDouble(d ->
                        distanceService.haversineDistance(
                                user.getLatitude(), user.getLongitude(),
                                d.getLatitude(), d.getLongitude())))
                .limit(20)
                .toList();
    }
}
