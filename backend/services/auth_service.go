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
	Repo      *repositories.UserRepository
	DB        *gorm.DB
	Affiliate *AffiliateService
}

func NewAuthService(db *gorm.DB) *AuthService {
	return &AuthService{
		Repo:      repositories.NewUserRepository(db),
		DB:        db,
		Affiliate: NewAffiliateService(db, NewNotificationService(db)),
	}
}

func (s *AuthService) Register(email, password, fullName, phone, role, referralCode string) (*models.User, string, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	role = strings.ToLower(role)
	if role == "" {
		role = "affiliate"
	}

	// Resolve Upline ID from Referral Code if provided
	var uplineID *string
	var resolvedUplineCode string
	if referralCode != "" {
		var upline models.AffiliateMember
		if err := s.DB.Where("ref_code = ?", referralCode).First(&upline).Error; err == nil {
			uID := upline.ID
			uplineID = &uID
			resolvedUplineCode = upline.RefCode
		}
	}

	// Check existing
	if _, err := s.Repo.FindByEmail(email); err == nil {
		return nil, "", errors.New("email sudah terdaftar")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, "", err
	}

	hashedPasswordStr := string(hashedPassword)
	user := &models.User{
		Email:        email,
		PasswordHash: &hashedPasswordStr,
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

		// [Akuglow Special] Every user is a partner/mitra
		aff := &models.AffiliateMember{
			UserID:           user.ID,
			RefCode:          utils.GenerateRefCode(fullName),
			MembershipTierID: 1, // Basic Tier
			Status:           models.AffiliateActive,
			UplineID:         uplineID,
			UplineCode:       resolvedUplineCode,
		}

		if err := tx.Create(aff).Error; err != nil {
			return err
		}

		if role == "merchant" {
			if err := tx.Create(&models.Merchant{
				UserID:    user.ID,
				StoreName: fullName + "'s Store",
				Status:    "pending",
			}).Error; err != nil {
				return err
			}
		}

		// [Akuglow Sync] Trigger Network Update for Upline
		if aff.UplineID != nil && *aff.UplineID != "" {
			go s.Affiliate.UpdateUplineSnapshotsRecursive(*aff.UplineID)
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

	if user.PasswordHash == nil {
		return nil, "", errors.New("silakan login menggunakan Google")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(password)); err != nil {
		s.HandleFailedLogin(user)
		return nil, "", errors.New("email atau kata sandi salah")
	}

	s.HandleSuccessfulLogin(user, clientIP)

	s.PopulatePermissions(user)

	mID, aID := s.GetExtraIDs(user.ID, user.Role)
	token, err := utils.GenerateJWT(user.ID, user.Role, user.Email, mID, aID)

	return user, token, err
}

func (s *AuthService) PopulatePermissions(user *models.User) {
	if user.Role == "superadmin" {
		user.Permissions = []string{"all"}
		return
	}
	if user.Role == "admin" && user.AdminRole != "" {
		var role models.Role
		if err := s.DB.Preload("Permissions").First(&role, "name = ?", user.AdminRole).Error; err == nil {
			var perms []string
			for _, p := range role.Permissions {
				perms = append(perms, p.Code)
			}
			user.Permissions = perms
		}
	}
}

func (s *AuthService) GetExtraIDs(userID, role string) (string, string) {
	mID, aID := "", ""
	
	// Everyone has an affiliate record
	if a, err := s.Repo.GetAffiliateByID(userID); err == nil {
		aID = a.ID
	}

	// [AkuGlow] Both merchants and superadmins can have a merchant/warehouse context
	if role == "merchant" || role == "superadmin" {
		if m, err := s.Repo.GetMerchantByID(userID); err == nil {
			mID = m.ID
		}
	}
	return mID, aID
}

// HandleGoogleUser memproses login/register via Google dengan dukungan Referral Code
func (s *AuthService) HandleGoogleUser(email, fullName, googleID, avatar, referralCode string) (*models.User, string, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	
	var user models.User
	err := s.DB.Preload("Profile").Where("email = ?", email).First(&user).Error
	
	if err == gorm.ErrRecordNotFound {
		// Buat user baru jika belum ada
		user = models.User{
			Email:    email,
			GoogleID: &googleID,
			Role:     "affiliate",
			Status:   "active",
			Profile: models.UserProfile{
				FullName:  fullName,
				AvatarUrl: &avatar,
			},
		}
		
		// Resolve Upline ID from Referral Code if provided
		var uplineID *string
		var uplineCode string
		if referralCode != "" {
			var upline models.AffiliateMember
			if err := s.DB.Where("ref_code = ?", referralCode).First(&upline).Error; err == nil {
				uID := upline.ID
				uplineID = &uID
				uplineCode = upline.RefCode
			}
		}

		err = s.DB.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&user).Error; err != nil {
				return err
			}
			// Setiap user otomatis jadi affiliate/mitra
			aff := &models.AffiliateMember{
				UserID:           user.ID,
				RefCode:          utils.GenerateRefCode(fullName),
				MembershipTierID: 1,
				Status:           models.AffiliateActive,
				UplineID:         uplineID,
				UplineCode:       uplineCode,
			}
			if err := tx.Create(aff).Error; err != nil {
				return err
			}

			// Sync Network (Infinite Depth) via Background Routine
			if uplineID != nil {
				go s.Affiliate.UpdateUplineSnapshotsRecursive(*uplineID)
			}
			return nil
		})
		if err != nil {
			return nil, "", err
		}
	} else if err != nil {
		return nil, "", err
	} else {
		// Update Google ID jika belum ada
		if user.GoogleID == nil || *user.GoogleID == "" {
			s.DB.Model(&user).Update("google_id", googleID)
		}
	}
	
	mID, aID := s.GetExtraIDs(user.ID, user.Role)
	token, err := utils.GenerateJWT(user.ID, user.Role, user.Email, mID, aID)
	
	return &user, token, err
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

// RequestPasswordReset creates a reset token and returns it (in a real app, this would be emailed)
func (s *AuthService) RequestPasswordReset(email string) (string, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	var user models.User
	if err := s.DB.Where("email = ?", email).First(&user).Error; err != nil {
		return "", errors.New("email tidak ditemukan")
	}

	token := utils.GenerateRandomString(32)
	expiry := time.Now().Add(1 * time.Hour)

	reset := models.PasswordReset{
		Email:     email,
		Token:     token,
		ExpiredAt: expiry,
	}

	if err := s.DB.Create(&reset).Error; err != nil {
		return "", err
	}

	// In a real production app, send email here
	// For now, we return it so the dev/user can see it or use it
	return token, nil
}

// ResetPassword validates the token and updates the user's password
func (s *AuthService) ResetPassword(token, newPassword string) error {
	var reset models.PasswordReset
	if err := s.DB.Where("token = ? AND expired_at > ? AND used_at IS NULL", token, time.Now()).First(&reset).Error; err != nil {
		return errors.New("token tidak valid atau sudah kadaluarsa")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	hashedPasswordStr := string(hashedPassword)
	
	err = s.DB.Transaction(func(tx *gorm.DB) error {
		// Update password
		if err := tx.Model(&models.User{}).Where("email = ?", reset.Email).Update("password_hash", &hashedPasswordStr).Error; err != nil {
			return err
		}

		// Mark token as used
		now := time.Now()
		reset.UsedAt = &now
		if err := tx.Save(&reset).Error; err != nil {
			return err
		}

		return nil
	})

	return err
}

func (s *AuthService) ChangePassword(userID string, oldPassword, newPassword string) error {
	var user models.User
	if err := s.DB.First(&user, "id = ?", userID).Error; err != nil {
		return errors.New("pengguna tidak ditemukan")
	}

	// Verify old password
	if user.PasswordHash != nil {
		if err := bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(oldPassword)); err != nil {
			return errors.New("kata sandi lama tidak sesuai")
		}
	}

	// Hash new password
	hashed, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	hashedStr := string(hashed)
	return s.DB.Model(&user).Update("password_hash", hashedStr).Error
}
