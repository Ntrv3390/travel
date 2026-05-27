package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/travel/backend/pkg/logger"
)

func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		c.Next()

		statusCode := c.Writer.Status()
		duration := time.Since(start)

		logger.Infof("[%s] %s %d %v", method, path, statusCode, duration)

		if len(c.Errors) > 0 {
			logger.Errorf("[%s] %s errors: %v", method, path, c.Errors)
		}
	}
}
