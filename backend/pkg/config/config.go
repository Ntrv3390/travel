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

	// Redis
	RedisHost string
	RedisPort string

	// Headout API
	HeadoutAPIKey string
	HeadoutURL    string

	// Environment
	Environment string
}

func Load() *Config {
	return &Config{
		Port:           getEnv("PORT", "8080"),
		DBHost:         getEnv("DB_HOST", "db-master"),
		DBPort:         getEnv("DB_PORT", "5432"),
		DBUser:         getEnv("DB_USER", "postgres"),
		DBPassword:     getEnv("DB_PASSWORD", "postgres"),
		DBName:         getEnv("DB_NAME", "travel_db"),
		DBSSLMode:      getEnv("DB_SSLMODE", "disable"),
		RedisHost:      getEnv("REDIS_HOST", "cache-layer"),
		RedisPort:      getEnv("REDIS_PORT", "6379"),
		HeadoutAPIKey:  getEnv("HEADOUT_API_KEY", ""),
		HeadoutURL:     getEnv("HEADOUT_URL", "https://api.headout.com"),
		Environment:    getEnv("ENV", "development"),
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
