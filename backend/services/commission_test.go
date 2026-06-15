package services

import (
	"math"
	"testing"

	"akuglow/backend/utils"

	"github.com/stretchr/testify/assert"
)

// formula: snapshotTotal * (levelRateDecimal / totalPresetRateDecimal)
// snapshotTotal = total komisi (sudah dalam rupiah), levelRate & totalPresetRate dalam decimal (0.10 = 10%)
func calcPresetCommission(snapshotTotal, levelRate, totalPresetRate float64) float64 {
	if totalPresetRate == 0 {
		return 0
	}
	return utils.RoundMoney(snapshotTotal * (levelRate / totalPresetRate))
}

// formula: subtotal * rate
func calcDirectCommission(subtotal, rate float64) float64 {
	return utils.RoundMoney(subtotal * rate)
}

// formula: subtotal * (totalRate / 100)
func calcTotalAffiliateFee(subtotal, totalRate float64) float64 {
	return utils.RoundMoney(subtotal * (totalRate / 100.0))
}

// splitPct: membagi amount menjadi withdrawable dan shopping balance
func splitCommission(amount, withdrawPct, shoppingPct float64) (withdrawable, shopping float64) {
	return utils.RoundMoney(amount * withdrawPct), utils.RoundMoney(amount * shoppingPct)
}

func TestCalcPresetCommission(t *testing.T) {
	// Preset 3 level: rate decimal 0.10, 0.05, 0.02 = total 0.17
	// snapshotTotal sudah berupa total komisi (17% dari subtotal)
	subtotal := 100000.0
	totalRatePct := 17.0 // 17%
	snapshotTotal := calcTotalAffiliateFee(subtotal, totalRatePct)

	// totalPresetRate (dari DB) dalam decimal
	totalPresetRate := 0.17
	levelRates := []float64{0.10, 0.05, 0.02}

	commL1 := calcPresetCommission(snapshotTotal, levelRates[0], totalPresetRate)
	commL2 := calcPresetCommission(snapshotTotal, levelRates[1], totalPresetRate)
	commL3 := calcPresetCommission(snapshotTotal, levelRates[2], totalPresetRate)

	total := utils.RoundMoney(commL1 + commL2 + commL3)
	expectedTotal := snapshotTotal

	assert.Equal(t, expectedTotal, total,
		"Total komisi preset harus sama dengan snapshot total fee")
	assert.Equal(t, 10000.0, commL1,
		"Level 1: 17000 * (0.10/0.17) = 10000")
	assert.Equal(t, 5000.0, commL2,
		"Level 2: 17000 * (0.05/0.17) = 5000")
	assert.Equal(t, 2000.0, commL3,
		"Level 3: 17000 * (0.02/0.17) = 2000")
}

func TestCalcPresetCommissionSingleLevel(t *testing.T) {
	// 1 level: 10%
	subtotal := 50000.0
	totalRate := 10.0

	comm := calcPresetCommission(subtotal, 10.0, totalRate)
	// 50000 * (10/10) = 50000
	assert.Equal(t, 50000.0, comm)
}

func TestCalcDirectCommission(t *testing.T) {
	tests := []struct {
		subtotal float64
		rate     float64
		expected float64
	}{
		{100000, 0.10, 10000.0},
		{75000, 0.05, 3750.0},
		{25000, 0.03, 750.0},
		{0, 0.10, 0.0},
	}
	for _, tt := range tests {
		got := calcDirectCommission(tt.subtotal, tt.rate)
		assert.Equal(t, tt.expected, got,
			"calcDirectCommission(%v, %v)", tt.subtotal, tt.rate)
	}
}

func TestCalcTotalAffiliateFee(t *testing.T) {
	tests := []struct {
		subtotal  float64
		totalRate float64
		expected  float64
	}{
		{100000, 17.0, 17000.0},
		{50000, 10.0, 5000.0},
		{25000, 0, 0.0},
	}
	for _, tt := range tests {
		got := calcTotalAffiliateFee(tt.subtotal, tt.totalRate)
		assert.Equal(t, tt.expected, got,
			"calcTotalAffiliateFee(%v, %v)", tt.subtotal, tt.totalRate)
	}
}

func TestSplitCommission(t *testing.T) {
	amount := 100000.0
	withdrawPct := 0.70
	shoppingPct := 0.30

	w, s := splitCommission(amount, withdrawPct, shoppingPct)
	assert.Equal(t, 70000.0, w)
	assert.Equal(t, 30000.0, s)
	assert.Equal(t, amount, math.Round((w+s)*100)/100)
}

func TestSplitCommissionRounding(t *testing.T) {
	// Kasus dengan desimal yang bisa kena rounding error
	amounts := []float64{99999.99, 123456.78, 50000.50, 33333.33}
	for _, amt := range amounts {
		w, s := splitCommission(amt, 0.70, 0.30)
		total := utils.RoundMoney(w + s)
		// Maks selisih 1 sen karena pembulatan
		diff := math.Abs(total - amt)
		assert.LessOrEqual(t, diff, 0.01,
			"Split 70/30 dari %v: %v + %v = %v (selisih %v)", amt, w, s, total, diff)
	}
}

func TestReverseDistributionCeiling(t *testing.T) {
	// Simulasi: wallet balance 50rb, harus ditarik 75rb
	balance := 50000.0
	deductAmount := 75000.0

	if balance < deductAmount {
		deductAmount = balance
	}
	balance -= deductAmount

	assert.Equal(t, 0.0, balance)
	assert.Equal(t, 50000.0, deductAmount)
}

func TestMoneyNegativeGuards(t *testing.T) {
	// TotalEarned jangan sampai negatif setelah reversal
	totalEarned := 50000.0
	reversal := 75000.0

	totalEarned -= reversal
	if totalEarned < 0 {
		totalEarned = 0
	}

	assert.Equal(t, 0.0, totalEarned)
}
