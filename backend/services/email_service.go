package services

import (
	"fmt"
	"net/smtp"
	"gorm.io/gorm"
)

type EmailService struct {
	DB *gorm.DB
}

func NewEmailService(db *gorm.DB) *EmailService {
	return &EmailService{DB: db}
}

func (s *EmailService) SendEmail(to, subject, body string) error {
	configSvc := NewConfigService(s.DB)
	
	enabled := configSvc.Get("notif_email_enabled", "false") == "true"
	if !enabled {
		return nil
	}

	host := configSvc.Get("notif_smtp_host", "")
	port := configSvc.Get("notif_smtp_port", "587")
	user := configSvc.Get("notif_smtp_user", "")
	pass := configSvc.Get("notif_smtp_pass", "")
	from := configSvc.Get("notif_smtp_from", user)

	if host == "" || user == "" {
		return fmt.Errorf("SMTP configuration is incomplete")
	}

	auth := smtp.PlainAuth("", user, pass, host)
	
	msg := []byte("To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"\r\n" +
		body + "\r\n")

	addr := host + ":" + port
	err := smtp.SendMail(addr, auth, from, []string{to}, msg)
	if err != nil {
		return fmt.Errorf("failed to send email: %v", err)
	}

	return nil
}
