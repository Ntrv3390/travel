package services

import (
	"fmt"
	"net/smtp"
	"strings"

	"github.com/travel/backend/pkg/logger"
)

type SMTPConfig struct {
	Host      string
	Port      string
	User      string
	Pass      string
	From      string
	AdminEmail string
}

type EmailService struct {
	cfg SMTPConfig
}

func NewEmailService(cfg SMTPConfig) *EmailService {
	return &EmailService{cfg: cfg}
}

type BookingConfirmationData struct {
	BookingID        string
	HeadoutReference string
	CustomerName     string
	CustomerEmail    string
	ExperienceName   string
	ExperienceDate   string
	ExperienceTime   string
	TotalAmount      float64
	Currency         string
	Quantity         int
	TicketURL        string
	TicketData       string
}

type HelpSubmissionData struct {
	ID      uint
	Name    string
	Email   string
	Subject string
	Message string
}

type PasswordResetData struct {
	Name      string
	Email     string
	ResetLink string
}

type BookingAdminNotificationData struct {
	BookingID        string
	HeadoutReference string
	CustomerName     string
	CustomerEmail    string
	ExperienceName   string
	ExperienceDate   string
	TotalAmount      float64
	Currency         string
	AdminURL         string
}

func (s *EmailService) SendBookingAdminNotification(data BookingAdminNotificationData) error {
	subject := fmt.Sprintf("New Booking: %s - %s", data.BookingID, data.CustomerName)
	htmlBody := buildBookingAdminNotificationHTML(data)

	if s.cfg.From == "" || s.cfg.Host == "" {
		logger.Infof("ADMIN NOTIFICATION TO: %s | SUBJECT: %s (SMTP not configured)", s.cfg.AdminEmail, subject)
		logger.Infof("HTML BODY:\n%s", htmlBody)
		return nil
	}

	return s.SendEmail(s.cfg.AdminEmail, subject, htmlBody)
}

func buildBookingAdminNotificationHTML(data BookingAdminNotificationData) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6">
<tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%%">
<tr><td style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1)">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0">
<tr><td style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:24px 32px;text-align:center">
<h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700">New Booking Received</h1>
</td></tr>
<tr><td style="padding:24px 32px">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px">
<tr><td style="padding:12px 16px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;width:140px;background:#f9fafb">Booking ID:</td><td style="padding:12px 16px;color:#374151;border-bottom:1px solid #e5e7eb">%s</td></tr>
<tr><td style="padding:12px 16px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;width:140px;background:#f9fafb">Reference:</td><td style="padding:12px 16px;color:#374151;border-bottom:1px solid #e5e7eb">%s</td></tr>
<tr><td style="padding:12px 16px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;width:140px;background:#f9fafb">Customer:</td><td style="padding:12px 16px;color:#374151;border-bottom:1px solid #e5e7eb">%s (%s)</td></tr>
<tr><td style="padding:12px 16px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;width:140px;background:#f9fafb">Experience:</td><td style="padding:12px 16px;color:#374151;border-bottom:1px solid #e5e7eb">%s</td></tr>
<tr><td style="padding:12px 16px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;width:140px;background:#f9fafb">Date:</td><td style="padding:12px 16px;color:#374151;border-bottom:1px solid #e5e7eb">%s</td></tr>
<tr><td style="padding:12px 16px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;width:140px;background:#f9fafb">Amount:</td><td style="padding:12px 16px;color:#374151;border-bottom:1px solid #e5e7eb;font-weight:700">%s %.2f</td></tr>
</table>
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:24px 0 0">
<table role="presentation" cellpadding="0" cellspacing="0">
<tr><td style="border-radius:8px;background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:0">
<a href="%s" style="display:inline-block;padding:14px 40px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;border-radius:8px">View in Admin Panel</a>
</td></tr>
</table>
</td></tr>
</table>
</td></tr>
</table>
</td></tr>
<tr><td style="text-align:center;padding:24px 16px 0">
<p style="margin:0;color:#9ca3af;font-size:12px">&copy; 2024 Triipzy. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
		data.BookingID,
		data.HeadoutReference,
		data.CustomerName,
		data.CustomerEmail,
		data.ExperienceName,
		data.ExperienceDate,
		data.Currency,
		data.TotalAmount,
		data.AdminURL,
	)
}

func (s *EmailService) SendBookingConfirmation(data BookingConfirmationData) error {
	subject := fmt.Sprintf("Booking Confirmed - %s", data.BookingID)
	htmlBody := buildBookingConfirmationHTML(data)

	if s.cfg.From == "" || s.cfg.Host == "" {
		logger.Infof("EMAIL TO: %s | SUBJECT: %s (SMTP not configured)", data.CustomerEmail, subject)
		logger.Infof("HTML BODY:\n%s", htmlBody)
		return nil
	}

	return s.SendEmail(data.CustomerEmail, subject, htmlBody)
}

func (s *EmailService) SendHelpSubmissionNotification(data HelpSubmissionData) error {
	subject := fmt.Sprintf("New Help Submission: %s", data.Subject)
	htmlBody := buildHelpNotificationHTML(data)

	if s.cfg.From == "" || s.cfg.Host == "" {
		logger.Infof("ADMIN NOTIFICATION TO: %s | SUBJECT: %s", s.cfg.AdminEmail, subject)
		logger.Infof("HTML BODY:\n%s", htmlBody)
		return nil
	}

	return s.SendEmail(s.cfg.AdminEmail, subject, htmlBody)
}

func (s *EmailService) SendHelpSubmissionAcknowledgment(data HelpSubmissionData) error {
	subject := "We received your help request - Triipzy"
	htmlBody := buildHelpAcknowledgmentHTML(data)

	if s.cfg.From == "" || s.cfg.Host == "" {
		logger.Infof("ACKNOWLEDGMENT TO: %s | SUBJECT: %s", data.Email, subject)
		logger.Infof("HTML BODY:\n%s", htmlBody)
		return nil
	}

	return s.SendEmail(data.Email, subject, htmlBody)
}

func (s *EmailService) SendEmail(to, subject, htmlBody string) error {
	addr := fmt.Sprintf("%s:%s", s.cfg.Host, s.cfg.Port)

	auth := smtp.PlainAuth("", s.cfg.User, s.cfg.Pass, s.cfg.Host)

	msg := buildMIMEMessage(s.cfg.From, to, subject, htmlBody)

	err := smtp.SendMail(addr, auth, s.cfg.From, []string{to}, []byte(msg))
	if err != nil {
		logger.Errorf("Failed to send email to %s: %v", to, err)
		return fmt.Errorf("send email: %w", err)
	}

	logger.Infof("Email sent successfully to %s - subject: %s", to, subject)
	return nil
}

func buildMIMEMessage(from, to, subject, htmlBody string) string {
	displayName := "Triipzy"
	var b strings.Builder
	b.WriteString(fmt.Sprintf("From: %s <%s>\r\n", displayName, from))
	b.WriteString(fmt.Sprintf("To: %s\r\n", to))
	b.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	b.WriteString("Reply-To: noreply@triipzy.com\r\n")
	b.WriteString("MIME-Version: 1.0\r\n")
	b.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n")
	b.WriteString("\r\n")
	b.WriteString(htmlBody)
	return b.String()
}

func buildBookingConfirmationHTML(data BookingConfirmationData) string {
	ticketSection := ""
	if data.TicketURL != "" {
		ticketSection = fmt.Sprintf(`<tr><td style="padding:12px 16px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;width:140px">Ticket:</td><td style="padding:12px 16px;color:#374151;border-bottom:1px solid #e5e7eb"><a href="%s" style="color:#4F46E5;text-decoration:none;font-weight:600">View Ticket</a></td></tr>`, data.TicketURL)
	}
	ticketDataSection := ""
	if data.TicketData != "" {
		ticketDataSection = fmt.Sprintf(`<p style="margin:16px 0 0;color:#374151;font-size:14px;line-height:1.6;white-space:pre-wrap">%s</p>`, data.TicketData)
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6">
<tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%%">
<tr><td style="text-align:center;padding:0 0 24px">
<img src="https://triipzy.com/logo.png" alt="Triipzy" style="height:40px" onerror="this.style.display='none'">
</td></tr>
<tr><td style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1)">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0">
<tr><td style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:32px 40px;text-align:center">
<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">Booking Confirmed! &#10003;</h1>
<p style="margin:8px 0 0;color:#c4b5fd;font-size:15px">Your experience is all set</p>
</td></tr>
<tr><td style="padding:32px 40px">
<p style="margin:0 0 4px;color:#6b7280;font-size:14px">Hi <strong style="color:#111827">%s</strong>,</p>
<p style="margin:0 0 24px;color:#6b7280;font-size:14px">Your booking has been confirmed! Here are the details:</p>
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px">
<tr><td style="padding:12px 16px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;width:140px">Booking ID:</td><td style="padding:12px 16px;color:#374151;border-bottom:1px solid #e5e7eb">%s</td></tr>
<tr><td style="padding:12px 16px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;width:140px">Reference:</td><td style="padding:12px 16px;color:#374151;border-bottom:1px solid #e5e7eb">%s</td></tr>
<tr><td style="padding:12px 16px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;width:140px">Experience:</td><td style="padding:12px 16px;color:#374151;border-bottom:1px solid #e5e7eb">%s</td></tr>
<tr><td style="padding:12px 16px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;width:140px">Date:</td><td style="padding:12px 16px;color:#374151;border-bottom:1px solid #e5e7eb">%s%s</td></tr>
<tr><td style="padding:12px 16px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;width:140px">Quantity:</td><td style="padding:12px 16px;color:#374151;border-bottom:1px solid #e5e7eb">%d</td></tr>
<tr><td style="padding:12px 16px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;width:140px">Total:</td><td style="padding:12px 16px;color:#374151;border-bottom:1px solid #e5e7eb;font-weight:700;font-size:16px">%s %.2f</td></tr>%s
</table>%s
</td></tr>
<tr><td style="padding:0 40px 32px;text-align:center">
<p style="margin:0;color:#9ca3af;font-size:13px">Thank you for booking with <strong style="color:#4F46E5">Triipzy</strong>!<br>Have a wonderful experience!</p>
</td></tr>
</table>
</td></tr>
<tr><td style="text-align:center;padding:24px 16px 0">
<p style="margin:0 0 6px;color:#9ca3af;font-size:12px">This is an automated message from Triipzy. Please do not reply to this email.</p>
<p style="margin:0;color:#9ca3af;font-size:12px">&copy; 2024 Triipzy. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
		data.CustomerName,
		data.BookingID,
		data.HeadoutReference,
		data.ExperienceName,
		data.ExperienceDate,
		timeSection(data.ExperienceTime),
		data.Quantity,
		data.Currency,
		data.TotalAmount,
		ticketSection,
		ticketDataSection,
	)
}

func timeSection(t string) string {
	if t == "" {
		return ""
	}
	return fmt.Sprintf(" at %s", t)
}

func buildHelpNotificationHTML(data HelpSubmissionData) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6">
<tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%%">
<tr><td style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1)">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0">
<tr><td style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:24px 32px">
<h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700">New Help Submission</h1>
</td></tr>
<tr><td style="padding:24px 32px">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px">
<tr><td style="padding:12px 16px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;width:120px;background:#f9fafb">Name:</td><td style="padding:12px 16px;color:#374151;border-bottom:1px solid #e5e7eb">%s</td></tr>
<tr><td style="padding:12px 16px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;width:120px;background:#f9fafb">Email:</td><td style="padding:12px 16px;color:#374151;border-bottom:1px solid #e5e7eb"><a href="mailto:%s" style="color:#4F46E5">%s</a></td></tr>
<tr><td style="padding:12px 16px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;width:120px;background:#f9fafb">Subject:</td><td style="padding:12px 16px;color:#374151;border-bottom:1px solid #e5e7eb">%s</td></tr>
</table>
<div style="margin-top:16px;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px">
<p style="margin:0 0 8px;font-weight:600;color:#374151;font-size:14px">Message:</p>
<p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;white-space:pre-wrap">%s</p>
</div>
</td></tr>
<tr><td style="text-align:center;padding:16px 24px">
<p style="margin:0;color:#9ca3af;font-size:12px">This is an automated message from Triipzy. Please do not reply to this email.</p>
</td></tr>
</table>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
		data.Name, data.Email, data.Email, data.Subject, data.Message)
}

func (s *EmailService) SendPasswordResetEmail(email, name, resetLink string) error {
	subject := "Reset Your Password - Triipzy"
	htmlBody := buildPasswordResetHTML(name, resetLink)

	if s.cfg.From == "" || s.cfg.Host == "" {
		logger.Infof("EMAIL TO: %s | SUBJECT: %s (SMTP not configured)", email, subject)
		logger.Infof("HTML BODY:\n%s", htmlBody)
		return nil
	}

	return s.SendEmail(email, subject, htmlBody)
}

func buildPasswordResetHTML(name, resetLink string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6">
<tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%%">
<tr><td style="text-align:center;padding:0 0 24px">
<img src="https://triipzy.com/logo.png" alt="Triipzy" style="height:40px" onerror="this.style.display='none'">
</td></tr>
<tr><td style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1)">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0">
<tr><td style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:32px 40px;text-align:center">
<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">Reset Your Password</h1>
</td></tr>
<tr><td style="padding:32px 40px">
<p style="margin:0 0 4px;color:#6b7280;font-size:14px">Hi <strong style="color:#111827">%s</strong>,</p>
<p style="margin:0 0 20px;color:#6b7280;font-size:14px">We received a request to reset your password. Click the button below to set a new password:</p>
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:0 0 24px">
<table role="presentation" cellpadding="0" cellspacing="0">
<tr><td style="border-radius:8px;background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:0">
<a href="%s" style="display:inline-block;padding:14px 40px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;border-radius:8px">Reset Password</a>
</td></tr>
</table>
</td></tr>
</table>
<p style="margin:0 0 20px;color:#6b7280;font-size:14px">Or copy and paste this link in your browser:</p>
<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin-bottom:20px;word-break:break-all">
<p style="margin:0;color:#4F46E5;font-size:13px;font-family:monospace">%s</p>
</div>
<p style="margin:0;color:#9ca3af;font-size:13px">This link will expire in 10 minutes. If you did not request a password reset, you can safely ignore this email.</p>
</td></tr>
<tr><td style="padding:0 40px 32px;text-align:center">
<p style="margin:0;color:#9ca3af;font-size:13px">Best regards,<br>The <strong style="color:#4F46E5">Triipzy</strong> Team</p>
</td></tr>
</table>
</td></tr>
<tr><td style="text-align:center;padding:24px 16px 0">
<p style="margin:0 0 6px;color:#9ca3af;font-size:12px">This is an automated message from Triipzy. Please do not reply to this email.</p>
<p style="margin:0;color:#9ca3af;font-size:12px">&copy; 2024 Triipzy. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`, name, resetLink, resetLink)
}

func buildHelpAcknowledgmentHTML(data HelpSubmissionData) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6">
<tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%%">
<tr><td style="text-align:center;padding:0 0 24px">
<img src="https://triipzy.com/logo.png" alt="Triipzy" style="height:40px" onerror="this.style.display='none'">
</td></tr>
<tr><td style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1)">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0">
<tr><td style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:32px 40px;text-align:center">
<h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700">We've Got Your Message!</h1>
</td></tr>
<tr><td style="padding:32px 40px">
<p style="margin:0 0 4px;color:#6b7280;font-size:14px">Hi <strong style="color:#111827">%s</strong>,</p>
<p style="margin:0 0 20px;color:#6b7280;font-size:14px">Thank you for reaching out to Triipzy support. We have received your request and will get back to you as soon as possible.</p>
<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:20px">
<p style="margin:0 0 8px;font-weight:600;color:#374151;font-size:14px">Summary of your request:</p>
<p style="margin:0;color:#6b7280;font-size:14px"><strong>Subject:</strong> %s</p>
</div>
<p style="margin:0;color:#6b7280;font-size:14px">If you have any additional information to add, please reply to this email.</p>
</td></tr>
<tr><td style="padding:0 40px 32px;text-align:center">
<p style="margin:0;color:#9ca3af;font-size:13px">Best regards,<br>The <strong style="color:#4F46E5">Triipzy</strong> Team</p>
</td></tr>
</table>
</td></tr>
<tr><td style="text-align:center;padding:24px 16px 0">
<p style="margin:0 0 6px;color:#9ca3af;font-size:12px">This is an automated message from Triipzy. Please do not reply to this email.</p>
<p style="margin:0;color:#9ca3af;font-size:12px">&copy; 2024 Triipzy. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
		data.Name, data.Subject)
}

func (s *EmailService) SendBookingTicket(email, name, bookingID string, ticketData []byte) error {
	subject := fmt.Sprintf("Your Tickets - %s", bookingID)
	htmlBody := buildTicketHTML(name, string(ticketData))

	if s.cfg.From == "" || s.cfg.Host == "" {
		logger.Infof("TICKET EMAIL TO: %s | BOOKING: %s | SIZE: %d bytes (SMTP not configured)", email, bookingID, len(ticketData))
		logger.Infof("HTML BODY:\n%s", htmlBody)
		return nil
	}

	return s.SendEmail(email, subject, htmlBody)
}

func buildTicketHTML(name, ticketData string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6">
<tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%%">
<tr><td style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1)">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0">
<tr><td style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:24px 32px;text-align:center">
<h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700">Your Tickets Are Here!</h1>
</td></tr>
<tr><td style="padding:24px 32px">
<p style="margin:0 0 4px;color:#6b7280;font-size:14px">Hi <strong style="color:#111827">%s</strong>,</p>
<p style="margin:0 0 20px;color:#6b7280;font-size:14px">Here are your tickets for the booking:</p>
<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;word-break:break-all">
<pre style="margin:0;color:#374151;font-size:13px;font-family:monospace;white-space:pre-wrap">%s</pre>
</div>
</td></tr>
<tr><td style="padding:0 32px 24px;text-align:center">
<p style="margin:0;color:#9ca3af;font-size:13px">Thank you for booking with <strong style="color:#4F46E5">Triipzy</strong>!</p>
</td></tr>
</table>
</td></tr>
<tr><td style="text-align:center;padding:24px 16px 0">
<p style="margin:0 0 6px;color:#9ca3af;font-size:12px">This is an automated message from Triipzy. Please do not reply to this email.</p>
<p style="margin:0;color:#9ca3af;font-size:12px">&copy; 2024 Triipzy. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`, name, ticketData)
}

func SendBookingConfirmation(data BookingConfirmationData) error {
	logger.Infof("EMAIL TO: %s | SUBJECT: Booking Confirmed - %s", data.CustomerEmail, data.BookingID)
	logger.Infof("HTML BODY:\n%s", buildBookingConfirmationHTML(data))
	return nil
}

func SendBookingTicket(email, name, bookingID string, ticketData []byte) error {
	logger.Infof("TICKET EMAIL TO: %s | BOOKING: %s | SIZE: %d bytes", email, bookingID, len(ticketData))
	logger.Infof("Ticket for %s sent successfully (simulated)", name)
	return nil
}
