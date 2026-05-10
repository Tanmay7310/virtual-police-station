package com.virtualpolice.vps.controller;

import com.virtualpolice.vps.dto.AuthDtos;
import com.virtualpolice.vps.repository.PoliceOfficerRepository;
import com.virtualpolice.vps.repository.UserRepository;
import com.virtualpolice.vps.service.AdminService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AdminService adminService;
    private final UserRepository userRepository;
    private final PoliceOfficerRepository officerRepository;

    public AdminController(AdminService adminService,
                           UserRepository userRepository,
                           PoliceOfficerRepository officerRepository) {
        this.adminService = adminService;
        this.userRepository = userRepository;
        this.officerRepository = officerRepository;
    }

    @GetMapping("/stats")
    public AuthDtos.DashboardStats stats() {
        return adminService.stats();
    }

    @GetMapping("/analytics")
    public AuthDtos.AdminAnalytics analytics() {
        return adminService.analytics();
    }

    @GetMapping("/users")
    public Object users() {
        return userRepository.findAll();
    }

    @GetMapping("/officers")
    public Object officers() {
        return officerRepository.findAll();
    }

    @GetMapping("/activity")
    public Object activityHealth() {
        return Map.of("status", "ok", "message", "System activity stream available");
    }

    @GetMapping("/crime-trend")
    public Object crimeTrend() {
        return adminService.crimeTrend();
    }

    @GetMapping("/events")
    public Object events() {
        return adminService.recentEvents();
    }

    @PostMapping("/purge-non-admin-users")
    public Object purgeNonAdminUsers() {
        long deletedUsers = adminService.purgePoliceAndCitizenUsers();
        return Map.of("deletedUsers", deletedUsers, "message", "Police and citizen users deleted");
    }
}
