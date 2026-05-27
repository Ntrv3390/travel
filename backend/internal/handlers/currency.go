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
		{Code: "USD", Symbol: "$", Name: "US Dollar"},
		{Code: "EUR", Symbol: "€", Name: "Euro"},
		{Code: "GBP", Symbol: "£", Name: "British Pound"},
		{Code: "JPY", Symbol: "¥", Name: "Japanese Yen"},
		{Code: "AUD", Symbol: "A$", Name: "Australian Dollar"},
		{Code: "CAD", Symbol: "C$", Name: "Canadian Dollar"},
		{Code: "CHF", Symbol: "Fr", Name: "Swiss Franc"},
		{Code: "INR", Symbol: "₹", Name: "Indian Rupee"},
		{Code: "MXN", Symbol: "Mex$", Name: "Mexican Peso"},
		{Code: "BRL", Symbol: "R$", Name: "Brazilian Real"},
		{Code: "SGD", Symbol: "S$", Name: "Singapore Dollar"},
		{Code: "AED", Symbol: "د.إ", Name: "UAE Dirham"},
		{Code: "THB", Symbol: "฿", Name: "Thai Baht"},
		{Code: "KRW", Symbol: "₩", Name: "South Korean Won"},
		{Code: "TRY", Symbol: "₺", Name: "Turkish Lira"},
		{Code: "ZAR", Symbol: "R", Name: "South African Rand"},
	}
	c.JSON(http.StatusOK, gin.H{
		"data": currencies,
	})
}
