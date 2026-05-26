package services

import (
	"fmt"

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
	subject := fmt.Sprintf("Booking Confirmed - %s", data.BookingID)
	body := fmt.Sprintf(`Hi %s,

Your booking has been confirmed!

Booking ID: %s
Reference: %s
Experience: %s
Date: %s
Time: %s
Quantity: %d
Total: %.2f %s
`,
		data.CustomerName,
		data.BookingID,
		data.HeadoutReference,
		data.ExperienceName,
		data.ExperienceDate,
		data.ExperienceTime,
		data.Quantity,
		data.TotalAmount,
		data.Currency,
	)

	if data.TicketURL != "" {
		if data.TicketURL == "embedded" {
			body += "\nYour ticket/voucher is attached to this email.\n"
		} else {
			body += fmt.Sprintf("\nYour ticket is available at: %s\n", data.TicketURL)
		}
	}
	if data.TicketData != "" {
		body += fmt.Sprintf("\n%s\n", data.TicketData)
	}

	body += "\nThank you for booking with us!\n"

	logger.Infof("📧 EMAIL TO: %s | SUBJECT: %s", data.CustomerEmail, subject)
	logger.Infof("📧 BODY:\n%s", body)

	return nil
}

func SendBookingTicket(email, name, bookingID string, ticketData []byte) error {
	logger.Infof("📧 TICKET EMAIL TO: %s | BOOKING: %s | SIZE: %d bytes", email, bookingID, len(ticketData))
	logger.Infof("📧 Ticket for %s sent successfully (simulated)", name)
	return nil
}
