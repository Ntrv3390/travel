package middleware

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

func AdminAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		adminKey := getAdminKey()
		if adminKey == "" {
			c.Next()
			return
		}

		providedKey := strings.TrimSpace(c.GetHeader("X-Admin-Key"))
		if providedKey == "" {
			providedKey = strings.TrimSpace(c.Query("adminKey"))
		}

		if providedKey != adminKey {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			c.Abort()
			return
		}

		c.Next()
	}
}

func getAdminKey() string {
	return os.Getenv("ADMIN_API_KEY")
}
