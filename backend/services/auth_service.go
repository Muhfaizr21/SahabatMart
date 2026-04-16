package services

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/repositories"
	"SahabatMart/backend/utils"
	"errors"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService struct {
	Repo *repositories.UserRepository
	DB   *gorm.DB
}

func NewAuthService(db *gorm.DB) *AuthService {
	return &AuthService{
		Repo: repositories.NewUserRepository(db),
		DB:   db,
	}
}

func (s *AuthService) Register(email, password, fullName, phone, role string) (*models.User, string, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	role = strings.ToLower(role)
	if role == "" {
		role = "buyer"
	}

	// Check existing
	if _, err := s.Repo.FindByEmail(email); err == nil {
		return nil, "", errors.New("email sudah terdaftar")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, "", err
	}

	user := &models.User{
		Email:        email,
		PasswordHash: string(hashedPassword),
		Role:         role,
		Status:       "active",
		Profile: models.UserProfile{
			FullName: fullName,
		},
	}

	if phone != "" {
		user.Phone = &phone
	}

	err = s.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(user).Error; err != nil {
			return err
		}

		switch role {
		case "merchant":
			return tx.Create(&models.Merchant{
				UserID:    user.ID,
				StoreName: fullName + "'s Store",
				Status:    "pending",
			}).Error
		case "affiliate":
			return tx.Create(&models.AffiliateMember{
				UserID:           user.ID,
				RefCode:          utils.GenerateRefCode(fullName),
				MembershipTierID: 1,
				Status:           models.AffiliateActive,
			}).Error
		}
		return nil
	})

	if err != nil {
		return nil, "", err
	}

	mID, aID := s.GetExtraIDs(user.ID, user.Role)
	token, err := utils.GenerateJWT(user.ID, user.Role, user.Email, mID, aID)
	
	return user, token, err
}

func (s *AuthService) Login(email, password, clientIP string) (*models.User, string, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	user, err := s.Repo.FindByEmail(email)
	if err != nil {
		return nil, "", errors.New("email atau kata sandi salah")
	}

	if user.Status != "active" {
		return nil, "", errors.New("akun tidak aktif")
	}

	if user.LockedUntil != nil && user.LockedUntil.After(time.Now()) {
		return nil, "", errors.New("akun terkunci sementara")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		s.HandleFailedLogin(user)
		return nil, "", errors.New("email atau kata sandi salah")
	}

	s.HandleSuccessfulLogin(user, clientIP)

	mID, aID := s.GetExtraIDs(user.ID, user.Role)
	token, err := utils.GenerateJWT(user.ID, user.Role, user.Email, mID, aID)

	return user, token, err
}

func (s *AuthService) GetExtraIDs(userID, role string) (string, string) {
	mID, aID := "", ""
	if role == "merchant" {
		if m, err := s.Repo.GetMerchantByID(userID); err == nil {
			mID = m.ID
		}
	} else if role == "affiliate" {
		if a, err := s.Repo.GetAffiliateByID(userID); err == nil {
			aID = a.ID
		}
	}
	return mID, aID
}

func (s *AuthService) HandleFailedLogin(user *models.User) {
	newAttempts := user.FailedLoginAttempts + 1
	updates := map[string]interface{}{
		"failed_login_attempts": newAttempts,
	}
	if newAttempts >= 5 {
		lockedUntil := time.Now().Add(15 * time.Minute)
		updates["locked_until"] = &lockedUntil
	}
	s.Repo.Update(user, updates)
}

func (s *AuthService) HandleSuccessfulLogin(user *models.User, clientIP string) {
	now := time.Now()
	s.Repo.Update(user, map[string]interface{}{
		"failed_login_attempts": 0,
		"locked_until":          nil,
		"last_login_at":         &now,
		"last_login_ip":         clientIP,
	})
}
