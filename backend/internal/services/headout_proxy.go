package services

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/travel/backend/pkg/config"
	"github.com/travel/backend/pkg/logger"
)

const (
	headoutDefaultTimeout = 15 * time.Second
	headoutAuthHeaderName = "Headout-Auth"
)

var ErrMissingHeadoutAPIKey = errors.New("headout api key is not configured")

type UpstreamResponse struct {
	StatusCode int
	Body       []byte
	Headers    http.Header
}

type HeadoutProxyService struct {
	httpClient *http.Client
	baseURL    string
	apiKey     string
}

func NewHeadoutProxyService(cfg *config.Config) *HeadoutProxyService {
	dialer := &net.Dialer{
		Timeout:   10 * time.Second,
		KeepAlive: 60 * time.Second,
	}
	transport := &http.Transport{
		DialContext:           dialer.DialContext,
		MaxIdleConns:          200,
		MaxIdleConnsPerHost:   100,
		IdleConnTimeout:       120 * time.Second,
		TLSHandshakeTimeout:   5 * time.Second,
		ResponseHeaderTimeout: 12 * time.Second,
		DisableKeepAlives:     false,
		ForceAttemptHTTP2:     true,
	}
	svc := &HeadoutProxyService{
		httpClient: &http.Client{Transport: transport},
		baseURL:    strings.TrimRight(cfg.HeadoutURL, "/"),
		apiKey:     strings.TrimSpace(cfg.HeadoutAPIKey),
	}
	// Pre-warm the connection so the first real request doesn't pay TLS setup cost.
	go svc.warmConnection()
	return svc
}

func (s *HeadoutProxyService) warmConnection() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.baseURL+"/v2/cities/?limit=1", nil)
	if err != nil {
		return
	}
	req.Header.Set("Accept", "application/json")
	resp, err := s.httpClient.Do(req)
	if err == nil {
		io.Copy(io.Discard, resp.Body)
		resp.Body.Close()
	}
}

func (s *HeadoutProxyService) Get(ctx context.Context, path string, query url.Values, requiresAuth bool) (*UpstreamResponse, error) {
	return s.request(ctx, http.MethodGet, path, query, nil, requiresAuth)
}

func (s *HeadoutProxyService) Post(ctx context.Context, path string, query url.Values, body []byte, requiresAuth bool) (*UpstreamResponse, error) {
	return s.request(ctx, http.MethodPost, path, query, body, requiresAuth)
}

func (s *HeadoutProxyService) Put(ctx context.Context, path string, query url.Values, body []byte, requiresAuth bool) (*UpstreamResponse, error) {
	return s.request(ctx, http.MethodPut, path, query, body, requiresAuth)
}

func (s *HeadoutProxyService) request(
	ctx context.Context,
	method string,
	path string,
	query url.Values,
	body []byte,
	requiresAuth bool,
) (*UpstreamResponse, error) {
	if requiresAuth && s.apiKey == "" {
		return nil, ErrMissingHeadoutAPIKey
	}

	fullURL := s.baseURL + path
	if len(query) > 0 {
		fullURL += "?" + query.Encode()
	}

	requestCtx, cancel := context.WithTimeout(ctx, headoutDefaultTimeout)
	defer cancel()

	var bodyReader io.Reader
	if len(body) > 0 {
		bodyReader = bytes.NewReader(body)
	}

	req, err := http.NewRequestWithContext(requestCtx, method, fullURL, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to build headout request: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	if len(body) > 0 {
		req.Header.Set("Content-Type", "application/json")
	}
	if requiresAuth {
		req.Header.Set(headoutAuthHeaderName, s.apiKey)
	}

	response, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("headout request failed: %w", err)
	}
	defer response.Body.Close()

	responseBody, err := io.ReadAll(io.LimitReader(response.Body, 10*1024*1024))
	if err != nil {
		return nil, fmt.Errorf("failed to read headout response: %w", err)
	}

	logger.Debugf("Headout request %s %s -> %d", method, fullURL, response.StatusCode)

	return &UpstreamResponse{
		StatusCode: response.StatusCode,
		Body:       responseBody,
		Headers:    response.Header,
	}, nil
}
