package com.virtualpolice.vps.repository;

import com.virtualpolice.vps.model.FirReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FirReportRepository extends JpaRepository<FirReport, Long> {
    List<FirReport> findByCitizenId(Long citizenId);
    List<FirReport> findByCitizenIdIn(List<Long> citizenIds);
    List<FirReport> findByAssignedOfficerIdIn(List<Long> officerIds);
}
