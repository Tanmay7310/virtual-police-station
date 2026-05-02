package com.virtualpolice.vps.service;

import com.virtualpolice.vps.dto.AuthDtos;
import com.virtualpolice.vps.model.*;
import com.virtualpolice.vps.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;

@Service
public class FirService {
    private final FirReportRepository firReportRepository;
    private final UserRepository userRepository;
    private final PoliceOfficerRepository policeOfficerRepository;
    private final EvidenceRepository evidenceRepository;
    private final StatusLogRepository statusLogRepository;
    private final OcrService ocrService;
    private final CategorizationService categorizationService;
    private final GeoRoutingService geoRoutingService;
    private final NotificationService notificationService;

    public FirService(FirReportRepository firReportRepository,
                      UserRepository userRepository,
                      PoliceOfficerRepository policeOfficerRepository,
                      EvidenceRepository evidenceRepository,
                      StatusLogRepository statusLogRepository,
                      OcrService ocrService,
                      CategorizationService categorizationService,
                      GeoRoutingService geoRoutingService,
                      NotificationService notificationService) {
        this.firReportRepository = firReportRepository;
        this.userRepository = userRepository;
        this.policeOfficerRepository = policeOfficerRepository;
        this.evidenceRepository = evidenceRepository;
        this.statusLogRepository = statusLogRepository;
        this.ocrService = ocrService;
        this.categorizationService = categorizationService;
        this.geoRoutingService = geoRoutingService;
        this.notificationService = notificationService;
    }

    public AuthDtos.OcrExtractResponse extractComplaintData(MultipartFile file) {
        String extractedText = ocrService.extractText(file);
        OcrService.ParsedOcrData parsed = ocrService.parseStructuredData(extractedText);
        CategorizationService.CategorizationResult analysis = categorizationService.analyze(extractedText);

        String suggestedDescription = ocrService.summarizeForDescription(extractedText);
        String suggestedTitle = ocrService.buildSuggestedTitle(parsed, analysis.category());

        return new AuthDtos.OcrExtractResponse(
                extractedText,
                parsed.name(),
                parsed.location(),
                parsed.keywords(),
                analysis.category(),
                analysis.priority(),
                suggestedTitle,
                suggestedDescription
        );
    }

    @Transactional
    public AuthDtos.FirResponse createFir(String citizenEmail, AuthDtos.FirCreateRequest request) {
        UserAccount citizen = userRepository.findByEmail(citizenEmail)
                .orElseThrow(() -> new IllegalArgumentException("Citizen not found"));

        if (!citizen.getAadhaarNumber().equals(request.aadhaarNumber())) {
            throw new IllegalStateException("Aadhaar does not match logged-in user");
        }

        String ocrText = request.ocrExtractedText() == null ? "" : request.ocrExtractedText().trim();
        OcrService.ParsedOcrData parsed = ocrService.parseStructuredData(ocrText);
        String combined = request.description() + " " + ocrText;
        CategorizationService.CategorizationResult analysis = categorizationService.analyze(combined);
        String resolvedLocation = (request.location() == null || request.location().isBlank())
                ? parsed.location()
                : request.location();
        String station = geoRoutingService.assignNearestStation(resolvedLocation);

        FirReport fir = new FirReport();
        fir.setCitizen(citizen);
        fir.setTitle(request.title());
        fir.setDescription(request.description());
        fir.setExtractedText(ocrText);
        fir.setCategory(analysis.category());
        fir.setPriority(analysis.priority());
        fir.setLocation(resolvedLocation);
        fir.setAssignedStation(station);
        fir.setExtractedName(parsed.name());
        fir.setExtractedLocation(parsed.location());
        fir.setExtractedCrimeKeywords(parsed.keywords());
        FirReport saved = firReportRepository.save(fir);

        saved.setDigitalSignatureHash(generateSignature(citizen.getAadhaarNumber(), saved.getId(), saved.getCreatedAt()));
        firReportRepository.save(saved);

        logStatus(saved, FirStatus.SUBMITTED, citizenEmail);
        notificationService.logEvent("FIR_SUBMITTED", "FIR #" + saved.getId() + " submitted by " + citizen.getEmail());
        return toResponse(saved);
    }

    public List<AuthDtos.FirResponse> getCitizenFirs(String email) {
        Long citizenId = userRepository.findByEmail(email).orElseThrow().getId();
        return firReportRepository.findByCitizenId(citizenId).stream().map(this::toResponse).toList();
    }

    public List<AuthDtos.FirResponse> getAllFirs() {
        return firReportRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional
    public AuthDtos.FirResponse updateFir(Long id, String officerEmail, AuthDtos.FirUpdateRequest request) {
        FirReport fir = firReportRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("FIR not found"));

        if (request.category() != null) {
            fir.setCategory(request.category());
        }
        if (request.priority() != null) {
            fir.setPriority(request.priority());
        }
        if (request.assignedOfficerId() != null) {
            PoliceOfficer officer = policeOfficerRepository.findById(request.assignedOfficerId())
                    .orElseThrow(() -> new IllegalArgumentException("Officer not found"));
            fir.setAssignedOfficer(officer);
        }
        if (request.status() != null) {
            fir.setStatus(request.status());
            logStatus(fir, request.status(), officerEmail);
            notificationService.logEvent("FIR_STATUS_UPDATED", "FIR #" + fir.getId() + " moved to " + request.status());
        }

        return toResponse(firReportRepository.save(fir));
    }

    @Transactional
    public void uploadEvidence(Long firId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Please select a file to upload");
        }
        if (file.getSize() > 10 * 1024 * 1024L) {
            throw new IllegalArgumentException("File too large. Maximum allowed size is 10 MB");
        }

        FirReport fir = firReportRepository.findById(firId)
                .orElseThrow(() -> new IllegalArgumentException("FIR not found"));

        String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "evidence";
        String fileType = file.getContentType()      != null ? file.getContentType()      : "application/octet-stream";
        long   sizeKb   = file.getSize() / 1024;

        byte[] fileBytes;
        try {
            fileBytes = file.getBytes();
        } catch (java.io.IOException e) {
            throw new IllegalStateException("Failed to read uploaded file", e);
        }

        EvidenceFile evidence = new EvidenceFile();
        evidence.setFir(fir);
        evidence.setFileName(fileName);
        evidence.setFileType(fileType);
        evidence.setStoragePath("db://evidence/" + firId + "/" + fileName);
        evidence.setFileData(fileBytes);
        evidenceRepository.save(evidence);

        notificationService.logEvent("EVIDENCE_UPLOADED",
                "Evidence '" + fileName + "' (" + sizeKb + " KB) uploaded for FIR #" + fir.getId());
    }


    public List<AuthDtos.EvidenceMetaResponse> getEvidenceForFir(Long firId) {
        return evidenceRepository.findByFirId(firId).stream()
                .map(e -> new AuthDtos.EvidenceMetaResponse(
                        e.getId(),
                        e.getFileName(),
                        e.getFileType(),
                        e.getFileData() != null ? e.getFileData().length : 0L,
                        e.getUploadedAt()
                ))
                .toList();
    }

    public EvidenceFile getEvidenceFile(Long evidenceId) {
        return evidenceRepository.findById(evidenceId)
                .orElseThrow(() -> new IllegalArgumentException("Evidence not found"));
    }

    public List<AuthDtos.StatusLogResponse> getTimeline(Long firId) {
        return statusLogRepository.findByFirIdOrderByUpdatedAtAsc(firId)
                .stream()
                .map(log -> new AuthDtos.StatusLogResponse(log.getStatus(), log.getUpdatedBy(), log.getUpdatedAt()))
                .toList();
    }

    private void logStatus(FirReport fir, FirStatus status, String actor) {
        StatusLog log = new StatusLog();
        log.setFir(fir);
        log.setStatus(status);
        log.setUpdatedBy(actor);
        statusLogRepository.save(log);
    }

    private String generateSignature(String aadhaar, Long firId, LocalDateTime timestamp) {
        String input = aadhaar + firId + timestamp;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Unable to generate signature", e);
        }
    }

    private AuthDtos.FirResponse toResponse(FirReport fir) {
        return new AuthDtos.FirResponse(
                fir.getId(),
                fir.getTitle(),
                fir.getDescription(),
                fir.getCategory(),
                fir.getStatus(),
                fir.getPriority(),
                fir.getLocation(),
                fir.getAssignedStation(),
                fir.getExtractedName(),
                fir.getExtractedLocation(),
                fir.getExtractedCrimeKeywords(),
                fir.getExtractedText(),
                fir.getDigitalSignatureHash(),
                fir.getCitizen().getFullName(),
                fir.getCreatedAt(),
                getTimeline(fir.getId())
        );
    }
}
