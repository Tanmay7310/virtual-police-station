package com.virtualpolice.vps.service;

import com.virtualpolice.vps.dto.AuthDtos;
import com.virtualpolice.vps.model.FirStatus;
import com.virtualpolice.vps.model.FirReport;
import com.virtualpolice.vps.model.PoliceOfficer;
import com.virtualpolice.vps.model.Role;
import com.virtualpolice.vps.model.UserAccount;
import com.virtualpolice.vps.repository.EvidenceRepository;
import com.virtualpolice.vps.repository.FirReportRepository;
import com.virtualpolice.vps.repository.PoliceOfficerRepository;
import com.virtualpolice.vps.repository.StatusLogRepository;
import com.virtualpolice.vps.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AdminService {
    private final UserRepository userRepository;
    private final PoliceOfficerRepository policeOfficerRepository;
    private final FirReportRepository firReportRepository;
    private final EvidenceRepository evidenceRepository;
    private final StatusLogRepository statusLogRepository;
    private final NotificationService notificationService;

    public AdminService(UserRepository userRepository,
                        PoliceOfficerRepository policeOfficerRepository,
                        FirReportRepository firReportRepository,
                        EvidenceRepository evidenceRepository,
                        StatusLogRepository statusLogRepository,
                        NotificationService notificationService) {
        this.userRepository = userRepository;
        this.policeOfficerRepository = policeOfficerRepository;
        this.firReportRepository = firReportRepository;
        this.evidenceRepository = evidenceRepository;
        this.statusLogRepository = statusLogRepository;
        this.notificationService = notificationService;
    }

    public AuthDtos.DashboardStats stats() {
        long activeCases = firReportRepository.findAll().stream()
                .filter(f -> f.getStatus() != FirStatus.RESOLVED)
                .count();
        return new AuthDtos.DashboardStats(
                userRepository.count(),
                policeOfficerRepository.count(),
                firReportRepository.count(),
                activeCases
        );
    }

    public AuthDtos.AdminAnalytics analytics() {
        List<FirReport> all = firReportRepository.findAll();

        Map<String, Long> byCategory = all.stream()
                .collect(Collectors.groupingBy(FirReport::getCategory, Collectors.counting()));
        Map<String, Long> byStatus = all.stream()
                .collect(Collectors.groupingBy(report -> report.getStatus().name(), Collectors.counting()));

        return new AuthDtos.AdminAnalytics(
                stats(),
                byCategory.entrySet().stream().map(e -> new AuthDtos.KeyValueCount(e.getKey(), e.getValue())).toList(),
                byStatus.entrySet().stream().map(e -> new AuthDtos.KeyValueCount(e.getKey(), e.getValue())).toList()
        );
    }

    /** Returns daily FIR counts for the last 30 days, grouped by category. */
    public List<Map<String, Object>> crimeTrend() {
        List<FirReport> all = firReportRepository.findAll();
        java.time.LocalDate today = java.time.LocalDate.now();
        java.time.LocalDate start = today.minusDays(29);

        // Collect all categories
        java.util.Set<String> categories = all.stream()
                .map(FirReport::getCategory)
                .collect(Collectors.toSet());

        // Build daily counts per category
        List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (int i = 0; i < 30; i++) {
            java.time.LocalDate date = start.plusDays(i);
            Map<String, Object> dayEntry = new java.util.LinkedHashMap<>();
            dayEntry.put("date", date.toString());

            long dayTotal = 0;
            for (String cat : categories) {
                long count = all.stream()
                        .filter(f -> f.getCreatedAt().toLocalDate().equals(date) && f.getCategory().equals(cat))
                        .count();
                dayEntry.put(cat, count);
                dayTotal += count;
            }
            dayEntry.put("total", dayTotal);
            result.add(dayEntry);
        }
        return result;
    }

    public List<AuthDtos.EventLogResponse> recentEvents() {
        return notificationService.recentEvents();
    }

    @Transactional
    public long purgePoliceAndCitizenUsers() {
        List<UserAccount> usersToDelete = userRepository.findByRoleIn(EnumSet.of(Role.CITIZEN, Role.POLICE));
        if (usersToDelete.isEmpty()) {
            return 0;
        }

        List<Long> userIds = usersToDelete.stream().map(UserAccount::getId).toList();

        List<PoliceOfficer> officersToDelete = policeOfficerRepository.findAll().stream()
                .filter(officer -> userIds.contains(officer.getUser().getId()))
                .toList();
        List<Long> officerIds = officersToDelete.stream().map(PoliceOfficer::getId).toList();

        if (!officerIds.isEmpty()) {
            List<FirReport> officerAssignedFirs = firReportRepository.findByAssignedOfficerIdIn(officerIds);
            officerAssignedFirs.forEach(fir -> fir.setAssignedOfficer(null));
            firReportRepository.saveAll(officerAssignedFirs);
        }

        List<FirReport> citizenFirs = firReportRepository.findByCitizenIdIn(userIds);
        List<Long> firIds = citizenFirs.stream().map(FirReport::getId).toList();
        if (!firIds.isEmpty()) {
            evidenceRepository.deleteByFirIdIn(firIds);
            statusLogRepository.deleteByFirIdIn(firIds);
            firReportRepository.deleteAll(citizenFirs);
        }

        if (!officersToDelete.isEmpty()) {
            policeOfficerRepository.deleteAll(officersToDelete);
        }

        userRepository.deleteAll(usersToDelete);
        return usersToDelete.size();
    }
}
