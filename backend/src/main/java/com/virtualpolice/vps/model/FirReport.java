package com.virtualpolice.vps.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "fir_reports")
public class FirReport {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "citizen_id")
    private UserAccount citizen;

    @ManyToOne
    @JoinColumn(name = "assigned_officer_id")
    private PoliceOfficer assignedOfficer;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(nullable = false)
    private String category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FirStatus status = FirStatus.SUBMITTED;

    @Column(nullable = false)
    private String priority = "MEDIUM";

    private String location;

    private String assignedStation;

    private String extractedName;

    private String extractedLocation;

    private String extractedCrimeKeywords;

    @Column(columnDefinition = "TEXT")
    private String extractedText;

    private String digitalSignatureHash;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId() {
        return id;
    }

    public UserAccount getCitizen() {
        return citizen;
    }

    public void setCitizen(UserAccount citizen) {
        this.citizen = citizen;
    }

    public PoliceOfficer getAssignedOfficer() {
        return assignedOfficer;
    }

    public void setAssignedOfficer(PoliceOfficer assignedOfficer) {
        this.assignedOfficer = assignedOfficer;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public FirStatus getStatus() {
        return status;
    }

    public void setStatus(FirStatus status) {
        this.status = status;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getExtractedText() {
        return extractedText;
    }

    public void setExtractedText(String extractedText) {
        this.extractedText = extractedText;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getAssignedStation() {
        return assignedStation;
    }

    public void setAssignedStation(String assignedStation) {
        this.assignedStation = assignedStation;
    }

    public String getExtractedName() {
        return extractedName;
    }

    public void setExtractedName(String extractedName) {
        this.extractedName = extractedName;
    }

    public String getExtractedLocation() {
        return extractedLocation;
    }

    public void setExtractedLocation(String extractedLocation) {
        this.extractedLocation = extractedLocation;
    }

    public String getExtractedCrimeKeywords() {
        return extractedCrimeKeywords;
    }

    public void setExtractedCrimeKeywords(String extractedCrimeKeywords) {
        this.extractedCrimeKeywords = extractedCrimeKeywords;
    }

    public String getDigitalSignatureHash() {
        return digitalSignatureHash;
    }

    public void setDigitalSignatureHash(String digitalSignatureHash) {
        this.digitalSignatureHash = digitalSignatureHash;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
