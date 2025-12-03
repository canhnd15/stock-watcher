package com.data.trade.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.email.from:noreply@stockwatcher.com}")
    private String fromEmail;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    /**
     * Send email verification email
     */
    public void sendVerificationEmail(String toEmail, String username, String verificationToken) {
        try {
            String verificationUrl = frontendUrl + "/verify-email?token=" + verificationToken;
            
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Verify Your Email - Stock Watcher");
            message.setText(buildVerificationEmailBody(username, verificationUrl));
            
            mailSender.send(message);
            log.info("Verification email sent to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send verification email to {}: {}", toEmail, e.getMessage(), e);
            throw new RuntimeException("Failed to send verification email: " + e.getMessage());
        }
    }

    /**
     * Build email verification email body
     */
    private String buildVerificationEmailBody(String username, String verificationUrl) {
        return String.format(
            "Hello %s,\n\n" +
            "Thank you for registering with Stock Watcher!\n\n" +
            "Please verify your email address by clicking the link below:\n\n" +
            "%s\n\n" +
            "This link will expire in 7 days.\n\n" +
            "If you did not create an account, please ignore this email.\n\n" +
            "Best regards,\n" +
            "Stock Watcher Team",
            username,
            verificationUrl
        );
    }
}

