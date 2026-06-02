package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type GeoResult struct {
	Country string `json:"country"`
	City    string `json:"city"`
	Region  string `json:"regionName"`
	ISP     string `json:"isp"`
	Query   string `json:"query"`
}

var geoClient = &http.Client{Timeout: 5 * time.Second}

func LookupGeo(ip string) *GeoResult {
	if ip == "" || ip == "127.0.0.1" || ip == "::1" || ip == "localhost" {
		return nil
	}

	url := fmt.Sprintf("http://ip-api.com/json/%s?fields=country,city,regionName,isp,query", ip)
	resp, err := geoClient.Get(url)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	var result GeoResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil
	}

	if result.Query == "" {
		return nil
	}

	return &result
}
