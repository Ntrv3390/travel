package sync

import (
	"encoding/json"
	"fmt"
	"strings"
)

// ExtractString extracts a string value from a map for any of the given keys.
// Returns the first matching value found.
func ExtractString(data map[string]interface{}, keys ...string) string {
	for _, key := range keys {
		v, exists := data[key]
		if !exists {
			continue
		}
		switch val := v.(type) {
		case string:
			return val
		case float64:
			return fmt.Sprintf("%.0f", val)
		case json.Number:
			return val.String()
		default:
			return fmt.Sprintf("%v", val)
		}
	}
	return ""
}

// ExtractNestedString extracts a string by traversing dot-separated paths.
// e.g. "city.name" looks up data["city"]["name"].
func ExtractNestedString(data map[string]interface{}, keys ...string) string {
	for _, key := range keys {
		parts := strings.Split(key, ".")
		current := data
		found := true
		for i, part := range parts {
			if i == len(parts)-1 {
				if v, ok := current[part]; ok {
					switch val := v.(type) {
					case string:
						return val
					case float64:
						return fmt.Sprintf("%.0f", val)
					case json.Number:
						return val.String()
					case map[string]interface{}:
						if s, ok := val["code"].(string); ok {
							return s
						}
						if s, ok := val["name"].(string); ok {
							return s
						}
						return fmt.Sprintf("%v", val)
					default:
						return fmt.Sprintf("%v", val)
					}
				}
			} else {
				if next, ok := current[part].(map[string]interface{}); ok {
					current = next
				} else {
					found = false
					break
				}
			}
		}
		if found {
			return ""
		}
	}
	return ""
}

// ExtractFloat extracts a float64 value from a map for any of the given keys.
func ExtractFloat(data map[string]interface{}, keys ...string) float64 {
	for _, key := range keys {
		if val, ok := data[key]; ok {
			switch v := val.(type) {
			case float64:
				return v
			case float32:
				return float64(v)
			case int:
				return float64(v)
			case int64:
				return float64(v)
			case json.Number:
				if f, err := v.Float64(); err == nil {
					return f
				}
			}
		}
	}
	return 0
}

// ExtractRawMessages extracts json.RawMessage arrays from a map using multiple possible keys.
func ExtractRawMessages(data map[string]interface{}, keys ...string) []json.RawMessage {
	var result []json.RawMessage
	for _, key := range keys {
		if val, ok := data[key]; ok {
			if arr, ok := val.([]interface{}); ok {
				for _, item := range arr {
					if rawBytes, err := json.Marshal(item); err == nil {
						result = append(result, rawBytes)
					}
				}
			}
		}
	}
	return result
}

// ProductData holds extracted product fields from Headout API response.
type ProductData struct {
	HeadoutID   string
	Title       string
	Description string
	CityCode    string
	CityName    string
	Category    string
	ImageURL    string
	Currency    string
	PriceFrom   float64
	Rating      float64
	ReviewCount int
	Duration    string
	RawJSON     []byte
	Variants    []VariantData
}

// VariantData holds extracted variant fields.
type VariantData struct {
	ID    string
	Title string
}

// ExtractProductData parses a Headout product response map into a ProductData struct.
func ExtractProductData(pData map[string]interface{}) (*ProductData, error) {
	headoutID := ExtractString(pData, "id")
	if headoutID == "" {
		return nil, fmt.Errorf("product has no id")
	}

	title := ExtractNestedString(pData, "name", "title")
	description := ExtractString(pData, "description")
	cityName := ExtractNestedString(pData, "city.name", "cityName")
	category := ExtractNestedString(pData, "primaryCategory.name", "category")

	var imageURL string
	if media, ok := pData["media"].([]interface{}); ok && len(media) > 0 {
		if first, ok := media[0].(map[string]interface{}); ok {
			if url, ok := first["url"].(string); ok {
				imageURL = url
			}
		}
	}
	if imageURL == "" {
		imageURL = ExtractNestedString(pData, "imageUrl")
	}

	currency := ExtractNestedString(pData, "currency.code", "listingPrice.currencyCode", "pricing.currency")

	var priceFrom float64
	if lp, ok := pData["listingPrice"].(map[string]interface{}); ok {
		if mp, ok := lp["minimumPrice"].(map[string]interface{}); ok {
			priceFrom = ExtractFloat(mp, "finalPrice")
		}
	}
	if priceFrom == 0 {
		if pricing, ok := pData["pricing"].(map[string]interface{}); ok {
			priceFrom = ExtractFloat(pricing, "headoutSellingPrice")
		}
	}

	rating := ExtractFloat(pData, "averageRating")
	if rating == 0 {
		if rs, ok := pData["reviewsSummary"].(map[string]interface{}); ok {
			rating = ExtractFloat(rs, "averageRating")
		}
	}

	var reviewCount int
	if rs, ok := pData["reviewsSummary"].(map[string]interface{}); ok {
		reviewCount = int(ExtractFloat(rs, "ratingsCount"))
	}

	duration := ExtractString(pData, "duration")
	rawCityCode := ExtractNestedString(pData, "cityCode", "city.code")

	rawJSON, _ := json.Marshal(pData)

	// Extract variants
	var variants []VariantData
	if vArr, ok := pData["variants"].([]interface{}); ok {
		for _, v := range vArr {
			if variant, ok := v.(map[string]interface{}); ok {
				vid := ExtractString(variant, "id")
				if vid == "" {
					continue
				}
				vtitle := ExtractString(variant, "title")
				if vtitle == "" {
					vtitle = ExtractString(variant, "name")
				}
				variants = append(variants, VariantData{ID: vid, Title: vtitle})
			}
		}
	}

	return &ProductData{
		HeadoutID:   headoutID,
		Title:       title,
		Description: description,
		CityCode:    rawCityCode,
		CityName:    cityName,
		Category:    category,
		ImageURL:    imageURL,
		Currency:    currency,
		PriceFrom:   priceFrom,
		Rating:      rating,
		ReviewCount: reviewCount,
		Duration:    duration,
		RawJSON:     rawJSON,
		Variants:    variants,
	}, nil
}
