package com.data.trade.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String fromAddress;

    @Value("${app.mail.base-url}")
    private String baseUrl;

    @Async
    public void sendVerificationEmail(String toEmail, String username, String token) {
        String verifyUrl = baseUrl + "/verify-email?token=" + token;
        String subject = "Stock Watcher - Verify Your Email";
        String htmlContent = buildVerificationEmailHtml(username, verifyUrl);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("Verification email sent to {}", toEmail);
        } catch (MessagingException e) {
            log.error("Failed to send verification email to {}: {}", toEmail, e.getMessage());
        }
    }

    private String buildVerificationEmailHtml(String username, String verifyUrl) {
        return """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
                        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                        .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: #ffffff; padding: 30px; text-align: center; }
                        .header h1 { margin: 0; font-size: 24px; }
                        .content { padding: 30px; color: #333333; line-height: 1.6; }
                        .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; margin: 20px 0; }
                        .footer { padding: 20px 30px; text-align: center; color: #888888; font-size: 12px; border-top: 1px solid #eeeeee; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Stock Watcher</h1>
                        </div>
                        <div class="content">
                            <p>Hi <strong>%s</strong>,</p>
                            <p>Thank you for registering! Please click the button below to verify your email address and activate your account.</p>
                            <p style="text-align: center;">
                                <a href="%s" class="btn">Verify Email Address</a>
                            </p>
                            <p>Or copy and paste this link into your browser:</p>
                            <p style="word-break: break-all; color: #2563eb;">%s</p>
                            <p>This link will expire in 7 days.</p>
                            <p>If you did not create an account, you can safely ignore this email.</p>
                        </div>
                        <div class="footer">
                            <p>&copy; Stock Watcher. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(username, verifyUrl, verifyUrl);
    }
}
