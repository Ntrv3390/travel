package middleware

import (
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type visitor struct {
	lastSeen time.Time
	count    int
}

type RateLimiter struct {
	visitors map[string]*visitor
	mu       sync.RWMutex
	limit    int
	window   time.Duration
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		limit:    limit,
		window:   window,
	}

	go func() {
		for {
			time.Sleep(window)
			rl.mu.Lock()
			for ip, v := range rl.visitors {
				if time.Since(v.lastSeen) > window {
					delete(rl.visitors, ip)
				}
			}
			rl.mu.Unlock()
		}
	}()

	return rl
}

// isAdminToken checks if the request carries a valid admin/superadmin JWT token.
func isAdminToken(c *gin.Context) bool {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return false
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return false
	}

	tokenString := parts[1]
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "triipzy-jwt-secret-change-in-production"
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(secret), nil
	})

	if err != nil || !token.Valid {
		return false
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return false
	}

	role, _ := claims["role"].(string)
	return role == "admin" || role == "superadmin"
}

func (rl *RateLimiter) RateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip rate limiting for admin/superadmin users
		if isAdminToken(c) {
			c.Next()
			return
		}

		ip := c.ClientIP()

		rl.mu.Lock()
		v, exists := rl.visitors[ip]
		if !exists {
			rl.visitors[ip] = &visitor{lastSeen: time.Now(), count: 1}
			rl.mu.Unlock()
			c.Next()
			return
		}

		if time.Since(v.lastSeen) > rl.window {
			v.count = 1
			v.lastSeen = time.Now()
			rl.mu.Unlock()
			c.Next()
			return
		}

		v.count++
		v.lastSeen = time.Now()
		if v.count > rl.limit {
			rl.mu.Unlock()
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
			c.Abort()
			return
		}
		rl.mu.Unlock()
		c.Next()
	}
}
