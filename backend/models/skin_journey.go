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
	SkinScore       int      `json:"skin_score"`
	EmotionScore    int      `json:"emotion_score"`
	Redness         int      `json:"redness"`
	AcneCount       int      `json:"acne_count"`
	Moisture        int      `json:"moisture"`
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

// SkinProgress - Tracking mingguan selfie & kondisi
type SkinProgress struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	UserID         string    `gorm:"type:uuid;not null;index" json:"user_id"`
	WeekNumber     int       `json:"week_number"`
	SelfieURL      string    `gorm:"type:text" json:"selfie_url"`
	SkinScore      int       `json:"skin_score"`
	EmotionalScore int       `json:"emotional_score"`
	RednessScore   int       `json:"redness_score"`
	AcneCount      int       `json:"acne_count"`
	Notes          string    `gorm:"type:text" json:"notes"`
	AllowMarketing bool      `gorm:"default:false" json:"allow_marketing"`
	CreatedAt      time.Time `json:"created_at"`
}

// SkinJournal - Jurnal harian & milestone hari ke-25
type SkinJournal struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	UserID          string    `gorm:"type:uuid;not null;index" json:"user_id"`
	DayNumber       int       `json:"day_number"`
	Content         string    `gorm:"type:text" json:"content"`
	HasAppliedCream bool      `gorm:"default:false" json:"has_applied_cream"`
	AffirmationRead bool      `gorm:"default:false" json:"affirmation_read"`
	IsRewardClaimed bool      `gorm:"default:false" json:"is_reward_claimed"`
	CreatedAt       time.Time `json:"created_at"`
}

// SkinWarriorLevel - Gamifikasi level pengguna
type SkinWarriorLevel struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	UserID        string    `gorm:"type:uuid;uniqueIndex" json:"user_id"`
	LevelName     string    `gorm:"type:varchar(50);default:'Novice'" json:"level_name"`
	Experience    int       `gorm:"default:0" json:"experience"`
	TotalJournals int       `gorm:"default:0" json:"total_journals"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (SkinPreTest) TableName() string      { return "skin_pre_tests" }
func (SkinProgress) TableName() string     { return "skin_progress_logs" }
func (SkinJournal) TableName() string      { return "skin_journals" }
func (SkinWarriorLevel) TableName() string { return "skin_warrior_levels" }

// SkinCommunityGroup - Kategori/Grup Komunitas
type SkinCommunityGroup struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"type:varchar(255);not null" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	Icon        string    `gorm:"type:varchar(50)" json:"icon"`
	CreatedAt   time.Time `json:"created_at"`
}

// SkinCommunityPost - Postingan di feed komunitas
type SkinCommunityPost struct {
	ID        uint                   `gorm:"primaryKey" json:"id"`
	UserID    string                 `gorm:"type:uuid;not null;index" json:"user_id"`
	User      User                   `gorm:"foreignKey:UserID" json:"user"`
	GroupID   uint                   `gorm:"index" json:"group_id"`
	Content   string                 `gorm:"type:text" json:"content"`
	ImageURL  string                 `gorm:"type:text" json:"image_url"`
	Likes     int                    `gorm:"default:0" json:"likes"`
	Comments  []SkinCommunityComment `gorm:"foreignKey:PostID" json:"comments"`
	CreatedAt time.Time              `json:"created_at"`
}

// SkinCommunityComment - Komentar di postingan
type SkinCommunityComment struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	PostID    uint      `gorm:"index" json:"post_id"`
	UserID    string    `gorm:"type:uuid;not null;index" json:"user_id"`
	User      User      `gorm:"foreignKey:UserID" json:"user"`
	Content   string    `gorm:"type:text" json:"content"`
	ParentID  *uint     `gorm:"index" json:"parent_id"`
	CreatedAt time.Time `json:"created_at"`
}

// ═══════════════════════════════════════════════════════════════
// DYNAMIC JOURNEY CONFIGURATION - ADMIN MANAGED (NO HARDCODE)
// ═══════════════════════════════════════════════════════════════

// SkinJourneyProgram - [FLOW 1] Program blueprint (e.g., Acne-Free Express 4 Weeks)
type SkinJourneyProgram struct {
	ID                 uint      `gorm:"primaryKey" json:"id"`
	Name               string    `gorm:"type:varchar(200);not null" json:"name"`
	Slug               string    `gorm:"type:varchar(200);uniqueIndex" json:"slug"`
	Category           string    `gorm:"type:varchar(100)" json:"category"`          // acne_treatment, anti_aging, brightening, hydration, sensitivity
	TargetSkinType     string    `gorm:"type:text" json:"target_skin_type"`          // JSON array: ["oily","combination"]
	TargetConcerns     string    `gorm:"type:text" json:"target_concerns"`           // JSON array: ["acne","sebum_control"]
	DurationWeeks      int       `gorm:"default:4" json:"duration_weeks"`
	Frequency          string    `gorm:"type:varchar(50);default:'daily'" json:"frequency"` // daily, 3x_week, 2x_week, weekly
	ExpectedOutcome    string    `gorm:"type:text" json:"expected_outcome"`
	AiScoreFocus       string    `gorm:"type:text" json:"ai_score_focus"`            // JSON: {"acneScore":true,"brightness":true}
	Tags               string    `gorm:"type:text" json:"tags"`                      // JSON array: ["premium","dermatologist"]
	Status             string    `gorm:"type:varchar(20);default:'draft'" json:"status"` // draft, active, archived
	Level              int       `gorm:"default:1" json:"level"`
	StepCount          int       `json:"step_count"`
	DurationDays       int       `gorm:"default:28" json:"duration_days"`
	IsActive           bool      `gorm:"default:true" json:"is_active"`
	CreatedBy          string    `gorm:"type:varchar(100)" json:"created_by"`
	Version            int       `gorm:"default:1" json:"version"`

	// FLOW 2 relations
	Phases   []SkinJourneyPhase   `gorm:"foreignKey:ProgramID" json:"phases"`
	Benefits []SkinJourneyBenefit `gorm:"foreignKey:ProgramID" json:"benefits"`
	Warnings []SkinJourneyWarning `gorm:"foreignKey:ProgramID" json:"warnings"`
	FAQs     []SkinJourneyFAQ     `gorm:"foreignKey:ProgramID" json:"faqs"`

	// FLOW 3 relations
	ProductSteps []SkinJourneyProductStep `gorm:"foreignKey:ProgramID" json:"product_steps"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// SkinJourneyPhase - [FLOW 2] Week-by-week timeline description (Adaptasi, Penyeimbangan, etc.)
type SkinJourneyPhase struct {
	ID           uint   `gorm:"primaryKey" json:"id"`
	ProgramID    uint   `gorm:"index;not null" json:"program_id"`
	PhaseNumber  int    `json:"phase_number"` // 1, 2, 3, 4
	Title        string `gorm:"type:varchar(200)" json:"title"`        // "Fase Adaptasi & Detox"
	WeekLabel    string `gorm:"type:varchar(100)" json:"week_label"`   // "MINGGU PERTAMA"
	Description  string `gorm:"type:text" json:"description"`
	Expectations string `gorm:"type:text" json:"expectations"` // JSON array of bullet points
	Tips         string `gorm:"type:text" json:"tips"`         // Actionable advice
	Order        int    `json:"order"`
}

// SkinJourneyBenefit - [FLOW 2] Program benefits list
type SkinJourneyBenefit struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	ProgramID   uint   `gorm:"index;not null" json:"program_id"`
	Icon        string `gorm:"type:varchar(50)" json:"icon"`
	Title       string `gorm:"type:varchar(200)" json:"title"`
	Description string `gorm:"type:text" json:"description"`
	Order       int    `json:"order"`
}

// SkinJourneyWarning - [FLOW 2] Precautions and warnings
type SkinJourneyWarning struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	ProgramID   uint   `gorm:"index;not null" json:"program_id"`
	WarningType string `gorm:"type:varchar(20)" json:"warning_type"` // danger, caution, info
	Badge       string `gorm:"type:varchar(50)" json:"badge"`        // "⚠️ PENTING", "ℹ️ INFO"
	Title       string `gorm:"type:varchar(200)" json:"title"`
	Description string `gorm:"type:text" json:"description"`
	Action      string `gorm:"type:text" json:"action"`
	Order       int    `json:"order"`
}

// SkinJourneyFAQ - [FLOW 2] Frequently asked questions
type SkinJourneyFAQ struct {
	ID        uint   `gorm:"primaryKey" json:"id"`
	ProgramID uint   `gorm:"index;not null" json:"program_id"`
	Question  string `gorm:"type:text" json:"question"`
	Answer    string `gorm:"type:text" json:"answer"`
	Order     int    `json:"order"`
}

// SkinJourneyProductStep - [FLOW 3 & 4] Product linked to program with detailed instructions
type SkinJourneyProductStep struct {
	ID              uint    `gorm:"primaryKey" json:"id"`
	ProgramID       uint    `gorm:"index;not null" json:"program_id"`
	ProductID       string  `gorm:"type:uuid;index" json:"product_id"`
	Product         Product `gorm:"foreignKey:ProductID" json:"product"`
	StepNumber      int     `json:"step_number"` // 1, 2, 3, 4, 5
	StepName        string  `gorm:"type:varchar(200)" json:"step_name"` // "Pembersihan Wajah"
	Phase           string  `gorm:"type:varchar(20)" json:"phase"`      // morning, evening, both
	Frequency       string  `gorm:"type:varchar(50)" json:"frequency"`  // daily, 3x_week, etc.
	Purpose         string  `gorm:"type:text" json:"purpose"`           // Why this product is here

	// FLOW 4: How-to-use instructions
	AmountText         string `gorm:"type:varchar(200)" json:"amount_text"`     // "1 pump (5ml)"
	AmountNote         string `gorm:"type:text" json:"amount_note"`             // Additional note about quantity
	StepByStepJSON     string `gorm:"type:text" json:"step_by_step_json"`       // JSON array of micro steps
	TipsJSON           string `gorm:"type:text" json:"tips_json"`               // JSON array
	CommonMistakesJSON string `gorm:"type:text" json:"common_mistakes_json"`    // JSON array
	MechanismExplain   string `gorm:"type:text" json:"mechanism_explain"`       // Science behind it
	WaitTimeSecs       int    `json:"wait_time_secs"`                           // Seconds to wait before next step
	VisualRefsJSON     string `gorm:"type:text" json:"visual_refs_json"`        // JSON array of video/photo URLs
	AdditionalNotes    string `gorm:"type:text" json:"additional_notes"`

	Order int `json:"order"`
}

// SkinJourneyStep - Individual step definition (library: Cleanse, Tone, etc.)
type SkinJourneyStep struct {
	ID                 uint   `gorm:"primaryKey" json:"id"`
	Name               string `gorm:"type:varchar(100);not null" json:"name"`
	Icon               string `gorm:"type:varchar(50)" json:"icon"`
	Description        string `gorm:"type:text" json:"description"`
	DefaultInstruction string `gorm:"type:text" json:"default_instruction"`
	Order              int    `json:"order"`
	IsActive           bool   `gorm:"default:true" json:"is_active"`
}

// SkinJourneyRoutine - Link Program -> Step + Timing (classic routine linking)
type SkinJourneyRoutine struct {
	ID           uint            `gorm:"primaryKey" json:"id"`
	ProgramID    uint            `gorm:"index" json:"program_id"`
	StepID       uint            `gorm:"index" json:"step_id"`
	Step         SkinJourneyStep `gorm:"foreignKey:StepID" json:"step"`
	Week         int             `json:"week"`
	TimeOfDay    string          `gorm:"type:varchar(20)" json:"time_of_day"` // morning, evening, both, weekly
	DurationMin  int             `json:"duration_min"`
	Instructions string          `gorm:"type:text" json:"instructions"`
}

// SkinJourneyProductMapping - Dynamic product recommendation logic
type SkinJourneyProductMapping struct {
	ID          uint    `gorm:"primaryKey" json:"id"`
	ProductID   string  `gorm:"type:uuid;index" json:"product_id"`
	Product     Product `gorm:"foreignKey:ProductID" json:"product"`
	SkinType    string  `gorm:"type:varchar(50)" json:"skin_type"`
	SkinConcern string  `gorm:"type:varchar(100)" json:"skin_concern"`
	StepType    string  `gorm:"type:varchar(50)" json:"step_type"`
	Priority    int     `gorm:"default:0" json:"priority"`
}

// SkinJourneyAIConfig - Dynamic Prompts for AI Analysis
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
	ID              uint               `gorm:"primaryKey" json:"id"`
	UserID          string             `gorm:"type:uuid;not null;uniqueIndex" json:"user_id"`
	ProgramID       uint               `json:"program_id"`
	Program         SkinJourneyProgram `gorm:"foreignKey:ProgramID" json:"program"`
	CurrentWeek     int                `gorm:"default:1" json:"current_week"`
	StartedAt       time.Time          `json:"started_at"`
	IsCompleted     bool               `gorm:"default:false" json:"is_completed"`
	SkinProfileJSON string             `gorm:"type:text" json:"skin_profile_json"`
}

// SkinStepLog - Mencatat penyelesaian langkah rutin harian
type SkinStepLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    string    `gorm:"type:uuid;not null;index" json:"user_id"`
	RoutineID uint      `gorm:"index" json:"routine_id"`
	Completed bool      `gorm:"default:true" json:"completed"`
	CreatedAt time.Time `gorm:"index" json:"created_at"`
}

// UserSkinJourneyHistory - Arsip program yang telah diselesaikan
type UserSkinJourneyHistory struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	UserID           string    `gorm:"type:uuid;not null;index" json:"user_id"`
	ProgramID        uint      `json:"program_id"`
	ProgramName      string    `json:"program_name"`
	StartedAt        time.Time `json:"started_at"`
	FinishedAt       time.Time `json:"finished_at"`
	DayCount         int       `json:"day_count"`
	ConsistencyScore int       `json:"consistency_score"`
	FinalRank        string    `json:"final_rank"`
	SkinProfileJSON  string    `gorm:"type:text" json:"skin_profile_json"`
}

func (SkinCommunityGroup) TableName() string        { return "skin_community_groups" }
func (SkinCommunityPost) TableName() string         { return "skin_community_posts" }
func (SkinCommunityComment) TableName() string      { return "skin_community_comments" }
func (SkinJourneyProgram) TableName() string        { return "skin_journey_programs" }
func (SkinJourneyPhase) TableName() string          { return "skin_journey_phases" }
func (SkinJourneyBenefit) TableName() string        { return "skin_journey_benefits" }
func (SkinJourneyWarning) TableName() string        { return "skin_journey_warnings" }
func (SkinJourneyFAQ) TableName() string            { return "skin_journey_faqs" }
func (SkinJourneyProductStep) TableName() string    { return "skin_journey_product_steps" }
func (SkinJourneyStep) TableName() string           { return "skin_journey_steps" }
func (SkinJourneyRoutine) TableName() string        { return "skin_journey_routines" }
func (SkinJourneyProductMapping) TableName() string { return "skin_journey_product_mappings" }
func (SkinJourneyAIConfig) TableName() string       { return "skin_journey_ai_configs" }
func (UserSkinJourney) TableName() string           { return "user_skin_journeys" }
func (SkinStepLog) TableName() string               { return "skin_step_logs" }
func (UserSkinJourneyHistory) TableName() string    { return "user_skin_journey_histories" }
