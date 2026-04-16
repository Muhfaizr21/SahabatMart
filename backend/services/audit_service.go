package services

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/repositories"
	"net"
	"strings"
)

type AuditService struct {
	Repo *repositories.AuditRepository
}

func NewAuditService(db *repositories.AuditRepository) *AuditService {
	return &AuditService{Repo: db}
}

func (s *AuditService) Log(adminID, action, targetType, targetID, detail, ip string) {
	cleanIP := s.CleanIP(ip)

	// Fallback admin ID logic if needed (moved from controller)
	if len(adminID) < 32 {
		// In a real clean architecture, we'd find the admin properly
		// but we'll stick to a valid placeholder if not provided
		adminID = "00000000-0000-0000-0000-000000000000"
	}

	s.Repo.Create(&models.AuditLog{
		AdminID:    adminID,
		Action:     action,
		TargetType: targetType,
		TargetID:   targetID,
		Detail:     detail,
		IPAddress:  cleanIP,
	})
}

func (s *AuditService) CleanIP(ip string) string {
	cleanIP := ip
	if strings.Contains(ip, ":") {
		host, _, err := net.SplitHostPort(ip)
		if err == nil {
			cleanIP = host
		} else {
			if idx := strings.LastIndex(ip, "]:"); idx != -1 {
				cleanIP = ip[1:idx]
			} else if !strings.Contains(ip, "[") && strings.Count(ip, ":") == 1 {
				cleanIP = strings.Split(ip, ":")[0]
			}
		}
	}
	if cleanIP == "::1" || cleanIP == "[::1]" || cleanIP == "127.0.0.1" {
		cleanIP = "127.0.0.1"
	}
	return cleanIP
}
