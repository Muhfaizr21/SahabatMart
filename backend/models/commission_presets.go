package models

import "time"

// CommissionPreset: Template distribusi komisi multi-level ke atas jaringan upline.
// Admin membuat preset ini, lalu assign ke produk.
// Contoh Preset "MLM Standard":
//   Level 1 (referrer langsung) → 10%
//   Level 2 (upline dari referrer) → 5%
//   Level 3 → 2%
type CommissionPreset struct {
	ID          string                  `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	Name        string                  `gorm:"type:varchar(100);not null;uniqueIndex" json:"name"`
	Description string                  `gorm:"type:text" json:"description"`
	IsActive    bool                    `gorm:"default:true" json:"is_active"`
	Levels      []CommissionPresetLevel `gorm:"foreignKey:PresetID;constraint:OnDelete:CASCADE" json:"levels"`
	CreatedAt   time.Time               `json:"created_at"`
	UpdatedAt   time.Time               `json:"updated_at"`
}

// CommissionPresetLevel: Persentase komisi per kedalaman level jaringan upline.
// Level 1 = referrer langsung (yang share link ke pembeli).
// Level 2 = upline dari referrer tersebut.
// Level 3 = upline dari level 2. Dst.
type CommissionPresetLevel struct {
	ID       uint    `gorm:"primaryKey;autoIncrement" json:"id"`
	PresetID string  `gorm:"type:uuid;not null;index" json:"preset_id"`
	Level    int     `gorm:"not null" json:"level"` // 1, 2, 3, 4, 5...
	Rate     float64 `gorm:"type:decimal(6,4);not null" json:"rate"` // 0.10 = 10%, 0.05 = 5%
}

func (CommissionPreset) TableName() string      { return "commission_presets" }
func (CommissionPresetLevel) TableName() string { return "commission_preset_levels" }
