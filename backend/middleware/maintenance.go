package middleware

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/utils"
	"fmt"
	"net/http"
	"strings"

	"gorm.io/gorm"
)

var bypassRoles = []string{"superadmin", "admin"}

func isAdminBypass(r *http.Request) bool {
	auth := r.Header.Get("Authorization")
	if auth == "" {
		return false
	}
	claims, err := utils.ParseJWT(auth) // ParseJWT handles "Bearer " prefix
	if err != nil {
		return false
	}
	for _, role := range bypassRoles {
		if claims.Role == role {
			return true
		}
	}
	return false
}

func isAuthEndpoint(path string) bool {
	return strings.HasPrefix(path, "/api/auth/")
}

func MaintenanceMiddleware(db *gorm.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			path := r.URL.Path
			fmt.Printf("[DEBUG] MaintenanceMiddleware: path='%s', isAuth=%v, isAdminBypass=%v\n", path, isAuthEndpoint(path), isAdminBypass(r))

			// Admin/superadmin with valid JWT bypass maintenance
			if isAdminBypass(r) {
				next.ServeHTTP(w, r)
				return
			}

			// All /api/admin routes bypass maintenance
			if len(path) >= 10 && path[:10] == "/api/admin" {
				next.ServeHTTP(w, r)
				return
			}

			// All /api/auth routes bypass maintenance (admin can always log in)
			if isAuthEndpoint(path) {
				next.ServeHTTP(w, r)
				return
			}

			// Webhooks & Public Config bypass
			if path == "/api/shipping/webhook" ||
			   path == "/api/tripay/webhook" ||
			   path == "/api/callback/tripay" ||
			   path == "/api/public/configs" ||
			   path == "/api/public/config" {
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