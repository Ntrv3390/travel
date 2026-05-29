package handlers

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/gin-gonic/gin"
	"github.com/travel/backend/internal/services"
	"github.com/travel/backend/pkg/config"
	"github.com/travel/backend/pkg/logger"
)

type HeadoutHandler struct {
	service       *services.HeadoutProxyService
	publicService *services.HeadoutProxyService
}

func NewHeadoutHandler(cfg *config.Config) *HeadoutHandler {
	publicCfg := *cfg
	publicCfg.HeadoutURL = cfg.HeadoutURL

	return &HeadoutHandler{
		service:       services.NewHeadoutProxyService(cfg),
		publicService: services.NewHeadoutProxyService(&publicCfg),
	}
}

// v1 endpoints
func (h *HeadoutHandler) GetProductByID(c *gin.Context) {
	path := fmt.Sprintf("/v1/product/get/%s", url.PathEscape(c.Param("productId")))
	h.proxyGetWithService(c, h.publicService, path, false)
}

func (h *HeadoutHandler) ListProductsByCity(c *gin.Context) {
	h.proxyGetWithService(c, h.publicService, "/v1/product/listing/list-by/city", false)
}

func (h *HeadoutHandler) ListProductsByCategory(c *gin.Context) {
	h.proxyGetWithService(c, h.publicService, "/v1/product/listing/list-by/category", false)
}

func (h *HeadoutHandler) ListInventoryByVariant(c *gin.Context) {
	h.proxyGetWithService(c, h.publicService, "/v1/inventory/list-by/variant", false)
}

func (h *HeadoutHandler) ListBookings(c *gin.Context) {
	h.proxyGet(c, "/v1/booking", true)
}

func (h *HeadoutHandler) GetBookingByID(c *gin.Context) {
	path := fmt.Sprintf("/v1/booking/%s", url.PathEscape(c.Param("id")))
	h.proxyGet(c, path, true)
}

func (h *HeadoutHandler) CreateBooking(c *gin.Context) {
	h.proxyBodyRequest(c, http.MethodPost, "/v1/booking", true)
}

func (h *HeadoutHandler) UpdateBooking(c *gin.Context) {
	path := fmt.Sprintf("/v1/booking/%s", url.PathEscape(c.Param("id")))
	h.proxyBodyRequest(c, http.MethodPut, path, true)
}

func (h *HeadoutHandler) ListCities(c *gin.Context) {
	h.proxyGetWithService(c, h.publicService, "/v1/city", false)
}

func (h *HeadoutHandler) ListCategoriesByCityV1(c *gin.Context) {
	h.proxyGetWithService(c, h.publicService, "/v1/category/list-by/city", false)
}

// v2 endpoints
func (h *HeadoutHandler) ListProductsV2(c *gin.Context) {
	h.proxyGet(c, "/v2/products", true)
}

func (h *HeadoutHandler) ListCategoriesV2(c *gin.Context) {
	h.proxyGet(c, "/v2/categories", true)
}

func (h *HeadoutHandler) ListCollectionsV2(c *gin.Context) {
	h.proxyGet(c, "/v2/collections", true)
}

func (h *HeadoutHandler) ListSubcategoriesV2(c *gin.Context) {
	h.proxyGet(c, "/v2/subcategories", true)
}

func (h *HeadoutHandler) proxyGet(c *gin.Context, path string, requiresAuth bool) {
	h.proxyGetWithService(c, h.service, path, requiresAuth)
}

func (h *HeadoutHandler) proxyGetWithService(c *gin.Context, service *services.HeadoutProxyService, path string, requiresAuth bool) {
	upstream, err := service.Get(c.Request.Context(), path, c.Request.URL.Query(), requiresAuth)
	if err != nil {
		h.handleProxyError(c, err)
		return
	}

	h.writeUpstreamResponse(c, upstream)
}

func (h *HeadoutHandler) proxyBodyRequest(c *gin.Context, method string, path string, requiresAuth bool) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	var upstream *services.UpstreamResponse
	switch method {
	case http.MethodPost:
		upstream, err = h.service.Post(c.Request.Context(), path, c.Request.URL.Query(), body, requiresAuth)
	case http.MethodPut:
		upstream, err = h.service.Put(c.Request.Context(), path, c.Request.URL.Query(), body, requiresAuth)
	default:
		err = fmt.Errorf("unsupported method: %s", method)
	}

	if err != nil {
		h.handleProxyError(c, err)
		return
	}

	h.writeUpstreamResponse(c, upstream)
}

func (h *HeadoutHandler) handleProxyError(c *gin.Context, err error) {
	if errors.Is(err, services.ErrMissingHeadoutAPIKey) {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "headout api key is missing",
		})
		return
	}

	logger.Errorf("Headout proxy request failed: %v", err)
	c.JSON(http.StatusBadGateway, gin.H{
		"error": "failed to fetch data from headout",
	})
}

func (h *HeadoutHandler) writeUpstreamResponse(c *gin.Context, upstream *services.UpstreamResponse) {
	contentType := upstream.Headers.Get("Content-Type")
	if contentType == "" {
		contentType = "application/json"
	}

	c.Data(upstream.StatusCode, contentType, upstream.Body)
}
