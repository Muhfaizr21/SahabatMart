package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"akuglow/backend/models"
	"akuglow/backend/repositories"
	"akuglow/backend/services"
	"akuglow/backend/utils"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type RBACController struct {
	DB    *gorm.DB
	Audit *services.AuditService
}

func NewRBACController(db *gorm.DB) *RBACController {
	audit := services.NewAuditService(repositories.NewAuditRepository(db))
	return &RBACController{
		DB:    db,
		Audit: audit,
	}
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

// POST /api/admin/rbac/roles/upsert
func (rc *RBACController) UpsertRole(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value("user_id").(string)
	var input struct {
		ID            string   `json:"id"`
		Name          string   `json:"name"`
		Description   string   `json:"description"`
		PermissionIDs []string `json:"permission_ids"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	var role models.Role
	oldName := ""
	if input.ID != "" {
		if err := rc.DB.First(&role, "id = ?", input.ID).Error; err == nil {
			oldName = role.Name
		}
	}

	role.Name = input.Name
	role.Description = input.Description

	var permissions []models.Permission
	if len(input.PermissionIDs) > 0 {
		rc.DB.Where("id IN ?", input.PermissionIDs).Find(&permissions)
	}

	if err := rc.DB.Transaction(func(tx *gorm.DB) error {
		if input.ID != "" {
			// Cascade Update: Jika nama role berubah, update semua user yang menggunakan role ini
			if oldName != "" && oldName != input.Name {
				if err := tx.Model(&models.User{}).Where("admin_role = ?", oldName).Update("admin_role", input.Name).Error; err != nil {
					return err
				}
			}
			if err := tx.Model(&role).Association("Permissions").Replace(permissions); err != nil {
				return err
			}
		} else {
			role.Permissions = permissions
		}

		if err := tx.Save(&role).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal menyimpan role: "+err.Error())
		return
	}

	action := "create_role"
	if input.ID != "" {
		action = "update_role"
	}
	rc.Audit.Log(adminID, action, "rbac", role.Name, fmt.Sprintf("Permissions: %d", len(input.PermissionIDs)), r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, role)
}

// DELETE /api/admin/rbac/roles/delete?id=...
func (rc *RBACController) DeleteRole(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value("user_id").(string)
	id := r.URL.Query().Get("id")
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "Missing ID")
		return
	}

	var role models.Role
	if err := rc.DB.First(&role, "id = ?", id).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "Role tidak ditemukan")
		return
	}

	var count int64
	rc.DB.Model(&models.User{}).Where("admin_role = ?", role.Name).Count(&count)
	if count > 0 {
		utils.JSONError(w, http.StatusConflict, fmt.Sprintf("Role ini masih digunakan oleh %d akun admin. Ubah role mereka terlebih dahulu.", count))
		return
	}

	rc.DB.Model(&role).Association("Permissions").Clear()
	rc.DB.Delete(&role)

	rc.Audit.Log(adminID, "delete_role", "rbac", role.Name, "Role deleted successfully", r.RemoteAddr)
	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// POST /api/admin/rbac/users
func (rc *RBACController) CreateAdminUser(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value("user_id").(string)
	var input struct {
		Email      string `json:"email"`
		Password   string `json:"password"`
		FullName   string `json:"full_name"`
		Role       string `json:"role"`
		AdminRole  string `json:"admin_role"`
		Department string `json:"department"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if input.Email == "" || input.Password == "" || input.FullName == "" {
		utils.JSONError(w, http.StatusBadRequest, "Email, password, dan nama lengkap wajib diisi")
		return
	}

	var existing models.User
	if err := rc.DB.Where("email = ?", input.Email).First(&existing).Error; err == nil {
		utils.JSONError(w, http.StatusConflict, "Email sudah terdaftar")
		return
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	hashStr := string(hash)

	if input.Role == "" {
		input.Role = "admin"
	}

	user := models.User{
		Email:        input.Email,
		PasswordHash: &hashStr,
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

	rc.Audit.Log(adminID, "create_admin", "rbac", user.Email, fmt.Sprintf("Role: %s, AdminRole: %s", user.Role, user.AdminRole), r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":  "success",
		"user_id": user.ID,
	})
}

// PUT /api/admin/rbac/users/update
func (rc *RBACController) UpdateAdminUser(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value("user_id").(string)
	var input struct {
		ID         string `json:"id"`
		AdminRole  string `json:"admin_role"`
		Department string `json:"department"`
		Role       string `json:"role"`
		FullName   string `json:"full_name"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if input.ID == "" {
		utils.JSONError(w, http.StatusBadRequest, "User ID wajib diisi")
		return
	}

	var user models.User
	if err := rc.DB.First(&user, "id = ?", input.ID).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "User tidak ditemukan")
		return
	}

	if adminID == input.ID && (input.Role != "" || input.AdminRole != "") {
		utils.JSONError(w, http.StatusForbidden, "Anda tidak dapat mengubah role Anda sendiri demi alasan keamanan")
		return
	}

	updates := map[string]interface{}{}
	if input.AdminRole != "" {
		updates["admin_role"] = input.AdminRole
	}
	if input.Department != "" {
		updates["department"] = input.Department
	}
	if input.Role != "" {
		updates["role"] = input.Role
	}

	if err := rc.DB.Model(&models.User{}).Where("id = ?", input.ID).Updates(updates).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal update user: "+err.Error())
		return
	}

	if input.FullName != "" {
		rc.DB.Model(&models.UserProfile{}).Where("user_id = ?", input.ID).Update("full_name", input.FullName)
	}

	rc.Audit.Log(adminID, "update_admin", "rbac", user.Email, fmt.Sprintf("New AdminRole: %s, New Role: %s", input.AdminRole, input.Role), r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// POST /api/admin/rbac/users/status
func (rc *RBACController) ToggleAdminStatus(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value("user_id").(string)
	var input struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if input.Status != "active" && input.Status != "inactive" && input.Status != "suspended" {
		utils.JSONError(w, http.StatusBadRequest, "Status tidak valid")
		return
	}

	var user models.User
	if err := rc.DB.First(&user, "id = ?", input.ID).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "User tidak ditemukan")
		return
	}

	// Protect SuperAdmin Utama & Self-deactivation
	if adminID == input.ID && input.Status != "active" {
		utils.JSONError(w, http.StatusForbidden, "Anda tidak dapat menonaktifkan akun Anda sendiri")
		return
	}

	if (user.Email == "admin@akuglow.id" || user.Email == "superadmin@akuglow.id") && input.Status != "active" {
		utils.JSONError(w, http.StatusForbidden, "Akun superadmin utama tidak dapat dinonaktifkan")
		return
	}

	if err := rc.DB.Model(&models.User{}).
		Where("id = ? AND role IN ?", input.ID, []string{"admin", "superadmin"}).
		Update("status", input.Status).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal update status: "+err.Error())
		return
	}

	rc.Audit.Log(adminID, "toggle_admin_status", "rbac", user.Email, fmt.Sprintf("Status changed to: %s", input.Status), r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// DELETE /api/admin/rbac/users/delete?id=...
func (rc *RBACController) DeleteAdmin(w http.ResponseWriter, r *http.Request) {
	adminID, _ := r.Context().Value("user_id").(string)
	id := r.URL.Query().Get("id")
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "Missing ID")
		return
	}

	var user models.User
	if err := rc.DB.First(&user, "id = ?", id).Error; err != nil {
		utils.JSONError(w, http.StatusNotFound, "User tidak ditemukan")
		return
	}

	// Protect the default superadmin
	if user.Email == "admin@akuglow.id" || user.Email == "superadmin@akuglow.id" {
		utils.JSONError(w, http.StatusForbidden, "Akun superadmin utama tidak dapat dihapus")
		return
	}

	rc.DB.Delete(&models.User{}, "id = ? AND role IN ?", id, []string{"admin", "superadmin"})

	rc.Audit.Log(adminID, "delete_admin", "rbac", user.Email, "Admin deleted permanently", r.RemoteAddr)

	utils.JSONResponse(w, http.StatusOK, map[string]string{"status": "success"})
}

// GET /api/admin/rbac/stats
func (rc *RBACController) GetStats(w http.ResponseWriter, r *http.Request) {
	var totalRoles, totalPerms int64
	rc.DB.Model(&models.Role{}).Count(&totalRoles)
	rc.DB.Model(&models.Permission{}).Count(&totalPerms)

	// Staff by department
	type DeptStat struct {
		Department string `json:"department"`
		Count      int64  `json:"count"`
	}
	var deptStats []DeptStat
	rc.DB.Model(&models.User{}).
		Select("department, count(*) as count").
		Where("role IN ?", []string{"admin", "superadmin"}).
		Group("department").
		Scan(&deptStats)

	// Staff by role
	type RoleStat struct {
		AdminRole string `json:"admin_role"`
		Count     int64  `json:"count"`
	}
	var roleStats []RoleStat
	rc.DB.Model(&models.User{}).
		Select("admin_role, count(*) as count").
		Where("role IN ?", []string{"admin", "superadmin"}).
		Group("admin_role").
		Scan(&roleStats)

	// Active vs inactive
	var activeCount, inactiveCount int64
	rc.DB.Model(&models.User{}).Where("role IN ? AND status = ?", []string{"admin", "superadmin"}, "active").Count(&activeCount)
	rc.DB.Model(&models.User{}).Where("role IN ? AND status != ?", []string{"admin", "superadmin"}, "active").Count(&inactiveCount)

	// Recent logins (last 7 days)
	sevenDaysAgo := time.Now().AddDate(0, 0, -7)
	var recentLogins int64
	rc.DB.Model(&models.User{}).
		Where("role IN ? AND last_login_at > ?", []string{"admin", "superadmin"}, sevenDaysAgo).
		Count(&recentLogins)

	utils.JSONResponse(w, http.StatusOK, map[string]interface{}{
		"total_roles":     totalRoles,
		"total_perms":     totalPerms,
		"active_admins":   activeCount,
		"inactive_admins": inactiveCount,
		"recent_logins":   recentLogins,
		"dept_stats":      deptStats,
		"role_stats":      roleStats,
	})
}

// GET /api/admin/rbac/admins
// Returns all admin users with their profile and role details
func (rc *RBACController) GetAdmins(w http.ResponseWriter, r *http.Request) {
	var users []models.User

	query := rc.DB.Preload("Profile").
		Where("role IN ?", []string{"admin", "superadmin"}).
		Order("created_at DESC")

	// Filter by department
	if dept := r.URL.Query().Get("department"); dept != "" {
		query = query.Where("department = ?", dept)
	}

	// Filter by admin_role
	if adminRole := r.URL.Query().Get("admin_role"); adminRole != "" {
		query = query.Where("admin_role = ?", adminRole)
	}

	// Filter by status
	if status := r.URL.Query().Get("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	// Search by email or name
	if search := r.URL.Query().Get("search"); search != "" {
		query = query.Joins("JOIN user_profiles ON user_profiles.user_id = users.id").
			Where("users.email ILIKE ? OR user_profiles.full_name ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Find(&users).Error; err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal mengambil data admin")
		return
	}

	utils.JSONResponse(w, http.StatusOK, users)
}
