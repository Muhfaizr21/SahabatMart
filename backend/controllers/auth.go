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
	FullName string `json:"full_name"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

const maxFailedLoginAttempts = 5
const loginLockDuration = 15 * time.Minute

func (ac *AuthController) Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Email == "" || req.Password == "" || req.FullName == "" {
		utils.JSONError(w, http.StatusBadRequest, "Email, password, and full name are required")
		return
	}

	// Cek apakah email sudah ada
	var existingUser models.User
	if err := ac.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		utils.JSONError(w, http.StatusConflict, "Email is already registered")
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Failed to hash password")
		return
	}

	var phonePtr *string
	if req.Phone != "" {
		phonePtr = &req.Phone
	}

	user := models.User{
		Email:        req.Email,
		Phone:        phonePtr,
		PasswordHash: string(hashedPassword),
		Role:         "buyer", // Default mendaftar sebagai pembeli
		Status:       "active",
		Profile: models.UserProfile{
			FullName: req.FullName,
		},
	}

	if err := ac.DB.Create(&user).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Failed to create user account")
		return
	}

	token, _ := utils.GenerateJWT(user.ID, user.Role, user.Email)

	utils.JSONResponse(w, http.StatusCreated, map[string]interface{}{
		"status":  "success",
		"message": "User registered successfully",
		"token":   token,
		"user":    user,
	})
}

func (ac *AuthController) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	var user models.User
	now := time.Now()
	email := strings.ToLower(strings.TrimSpace(req.Email))
	// Preload Profile agar info user_profile terbawa saat login
	if err := ac.DB.Preload("Profile").Where("email = ?", email).First(&user).Error; err != nil {
		utils.JSONError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	if user.Status != "active" {
		utils.JSONError(w, http.StatusForbidden, "Account is not active")
		return
	}

	if user.LockedUntil != nil && user.LockedUntil.After(now) {
		utils.JSONError(w, http.StatusLocked, "Account is temporarily locked due to failed login attempts")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		updates := map[string]interface{}{
			"failed_login_attempts": user.FailedLoginAttempts + 1,
		}
		if user.FailedLoginAttempts+1 >= maxFailedLoginAttempts {
			lockedUntil := now.Add(loginLockDuration)
			updates["locked_until"] = &lockedUntil
		}
		ac.DB.Model(&user).Updates(updates)
		utils.JSONError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	token, err := utils.GenerateJWT(user.ID, user.Role, user.Email)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	clientIP := r.RemoteAddr
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		clientIP = host
	}

	ac.DB.Model(&user).Updates(map[string]interface{}{
		"failed_login_attempts": 0,
		"locked_until":          nil,
		"last_login_at":         &now,
		"last_login_ip":         clientIP,
	})

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":  "success",
		"message": "Login successful",
		"token":   token,
		"user":    user,
	})
}
