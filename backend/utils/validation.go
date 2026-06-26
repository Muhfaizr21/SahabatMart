package utils

import (
	"net/mail"
	"strings"
	"unicode"
)

type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

type ValidationResult struct {
	Valid  bool              `json:"valid"`
	Errors []ValidationError `json:"errors,omitempty"`
}

func (r *ValidationResult) AddError(field, message string) {
	r.Valid = false
	r.Errors = append(r.Errors, ValidationError{Field: field, Message: message})
}

func ValidateEmail(email string) bool {
	_, err := mail.ParseAddress(email)
	return err == nil
}

func ValidatePassword(password string) *ValidationResult {
	result := &ValidationResult{Valid: true}
	if len(password) < 6 {
		result.AddError("password", "Password minimal 6 karakter")
	}
	if len(password) > 128 {
		result.AddError("password", "Password maksimal 128 karakter")
	}
	return result
}

func ValidateRegisterInput(email, password, fullName, phone string) *ValidationResult {
	result := &ValidationResult{Valid: true}

	email = strings.TrimSpace(email)
	if email == "" {
		result.AddError("email", "Email wajib diisi")
	} else if !ValidateEmail(email) {
		result.AddError("email", "Format email tidak valid")
	}

	if fullName = strings.TrimSpace(fullName); fullName == "" {
		result.AddError("full_name", "Nama lengkap wajib diisi")
	} else if len(fullName) < 2 {
		result.AddError("full_name", "Nama minimal 2 karakter")
	} else if len(fullName) > 100 {
		result.AddError("full_name", "Nama maksimal 100 karakter")
	}

	pwResult := ValidatePassword(password)
	if !pwResult.Valid {
		result.Errors = append(result.Errors, pwResult.Errors...)
		result.Valid = false
	}

	if phone != "" {
		cleaned := strings.Map(func(r rune) rune {
			if unicode.IsDigit(r) {
				return r
			}
			return -1
		}, phone)
		if len(cleaned) < 10 || len(cleaned) > 15 {
			result.AddError("phone", "Nomor telepon tidak valid (10-15 digit)")
		}
	}

	return result
}

func SanitizeString(s string) string {
	s = strings.TrimSpace(s)
	s = strings.Map(func(r rune) rune {
		if r < 32 && r != '\n' && r != '\t' {
			return -1
		}
		return r
	}, s)
	return s
}
