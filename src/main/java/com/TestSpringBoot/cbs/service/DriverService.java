package com.TestSpringBoot.cbs.service;

import com.TestSpringBoot.cbs.model.entities.BikeDriver;
import com.TestSpringBoot.cbs.model.entities.CabDriver;
import com.TestSpringBoot.cbs.model.entities.ThreeWheelerDriver;
import com.TestSpringBoot.cbs.model.entities.User;
import com.TestSpringBoot.cbs.repository.BikeDriverRepository;
import com.TestSpringBoot.cbs.repository.CabDriverRepository;
import com.TestSpringBoot.cbs.repository.ThreeWheelerDriverRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
public class DriverService {
    @Autowired
    private CabDriverRepository cabRepo;
    @Autowired
    private BikeDriverRepository bikeRepo;
    @Autowired
    private ThreeWheelerDriverRepository autoRepo;

    public List<CabDriver> getNearbyCabs(User user) {
        return cabRepo.findAll().stream()
                .filter(CabDriver::getIsAvailable)
                .sorted(Comparator.comparingInt(
                        d -> Math.abs(user.getX() - d.getX()) + Math.abs(user.getY() - d.getY())))
                .limit(20)
                .toList();
    }

    public List<BikeDriver> getNearbyBikes(User user) {
        return bikeRepo.findAll().stream()
                .filter(BikeDriver::getIsAvailable)
                .sorted(Comparator.comparingInt(
                        d -> Math.abs(user.getX() - d.getX()) + Math.abs(user.getY() - d.getY())))
                .limit(10)
                .toList();
    }

    public List<ThreeWheelerDriver> getNearbyAutos(User user) {
        return autoRepo.findAll().stream()
                .filter(ThreeWheelerDriver::getIsAvailable)
                .sorted(Comparator.comparingInt(
                        d -> Math.abs(user.getX() - d.getX()) + Math.abs(user.getY() - d.getY())))
                .limit(10)
                .toList();
    }
}
