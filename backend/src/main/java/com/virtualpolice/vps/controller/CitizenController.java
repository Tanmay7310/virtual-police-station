package com.virtualpolice.vps.controller;

import com.virtualpolice.vps.dto.AuthDtos;
import com.virtualpolice.vps.service.FirService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/citizen")
public class CitizenController {
    private final FirService firService;

    public CitizenController(FirService firService) {
        this.firService = firService;
    }

    @PostMapping("/fir")
    public AuthDtos.FirResponse createFir(Authentication auth, @Valid @RequestBody AuthDtos.FirCreateRequest request) {
        return firService.createFir(auth.getName(), request);
    }

    @PostMapping(value = "/ocr/extract", consumes = "multipart/form-data")
    public AuthDtos.OcrExtractResponse extractOcr(@RequestPart("file") MultipartFile file) {
        return firService.extractComplaintData(file);
    }

    @GetMapping("/fir")
    public List<AuthDtos.FirResponse> myFirs(Authentication auth) {
        return firService.getCitizenFirs(auth.getName());
    }

    @PostMapping(value = "/fir/{id}/evidence", consumes = "multipart/form-data")
    public void uploadEvidence(@PathVariable Long id,
                               @RequestPart("file") MultipartFile file) {
        firService.uploadEvidence(id, file);
    }

    @GetMapping("/fir/{id}/timeline")
    public List<AuthDtos.StatusLogResponse> timeline(@PathVariable Long id) {
        return firService.getTimeline(id);
    }
}
