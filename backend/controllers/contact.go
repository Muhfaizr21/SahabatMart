package controllers

import (
	"encoding/json"
	"net/http"
	"SahabatMart/backend/models"
	"SahabatMart/backend/utils"
	"gorm.io/gorm"
)

type ContactController struct {
	DB *gorm.DB
}

// SubmitMessage (Public)
func (cc *ContactController) SubmitMessage(w http.ResponseWriter, r *http.Request) {
	var msg models.ContactMessage
	if err := json.NewDecoder(r.Body).Decode(&msg); err != nil {
		utils.JSONResponse(w, http.StatusBadRequest, map[string]string{"message": "Invalid request body"})
		return
	}

	if msg.Name == "" || msg.Email == "" || msg.Message == "" {
		utils.JSONResponse(w, http.StatusBadRequest, map[string]string{"message": "Please fill in all required fields"})
		return
	}

	if err := cc.DB.Create(&msg).Error; err != nil {
		utils.JSONResponse(w, http.StatusInternalServerError, map[string]string{"message": "Failed to send message"})
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Message sent successfully! We will get back to you soon."})
}

// GetMessages (Admin)
func (cc *ContactController) GetMessages(w http.ResponseWriter, r *http.Request) {
	var messages []models.ContactMessage
	cc.DB.Order("created_at DESC").Find(&messages)
	utils.JSONResponse(w, http.StatusOK, messages)
}

// UpdateStatus (Admin)
func (cc *ContactController) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	status := r.URL.Query().Get("status")

	if id == "" || status == "" {
		utils.JSONResponse(w, http.StatusBadRequest, map[string]string{"message": "Missing ID or status"})
		return
	}

	if err := cc.DB.Model(&models.ContactMessage{}).Where("id = ?", id).Update("status", status).Error; err != nil {
		utils.JSONResponse(w, http.StatusInternalServerError, map[string]string{"message": "Update failed"})
		return
	}

	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// DeleteMessage (Admin)
func (cc *ContactController) DeleteMessage(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		utils.JSONResponse(w, http.StatusBadRequest, map[string]string{"message": "Missing ID"})
		return
	}

	cc.DB.Delete(&models.ContactMessage{}, id)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}
