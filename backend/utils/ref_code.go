package utils

import (
	"fmt"
	"math/rand"
	"regexp"
	"strings"
	"time"
)

func GenerateRefCode(name string) string {
	reg, _ := regexp.Compile("[^a-zA-Z0-9]+")
	cleanName := reg.ReplaceAllString(name, "")
	if len(cleanName) > 6 {
		cleanName = cleanName[:6]
	} else if len(cleanName) == 0 {
		cleanName = "SM"
	}

	timestamp := time.Now().UnixNano() % 1000000
	return strings.ToUpper(fmt.Sprintf("%s%d", cleanName, timestamp))
}

// GenerateShortCode generates a random alphanumeric short code of given length
func GenerateShortCode(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	src := rand.NewSource(time.Now().UnixNano())
	r := rand.New(src)
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[r.Intn(len(charset))]
	}
	return string(b)
}

func Slugify(s string) string {
	s = strings.ToLower(s)
	reg, _ := regexp.Compile("[^a-z0-9]+")
	return strings.Trim(reg.ReplaceAllString(s, "-"), "-")
}
