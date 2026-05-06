package services

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type StorageService struct {
	BaseURL    string
	UploadDir  string
}

func NewStorageService(baseURL, uploadDir string) *StorageService {
	return &StorageService{
		BaseURL:    baseURL,
		UploadDir:  uploadDir,
	}
}

func (s *StorageService) SaveImage(file multipart.File, header *multipart.FileHeader) (string, error) {
	if err := os.MkdirAll(s.UploadDir, os.ModePerm); err != nil {
		return "", err
	}

	ext := filepath.Ext(header.Filename)
	if ext == "" {
		ext = ".webp" // Fallback
	}
	filename := fmt.Sprintf("%d-%s%s", time.Now().Unix(), strings.TrimSuffix(strings.ReplaceAll(header.Filename, " ", "_"), ext), ext)
	filePath := filepath.Join(s.UploadDir, filename)

	out, err := os.Create(filePath)
	if err != nil {
		return "", err
	}
	defer out.Close()

	if _, err = io.Copy(out, file); err != nil {
		return "", err
	}

	// Clean base URL to prevent double slashes
	baseUrl := strings.TrimSuffix(s.BaseURL, "/")
	uploadDir := strings.TrimPrefix(s.UploadDir, "./")
	uploadDir = strings.TrimPrefix(uploadDir, "/")

	if baseUrl == "" {
		return fmt.Sprintf("/%s/%s", uploadDir, filename), nil
	}

	return fmt.Sprintf("%s/%s/%s", baseUrl, uploadDir, filename), nil
}
