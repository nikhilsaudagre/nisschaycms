package com.nisschay.cms.dto.req;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MedicineRequest {
    @NotBlank(message = "Medicine name is required")
    private String name;
    private String manufacturerName;
    private String saltComposition;
    private String medicineDesc;
    private String sideEffects;
}
