package controllers

import (
	"encoding/json"
	"net"
	"net/http"
	"strings"

	"SahabatMart/backend/models"
	"SahabatMart/backend/services"
	"SahabatMart/backend/utils"

	"gorm.io/gorm"
)

type AuthController struct {
	Service *services.AuthService
}

func NewAuthController(db *gorm.DB) *AuthController {
	return &AuthController{
		Service: services.NewAuthService(db),
	}
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"full_name"`
	Phone    string `json:"phone"`
	Role     string `json:"role"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (ac *AuthController) Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Metode tidak diizinkan")
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Format data tidak valid")
		return
	}

	user, token, err := ac.Service.Register(req.Email, req.Password, req.FullName, req.Phone, req.Role)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "email sudah terdaftar" {
			status = http.StatusConflict
		}
		utils.JSONError(w, status, err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusCreated, map[string]interface{}{
		"message": "Registrasi berhasil",
		"token":   token,
		"user":    user,
	})
}

func (ac *AuthController) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Metode tidak diizinkan")
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Format data tidak valid")
		return
	}

	clientIP := ac.getClientIP(r)
	user, token, err := ac.Service.Login(req.Email, req.Password, clientIP)
	if err != nil {
		utils.JSONError(w, http.StatusUnauthorized, err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"message": "Login berhasil",
		"token":   token,
		"user":    user,
	})
}

func (ac *AuthController) getClientIP(r *http.Request) string {
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		ips := strings.Split(xff, ",")
		return strings.TrimSpace(ips[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// Impersonate memungkinkan Admin login sebagai user lain tanpa password
func (ac *AuthController) Impersonate(w http.ResponseWriter, r *http.Request) {
	var req struct {
		TargetUserID string `json:"target_user_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid request")
		return
	}

	var user models.User
	// Cari user lengkap dengan relasi Merchant/Affiliate
	if err := ac.Service.DB.Preload("Merchant").Preload("Affiliate").First(&user, "id = ?", req.TargetUserID).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "User tidak ditemukan")
		return
	}

	merchantID := ""
	if user.Merchant != nil {
		merchantID = user.Merchant.ID
	}
	affiliateID := ""
	if user.Affiliate != nil {
		affiliateID = user.Affiliate.ID
	}

	token, _ := utils.GenerateJWT(user.ID, user.Role, user.Email, merchantID, affiliateID)
	
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"message": "Ghost login berhasil",
		"token":   token,
		"user":    user,
		"is_ghost": true,
	})
}
