package repositories

import (
	"SahabatMart/backend/models"
	"gorm.io/gorm"
)

type UserRepository struct {
	DB *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{DB: db}
}

func (r *UserRepository) FindByEmail(email string) (*models.User, error) {
	var user models.User
	err := r.DB.Preload("Profile").Preload("Affiliate").Preload("Merchant").Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) Create(user *models.User) error {
	return r.DB.Create(user).Error
}

func (r *UserRepository) Update(user *models.User, updates interface{}) error {
	return r.DB.Model(user).Updates(updates).Error
}

func (r *UserRepository) GetMerchantByID(userID string) (*models.Merchant, error) {
	var m models.Merchant
	err := r.DB.Where("user_id = ?", userID).First(&m).Error
	return &m, err
}

func (r *UserRepository) GetAffiliateByID(identifier string) (*models.AffiliateMember, error) {
	var a models.AffiliateMember
	err := r.DB.Where("id = ? OR user_id = ? OR ref_code = ?", identifier, identifier, identifier).First(&a).Error
	return &a, err
}
