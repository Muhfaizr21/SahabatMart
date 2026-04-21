package controllers

import (
	"encoding/json"
	"net/http"
	"SahabatMart/backend/models"
	"SahabatMart/backend/utils"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type RBACController struct {
	DB *gorm.DB
}

func NewRBACController(db *gorm.DB) *RBACController {
	return &RBACController{DB: db}
}

// GET /api/admin/rbac/permissions
func (rc *RBACController) GetPermissions(w http.ResponseWriter, r *http.Request) {
	var permissions []models.Permission
	rc.DB.Order("\"group\" ASC, name ASC").Find(&permissions)
	utils.JSONResponse(w, http.StatusOK, permissions)
}

// GET /api/admin/rbac/roles
func (rc *RBACController) GetRoles(w http.ResponseWriter, r *http.Request) {
	var roles []models.Role
	rc.DB.Preload("Permissions").Find(&roles)
	utils.JSONResponse(w, http.StatusOK, roles)
}

// POST /api/admin/rbac/roles
func (rc *RBACController) UpsertRole(w http.ResponseWriter, r *http.Request) {
	var input struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		Description string `json:"description"`
		PermissionIDs []string `json:"permission_ids"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	var role models.Role
	if input.ID != "" {
		rc.DB.First(&role, "id = ?", input.ID)
	}

	role.Name = input.Name
	role.Description = input.Description

	// Handle Permissions
	var permissions []models.Permission
	if len(input.PermissionIDs) > 0 {
		rc.DB.Where("id IN ?", input.PermissionIDs).Find(&permissions)
	}
	
	if input.ID != "" {
		// Update many-to-many
		rc.DB.Model(&role).Association("Permissions").Replace(permissions)
	} else {
		role.Permissions = permissions
	}

	if err := rc.DB.Save(&role).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menyimpan role: "+err.Error())
		return
	}

	utils.JSONResponse(w, http.StatusOK, role)
}

// DELETE /api/admin/rbac/roles?id=...
func (rc *RBACController) DeleteRole(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "Missing ID")
		return
	}

	// Clean up association first if needed, GORM usually handles this with deleted tags but to be safe:
	var role models.Role
	rc.DB.First(&role, id)
	rc.DB.Model(&role).Association("Permissions").Clear()
	rc.DB.Delete(&role)

	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// POST /api/admin/rbac/users
// Creating a new admin user with a specific role
func (rc *RBACController) CreateAdminUser(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Email     string `json:"email"`
		Password  string `json:"password"`
		FullName  string `json:"full_name"`
		Role      string `json:"role"`       // user_role: 'admin' or 'superadmin'
		AdminRole string `json:"admin_role"` // the name of the Role (from roles table)
		Department string `json:"department"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)

	user := models.User{
		Email:        input.Email,
		PasswordHash: string(hash),
		Role:         input.Role,
		AdminRole:    input.AdminRole,
		Department:   input.Department,
		Status:       "active",
	}

	if err := rc.DB.Create(&user).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal membuat user: "+err.Error())
		return
	}

	profile := models.UserProfile{
		UserID:   user.ID,
		FullName: input.FullName,
	}
	rc.DB.Create(&profile)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status": "success",
		"user_id": user.ID,
	})
}

// POST /api/admin/rbac/users/status
func (rc *RBACController) ToggleAdminStatus(w http.ResponseWriter, r *http.Request) {
	var input struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if err := rc.DB.Model(&models.User{}).Where("id = ? AND role IN ?", input.ID, []string{"admin", "superadmin"}).Update("status", input.Status).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal update status: "+err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// DELETE /api/admin/rbac/users?id=...
func (rc *RBACController) DeleteAdmin(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "Missing ID")
		return
	}
	// Protect superadmin from self-deletion or accidents? 
	// For now just basic delete.
	rc.DB.Delete(&models.User{}, "id = ? AND role IN ?", id, []string{"admin", "superadmin"})
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}
