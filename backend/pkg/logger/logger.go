package logger

import (
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var globalLogger *zap.SugaredLogger

func Init(environment string) error {
	var config zap.Config

	if environment == "production" {
		config = zap.NewProductionConfig()
	} else {
		config = zap.NewDevelopmentConfig()
		config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	}

	logger, err := config.Build()
	if err != nil {
		return err
	}

	globalLogger = logger.Sugar()
	return nil
}

func Get() *zap.SugaredLogger {
	if globalLogger == nil {
		panic("logger not initialized")
	}
	return globalLogger
}

func Close() {
	if globalLogger != nil {
		globalLogger.Sync()
	}
}

func Info(args ...interface{}) {
	Get().Info(args...)
}

func Error(args ...interface{}) {
	Get().Error(args...)
}

func Warn(args ...interface{}) {
	Get().Warn(args...)
}

func Debug(args ...interface{}) {
	Get().Debug(args...)
}

func Infof(template string, args ...interface{}) {
	Get().Infof(template, args...)
}

func Errorf(template string, args ...interface{}) {
	Get().Errorf(template, args...)
}

func Warnf(template string, args ...interface{}) {
	Get().Warnf(template, args...)
}

func Debugf(template string, args ...interface{}) {
	Get().Debugf(template, args...)
}
