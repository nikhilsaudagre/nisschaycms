package com.nisschay.cms.dto.res;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DemographicStatsResponse {
    private Map<String, Long> ageDistribution;
    private Map<String, Long> genderDistribution;
}
