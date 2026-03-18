package de.kyle.abstimmungstool.controller;

import de.kyle.abstimmungstool.dto.AdminLoginRequest;
import de.kyle.abstimmungstool.dto.AuthResponse;
import de.kyle.abstimmungstool.dto.VotingCodeLoginRequest;
import de.kyle.abstimmungstool.entity.VotingCode;
import de.kyle.abstimmungstool.repository.VotingCodeRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

import static org.springframework.security.web.context.HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY;

/**
 * Authentication controller providing login endpoints for admin and participant users.
 *
 * <p>Admin authentication uses the InMemoryUserDetailsService with credentials
 * from application.properties.
 *
 * <p>Participant authentication validates a voting code against the database
 * and creates a session with PARTICIPANT role.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String SESSION_ATTR_VOTING_CODE_ID = "VOTING_CODE_ID";
    private static final String SESSION_ATTR_POLL_GROUP_ID = "POLL_GROUP_ID";

    private final VotingCodeRepository votingCodeRepository;
    private final UserDetailsService userDetailsService;
    private final PasswordEncoder passwordEncoder;

    public AuthController(VotingCodeRepository votingCodeRepository,
                          UserDetailsService userDetailsService,
                          PasswordEncoder passwordEncoder) {
        this.votingCodeRepository = votingCodeRepository;
        this.userDetailsService = userDetailsService;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Authenticates an admin user with username and password.
     * Credentials are validated against the InMemoryUserDetailsService.
     */
    @PostMapping("/admin/login")
    public ResponseEntity<AuthResponse> adminLogin(@RequestBody AdminLoginRequest request,
                                                   HttpSession session) {
        var userDetails = userDetailsService.loadUserByUsername(request.username());
        if (userDetails == null || !passwordEncoder.matches(request.password(), userDetails.getPassword())) {
            return ResponseEntity.status(401)
                    .body(new AuthResponse(null, "Invalid credentials"));
        }

        var authentication = new UsernamePasswordAuthenticationToken(
                userDetails.getUsername(),
                null,
                userDetails.getAuthorities()
        );

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        session.setAttribute(SPRING_SECURITY_CONTEXT_KEY, context);

        return ResponseEntity.ok(new AuthResponse("ADMIN", "Login successful"));
    }

    /**
     * Authenticates a participant using a voting code.
     * Validates the code against the database, then creates a session
     * with PARTICIPANT role and stores voting code and poll group IDs.
     */
    @PostMapping("/participant/login")
    public ResponseEntity<AuthResponse> participantLogin(@RequestBody VotingCodeLoginRequest request,
                                                         HttpSession session) {
        VotingCode votingCode = votingCodeRepository.findByCode(request.code())
                .orElse(null);

        if (votingCode == null) {
            return ResponseEntity.status(401)
                    .body(new AuthResponse(null, "Invalid voting code"));
        }

        if (!votingCode.isActive()) {
            return ResponseEntity.status(401)
                    .body(new AuthResponse(null, "Dieser Abstimmungscode wurde deaktiviert"));
        }

        var authorities = List.of(new SimpleGrantedAuthority("ROLE_PARTICIPANT"));
        var authentication = new UsernamePasswordAuthenticationToken(
                "participant:" + votingCode.getCode(),
                null,
                authorities
        );

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        session.setAttribute(SPRING_SECURITY_CONTEXT_KEY, context);

        // Store voting code and poll group IDs in session for later use
        session.setAttribute(SESSION_ATTR_VOTING_CODE_ID, votingCode.getId());
        session.setAttribute(SESSION_ATTR_POLL_GROUP_ID, votingCode.getGroup().getId());

        return ResponseEntity.ok(new AuthResponse("PARTICIPANT", "Login successful"));
    }

    /**
     * Returns the current authentication status.
     */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(HttpSession session) {
        var context = SecurityContextHolder.getContext();
        var authentication = context.getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return ResponseEntity.status(401).body(Map.of("authenticated", false));
        }

        String role = authentication.getAuthorities().stream()
                .findFirst()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .orElse("UNKNOWN");

        Map<String, Object> response = new java.util.HashMap<>(Map.of(
                "authenticated", true,
                "principal", authentication.getPrincipal().toString(),
                "role", role
        ));

        Long votingCodeId = (Long) session.getAttribute(SESSION_ATTR_VOTING_CODE_ID);
        Long pollGroupId = (Long) session.getAttribute(SESSION_ATTR_POLL_GROUP_ID);
        if (votingCodeId != null) {
            response.put("votingCodeId", votingCodeId);
        }
        if (pollGroupId != null) {
            response.put("pollGroupId", pollGroupId);
        }

        return ResponseEntity.ok(response);
    }

    /**
     * Logs out the current user by invalidating the session.
     */
    @PostMapping("/logout")
    public ResponseEntity<AuthResponse> logout(HttpSession session) {
        session.invalidate();
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(new AuthResponse(null, "Logged out successfully"));
    }
}
