package models

import (
	"time"
)

// SkinPreTest - Data formulir awal pengguna
type SkinPreTest struct {
	ID                uint      `gorm:"primaryKey" json:"id"`
	UserID            string    `gorm:"type:uuid;not null;index" json:"user_id"`
	FullName          string    `gorm:"type:varchar(200)" json:"full_name"`
	SkinProblem       string    `gorm:"type:text" json:"skin_problem"`
	SkinType          string    `gorm:"type:varchar(100)" json:"skin_type"`
	PreviousEffects   string    `gorm:"type:text" json:"previous_effects"`
	Suggestions       string    `gorm:"type:text" json:"suggestions"`
	BarcodeToken      string    `gorm:"type:varchar(100);uniqueIndex" json:"barcode_token"`
	CreatedAt         time.Time `json:"created_at"`
}

// SkinProgress - Tracking mingguan selfie & kondisi emosional
type SkinProgress struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	UserID         string    `gorm:"type:uuid;not null;index" json:"user_id"`
	WeekNumber     int       `json:"week_number"`
	SelfieURL      string    `gorm:"type:text" json:"selfie_url"`
	SkinScore      int       `json:"skin_score"`      // Skala 1-10
	EmotionalScore int       `json:"emotional_score"` // Skala 1-10
	RednessScore   int       `json:"redness_score"`   // Hasil Analisis AI (%)
	AcneCount      int       `json:"acne_count"`      // Hasil Analisis AI (Jumlah)
	Notes          string    `gorm:"type:text" json:"notes"`
	CreatedAt      time.Time `json:"created_at"`
}

// SkinJournal - Jurnal harian harian & milestone hari ke-25
type SkinJournal struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	UserID         string    `gorm:"type:uuid;not null;index" json:"user_id"`
	DayNumber      int       `json:"day_number"`
	Content        string    `gorm:"type:text" json:"content"`
	HasAppliedCream bool      `gorm:"default:false" json:"has_applied_cream"`
	AffirmationRead bool      `gorm:"default:false" json:"affirmation_read"`
	IsRewardClaimed bool      `gorm:"default:false" json:"is_reward_claimed"` // Untuk diskon hari ke-25
	CreatedAt      time.Time `json:"created_at"`
}

// SkinWarriorLevel - Gamifikasi level pengguna
type SkinWarriorLevel struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	UserID      string    `gorm:"type:uuid;uniqueIndex" json:"user_id"`
	LevelName   string    `gorm:"type:varchar(50);default:'Novice'" json:"level_name"` // Novice, Survivor, Warrior, Elite
	Experience  int       `gorm:"default:0" json:"experience"`
	TotalJournals int     `gorm:"default:0" json:"total_journals"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (SkinPreTest) TableName() string      { return "skin_pre_tests" }
func (SkinProgress) TableName() string     { return "skin_progress_logs" }
func (SkinJournal) TableName() string      { return "skin_journals" }
func (SkinWarriorLevel) TableName() string { return "skin_warrior_levels" }

// SkinCommunityGroup - Kategori/Grup Komunitas (Dikelola Admin)
type SkinCommunityGroup struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"type:varchar(255);not null" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	Icon        string    `gorm:"type:varchar(50)" json:"icon"` // misal: "face", "spa"
	CreatedAt   time.Time `json:"created_at"`
}

// SkinCommunityPost - Postingan di feed komunitas internal
type SkinCommunityPost struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    string    `gorm:"type:uuid;not null;index" json:"user_id"`
	User      User      `gorm:"foreignKey:UserID" json:"user"`
	GroupID   uint      `gorm:"index" json:"group_id"` // Link ke grup
	Content   string    `gorm:"type:text" json:"content"`
	ImageURL  string    `gorm:"type:text" json:"image_url"`
	Likes     int       `gorm:"default:0" json:"likes"`
	Comments  []SkinCommunityComment `gorm:"foreignKey:PostID" json:"comments"`
	CreatedAt time.Time `json:"created_at"`
}

// SkinCommunityComment - Komentar dan balasan di postingan
type SkinCommunityComment struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	PostID    uint      `gorm:"index" json:"post_id"`
	UserID    string    `gorm:"type:uuid;not null;index" json:"user_id"`
	User      User      `gorm:"foreignKey:UserID" json:"user"`
	Content   string    `gorm:"type:text" json:"content"`
	ParentID  *uint     `gorm:"index" json:"parent_id"` // Untuk balasan/reply
	CreatedAt time.Time `json:"created_at"`
}

func (SkinCommunityGroup) TableName() string   { return "skin_community_groups" }
func (SkinCommunityPost) TableName() string    { return "skin_community_posts" }
func (SkinCommunityComment) TableName() string { return "skin_community_comments" }
