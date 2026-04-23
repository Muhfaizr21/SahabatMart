package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID                  string         `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	Email               string         `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	Phone               *string        `gorm:"type:varchar(20);uniqueIndex" json:"phone"`
	PhoneCountryCode    string         `gorm:"type:varchar(5);default:'+62'" json:"phone_country_code"`
	PasswordHash        *string        `gorm:"type:text" json:"-"`
	GoogleID            *string        `gorm:"type:varchar(100);uniqueIndex" json:"google_id"`
	Role                string         `gorm:"type:user_role;default:'affiliate';not null" json:"role"`
	AdminRole           string         `gorm:"type:varchar(50)" json:"admin_role"` // super, finance, cs_staff
	Department          string         `gorm:"type:varchar(100)" json:"department"` // IT, Marketing, Finance
	AdminPermissions    string         `gorm:"type:text" json:"admin_permissions"` // ["manage_users", "manage_finance"]
	Status              string         `gorm:"type:user_status;default:'active';not null" json:"status"`
	EmailVerifiedAt     *time.Time     `json:"email_verified_at"`
	PhoneVerifiedAt     *time.Time     `json:"phone_verified_at"`
	TwoFactorEnabled    bool           `gorm:"default:false" json:"two_factor_enabled"`
	TwoFactorSecret     *string        `json:"-"`
	LastLoginAt         *time.Time     `json:"last_login_at"`
	LastLoginIp         *string        `gorm:"type:inet" json:"last_login_ip"`
	FailedLoginAttempts int            `gorm:"default:0" json:"failed_login_attempts"`
	LockedUntil         *time.Time     `json:"locked_until"`
	CreatedAt           time.Time      `json:"created_at"`
	UpdatedAt           time.Time      `json:"updated_at"`
	DeletedAt           gorm.DeletedAt `gorm:"index" json:"-"`

	Profile UserProfile `gorm:"foreignKey:UserID" json:"profile"`
	Merchant *Merchant  `gorm:"foreignKey:UserID" json:"merchant,omitempty"`
	Affiliate *AffiliateMember `gorm:"foreignKey:UserID" json:"affiliate,omitempty"`
}

type UserProfile struct {
	ID          string    `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	UserID      string    `gorm:"type:uuid;uniqueIndex;not null" json:"user_id"`
	FullName    string    `gorm:"type:varchar(150);not null" json:"full_name"`
	DisplayName *string   `gorm:"type:varchar(100)" json:"display_name"`
	AvatarUrl   *string   `gorm:"type:text" json:"avatar_url"`
	Gender      *string   `gorm:"type:gender_type" json:"gender"`
	DateOfBirth *string   `gorm:"type:date" json:"date_of_birth"`
	Bio         *string   `gorm:"type:text" json:"bio"`
	Address     string    `gorm:"type:text" json:"address"`
	City        string    `gorm:"type:varchar(100)" json:"city"`
	Province    string    `gorm:"type:varchar(100)" json:"province"`
	ZipCode      string    `gorm:"type:varchar(10)" json:"zip_code"`
	RewardPoints int64     `gorm:"default:0" json:"reward_points"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (User) TableName() string {
	return "users"
}

func (UserProfile) TableName() string {
	return "user_profiles"
}
