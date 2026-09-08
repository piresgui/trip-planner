package com.tripplanner.config;

import com.tripplanner.auth.JwtUtil;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Browsers can't set arbitrary headers during the WebSocket handshake, so a
 * plain HTTP Authorization header (used by JwtAuthFilter for REST calls)
 * never reaches us here. Instead the client sends the JWT as a STOMP header
 * on the CONNECT frame itself, and this interceptor validates it there --
 * the handshake endpoint is left permitAll in SecurityConfig on purpose.
 */
@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtUtil jwtUtil;

    public StompAuthChannelInterceptor(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                if (jwtUtil.isTokenValid(token)) {
                    var authToken = new UsernamePasswordAuthenticationToken(
                            jwtUtil.extractUserId(token), null, List.of());
                    accessor.setUser(authToken);
                }
            }
        }
        return message;
    }
}
