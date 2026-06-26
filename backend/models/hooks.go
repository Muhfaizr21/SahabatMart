package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Helper to generate UUID if empty
func ensureUUID(id *string) {
	if id != nil && *id == "" {
		*id = uuid.New().String()
	}
}

// admin_config.go models
func (p *Product) BeforeCreate(tx *gorm.DB) (err error)         { ensureUUID(&p.ID); return nil }
func (pv *ProductVariant) BeforeCreate(tx *gorm.DB) (err error) { ensureUUID(&pv.ID); return nil }
func (i *Inventory) BeforeCreate(tx *gorm.DB) (err error)       { ensureUUID(&i.ID); return nil }
func (r *RestockRequest) BeforeCreate(tx *gorm.DB) (err error)  { ensureUUID(&r.ID); return nil }
func (ri *RestockItem) BeforeCreate(tx *gorm.DB) (err error)    { ensureUUID(&ri.ID); return nil }
func (s *Supplier) BeforeCreate(tx *gorm.DB) (err error)        { ensureUUID(&s.ID); return nil }
func (is *InboundStock) BeforeCreate(tx *gorm.DB) (err error)   { ensureUUID(&is.ID); return nil }
func (ii *InboundItem) BeforeCreate(tx *gorm.DB) (err error)    { ensureUUID(&ii.ID); return nil }
func (sm *StockMutation) BeforeCreate(tx *gorm.DB) (err error)  { ensureUUID(&sm.ID); return nil }
func (c *Cart) BeforeCreate(tx *gorm.DB) (err error)            { ensureUUID(&c.ID); return nil }
func (ci *CartItem) BeforeCreate(tx *gorm.DB) (err error)       { ensureUUID(&ci.ID); return nil }
func (w *Wishlist) BeforeCreate(tx *gorm.DB) (err error)        { ensureUUID(&w.ID); return nil }
func (tcp *TierCommissionPreset) BeforeCreate(tx *gorm.DB) (err error) {
	ensureUUID(&tcp.ID)
	return nil
}
func (m *Merchant) BeforeCreate(tx *gorm.DB) (err error) { ensureUUID(&m.ID); return nil }

// payment.go models
func (p *Payment) BeforeCreate(tx *gorm.DB) (err error) { ensureUUID(&p.ID); return nil }

// affiliate.go models
func (am *AffiliateMember) BeforeCreate(tx *gorm.DB) (err error) { ensureUUID(&am.ID); return nil }
func (ac *AffiliateCommission) BeforeCreate(tx *gorm.DB) (err error) {
	ensureUUID(&ac.ID)
	return nil
}
func (al *AffiliateLink) BeforeCreate(tx *gorm.DB) (err error) { ensureUUID(&al.ID); return nil }
func (ac *AffiliateClickLog) BeforeCreate(tx *gorm.DB) (err error) {
	ensureUUID(&ac.ID)
	return nil
}
func (aw *AffiliateWithdrawal) BeforeCreate(tx *gorm.DB) (err error) {
	ensureUUID(&aw.ID)
	return nil
}
func (at *AffiliateTurnoverSnapshot) BeforeCreate(tx *gorm.DB) (err error) {
	ensureUUID(&at.ID)
	return nil
}

// commission_presets.go models
func (cp *CommissionPreset) BeforeCreate(tx *gorm.DB) (err error) { ensureUUID(&cp.ID); return nil }
func (mcp *MerchantCommissionPreset) BeforeCreate(tx *gorm.DB) (err error) {
	ensureUUID(&mcp.ID)
	return nil
}

// commission_rules.go models
func (cr *CommissionRule) BeforeCreate(tx *gorm.DB) (err error) { ensureUUID(&cr.ID); return nil }

// rbac.go models
func (p *Permission) BeforeCreate(tx *gorm.DB) (err error) { ensureUUID(&p.ID); return nil }
func (r *Role) BeforeCreate(tx *gorm.DB) (err error)       { ensureUUID(&r.ID); return nil }

// order.go models
func (o *Order) BeforeCreate(tx *gorm.DB) (err error) { ensureUUID(&o.ID); return nil }
func (omg *OrderMerchantGroup) BeforeCreate(tx *gorm.DB) (err error) {
	ensureUUID(&omg.ID)
	return nil
}
func (oi *OrderItem) BeforeCreate(tx *gorm.DB) (err error) { ensureUUID(&oi.ID); return nil }
func (osh *OrderStatusHistory) BeforeCreate(tx *gorm.DB) (err error) {
	ensureUUID(&osh.ID)
	return nil
}

// user.go models
func (u *User) BeforeCreate(tx *gorm.DB) (err error)         { ensureUUID(&u.ID); return nil }
func (up *UserProfile) BeforeCreate(tx *gorm.DB) (err error) { ensureUUID(&up.ID); return nil }

// media.go models
func (m *Media) BeforeCreate(tx *gorm.DB) (err error) { ensureUUID(&m.ID); return nil }

// finance.go models
func (w *Wallet) BeforeCreate(tx *gorm.DB) (err error) { ensureUUID(&w.ID); return nil }
func (wt *WalletTransaction) BeforeCreate(tx *gorm.DB) (err error) {
	ensureUUID(&wt.ID)
	return nil
}
func (wr *WithdrawalRequest) BeforeCreate(tx *gorm.DB) (err error) {
	ensureUUID(&wr.ID)
	return nil
}
func (r *Refund) BeforeCreate(tx *gorm.DB) (err error) { ensureUUID(&r.ID); return nil }

// review.go models
func (r *Review) BeforeCreate(tx *gorm.DB) (err error) { ensureUUID(&r.ID); return nil }
