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

	filename := fmt.Sprintf("%d-%s.webp", time.Now().Unix(), strings.ReplaceAll(header.Filename, " ", "_"))
	filePath := filepath.Join(s.UploadDir, filename)

	out, err := os.Create(filePath)
	if err != nil {
		return "", err
	}
	defer out.Close()

	if _, err = io.Copy(out, file); err != nil {
		return "", err
	}

	return fmt.Sprintf("%s/%s/%s", s.BaseURL, s.UploadDir, filename), nil
}
