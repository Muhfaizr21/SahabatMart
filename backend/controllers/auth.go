package controllers

import (
	"encoding/json"
	"net"
	"net/http"
	"strings"
	"time"

	"SahabatMart/backend/models"
	"SahabatMart/backend/utils"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthController struct {
	DB *gorm.DB
}

type RegisterRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
	FullName string `json:"full_name" validate:"required"`
	Phone    string `json:"phone"`
	Role     string `json:"role"` // buyer, merchant, affiliate
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

const (
	maxFailedLoginAttempts = 5
	loginLockDuration      = 15 * time.Minute
)

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

	// Validasi input minimal
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" || req.Password == "" || req.FullName == "" {
		utils.JSONError(w, http.StatusBadRequest, "Email, password, dan nama lengkap wajib diisi")
		return
	}

	if len(req.Password) < 8 {
		utils.JSONError(w, http.StatusBadRequest, "Password minimal 8 karakter")
		return
	}

	// Cek duplikasi email
	var existingUser models.User
	if err := ac.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		utils.JSONError(w, http.StatusConflict, "Email sudah terdaftar")
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal memproses kata sandi")
		return
	}

	// Inisialisasi User
	role := strings.ToLower(req.Role)
	if role == "" {
		role = "buyer"
	}

	user := models.User{
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Role:         role,
		Status:       "active",
		Profile: models.UserProfile{
			FullName: req.FullName,
		},
	}

	if req.Phone != "" {
		user.Phone = &req.Phone
	}

	// Simpan ke DB dengan Transaksi
	err = ac.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&user).Error; err != nil {
			return err
		}

		// Buat record profil aktor jika perlu
		switch role {
		case "merchant":
			return tx.Create(&models.Merchant{
				UserID:    user.ID,
				StoreName: req.FullName + "'s Store",
				Status:    "pending",
			}).Error
		case "affiliate":
			// GenerateRefCode should be robust
			return tx.Create(&models.AffiliateMember{
				UserID:           user.ID,
				RefCode:          utils.GenerateRefCode(req.FullName),
				MembershipTierID: 1,
				Status:           models.AffiliateActive,
			}).Error
		}
		return nil
	})

	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mendaftarkan akun: "+err.Error())
		return
	}

	// Generate Token
	mID, aID := ac.getExtraIDs(user.ID, user.Role)
	token, err := utils.GenerateJWT(user.ID, user.Role, user.Email, mID, aID)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal membuat sesi login")
		return
	}

	// Return logic: exclude sensitive data
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

	var user models.User
	email := strings.TrimSpace(strings.ToLower(req.Email))
	if err := ac.DB.Preload("Profile").Where("email = ?", email).First(&user).Error; err != nil {
		utils.JSONError(w, http.StatusUnauthorized, "Email atau kata sandi salah")
		return
	}

	// Cek Status & Lock
	if user.Status != "active" {
		utils.JSONError(w, http.StatusForbidden, "Akun Anda tidak aktif atau ditangguhkan")
		return
	}
	if user.LockedUntil != nil && user.LockedUntil.After(time.Now()) {
		utils.JSONError(w, http.StatusLocked, "Akun terkunci sementara karena terlalu banyak percobaan gagal")
		return
	}

	// Verifikasi Password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		ac.handleFailedLogin(&user)
		utils.JSONError(w, http.StatusUnauthorized, "Email atau kata sandi salah")
		return
	}

	// Login Berhasil
	clientIP := ac.getClientIP(r)
	ac.handleSuccessfulLogin(&user, clientIP)

	mID, aID := ac.getExtraIDs(user.ID, user.Role)
	token, err := utils.GenerateJWT(user.ID, user.Role, user.Email, mID, aID)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal membuat sesi login")
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"message": "Login berhasil",
		"token":   token,
		"user":    user,
	})
}

func (ac *AuthController) getExtraIDs(userID, role string) (string, string) {
	mID, aID := "", ""
	if role == "merchant" {
		var m models.Merchant
		if err := ac.DB.Select("id").Where("user_id = ?", userID).First(&m).Error; err == nil {
			mID = m.ID
		}
	} else if role == "affiliate" {
		var a models.AffiliateMember
		if err := ac.DB.Select("id").Where("user_id = ?", userID).First(&a).Error; err == nil {
			aID = a.ID
		}
	}
	return mID, aID
}

func (ac *AuthController) getClientIP(r *http.Request) string {
	// Look for X-Forwarded-For header
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		ips := strings.Split(xff, ",")
		return strings.TrimSpace(ips[0])
	}
	
	// Fallback to RemoteAddr
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func (ac *AuthController) handleFailedLogin(user *models.User) {
	newAttempts := user.FailedLoginAttempts + 1
	updates := map[string]interface{}{
		"failed_login_attempts": newAttempts,
	}
	
	if newAttempts >= maxFailedLoginAttempts {
		lockedUntil := time.Now().Add(loginLockDuration)
		updates["locked_until"] = &lockedUntil
	}
	
	ac.DB.Model(user).Updates(updates)
}

func (ac *AuthController) handleSuccessfulLogin(user *models.User, clientIP string) {
	now := time.Now()
	ac.DB.Model(user).Updates(map[string]interface{}{
		"failed_login_attempts": 0,
		"locked_until":          nil,
		"last_login_at":         &now,
		"last_login_ip":         clientIP,
	})
}
