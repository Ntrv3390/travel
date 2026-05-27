package services

import (
	"bytes"
	"fmt"
	"html/template"
	"strings"

	"github.com/travel/backend/pkg/logger"
)

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

func SendBookingConfirmation(data BookingConfirmationData) error {
	htmlBody := buildConfirmationHTML(data)
	textBody := buildConfirmationText(data)

	subject := fmt.Sprintf("Booking Confirmed - %s", data.BookingID)

	logger.Infof("📧 EMAIL TO: %s | SUBJECT: %s", data.CustomerEmail, subject)
	logger.Infof("📧 HTML BODY:\n%s", htmlBody)
	logger.Infof("📧 TEXT BODY:\n%s", textBody)

	return nil
}

func SendBookingTicket(email, name, bookingID string, ticketData []byte) error {
	logger.Infof("📧 TICKET EMAIL TO: %s | BOOKING: %s | SIZE: %d bytes", email, bookingID, len(ticketData))
	logger.Infof("📧 Ticket for %s sent successfully (simulated)", name)
	return nil
}

func buildConfirmationHTML(data BookingConfirmationData) string {
	var buf bytes.Buffer
	tmpl := `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">Booking Confirmed!</h1>
    </div>
    <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef; border-radius: 0 0 8px 8px;">
        <p>Hi <strong>{{.CustomerName}}</strong>,</p>
        <p>Your booking has been confirmed! Here are the details:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr><td style="padding: 8px; font-weight: bold;">Booking ID:</td><td style="padding: 8px;">{{.BookingID}}</td></tr>
            {{if .ExperienceName}}<tr><td style="padding: 8px; font-weight: bold;">Experience:</td><td style="padding: 8px;">{{.ExperienceName}}</td></tr>{{end}}
            <tr><td style="padding: 8px; font-weight: bold;">Date:</td><td style="padding: 8px;">{{.ExperienceDate}}{{if .ExperienceTime}} at {{.ExperienceTime}}{{end}}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Quantity:</td><td style="padding: 8px;">{{.Quantity}}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Total:</td><td style="padding: 8px;">{{printf "%.2f" .TotalAmount}} {{.Currency}}</td></tr>
            {{if .TicketURL}}<tr><td style="padding: 8px; font-weight: bold;">Ticket:</td><td style="padding: 8px;"><a href="{{.TicketURL}}" style="color: #4F46E5;">View Ticket</a></td></tr>{{end}}
        </table>
        {{if .TicketData}}<p style="margin-top: 20px;">{{.TicketData}}</p>{{end}}
        <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">Thank you for booking with us!<br>Have a great experience!</p>
    </div>
</body>
</html>`
	t := template.Must(template.New("email").Parse(tmpl))
	if err := t.Execute(&buf, data); err != nil {
		logger.Errorf("Failed to render email HTML template: %v", err)
		return buildConfirmationText(data)
	}
	return buf.String()
}

func buildConfirmationText(data BookingConfirmationData) string {
	var buf strings.Builder
	buf.WriteString(fmt.Sprintf("Hi %s,\n\n", data.CustomerName))
	buf.WriteString("Your booking has been confirmed!\n\n")
	buf.WriteString(fmt.Sprintf("Booking ID: %s\n", data.BookingID))
	buf.WriteString(fmt.Sprintf("Reference: %s\n", data.HeadoutReference))
	if data.ExperienceName != "" {
		buf.WriteString(fmt.Sprintf("Experience: %s\n", data.ExperienceName))
	}
	buf.WriteString(fmt.Sprintf("Date: %s", data.ExperienceDate))
	if data.ExperienceTime != "" {
		buf.WriteString(fmt.Sprintf(" at %s", data.ExperienceTime))
	}
	buf.WriteString("\n")
	buf.WriteString(fmt.Sprintf("Quantity: %d\n", data.Quantity))
	buf.WriteString(fmt.Sprintf("Total: %.2f %s\n", data.TotalAmount, data.Currency))
	if data.TicketURL != "" {
		if data.TicketURL == "embedded" {
			buf.WriteString("\nYour ticket/voucher is attached to this email.\n")
		} else {
			buf.WriteString(fmt.Sprintf("\nYour ticket is available at: %s\n", data.TicketURL))
		}
	}
	if data.TicketData != "" {
		buf.WriteString(fmt.Sprintf("\n%s\n", data.TicketData))
	}
	buf.WriteString("\nThank you for booking with us!\n")
	return buf.String()
}
