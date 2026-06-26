package controllers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strings"

	"akuglow/backend/models"
	"akuglow/backend/services"
	"akuglow/backend/utils"

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
	Remember bool   `json:"remember"`
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

	validation := utils.ValidateRegisterInput(req.Email, req.Password, req.FullName, req.Phone)
	if !validation.Valid {
		utils.JSONResponse(w, http.StatusBadRequest, map[string]interface{}{
			"message": "Validasi gagal",
			"errors":  validation.Errors,
		})
		return
	}

	req.Email = utils.SanitizeString(req.Email)
	req.FullName = utils.SanitizeString(req.FullName)
	req.Phone = utils.SanitizeString(req.Phone)

	user, token, err := ac.Service.Register(req.Email, req.Password, req.FullName, req.Phone, req.Role, req.ReferralCode)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "email sudah terdaftar" {
			status = http.StatusConflict
		}
		utils.JSONError(w, status, err.Error())
		return
	}

	// Async sync past guest location logs
	go SyncGuestLogsToUser(ac.Service.DB, user.ID, ac.getClientIP(r))

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

	req.Email = utils.SanitizeString(req.Email)
	if req.Email == "" {
		utils.JSONError(w, http.StatusBadRequest, "Email wajib diisi")
		return
	}
	if req.Password == "" {
		utils.JSONError(w, http.StatusBadRequest, "Password wajib diisi")
		return
	}

	clientIP := ac.getClientIP(r)
	user, accessToken, refreshToken, err := ac.Service.Login(req.Email, req.Password, clientIP, req.Remember)
	if err != nil {
		utils.JSONError(w, http.StatusUnauthorized, err.Error())
		return
	}

	// Async sync past guest location logs
	go SyncGuestLogsToUser(ac.Service.DB, user.ID, clientIP)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"message":       "Login berhasil",
		"token":         accessToken,
		"refresh_token": refreshToken,
		"user":          user,
	})
}

// [FIX #7] RefreshToken — exchanges a valid refresh token for a new access token + rotated refresh token.
// POST /api/auth/refresh
func (ac *AuthController) RefreshToken(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Format data tidak valid")
		return
	}
	if req.RefreshToken == "" {
		utils.JSONError(w, http.StatusBadRequest, "refresh_token wajib diisi")
		return
	}

	userID, _, err := utils.ValidateRefreshToken(req.RefreshToken)
	if err != nil {
		utils.JSONError(w, http.StatusUnauthorized, "Refresh token tidak valid atau kadaluarsa")
		return
	}

	// Revoke old, issue new pair (token rotation)
	_ = utils.RevokeRefreshToken(req.RefreshToken)

	// Rebuild user context from DB
	var user models.User
	if err := ac.Service.DB.Preload("Merchant").Preload("Affiliate").First(&user, "id = ?", userID).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "User tidak ditemukan")
		return
	}
	ac.Service.PopulatePermissions(&user)

	mID, aID := ac.Service.GetExtraIDs(user.ID, user.Role)
	accessToken, refreshToken, err := utils.GenerateTokenPair(user.ID, user.Role, user.Email, mID, aID)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal membuat token baru")
		return
	}
	_ = utils.StoreRefreshToken(user.ID, refreshToken)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"message":       "Token berhasil diperbarui",
		"token":         accessToken,
		"refresh_token": refreshToken,
	})
}

func (ac *AuthController) getClientIP(r *http.Request) string {
	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip = r.Header.Get("X-Real-IP")
	}
	if ip == "" {
		var err error
		ip, _, err = net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			ip = r.RemoteAddr
		}
	}
	if strings.Contains(ip, ",") {
		parts := strings.Split(ip, ",")
		ip = strings.TrimSpace(parts[0])
	}
	return ip
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

	token, _ := utils.GenerateJWT(user.ID, user.Role, user.Email, merchantID, affiliateID, true)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"message":  "Ghost login berhasil",
		"token":    token,
		"user":     user,
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
	ac.Service.PopulatePermissions(&user)

	utils.JSONResponse(w, http.StatusOK, user)
}

func (ac *AuthController) getGoogleConfig() *oauth2.Config {
	configSvc := services.NewConfigService(ac.Service.DB)
	return &oauth2.Config{
		RedirectURL:  configSvc.Get("google_redirect_url", os.Getenv("GOOGLE_REDIRECT_URL")),
		ClientID:     configSvc.Get("google_client_id", os.Getenv("GOOGLE_CLIENT_ID")),
		ClientSecret: configSvc.Get("google_client_secret", os.Getenv("GOOGLE_CLIENT_SECRET")),
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
		utils.JSONErrorInternal(w, err, "")
		return
	}

	// Async sync past guest location logs
	go SyncGuestLogsToUser(ac.Service.DB, user.ID, ac.getClientIP(r))

	frontendURL := ac.Service.GetFrontendURL()

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

	fmt.Printf("📩 Password reset requested for: %s\n", req.Email)
	token, err := ac.Service.RequestPasswordReset(req.Email)
	if err != nil {
		fmt.Printf("❌ Failed to request reset for %s: %v\n", req.Email, err)
		utils.JSONError(w, http.StatusNotFound, err.Error())
		return
	}
	fmt.Printf("✅ Reset token generated: %s\n", token)

	resp := map[string]interface{}{
		"message": "Instruksi reset password telah dikirim ke email Anda",
	}

	isDev := os.Getenv("APP_ENV") != "production"
	if isDev {
		log.Printf("📧 [DEV] Reset token for %s: %s", req.Email, token)
	}

	utils.JSONResponse(w, http.StatusOK, resp)
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
