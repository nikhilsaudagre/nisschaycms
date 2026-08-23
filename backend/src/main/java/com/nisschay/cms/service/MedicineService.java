package com.nisschay.cms.service;

import com.nisschay.cms.dto.req.MedicineRequest;
import com.nisschay.cms.dto.res.MedicineResponse;
import com.nisschay.cms.entity.Clinic;
import com.nisschay.cms.entity.Medicine;
import com.nisschay.cms.repository.ClinicRepository;
import com.nisschay.cms.repository.MedicineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MedicineService {

    private final MedicineRepository medicineRepository;
    private final ClinicRepository clinicRepository;

    @Transactional
    public List<MedicineResponse> getAllMedicines(UUID clinicId) {
        List<Medicine> medicines = medicineRepository.findAllActiveMedicines(clinicId);
        if (medicines.isEmpty()) {
            // Seed essential clinic medicines automatically for first-time setup
            medicines = seedDefaultMedicines(clinicId);
        }
        return medicines.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional
    public List<MedicineResponse> reseedDefaultMedicines(UUID clinicId) {
        List<Medicine> seeded = seedDefaultMedicines(clinicId);
        return seeded.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional
    public void resetClinicMedicines(UUID clinicId) {
        medicineRepository.deleteAllMedicinesForClinic(clinicId);
    }

    @Transactional
    public List<MedicineResponse> searchOrSuggestMedicines(UUID clinicId, String query) {
        if (query == null || query.trim().isEmpty()) {
            return getAllMedicines(clinicId);
        }
        List<Medicine> medicines = medicineRepository.searchMedicines(clinicId, query.trim());
        if (medicines.isEmpty()) {
            // Fallback search across all active medicines
            medicines = medicineRepository.findAllActiveMedicines(clinicId);
        }
        return medicines.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional
    public MedicineResponse createMedicine(UUID clinicId, MedicineRequest request) {
        Clinic clinic = clinicRepository.findById(clinicId)
                .orElseThrow(() -> new RuntimeException("Clinic not found"));

        Medicine medicine = Medicine.builder()
                .clinic(clinic)
                .name(request.getName())
                .manufacturerName(request.getManufacturerName())
                .saltComposition(request.getSaltComposition())
                .medicineDesc(request.getMedicineDesc())
                .sideEffects(request.getSideEffects())
                .active(true)
                .build();

        Medicine saved = medicineRepository.save(medicine);
        return mapToResponse(saved);
    }

    @Transactional
    public List<MedicineResponse> createMedicinesBulk(UUID clinicId, List<MedicineRequest> requests) {
        Clinic clinic = clinicRepository.findById(clinicId)
                .orElseThrow(() -> new RuntimeException("Clinic not found"));

        List<Medicine> medicinesToSave = requests.stream().map(request -> 
            Medicine.builder()
                .clinic(clinic)
                .name(request.getName())
                .manufacturerName(request.getManufacturerName())
                .saltComposition(request.getSaltComposition())
                .medicineDesc(request.getMedicineDesc())
                .sideEffects(request.getSideEffects())
                .active(true)
                .build()
        ).collect(Collectors.toList());

        List<Medicine> saved = medicineRepository.saveAll(medicinesToSave);
        return saved.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional
    public List<MedicineResponse> importMedicinesFile(UUID clinicId, org.springframework.web.multipart.MultipartFile file) {
        Clinic clinic = clinicRepository.findById(clinicId)
                .orElseThrow(() -> new RuntimeException("Clinic not found"));
        
        // Wipe all existing medicines first as user requested!
        medicineRepository.deleteAllMedicinesForClinic(clinicId);
        
        try {
            parseAndSaveCSVStream(clinic, file.getInputStream());
        } catch (Exception e) {
            throw new RuntimeException("Failed to import file: " + e.getMessage(), e);
        }
        
        // Return first page of imported results (up to 50)
        return medicineRepository.findAllActiveMedicines(clinicId).stream()
                .limit(50)
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private boolean isNumeric(String str) {
        if (str == null || str.trim().isEmpty()) {
            return false;
        }
        return str.trim().matches("-?\\d+(\\.\\d+)?");
    }

    private String getSafeRowValue(String[] row, int idx, String fallback) {
        if (idx >= 0 && idx < row.length && row[idx] != null) {
            return row[idx].trim().replace("\"", "");
        }
        return fallback;
    }

    @Transactional
    public MedicineResponse updateMedicine(UUID clinicId, UUID id, MedicineRequest request) {
        Medicine medicine = medicineRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Medicine not found"));

        medicine.setName(request.getName());
        medicine.setManufacturerName(request.getManufacturerName());
        medicine.setSaltComposition(request.getSaltComposition());
        medicine.setMedicineDesc(request.getMedicineDesc());
        medicine.setSideEffects(request.getSideEffects());

        Medicine updated = medicineRepository.save(medicine);
        return mapToResponse(updated);
    }

    @Transactional
    public void deleteMedicine(UUID clinicId, UUID id) {
        Medicine medicine = medicineRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Medicine not found"));
        medicine.setActive(false);
        medicineRepository.save(medicine);
    }

    private void parseAndSaveCSVStream(Clinic clinic, java.io.InputStream inputStream) {
        try (java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(inputStream, "UTF-8"))) {
            String firstLine = reader.readLine();
            if (firstLine == null) return;
            
            String delimiter = ",";
            if (firstLine.contains(";")) delimiter = ";";
            else if (firstLine.contains("\t")) delimiter = "\t";
            
            String[] headers = firstLine.split(delimiter);
            for (int i = 0; i < headers.length; i++) {
                headers[i] = headers[i].trim().toLowerCase().replace("\"", "");
            }
            
            int nameIdx = -1, saltIdx = -1, descIdx = -1, sideIdx = -1, manufIdx = -1;
            
            for (int i = 0; i < headers.length; i++) {
                String h = headers[i];
                if (h.equals("medicine name") || h.equals("name")) nameIdx = i;
                else if (h.equals("composition")) saltIdx = i;
                else if (h.equals("uses")) descIdx = i;
                else if (h.equals("side_effects") || h.equals("side effects") || h.contains("side")) sideIdx = i;
                else if (h.equals("manufacturer") || h.contains("manufactur")) manufIdx = i;
            }
            
            List<Medicine> batch = new java.util.ArrayList<>();
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.trim().isEmpty()) continue;
                
                String[] row = parseCSVLine(line, delimiter);
                if (row.length == 0) continue;
                
                String name = getSafeRowValue(row, nameIdx, "Unnamed Medicine");
                if (name.isEmpty() || isNumeric(name)) continue;
                
                Medicine m = Medicine.builder()
                        .clinic(clinic)
                        .name(name)
                        .manufacturerName(getSafeRowValue(row, manufIdx, ""))
                        .saltComposition(getSafeRowValue(row, saltIdx, ""))
                        .medicineDesc(getSafeRowValue(row, descIdx, ""))
                        .sideEffects(getSafeRowValue(row, sideIdx, ""))
                        .active(true)
                        .build();
                
                batch.add(m);
                if (batch.size() >= 2000) {
                    medicineRepository.saveAll(batch);
                    batch.clear();
                }
            }
            if (!batch.isEmpty()) {
                medicineRepository.saveAll(batch);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to stream parse medicine database: " + e.getMessage(), e);
        }
    }

    private String[] parseCSVLine(String line, String delimiter) {
        List<String> values = new java.util.ArrayList<>();
        StringBuilder sb = new StringBuilder();
        boolean inQuotes = false;
        char delim = delimiter.charAt(0);
        
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == delim && !inQuotes) {
                values.add(sb.toString().trim());
                sb.setLength(0);
            } else {
                sb.append(c);
            }
        }
        values.add(sb.toString().trim());
        return values.toArray(new String[0]);
    }

    private List<Medicine> seedDefaultMedicines(UUID clinicId) {
        Clinic clinic = clinicRepository.findById(clinicId).orElse(null);
        
        java.io.File csvFile = new java.io.File("C:\\Users\\LENOVO\\Downloads\\Medicine_Details.csv\\Medicine_Details.csv");
        if (csvFile.exists()) {
            try {
                parseAndSaveCSVStream(clinic, new java.io.FileInputStream(csvFile));
            } catch (Exception e) {
                throw new RuntimeException("Failed to seed from local CSV: " + e.getMessage(), e);
            }
        } else {
            List<Medicine> defaults = new java.util.ArrayList<>();
            defaults.add(Medicine.builder().clinic(clinic).name("Dolo 650mg").manufacturerName("Micro Labs Ltd").saltComposition("Paracetamol (650mg)").medicineDesc("Used for fever and pain relief.").sideEffects("Nausea, Vomiting").active(true).build());
            medicineRepository.saveAll(defaults);
        }
        
        return medicineRepository.findAllActiveMedicines(clinicId);
    }

    private MedicineResponse mapToResponse(Medicine m) {
        return MedicineResponse.builder()
                .id(m.getId())
                .name(m.getName())
                .manufacturerName(m.getManufacturerName())
                .saltComposition(m.getSaltComposition())
                .medicineDesc(m.getMedicineDesc())
                .sideEffects(m.getSideEffects())
                .active(m.getActive())
                .build();
    }
}
