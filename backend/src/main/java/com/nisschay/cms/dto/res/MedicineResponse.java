package com.nisschay.cms.dto.res;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Builder
public class MedicineResponse {
    private UUID id;
    private String name;
    private String manufacturerName;
    private String saltComposition;
    private String medicineDesc;
    private String sideEffects;
    private Boolean active;
}
