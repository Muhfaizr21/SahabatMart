package utils

import "math"

func RoundMoney(amount float64) float64 {
	return math.Round(amount*100) / 100
}

func RoundMoneyInt(amount float64) float64 {
	return math.Round(amount)
}
