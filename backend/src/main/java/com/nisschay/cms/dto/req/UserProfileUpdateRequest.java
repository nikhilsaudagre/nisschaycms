package com.nisschay.cms.dto.req;

import lombok.Data;

@Data
public class UserProfileUpdateRequest {
    private String name;
    private String phone;
    private String password;
    private String profilePictureUrl;
}
