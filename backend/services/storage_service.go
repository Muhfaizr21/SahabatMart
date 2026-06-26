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
	BaseURL   string
	UploadDir string
}

func NewStorageService(baseURL, uploadDir string) *StorageService {
	return &StorageService{
		BaseURL:   baseURL,
		UploadDir: uploadDir,
	}
}

func (s *StorageService) SaveImage(file multipart.File, header *multipart.FileHeader) (string, error) {
	if err := os.MkdirAll(s.UploadDir, os.ModePerm); err != nil {
		return "", err
	}

	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowed := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".webp": true,
		".gif":  true,
		".mp4":  true,
		".mov":  true,
		".avi":  true,
		".mkv":  true,
		".webm": true,
		".pdf":  true,
		".zip":  true,
		".rar":  true,
		".doc":  true,
		".docx": true,
		".xls":  true,
		".xlsx": true,
		".ppt":  true,
		".pptx": true,
		".txt":  true,
		".csv":  true,
	}
	if !allowed[ext] {
		return "", fmt.Errorf("ekstensi file tidak diizinkan: %s", ext)
	}

	baseName := strings.TrimSuffix(strings.ReplaceAll(header.Filename, " ", "_"), ext)
	filename := fmt.Sprintf("%d-%s%s", time.Now().Unix(), baseName, ext)
	filePath := filepath.Join(s.UploadDir, filename)

	out, err := os.Create(filePath)
	if err != nil {
		return "", err
	}
	defer out.Close()

	// Reset file pointer to beginning just in case
	file.Seek(0, 0)
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
