package config

import (
	"os"
	"strconv"
)

type Config struct {
	// Server
	Port string

	// Database
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string
	// Headout API
	HeadoutAPIKey         string
	HeadoutURL            string
	HeadoutEnvironment    string
	HeadoutSandboxBaseURL string
	HeadoutStageBaseURL   string
	HeadoutProdBaseURL    string

	// Environment
	Environment string

	// JWT
	JWTSecret string

	// SMTP
	SMTPHost    string
	SMTPPort    string
	SMTPUser    string
	SMTPPass    string
	SMTPFrom    string
	AdminEmail string
}

func Load() *Config {
	cfg := &Config{
		Port:           getEnv("PORT", "8080"),
		DBHost:         getEnv("DB_HOST", "db-master"),
		DBPort:         getEnv("DB_PORT", "5432"),
		DBUser:         getEnv("DB_USER", "postgres"),
		DBPassword:     getEnv("DB_PASSWORD", "postgres"),
		DBName:         getEnv("DB_NAME", "travel_db"),
		DBSSLMode:      getEnv("DB_SSLMODE", "disable"),
		HeadoutAPIKey:         getEnv("HEADOUT_API_KEY", ""),
		HeadoutURL:            getEnv("HEADOUT_URL", ""),
		HeadoutEnvironment:    getEnv("HEADOUT_ENV", ""),
		HeadoutSandboxBaseURL: getEnv("HEADOUT_SANDBOX_BASE_URL", "https://sandbox.api.dev-headout.com/api/public"),
		HeadoutStageBaseURL:   getEnv("HEADOUT_STAGE_BASE_URL", "https://sandbox.api.dev-headout.com/api/public"),
		HeadoutProdBaseURL:    getEnv("HEADOUT_PROD_BASE_URL", "https://www.headout.com/api/public"),
		Environment:           getEnv("ENV", "development"),

		// JWT
		JWTSecret: getEnv("JWT_SECRET", "triipzy-jwt-secret-change-in-production"),

		// SMTP
		SMTPHost:    getEnv("SMTP_HOST", ""),
		SMTPPort:    getEnv("SMTP_PORT", ""),
		SMTPUser:    getEnv("SMTP_USER", ""),
		SMTPPass:    getEnv("SMTP_PASS", ""),
		SMTPFrom:    getEnv("SMTP_FROM", ""),
		AdminEmail: getEnv("ADMIN_EMAIL", ""),
	}

	cfg.HeadoutURL = resolveHeadoutURL(cfg)
	return cfg
}

func resolveHeadoutURL(cfg *Config) string {
	if cfg.HeadoutURL != "" {
		return cfg.HeadoutURL
	}

	headoutEnv := cfg.HeadoutEnvironment
	if headoutEnv == "" {
		switch cfg.Environment {
		case "production":
			headoutEnv = "production"
		case "staging":
			headoutEnv = "stage"
		default:
			headoutEnv = "sandbox"
		}
	}

	switch headoutEnv {
	case "prod", "production":
		return cfg.HeadoutProdBaseURL
	case "stage", "staging":
		return cfg.HeadoutStageBaseURL
	case "sandbox", "test", "development", "dev", "local":
		return cfg.HeadoutSandboxBaseURL
	default:
		return cfg.HeadoutSandboxBaseURL
	}
}

func getEnv(key, defaultVal string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	val := getEnv(key, "")
	if val == "" {
		return defaultVal
	}
	intVal, err := strconv.Atoi(val)
	if err != nil {
		return defaultVal
	}
	return intVal
}
