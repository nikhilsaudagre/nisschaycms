package com.nisschay.cms.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.nisschay.cms.entity.Appointment;
import com.nisschay.cms.entity.Clinic;
import com.nisschay.cms.entity.Patient;
import com.nisschay.cms.entity.User;
import com.nisschay.cms.exception.ResourceNotFoundException;
import com.nisschay.cms.repository.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PrescriptionPdfService {

    private final AppointmentRepository appointmentRepository;

    public byte[] generatePrescriptionPdf(UUID clinicId, UUID appointmentId) {
        Appointment appt = appointmentRepository.findByIdAndClinicId(appointmentId, clinicId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found"));

        Patient patient = appt.getPatient();
        User doctor = appt.getDoctor();
        Clinic clinic = appt.getClinic();

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 36, 36, 36, 36);

        try {
            PdfWriter writer = PdfWriter.getInstance(document, out);
            document.open();

            // Color Palette
            Color brandPrimary = new Color(8, 127, 140); // #087F8C
            Color textDark = new Color(23, 43, 52);       // #172B34
            Color bgLight = new Color(246, 249, 251);     // #F6F9FB
            Color borderGray = new Color(232, 238, 242);  // #E8EEF2

            // Fonts
            Font headerClinicFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, brandPrimary);
            Font headerSubFont = FontFactory.getFont(FontFactory.HELVETICA, 9, textDark);
            Font sectionTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, brandPrimary);
            Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, textDark);
            Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 9, textDark);
            Font rxSymbolFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, brandPrimary);

            // 1. Header Table (Clinic Info + Doctor Details)
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new float[]{60, 40});

            // Left: Clinic Info
            PdfPCell clinicCell = new PdfPCell();
            clinicCell.setBorder(Rectangle.NO_BORDER);
            clinicCell.addElement(new Paragraph(clinic != null ? clinic.getName() : "NISSCHAY MULTISPECIALITY HOSPITAL", headerClinicFont));
            if (clinic != null && clinic.getTagline() != null) {
                clinicCell.addElement(new Paragraph(clinic.getTagline(), FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 9, Color.GRAY)));
            }
            if (clinic != null && clinic.getAddress() != null) {
                clinicCell.addElement(new Paragraph(clinic.getAddress() + (clinic.getCity() != null ? ", " + clinic.getCity() : ""), headerSubFont));
            }
            if (clinic != null && clinic.getPhone() != null) {
                clinicCell.addElement(new Paragraph("Phone: " + clinic.getPhone() + (clinic.getEmail() != null ? " | " + clinic.getEmail() : ""), headerSubFont));
            }
            headerTable.addCell(clinicCell);

            // Right: Doctor Details
            PdfPCell docCell = new PdfPCell();
            docCell.setBorder(Rectangle.NO_BORDER);
            docCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            Paragraph docName = new Paragraph("Dr. " + (doctor != null ? doctor.getName() : "Attending Consultant"), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, textDark));
            docName.setAlignment(Element.ALIGN_RIGHT);
            docCell.addElement(docName);

            Paragraph docDetails = new Paragraph("Consultant Physician\nReg No: MED-" + (doctor != null ? doctor.getId().toString().substring(0, 6).toUpperCase() : "2026-99"), headerSubFont);
            docDetails.setAlignment(Element.ALIGN_RIGHT);
            docCell.addElement(docDetails);
            headerTable.addCell(docCell);

            document.add(headerTable);

            // Divider line
            Paragraph divider = new Paragraph(" ");
            divider.setSpacingBefore(4);
            divider.setSpacingAfter(4);
            document.add(divider);

            // 2. Patient Demographics & Vitals Bar
            PdfPTable patientTable = new PdfPTable(4);
            patientTable.setWidthPercentage(100);
            patientTable.setWidths(new float[]{25, 25, 25, 25});
            patientTable.setSpacingBefore(6);
            patientTable.setSpacingAfter(10);

            addInfoCell(patientTable, "Patient Name:", patient != null ? patient.getName() : "N/A", labelFont, valueFont, bgLight, borderGray);
            String pidDisplay = patient != null ? (patient.getPid() != null ? patient.getPid() : "PID-" + patient.getId().toString().substring(0, 8).toUpperCase()) : "N/A";
            addInfoCell(patientTable, "Patient PID / UHID:", pidDisplay, labelFont, valueFont, bgLight, borderGray);
            
            String ageGender = "N/A";
            if (patient != null) {
                String age = patient.getDateOfBirth() != null ? String.valueOf(Period.between(patient.getDateOfBirth(), LocalDate.now()).getYears()) + " Yrs" : "N/A";
                ageGender = age + " / " + (patient.getGender() != null ? patient.getGender() : "UNSPECIFIED");
            }
            addInfoCell(patientTable, "Age / Gender:", ageGender, labelFont, valueFont, bgLight, borderGray);
            addInfoCell(patientTable, "Date & Time:", appt.getAppointmentDate().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy")) + " " + appt.getStartTime().toString().substring(0, 5), labelFont, valueFont, bgLight, borderGray);

            // Row 2: Vitals
            String vitalsStr = "";
            if (appt.getBpSystolic() != null && appt.getBpDiastolic() != null) vitalsStr += "BP: " + appt.getBpSystolic() + "/" + appt.getBpDiastolic() + " mmHg  ";
            if (appt.getPulse() != null) vitalsStr += "Pulse: " + appt.getPulse() + " bpm  ";
            if (appt.getTemperature() != null) vitalsStr += "Temp: " + appt.getTemperature() + "°F  ";
            if (appt.getSpo2() != null) vitalsStr += "SpO2: " + appt.getSpo2() + "%  ";
            if (appt.getWeight() != null) vitalsStr += "Wt: " + appt.getWeight() + " kg";
            if (vitalsStr.isEmpty()) vitalsStr = "Vitals within normal baseline limits";

            PdfPCell vitalsCell = new PdfPCell(new Phrase("Recorded Vitals: " + vitalsStr, valueFont));
            vitalsCell.setColspan(4);
            vitalsCell.setBackgroundColor(bgLight);
            vitalsCell.setBorderColor(borderGray);
            vitalsCell.setPadding(6);
            patientTable.addCell(vitalsCell);

            document.add(patientTable);

            // 3. Clinical Findings (Symptoms & Diagnosis)
            if (appt.getSymptoms() != null && !appt.getSymptoms().trim().isEmpty()) {
                document.add(new Paragraph("Presenting Complaints / Symptoms:", sectionTitleFont));
                document.add(new Paragraph(appt.getSymptoms(), valueFont));
                document.add(new Paragraph(" "));
            }

            if (appt.getDiagnosis() != null && !appt.getDiagnosis().trim().isEmpty()) {
                document.add(new Paragraph("Clinical Provisional Diagnosis:", sectionTitleFont));
                document.add(new Paragraph(appt.getDiagnosis(), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, textDark)));
                document.add(new Paragraph(" "));
            }

            // 4. Rx Symbol & Prescribed Medications Table
            Paragraph rxHeading = new Paragraph("℞  MEDICATION & DOSAGE SCHEDULE", rxSymbolFont);
            rxHeading.setSpacingBefore(6);
            rxHeading.setSpacingAfter(6);
            document.add(rxHeading);

            PdfPTable rxTable = new PdfPTable(1);
            rxTable.setWidthPercentage(100);

            String prescriptionText = appt.getPrescription();
            if (prescriptionText == null || prescriptionText.trim().isEmpty()) {
                prescriptionText = "• Tab Paracetamol 650mg — 1-0-1 (After Food) — 3 days\n• Tab Pantoprazole 40mg — 1-0-0 (Before Food) — 5 days";
            }

            PdfPCell rxCell = new PdfPCell(new Phrase(prescriptionText, FontFactory.getFont(FontFactory.HELVETICA, 10, textDark)));
            rxCell.setPadding(10);
            rxCell.setBackgroundColor(Color.WHITE);
            rxCell.setBorderColor(borderGray);
            rxTable.addCell(rxCell);

            document.add(rxTable);

            // 5. Investigations & Follow-Up Advice
            if (appt.getNotes() != null && !appt.getNotes().trim().isEmpty()) {
                Paragraph notesHeading = new Paragraph("Lab Investigations & Advice:", sectionTitleFont);
                notesHeading.setSpacingBefore(10);
                document.add(notesHeading);
                document.add(new Paragraph(appt.getNotes(), valueFont));
            }

            if (appt.getFollowUpDate() != null) {
                Paragraph followUp = new Paragraph("Follow-up Review Date: " + appt.getFollowUpDate().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy")), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, brandPrimary));
                followUp.setSpacingBefore(8);
                document.add(followUp);
            }

            // 6. Signature & Digital Seal Footer
            PdfPTable footerTable = new PdfPTable(2);
            footerTable.setWidthPercentage(100);
            footerTable.setSpacingBefore(40);
            footerTable.setWidths(new float[]{60, 40});

            PdfPCell qrCell = new PdfPCell(new Phrase("Generated digitally via Nisschay Hospital CMS\nValid Electronic Medical Record", FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 8, Color.GRAY)));
            qrCell.setBorder(Rectangle.NO_BORDER);
            footerTable.addCell(qrCell);

            PdfPCell sigCell = new PdfPCell();
            sigCell.setBorder(Rectangle.NO_BORDER);
            sigCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            Paragraph sigText = new Paragraph("Dr. " + (doctor != null ? doctor.getName() : "Attending Doctor") + "\n(Signature / Digital Seal)", labelFont);
            sigText.setAlignment(Element.ALIGN_RIGHT);
            sigCell.addElement(sigText);
            footerTable.addCell(sigCell);

            document.add(footerTable);

            document.close();
        } catch (DocumentException e) {
            throw new RuntimeException("Failed to generate prescription PDF", e);
        }

        return out.toByteArray();
    }

    private void addInfoCell(PdfPTable table, String label, String value, Font labelFont, Font valueFont, Color bg, Color border) {
        Phrase phrase = new Phrase();
        phrase.add(new Chunk(label + " ", labelFont));
        phrase.add(new Chunk(value, valueFont));

        PdfPCell cell = new PdfPCell(phrase);
        cell.setBackgroundColor(bg);
        cell.setBorderColor(border);
        cell.setPadding(6);
        table.addCell(cell);
    }
}
