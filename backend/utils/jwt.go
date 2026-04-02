package utils

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var JWTKey = []byte("super_secret_sahabatmart_key") // Gantilah di dalam .env nantinya!

type Claims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

func GenerateJWT(userID, role, email string) (string, error) {
	expirationTime := time.Now().Add(24 * 7 * time.Hour) // 7 Hari
	claims := &Claims{
		UserID: userID,
		Role:   role,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(JWTKey)
}
