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
	err := r.DB.Preload("Profile").Where("email = ?", email).First(&user).Error
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
	err := r.DB.Select("id").Where("user_id = ?", userID).First(&m).Error
	return &m, err
}

func (r *UserRepository) GetAffiliateByID(userID string) (*models.AffiliateMember, error) {
	var a models.AffiliateMember
	err := r.DB.Select("id").Where("user_id = ?", userID).First(&a).Error
	return &a, err
}
