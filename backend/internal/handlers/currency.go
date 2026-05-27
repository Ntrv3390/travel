package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type CurrencyHandler struct{}

func NewCurrencyHandler() *CurrencyHandler {
	return &CurrencyHandler{}
}

func (h *CurrencyHandler) ListCurrencies(c *gin.Context) {
	currencies := []string{
		"USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "INR",
		"MXN", "BRL", "SGD", "AED", "THB", "KRW", "TRY", "ZAR",
	}
	c.JSON(http.StatusOK, gin.H{
		"data": currencies,
	})
}
