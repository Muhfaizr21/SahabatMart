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

type SkinAnalysisResult struct {
	SkinScore       int      `json:"skin_score"`       // Skala 1-10
	EmotionScore    int      `json:"emotion_score"`    // Skala 1-10
	Redness         int      `json:"redness"`          // 0-100%
	AcneCount       int      `json:"acne_count"`       // Jumlah blemish
	Moisture        int      `json:"moisture"`         // 0-100%
	SkinType        string   `json:"skin_type"`
	SkinTone        string   `json:"skin_tone"`
	PrimaryConcern  string   `json:"primary_concern"`
	Summary         string   `json:"summary"`
	Recommendations []string `json:"recommendations"`
	PositiveNotes   string   `json:"positive_notes"`
	HealingMessage  string   `json:"healing_message"`
	AIProvider      string   `json:"ai_provider"`
	IsMock          bool     `json:"is_mock"`
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
	AllowMarketing bool      `gorm:"default:false" json:"allow_marketing"`
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

// --- DYNAMIC JOURNEY CONFIGURATION (ADMIN MANAGED) ---

// SkinJourneyProgram - Program type (Essential, Advanced, Intensive)
type SkinJourneyProgram struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"type:varchar(100);not null" json:"name"` // Essential Basic, Advanced, Intensive
	Description string    `gorm:"type:text" json:"description"`
	Level       int       `json:"level"` // 1: Essential, 2: Advanced, 3: Intensive
	StepCount   int       `json:"step_count"`
	IsActive    bool      `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
}

// SkinJourneyStep - Individual step definition (e.g., Cleanse, Tone)
type SkinJourneyStep struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Name         string    `gorm:"type:varchar(100);not null" json:"name"` // Cleanse, Tone, Serum, etc.
	Icon         string    `gorm:"type:varchar(50)" json:"icon"`
	Description  string    `gorm:"type:text" json:"description"`
	Order        int       `json:"order"`
	IsActive     bool      `gorm:"default:true" json:"is_active"`
}

// SkinJourneyRoutine - Link Program -> Step + Timing
type SkinJourneyRoutine struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	ProgramID   uint      `gorm:"index" json:"program_id"`
	StepID      uint      `gorm:"index" json:"step_id"`
	Step        SkinJourneyStep `gorm:"foreignKey:StepID" json:"step"`
	TimeOfDay   string    `gorm:"type:varchar(20)" json:"time_of_day"` // morning, evening, both, weekly
	DurationMin int       `json:"duration_min"`
	Instructions string    `gorm:"type:text" json:"instructions"` // Markdown instructions
}

// SkinJourneyProductMapping - Dynamic product recommendation logic
type SkinJourneyProductMapping struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	ProductID   string    `gorm:"type:uuid;index" json:"product_id"`
	Product     Product   `gorm:"foreignKey:ProductID" json:"product"`
	SkinType    string    `gorm:"type:varchar(50)" json:"skin_type"`    // oily, dry, etc.
	SkinConcern string    `gorm:"type:varchar(100)" json:"skin_concern"` // acne, dark spots, etc.
	StepType    string    `gorm:"type:varchar(50)" json:"step_type"`    // matches SkinJourneyStep.Name
	Priority    int       `gorm:"default:0" json:"priority"`
}

// SkinJourneyAIConfig - Dynamic Prompts for AI Analysis & Recommendations
type SkinJourneyAIConfig struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Stage       string    `gorm:"type:varchar(50);uniqueIndex" json:"stage"` // analysis, set_program, recommendation, cara_pakai
	PromptTitle string    `gorm:"type:varchar(200)" json:"prompt_title"`
	PromptBody  string    `gorm:"type:text" json:"prompt_body"`
	SystemRole  string    `gorm:"type:text" json:"system_role"`
	Temperature float64   `gorm:"default:0.1" json:"temperature"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// UserSkinJourney - User's active program and progress
type UserSkinJourney struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	UserID          string    `gorm:"type:uuid;not null;uniqueIndex" json:"user_id"`
	ProgramID       uint      `json:"program_id"`
	Program         SkinJourneyProgram `gorm:"foreignKey:ProgramID" json:"program"`
	CurrentWeek     int       `gorm:"default:1" json:"current_week"`
	StartedAt       time.Time `json:"started_at"`
	IsCompleted     bool      `gorm:"default:false" json:"is_completed"`
	SkinProfileJSON string    `gorm:"type:text" json:"skin_profile_json"` // Stores AI results
}

// SkinStepLog - Mencatat penyelesaian langkah rutin harian
type SkinStepLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    string    `gorm:"type:uuid;not null;index" json:"user_id"`
	RoutineID uint      `gorm:"index" json:"routine_id"`
	Completed bool      `gorm:"default:true" json:"completed"`
	CreatedAt time.Time `gorm:"index" json:"created_at"` // Digunakan untuk filter hari ini
}

func (SkinJourneyProgram) TableName() string        { return "skin_journey_programs" }
func (SkinJourneyStep) TableName() string           { return "skin_journey_steps" }
func (SkinJourneyRoutine) TableName() string        { return "skin_journey_routines" }
func (SkinJourneyProductMapping) TableName() string { return "skin_journey_product_mappings" }
func (SkinJourneyAIConfig) TableName() string       { return "skin_journey_ai_configs" }
func (UserSkinJourney) TableName() string           { return "user_skin_journeys" }
func (SkinStepLog) TableName() string               { return "skin_step_logs" }
