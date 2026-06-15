package utils

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestRoundMoney(t *testing.T) {
	tests := []struct {
		input    float64
		expected float64
	}{
		{10.005, 10.01},
		{10.004, 10.00},
		{100.00, 100.00},
		{99.999, 100.00},
		{0.1 + 0.2, 0.30},
		{0.1 + 0.2 + 0.05, 0.35},
		{15000.125, 15000.13},
		{15000.124, 15000.12},
		{0.00, 0.00},
		{-5.001, -5.00},
	}
	for _, tt := range tests {
		got := RoundMoney(tt.input)
		assert.Equal(t, tt.expected, got, "RoundMoney(%v)", tt.input)
	}
}

func TestRoundMoneyAccumulation(t *testing.T) {
	// Simulasi komisi MLM: 10% + 5% + 2% dari 100000
	subtotal := 100000.0
	rates := []float64{0.10, 0.05, 0.02}
	totalDistributed := 0.0
	for _, r := range rates {
		amt := RoundMoney(subtotal * r)
		totalDistributed += amt
	}
	// Total tidak boleh melebihi subtotal * totalRate
	totalRate := 0.0
	for _, r := range rates {
		totalRate += r
	}
	assert.LessOrEqual(t, totalDistributed, RoundMoney(subtotal*totalRate)+0.01)
}

func TestRoundMoneySplitTotal(t *testing.T) {
	// Test bahwa withdrawPct + shoppingPct ≈ total amount
	amount := 100000.0
	withdrawPct := 0.70
	shoppingPct := 0.30

	withdrawable := RoundMoney(amount * withdrawPct)
	shopping := RoundMoney(amount * shoppingPct)
	total := RoundMoney(withdrawable + shopping)

	// Boleh selisih 1 sen karena rounding
	assert.InDelta(t, amount, total, 0.01,
		"withdrawPct+shoppingPct harus 100%% setelah rounding")
}

func TestRoundMoneyPartialDeduction(t *testing.T) {
	// Simulasi ReverseDistribution ketika balance terbatas
	balance := 50000.0
	deductAmount := 75000.0

	if balance < deductAmount {
		deductAmount = balance
	}
	balance -= deductAmount

	assert.Equal(t, 0.0, balance)
	assert.Equal(t, 50000.0, deductAmount)
}

func TestRoundMoneyZeroValues(t *testing.T) {
	assert.Equal(t, 0.0, RoundMoney(0))
	assert.Equal(t, 0.0, RoundMoney(-0.0))
	assert.Equal(t, 0.0, RoundMoney(0.001))
	assert.Equal(t, 0.0, RoundMoney(0.0001))
}
