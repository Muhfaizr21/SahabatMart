package repositories

import (
	"SahabatMart/backend/models"
	"fmt"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type FinanceRepository struct {
	DB *gorm.DB
}

func NewFinanceRepository(db *gorm.DB) *FinanceRepository {
	return &FinanceRepository{DB: db}
}

func (r *FinanceRepository) GetWalletWithLock(ownerID string, ownerType models.WalletOwnerType) (*models.Wallet, error) {
	if _, err := uuid.Parse(ownerID); err != nil {
		return nil, fmt.Errorf("invalid owner id: %s", ownerID)
	}
	var wallet models.Wallet
	err := r.DB.Clauses(clause.Locking{Strength: "UPDATE"}).
		FirstOrCreate(&wallet, models.Wallet{OwnerID: ownerID, OwnerType: ownerType}).Error
	return &wallet, err
}

func (r *FinanceRepository) SaveWallet(wallet *models.Wallet) error {
	return r.DB.Save(wallet).Error
}

func (r *FinanceRepository) CreateTransaction(txn *models.WalletTransaction) error {
	return r.DB.Create(txn).Error
}
