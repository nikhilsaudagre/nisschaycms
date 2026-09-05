package com.nisschay.cms.dto.req;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PosCalculationRequest {

    private List<PosItem> items;
    private BigDecimal taxRate; // percentage e.g. 12
    private BigDecimal discountAmount;
    private BigDecimal cashTendered;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PosItem {
        private BigDecimal unitPrice;
        private Integer quantity;
    }
}
