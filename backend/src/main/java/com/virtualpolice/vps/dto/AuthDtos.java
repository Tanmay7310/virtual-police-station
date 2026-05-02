package com.virtualpolice.vps.dto;

import com.virtualpolice.vps.model.FirStatus;
import com.virtualpolice.vps.model.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

public class AuthDtos {
    public record RegisterRequest(
            @NotBlank String fullName,
            @Email String email,
            @Size(min = 8, message = "Password must be at least 8 characters") String password,
            @Pattern(regexp = "\\d{12}") String aadhaarNumber,
            Role role
    ) {
    }

    public record LoginRequest(@Email String email, @NotBlank String password) {
    }

    public record AuthResponse(String token, Role role, String name) {
    }

    public record OtpGenerateRequest(@Pattern(regexp = "\\d{12}") String aadhaarNumber) {
    }

    public record OtpGenerateResponse(String message, String debugOtp) {
    }

    public record OtpVerifyRequest(@Pattern(regexp = "\\d{12}") String aadhaarNumber, @Pattern(regexp = "\\d{6}") String otp) {
    }

    public record OtpVerifyResponse(boolean verified, String message) {
    }

    public record FirCreateRequest(
            @NotBlank @Size(max = 120) String title,
            @NotBlank @Size(max = 3000) String description,
            @Size(max = 200) String location,
            @Pattern(regexp = "\\d{12}") String aadhaarNumber,
            @Size(max = 10000) String ocrExtractedText,
            @Size(max = 500) String ocrKeywords
    ) {
    }

    public record OcrExtractResponse(
            String extractedText,
            String extractedName,
            String suggestedLocation,
            String keywords,
            String suggestedCategory,
            String suggestedPriority,
            String suggestedTitle,
            String suggestedDescription
    ) {
    }

    public record FirUpdateRequest(FirStatus status, String category, String priority, Long assignedOfficerId) {
    }

    public record EvidenceUploadRequest(
            @NotBlank @Size(max = 200) String fileName,
            @NotBlank String fileType,
            @NotBlank @Size(max = 500) String storagePath,
            @Min(1) @Max(5120) Integer fileSizeKb
    ) {
    }

    public record FirResponse(
            Long id,
            String title,
            String description,
            String category,
            FirStatus status,
            String priority,
            String location,
            String assignedStation,
            String extractedName,
            String extractedLocation,
            String extractedCrimeKeywords,
            String extractedText,
            String digitalSignatureHash,
            String citizenName,
            LocalDateTime createdAt,
            List<StatusLogResponse> logs
    ) {
    }

    public record StatusLogResponse(FirStatus status, String updatedBy, LocalDateTime updatedAt) {
    }

    public record DashboardStats(long users, long officers, long firs, long activeCases) {
    }

        public record AdminAnalytics(
                        DashboardStats stats,
                        List<KeyValueCount> firByCategory,
                        List<KeyValueCount> firByStatus
        ) {
        }

        public record KeyValueCount(String key, long count) {
        }

        public record EventLogResponse(String eventType, String message, LocalDateTime createdAt) {
        }

        public record EvidenceMetaResponse(
                Long id,
                String fileName,
                String fileType,
                long fileSizeBytes,
                LocalDateTime uploadedAt
        ) {
        }
}
