package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"SahabatMart/backend/models"
	"SahabatMart/backend/utils"
)

// BulkNotifyUsers mengirimkan notifikasi khusus ke daftar ID user terpilih
// POST /api/admin/users/bulk-notify
func (ac *AdminController) BulkNotifyUsers(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value("user_id").(string)

	var req struct {
		UserIDs []string `json:"user_ids"`
		Title   string   `json:"title"`
		Message string   `json:"message"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Payload tidak valid")
		return
	}

	if len(req.UserIDs) == 0 {
		utils.JSONError(w, http.StatusBadRequest, "Pilih minimal satu pengguna")
		return
	}

	if req.Title == "" || req.Message == "" {
		utils.JSONError(w, http.StatusBadRequest, "Judul dan Pesan wajib diisi")
		return
	}

	// Ambil data user untuk mendapatkan role masing-masing
	var targetUsers []models.User
	if err := ac.DB.Where("id IN ?", req.UserIDs).Find(&targetUsers).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil data pengguna: "+err.Error())
		return
	}

	// Kirim notifikasi secara background
	go func(users []models.User, title, msg string) {
		for _, u := range users {
			receiverID := u.ID
			receiverType := "user"
			if u.Role == "merchant" {
				var merchant models.Merchant
				if err := ac.DB.Select("id").First(&merchant, "user_id = ?", u.ID).Error; err == nil {
					receiverID = merchant.ID
					receiverType = "merchant"
				}
			}
			_ = ac.Notif.Push(receiverID, receiverType, "admin_message", title, msg, "")
		}
	}(targetUsers, req.Title, req.Message)

	ac.Audit.Log(adminID, "bulk_notify_users", "user", "broadcast", fmt.Sprintf("Title: %s, Count: %d", req.Title, len(targetUsers)), r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":  "success",
		"message": fmt.Sprintf("Berhasil menjadwalkan pengiriman notifikasi ke %d pengguna", len(targetUsers)),
	})
}
