package middleware

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/utils"
	"net/http"
	"gorm.io/gorm"
)

func MaintenanceMiddleware(db *gorm.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip check for critical webhooks and admin routes
			path := r.URL.Path
			if (len(path) >= 10 && path[:10] == "/api/admin") || 
			   path == "/api/shipping/webhook" || 
			   path == "/api/tripay/webhook" ||
			   path == "/api/callback/tripay" {
				next.ServeHTTP(w, r)
				return
			}

			var isMaint models.PlatformConfig
			if err := db.Where("key = ?", "platform_maintenance").First(&isMaint).Error; err == nil {
				if isMaint.Value == "true" {
					var msg models.PlatformConfig
					maintMsg := "Platform sedang dalam pemeliharaan rutin."
					if err := db.Where("key = ?", "platform_maint_msg").First(&msg).Error; err == nil {
						maintMsg = msg.Value
					}
					
					utils.JSONError(w, http.StatusServiceUnavailable, maintMsg)
					return
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}
