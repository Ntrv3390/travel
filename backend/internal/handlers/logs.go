package handlers

import (
	"bufio"
	"context"
	"encoding/binary"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func dockerDial(_ context.Context, _, _ string) (net.Conn, error) {
	return net.DialTimeout("unix", "/var/run/docker.sock", 5*time.Second)
}

func readDockerLogs(container string, tail int) ([]string, error) {
	url := fmt.Sprintf("http://localhost/containers/%s/logs?stdout=true&stderr=true&tail=%d", url.PathEscape(container), tail)

	client := &http.Client{
		Transport: &http.Transport{DialContext: dockerDial},
		Timeout:   30 * time.Second,
	}

	resp, err := client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("cannot access Docker socket: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Docker API error (%d): %s", resp.StatusCode, string(body))
	}

	var lines []string
	reader := bufio.NewReader(resp.Body)
	for {
		header := make([]byte, 8)
		if _, err := io.ReadFull(reader, header); err != nil {
			break
		}
		msgLen := binary.BigEndian.Uint32(header[4:8])
		if msgLen == 0 {
			continue
		}
		msg := make([]byte, msgLen)
		if _, err := io.ReadFull(reader, msg); err != nil {
			break
		}
		lines = append(lines, strings.TrimRight(string(msg), "\r\n"))
	}

	return lines, nil
}

func (h *AdminHandler) GetDockerLogs(c *gin.Context) {
	role, _ := c.Get("role")
	if role != "superadmin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "superadmin access required"})
		return
	}

	container := c.DefaultQuery("container", "travel-api-gateway")
	if !isValidContainerName(container) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid container name"})
		return
	}
	tailStr := c.DefaultQuery("tail", "500")
	search := strings.TrimSpace(c.Query("search"))
	level := strings.TrimSpace(c.Query("level"))

	tail, err := strconv.Atoi(tailStr)
	if err != nil || tail <= 0 || tail > 10000 {
		tail = 500
	}

	lines, err := readDockerLogs(container, tail)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	filtered := make([]string, 0, len(lines))
	for _, line := range lines {
		if level != "" && !strings.Contains(strings.ToUpper(line), strings.ToUpper(level)) {
			continue
		}
		if search != "" && !strings.Contains(strings.ToLower(line), strings.ToLower(search)) {
			continue
		}
		filtered = append(filtered, line)
	}

	for i, j := 0, len(filtered)-1; i < j; i, j = i+1, j-1 {
		filtered[i], filtered[j] = filtered[j], filtered[i]
	}

	c.JSON(http.StatusOK, gin.H{
		"logs":  filtered,
		"total": len(filtered),
	})
}

func (h *AdminHandler) StreamDockerLogs(c *gin.Context) {
	tokenString := c.Query("token")
	if tokenString == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "token required"})
		return
	}

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server misconfiguration"})
		return
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token claims"})
		return
	}

	role, _ := claims["role"].(string)
	if role != "superadmin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "superadmin access required"})
		return
	}

	container := c.DefaultQuery("container", "travel-api-gateway")
	if !isValidContainerName(container) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid container name"})
		return
	}

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.WriteHeader(http.StatusOK)
	c.Writer.Flush()

	url := fmt.Sprintf("http://localhost/containers/%s/logs?stdout=true&stderr=true&follow=true&tail=0", url.PathEscape(container))

	client := &http.Client{
		Transport: &http.Transport{DialContext: dockerDial},
	}

	resp, err := client.Get(url)
	if err != nil {
		fmt.Fprintf(c.Writer, "event: error\ndata: %v\n\n", err)
		c.Writer.Flush()
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		fmt.Fprintf(c.Writer, "event: error\ndata: Docker API error (%d): %s\n\n", resp.StatusCode, string(body))
		c.Writer.Flush()
		return
	}

	reader := bufio.NewReader(resp.Body)
	for {
		select {
		case <-c.Request.Context().Done():
			return
		default:
		}

		header := make([]byte, 8)
		if _, err := io.ReadFull(reader, header); err != nil {
			break
		}

		msgLen := binary.BigEndian.Uint32(header[4:8])
		if msgLen == 0 {
			continue
		}

		msg := make([]byte, msgLen)
		if _, err := io.ReadFull(reader, msg); err != nil {
			break
		}

		line := strings.TrimRight(string(msg), "\r\n")
		fmt.Fprintf(c.Writer, "data: %s\n\n", line)
		c.Writer.Flush()
	}
}

func isValidContainerName(name string) bool {
	if name == "" || len(name) > 255 {
		return false
	}
	for _, ch := range name {
		if !((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch == '-' || ch == '_' || ch == '.') {
			return false
		}
	}
	return true
}
