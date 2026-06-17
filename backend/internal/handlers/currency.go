package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type CurrencyInfo struct {
	Code   string `json:"code"`
	Symbol string `json:"symbol"`
	Name   string `json:"name"`
}

type CurrencyHandler struct{}

func NewCurrencyHandler() *CurrencyHandler {
	return &CurrencyHandler{}
}

func (h *CurrencyHandler) ListCurrencies(c *gin.Context) {
	currencies := []CurrencyInfo{
		{Code: "AED", Symbol: "د.إ", Name: "UAE Dirham"},
		{Code: "ALL", Symbol: "L", Name: "Albanian Lek"},
		{Code: "ARS", Symbol: "AR$", Name: "Argentine Peso"},
		{Code: "AUD", Symbol: "A$", Name: "Australian Dollar"},
		{Code: "AZN", Symbol: "₼", Name: "Azerbaijan Manat"},
		{Code: "BHD", Symbol: "BD", Name: "Bahrain Dinar"},
		{Code: "BRL", Symbol: "R$", Name: "Brazilian Real"},
		{Code: "CAD", Symbol: "C$", Name: "Canadian Dollar"},
		{Code: "CHF", Symbol: "Fr", Name: "Swiss Franc"},
		{Code: "CLP", Symbol: "CL$", Name: "Chilean Peso"},
		{Code: "CNY", Symbol: "¥", Name: "Chinese Yuan"},
		{Code: "COP", Symbol: "CO$", Name: "Colombian Peso"},
		{Code: "CRC", Symbol: "₡", Name: "Costa Rican Colón"},
		{Code: "CZK", Symbol: "Kč", Name: "Czech Koruna"},
		{Code: "DKK", Symbol: "kr", Name: "Danish Krone"},
		{Code: "DOP", Symbol: "RD$", Name: "Dominican Peso"},
		{Code: "EGP", Symbol: "E£", Name: "Egyptian Pound"},
		{Code: "EUR", Symbol: "€", Name: "Euro"},
		{Code: "FJD", Symbol: "FJ$", Name: "Fijian Dollar"},
		{Code: "GBP", Symbol: "£", Name: "British Pound"},
		{Code: "HKD", Symbol: "HK$", Name: "Hong Kong Dollar"},
		{Code: "HUF", Symbol: "Ft", Name: "Hungarian Forint"},
		{Code: "IDR", Symbol: "Rp", Name: "Indonesian Rupiah"},
		{Code: "ILS", Symbol: "₪", Name: "Israeli Shekel"},
		{Code: "INR", Symbol: "₹", Name: "Indian Rupee"},
		{Code: "ISK", Symbol: "kr", Name: "Icelandic Króna"},
		{Code: "JOD", Symbol: "JD", Name: "Jordanian Dinar"},
		{Code: "JPY", Symbol: "¥", Name: "Japanese Yen"},
		{Code: "KES", Symbol: "KSh", Name: "Kenyan Shilling"},
		{Code: "KRW", Symbol: "₩", Name: "South Korean Won"},
		{Code: "LBP", Symbol: "ل.ل", Name: "Lebanese Pound"},
		{Code: "MAD", Symbol: "MAD", Name: "Moroccan Dirham"},
		{Code: "MOP", Symbol: "MOP$", Name: "Macanese Pataca"},
		{Code: "MUR", Symbol: "₨", Name: "Mauritian Rupee"},
		{Code: "MXN", Symbol: "MX$", Name: "Mexican Peso"},
		{Code: "MYR", Symbol: "RM", Name: "Malaysian Ringgit"},
		{Code: "NOK", Symbol: "kr", Name: "Norwegian Krone"},
		{Code: "NZD", Symbol: "NZ$", Name: "New Zealand Dollar"},
		{Code: "OMR", Symbol: "OMR", Name: "Omani Rial"},
		{Code: "PEN", Symbol: "S/", Name: "Peruvian Sol"},
		{Code: "PLN", Symbol: "zł", Name: "Polish Złoty"},
		{Code: "QAR", Symbol: "QR", Name: "Qatari Riyal"},
		{Code: "RON", Symbol: "lei", Name: "Romanian Leu"},
		{Code: "SAR", Symbol: "SR", Name: "Saudi Riyal"},
		{Code: "SEK", Symbol: "kr", Name: "Swedish Krona"},
		{Code: "SGD", Symbol: "S$", Name: "Singapore Dollar"},
		{Code: "THB", Symbol: "฿", Name: "Thai Baht"},
		{Code: "TRY", Symbol: "₺", Name: "Turkish Lira"},
		{Code: "TWD", Symbol: "NT$", Name: "Taiwan Dollar"},
		{Code: "USD", Symbol: "$", Name: "US Dollar"},
		{Code: "VND", Symbol: "₫", Name: "Vietnamese Dong"},
		{Code: "ZAR", Symbol: "R", Name: "South African Rand"},
	}
	c.JSON(http.StatusOK, gin.H{
		"data": currencies,
	})
}
