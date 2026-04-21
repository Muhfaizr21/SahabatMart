package utils

import (
	"errors"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func jwtKey() []byte {
	secret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
	if secret == "" {
		// Logika Keamanan: Jangan biarkan aplikasi jalan dengan secret default jika di env tidak ada.
		// Ini mencegah serangan signature forgery di environment produksi.
		panic("CRITICAL ERROR: JWT_SECRET environment variable is not set!")
	}
	return []byte(secret)
}

type Claims struct {
	UserID      string `json:"user_id"`
	MerchantID  string `json:"merchant_id,omitempty"`
	AffiliateID string `json:"affiliate_id,omitempty"`
	Role        string `json:"role"`
	Email       string `json:"email"`
	jwt.RegisteredClaims
}

func GenerateJWT(userID, role, email, merchantID, affiliateID string) (string, error) {
	expirationTime := time.Now().Add(24 * 7 * time.Hour) // 7 Hari
	claims := &Claims{
		UserID:      userID,
		MerchantID:  merchantID,
		AffiliateID: affiliateID,
		Role:        role,
		Email:       email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtKey())
}

func ParseJWT(authHeader string) (*Claims, error) {
	tokenString := strings.TrimSpace(authHeader)
	if tokenString == "" {
		return nil, errors.New("missing token")
	}

	if strings.HasPrefix(strings.ToLower(tokenString), "bearer ") {
		tokenString = strings.TrimSpace(tokenString[7:])
	}

	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return jwtKey(), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}
