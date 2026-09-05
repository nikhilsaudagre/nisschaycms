package com.nisschay.cms.security;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.nisschay.cms.entity.User;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Getter
@AllArgsConstructor
public class UserDetailsImpl implements UserDetails {
    private static final long serialVersionUID = 1L;

    private UUID id;
    private String name;
    private String email;

    @JsonIgnore
    private String password;

    private UUID clinicId;
    private String clinicName;
    private String role;

    private Collection<? extends GrantedAuthority> authorities;

    public static UserDetailsImpl build(User user) {
        // Map roles and permissions to authorities
        // We prefix roles with "ROLE_" and leave permissions as is (or prefix them if preferred).
        // Standard Spring Security expects "ROLE_ADMIN", "ROLE_DOCTOR", etc.
        List<SimpleGrantedAuthority> roleAuthorities = Stream.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().getId()))
                .collect(Collectors.toList());

        List<SimpleGrantedAuthority> permissionAuthorities = user.getRole().getPermissions().stream()
                .map(permission -> new SimpleGrantedAuthority(permission.getId()))
                .toList();

        // Combine both role and permission authorities
        List<GrantedAuthority> authorities = Stream.concat(roleAuthorities.stream(), permissionAuthorities.stream())
                .collect(Collectors.toList());

        return new UserDetailsImpl(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPasswordHash(),
                user.getClinic() != null ? user.getClinic().getId() : null,
                user.getClinic() != null ? user.getClinic().getName() : "Nisschay Clinic",
                user.getRole() != null ? user.getRole().getId() : "DOCTOR",
                authorities
        );
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
