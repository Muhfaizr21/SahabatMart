package utils

import (
	"errors"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func jwtKey() ([]byte, error) {
	secret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
	if secret == "" {
		return nil, errors.New("JWT_SECRET environment variable is not set")
	}
	return []byte(secret), nil
}

type Claims struct {
	UserID      string `json:"user_id"`
	MerchantID  string `json:"merchant_id,omitempty"`
	AffiliateID string `json:"affiliate_id,omitempty"`
	Role        string `json:"role"`
	Email       string `json:"email"`
	jwt.RegisteredClaims
}

// [FIX #7] RefreshClaims stores long-lived refresh token data
type RefreshClaims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// [FIX #7] GenerateJWT now returns (accessToken, refreshToken, error).
// accessToken: 15 min. refreshToken: 7 days.
func GenerateJWT(userID, role, email, merchantID, affiliateID string, remember bool) (string, error) {
	duration := 24 * time.Hour // Default 1 hari
	if remember {
		duration = 24 * 30 * time.Hour // 30 hari jika "Ingat Saya"
	}

	expirationTime := time.Now().Add(duration)
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

	key, err := jwtKey()
	if err != nil {
		return "", err
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(key)
}

// [FIX #7] GenerateTokenPair generates access + refresh tokens
func GenerateTokenPair(userID, role, email, merchantID, affiliateID string) (accessToken, refreshToken string, err error) {
	accessToken, err = GenerateJWT(userID, role, email, merchantID, affiliateID, false)
	if err != nil {
		return "", "", err
	}

	refreshClaims := &RefreshClaims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			ID:        "refresh_" + userID + "_" + time.Now().Format("20060102150405"),
		},
	}
	key, err := jwtKey()
	if err != nil {
		return "", "", err
	}
	rt := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshToken, err = rt.SignedString(key)
	if err != nil {
		return "", "", err
	}
	return accessToken, refreshToken, nil
}

// [FIX #7] ValidateRefreshToken validates a refresh token string and returns userID + role
func ValidateRefreshToken(tokenString string) (string, string, error) {
	key, err := jwtKey()
	if err != nil {
		return "", "", err
	}
	token, err := jwt.ParseWithClaims(tokenString, &RefreshClaims{}, func(token *jwt.Token) (interface{}, error) {
		return key, nil
	})
	if err != nil {
		return "", "", err
	}
	claims, ok := token.Claims.(*RefreshClaims)
	if !ok || !token.Valid {
		return "", "", errors.New("invalid refresh token")
	}
	return claims.UserID, claims.Role, nil
}

// [FIX #8] StoreRefreshToken persists a refresh token hash for invalidation (optional).
// To be called during login/token refresh. Intentionally empty stub — wire to Redis/DB when ready.
func StoreRefreshToken(userID, refreshToken string) error {
	_ = userID
	_ = refreshToken
	return nil
}

// [FIX #8] RevokeRefreshToken invalidates a stored refresh token. Stub.
func RevokeRefreshToken(refreshToken string) error {
	_ = refreshToken
	return nil
}

func ParseJWT(authHeader string) (*Claims, error) {
	tokenString := strings.TrimSpace(authHeader)
	if tokenString == "" {
		return nil, errors.New("missing token")
	}

	if strings.HasPrefix(strings.ToLower(tokenString), "bearer ") {
		tokenString = strings.TrimSpace(tokenString[7:])
	}

	key, err := jwtKey()
	if err != nil {
		return nil, err
	}
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return key, nil
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
