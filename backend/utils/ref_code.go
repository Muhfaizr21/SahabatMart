package utils

import (
	"fmt"
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
