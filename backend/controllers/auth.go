package controllers

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"strings"

	"SahabatMart/backend/models"
	"SahabatMart/backend/services"
	"SahabatMart/backend/utils"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	googleoauth "google.golang.org/api/oauth2/v2"
	"google.golang.org/api/option"
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
	Email        string `json:"email"`
	Password     string `json:"password"`
	FullName     string `json:"full_name"`
	Phone        string `json:"phone"`
	Role         string `json:"role"`
	ReferralCode string `json:"referral_code"`
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

	user, token, err := ac.Service.Register(req.Email, req.Password, req.FullName, req.Phone, req.Role, req.ReferralCode)
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

// GetMe mengambil profil user yang sedang login
func (ac *AuthController) GetMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value("user_id").(string)
	if !ok {
		utils.JSONError(w, http.StatusUnauthorized, "Sesi tidak valid")
		return
	}

	var user models.User
	if err := ac.Service.DB.Preload("Profile").Preload("Merchant").Preload("Affiliate").First(&user, "id = ?", userID).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "User tidak ditemukan")
		return
	}

	utils.JSONResponse(w, http.StatusOK, user)
}

func (ac *AuthController) getGoogleConfig() *oauth2.Config {
	return &oauth2.Config{
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"),
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		Scopes:       []string{"https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"},
		Endpoint:     google.Endpoint,
	}
}

func (ac *AuthController) GoogleLogin(w http.ResponseWriter, r *http.Request) {
	ref := r.URL.Query().Get("ref")
	if ref == "" {
		ref = "direct"
	}
	url := ac.getGoogleConfig().AuthCodeURL(ref)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func (ac *AuthController) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	code := r.FormValue("code")
	config := ac.getGoogleConfig()
	
	token, err := config.Exchange(context.Background(), code)
	if err != nil {
		utils.JSONError(w, http.StatusUnauthorized, "Gagal menukar token Google")
		return
	}

	oauth2Service, err := googleoauth.NewService(context.Background(), option.WithTokenSource(config.TokenSource(context.Background(), token)))
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal memuat layanan Google")
		return
	}

	userInfo, err := oauth2Service.Userinfo.Get().Do()
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil data user Google")
		return
	}

	state := r.FormValue("state")
	if state == "direct" || state == "state-token" {
		state = ""
	}

	user, jwtToken, err := ac.Service.HandleGoogleUser(userInfo.Email, userInfo.Name, userInfo.Id, userInfo.Picture, state)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}
	
	// Redirect balik ke frontend dengan token di URL
	http.Redirect(w, r, fmt.Sprintf("%s/login?token=%s&user_id=%s", frontendURL, jwtToken, user.ID), http.StatusTemporaryRedirect)
}

func (ac *AuthController) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Format data tidak valid")
		return
	}

	token, err := ac.Service.RequestPasswordReset(req.Email)
	if err != nil {
		utils.JSONError(w, http.StatusNotFound, err.Error())
		return
	}

	// In production, token is sent via email. 
	// For AkuGlow, we return it in response for debugging/demonstration if needed, 
	// but ideally it should be hidden.
	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"message": "Instruksi reset password telah dikirim ke email Anda",
		"debug_token": token, // REMOVE THIS IN PRODUCTION
	})
}

func (ac *AuthController) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token       string `json:"token"`
		NewPassword string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Format data tidak valid")
		return
	}

	if err := ac.Service.ResetPassword(req.Token, req.NewPassword); err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"message": "Kata sandi berhasil diperbarui. Silakan login kembali.",
	})
}

func (ac *AuthController) ChangePassword(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID, ok := r.Context().Value("user_id").(string)
	if !ok {
		utils.JSONError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		OldPassword string `json:"old_password"`
		NewPassword string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if len(req.NewPassword) < 6 {
		utils.JSONError(w, http.StatusBadRequest, "Password minimal 6 karakter")
		return
	}

	if err := ac.Service.ChangePassword(userID, req.OldPassword, req.NewPassword); err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Password berhasil diubah"})
}
