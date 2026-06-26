package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"akuglow/backend/models"
	"akuglow/backend/services"
	"akuglow/backend/utils"

	"gorm.io/gorm"
)

type CMSController struct {
	DB     *gorm.DB
	CMSSvc *services.CMSService
	Store  *services.StorageService
}

func NewCMSController(db *gorm.DB) *CMSController {
	return &CMSController{
		DB:     db,
		CMSSvc: services.NewCMSService(db),
		Store:  services.NewStorageService("", "uploads"),
	}
}

func parsePlatform(r *http.Request) (models.CMSPlatform, error) {
	p := models.CMSPlatform(r.FormValue("platform"))
	if p == "" {
		p = models.CMSPlatform(r.URL.Query().Get("platform"))
	}
	switch p {
	case models.PlatformLandingPage, models.PlatformAffiliateDash, models.PlatformMerchantDash:
		return p, nil
	}
	return "", fmt.Errorf("platform tidak valid: %q", p)
}

func extractID(r *http.Request) string {
	if id := r.URL.Query().Get("id"); id != "" {
		return id
	}
	parts := strings.Split(strings.TrimRight(r.URL.Path, "/"), "/")
	if len(parts) > 0 {
		return parts[len(parts)-1]
	}
	return ""
}

func (cc *CMSController) ListPlatforms(w http.ResponseWriter, r *http.Request) {
	platforms := []map[string]interface{}{
		{"key": models.PlatformLandingPage, "label": "Landing Page", "icon": "web", "description": "Halaman utama publik AkuGlow"},
		{"key": models.PlatformAffiliateDash, "label": "Affiliate Dashboard", "icon": "groups", "description": "Dashboard mitra affiliate"},
		{"key": models.PlatformMerchantDash, "label": "Merchant Dashboard", "icon": "store", "description": "Dashboard merchant/distributor"},
	}
	utils.JSONResponse(w, http.StatusOK, platforms)
}

func (cc *CMSController) GetTheme(w http.ResponseWriter, r *http.Request) {
	platform, err := parsePlatform(r)
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	theme, err := cc.CMSSvc.GetTheme(platform)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusOK, theme)
}

func (cc *CMSController) UpdateTheme(w http.ResponseWriter, r *http.Request) {
	platform, err := parsePlatform(r)
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	var payload models.SiteTheme
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Data tidak valid")
		return
	}
	theme, err := cc.CMSSvc.UpdateTheme(platform, func(t *models.SiteTheme) {
		t.Colors = payload.Colors
		t.Typography = payload.Typography
		t.Spacing = payload.Spacing
		t.Logo = payload.Logo
		t.CustomCSS = payload.CustomCSS
		if payload.Name != "" {
			t.Name = payload.Name
		}
	})
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusOK, theme)
}

func (cc *CMSController) PublishTheme(w http.ResponseWriter, r *http.Request) {
	platform, err := parsePlatform(r)
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	theme, err := cc.CMSSvc.PublishTheme(platform)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusOK, theme)
}

func (cc *CMSController) ListSections(w http.ResponseWriter, r *http.Request) {
	platform, err := parsePlatform(r)
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	page := r.URL.Query().Get("page")
	sections, err := cc.CMSSvc.ListSections(platform, page)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusOK, sections)
}

func (cc *CMSController) CreateSection(w http.ResponseWriter, r *http.Request) {
	var sec models.SiteSection
	if err := json.NewDecoder(r.Body).Decode(&sec); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Data tidak valid")
		return
	}
	if sec.Platform == "" {
		utils.JSONError(w, http.StatusBadRequest, "platform wajib diisi")
		return
	}
	if sec.Key == "" {
		utils.JSONError(w, http.StatusBadRequest, "key wajib diisi")
		return
	}
	if err := cc.CMSSvc.CreateSection(&sec); err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusCreated, sec)
}

func (cc *CMSController) UpdateSection(w http.ResponseWriter, r *http.Request) {
	id := extractID(r)
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "id wajib diisi")
		return
	}
	var payload models.SiteSection
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Data tidak valid")
		return
	}
	sec, err := cc.CMSSvc.UpdateSection(id, func(s *models.SiteSection) {
		s.Title = payload.Title
		s.Subtitle = payload.Subtitle
		s.Content = payload.Content
		s.Variant = payload.Variant
		s.IsActive = payload.IsActive
		if payload.Page != "" {
			s.Page = payload.Page
		}
		if payload.Key != "" {
			s.Key = payload.Key
		}
		if payload.Order != 0 {
			s.Order = payload.Order
		}
	})
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusOK, sec)
}

func (cc *CMSController) DeleteSection(w http.ResponseWriter, r *http.Request) {
	id := extractID(r)
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "id wajib diisi")
		return
	}
	if err := cc.CMSSvc.DeleteSection(id); err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Section berhasil dihapus"})
}

func (cc *CMSController) ReorderSections(w http.ResponseWriter, r *http.Request) {
	platform, err := parsePlatform(r)
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	var req struct {
		IDs []string `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Data tidak valid")
		return
	}
	if err := cc.CMSSvc.ReorderSections(platform, r.URL.Query().Get("page"), req.IDs); err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Urutan berhasil disimpan"})
}

func (cc *CMSController) GetMenu(w http.ResponseWriter, r *http.Request) {
	platform, err := parsePlatform(r)
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	location := r.URL.Query().Get("location")
	if location == "" {
		location = "main"
	}
	menu, err := cc.CMSSvc.GetMenu(platform, location)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusOK, menu)
}

func (cc *CMSController) UpsertMenu(w http.ResponseWriter, r *http.Request) {
	platform, err := parsePlatform(r)
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	var req struct {
		Location string            `json:"location"`
		Items    []*models.MenuItem `json:"items"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Data tidak valid")
		return
	}
	if req.Location == "" {
		req.Location = "main"
	}
	menu, err := cc.CMSSvc.UpsertMenu(platform, req.Location, req.Items)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusOK, menu)
}

func (cc *CMSController) ListAssets(w http.ResponseWriter, r *http.Request) {
	platform, _ := parsePlatform(r)
	category := r.URL.Query().Get("category")
	assets, err := cc.CMSSvc.ListAssets(platform, category)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusOK, assets)
}

func (cc *CMSController) UploadAsset(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Gagal parse form")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, "File tidak ditemukan")
		return
	}
	defer file.Close()

	platform := models.CMSPlatform(r.FormValue("platform"))
	category := r.FormValue("category")
	if category == "" {
		category = "general"
	}
	label := r.FormValue("label")
	if label == "" {
		label = header.Filename
	}
	altText := r.FormValue("alt_text")

	url, err := cc.Store.SaveImage(file, header)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal upload file")
		return
	}

	asset := &models.SiteAsset{
		Platform: platform,
		Label:    label,
		FileName: header.Filename,
		URL:      url,
		MimeType: header.Header.Get("Content-Type"),
		FileSize: header.Size,
		AltText:  altText,
		Category: category,
	}

	if err := cc.CMSSvc.CreateAsset(asset); err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusCreated, asset)
}

func (cc *CMSController) DeleteAsset(w http.ResponseWriter, r *http.Request) {
	id := extractID(r)
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "id wajib diisi")
		return
	}
	if err := cc.CMSSvc.DeleteAsset(id); err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusOK, map[string]string{"message": "Asset berhasil dihapus"})
}

func (cc *CMSController) GetPublicCMS(w http.ResponseWriter, r *http.Request) {
	platform := models.CMSPlatform(r.URL.Query().Get("platform"))
	if platform == "" {
		utils.JSONError(w, http.StatusBadRequest, "platform required")
		return
	}
	w.Header().Set("Cache-Control", "public, max-age=300")
	w.Header().Set("Vary", "Accept-Encoding")
	data, err := cc.CMSSvc.GetPublishedCMS(platform)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusOK, data)
}

// ─── Page Content ──────────────────────────────────────────────────────────────

func (cc *CMSController) GetPageContent(w http.ResponseWriter, r *http.Request) {
	platform, err := parsePlatform(r)
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	page := r.URL.Query().Get("page")
	if page == "" {
		utils.JSONError(w, http.StatusBadRequest, "page required")
		return
	}
	pc, err := cc.CMSSvc.GetPageContent(platform, page)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusOK, pc)
}

func (cc *CMSController) UpdatePageContent(w http.ResponseWriter, r *http.Request) {
	platform, err := parsePlatform(r)
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	page := r.URL.Query().Get("page")
	if page == "" {
		utils.JSONError(w, http.StatusBadRequest, "page required")
		return
	}
	var payload struct {
		Content json.RawMessage `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "Data tidak valid")
		return
	}
	pc, err := cc.CMSSvc.UpdatePageContent(platform, page, payload.Content)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSONResponse(w, http.StatusOK, pc)
}

func (cc *CMSController) GetPublicPageContent(w http.ResponseWriter, r *http.Request) {
	platform := models.CMSPlatform(r.URL.Query().Get("platform"))
	page := r.URL.Query().Get("page")
	if platform == "" || page == "" {
		utils.JSONError(w, http.StatusBadRequest, "platform and page required")
		return
	}
	pc, err := cc.CMSSvc.GetPageContent(platform, page)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.Header().Set("Cache-Control", "public, max-age=60")
	utils.JSONResponse(w, http.StatusOK, pc)
}

func (cc *CMSController) PreviewCSS(w http.ResponseWriter, r *http.Request) {
	platform := models.CMSPlatform(r.URL.Query().Get("platform"))
	if platform == "" {
		utils.JSONError(w, http.StatusBadRequest, "platform required")
		return
	}
	css, err := cc.CMSSvc.GeneratePreviewCSS(platform)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.Header().Set("Content-Type", "text/css")
	w.Header().Set("Cache-Control", "no-cache")
	w.Write([]byte(css))
}

func (cc *CMSController) OverrideCSS(w http.ResponseWriter, r *http.Request) {
	platform := models.CMSPlatform(r.URL.Query().Get("platform"))
	if platform == "" {
		utils.JSONError(w, http.StatusBadRequest, "platform required")
		return
	}
	css, err := cc.CMSSvc.GenerateOverrideCSS(platform)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.Header().Set("Content-Type", "text/css")
	w.Header().Set("Cache-Control", "public, max-age=60")
	w.Write([]byte(css))
}

func (cc *CMSController) GetPreviewPage(w http.ResponseWriter, r *http.Request) {
	platform := models.CMSPlatform(r.URL.Query().Get("platform"))
	if platform == "" {
		utils.JSONError(w, http.StatusBadRequest, "platform required")
		return
	}
	theme, err := cc.CMSSvc.GetTheme(platform)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	_ = theme
	raw := strings.ReplaceAll(string(platform), "_", " ")
	platformLabel := ""
	for i, w := range strings.Fields(raw) {
		if i > 0 { platformLabel += " " }
		platformLabel += strings.ToUpper(w[:1]) + w[1:]
	}

	cssURL := "/api/public/cms/preview.css?platform=" + string(platform)

	var bodyHTML string
	switch platform {
	case models.PlatformAffiliateDash:
		bodyHTML = affiliatePreviewHTML(cssURL, platformLabel)
	case models.PlatformMerchantDash:
		bodyHTML = merchantPreviewHTML(cssURL, platformLabel)
	default:
		bodyHTML = landingPreviewHTML(cssURL, platformLabel)
	}

	html := `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CMS Preview - ` + platformLabel + `</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="` + cssURL + `">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: var(--cms-font-family); color: var(--cms-text); background: var(--cms-bg); }
    .container { max-width: var(--cms-container-width); margin: 0 auto; padding: 0 1rem; }
    .section { padding: var(--cms-section-padding) 0; }
    .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem;
      border-radius: var(--cms-border-radius); font-weight: 600; font-size: 0.875rem;
      transition: all 0.2s; cursor: pointer; text-decoration: none; border: 0; }
    .btn-primary { background: var(--cms-primary); color: #fff; }
    .btn-primary:hover { opacity: 0.9; }
    .btn-outline { background: transparent; border: 2px solid var(--cms-border); color: var(--cms-text); }
    .card { background: var(--cms-card); border: 1px solid var(--cms-border);
      border-radius: var(--cms-border-radius); padding: 1.5rem; }
    .tag { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--cms-gap); }
    .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--cms-gap); }
    .grid-4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--cms-gap); }
    .badge { font-size: 0.75rem; padding: 0.125rem 0.5rem; border-radius: 999px; font-weight: 600; }
  </style>
</head>
<body>` + bodyHTML + `</body>
</html>`

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(html))
}

func landingPreviewHTML(cssURL, label string) string {
	return `<div class="container">
    <div class="section" style="text-align:center">
      <span class="tag" style="background:var(--cms-primary);color:#fff">Live Preview</span>
      <h1 style="margin:1.5rem 0 0.5rem;color:var(--cms-primary);font-size:2.5rem">Selamat Datang di ` + label + `</h1>
      <p style="color:var(--cms-muted);max-width:600px;margin:0 auto 2rem">Tema ini dapat disesuaikan secara real-time melalui CMS Editor.</p>
      <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap">
        <a href="#" class="btn btn-primary">Mulai Sekarang</a>
        <a href="#" class="btn btn-outline">Pelajari Lebih Lanjut</a>
      </div>
    </div>
    <div class="section">
      <h2 style="margin-bottom:2rem">Preview Komponen</h2>
      <div class="grid-3">
        <div class="card"><h3 style="color:var(--cms-primary);margin-bottom:0.5rem">Card Default</h3><p style="color:var(--cms-muted)">Card dengan warna dasar.</p></div>
        <div class="card" style="border-color:var(--cms-primary)"><h3 style="color:var(--cms-secondary);margin-bottom:0.5rem">Card Outline</h3><p style="color:var(--cms-muted)">Card dengan border primary.</p></div>
        <div class="card" style="background:var(--cms-primary);color:#fff;border-color:var(--cms-primary)"><h3 style="margin-bottom:0.5rem">Card Solid</h3><p style="opacity:0.85">Card latar primary.</p></div>
      </div>
    </div>
    <div class="section" style="border-top:1px solid var(--cms-border)">
      <h3 style="margin-bottom:1rem">Heading Levels</h3>
      <h1>Heading 1</h1><h2>Heading 2</h2><h3>Heading 3</h3><h4>Heading 4</h4><h5>Heading 5</h5><h6>Heading 6</h6>
    </div>
    <div class="section" style="border-top:1px solid var(--cms-border)">
      <h3 style="margin-bottom:1rem">Status</h3>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
        <span class="tag" style="background:var(--cms-success);color:#fff">Success</span>
        <span class="tag" style="background:var(--cms-warning);color:#fff">Warning</span>
        <span class="tag" style="background:var(--cms-error);color:#fff">Error</span>
        <span class="tag" style="background:var(--cms-primary);color:#fff">Primary</span>
        <span class="tag" style="background:var(--cms-secondary);color:#fff">Secondary</span>
      </div>
    </div>
  </div>`
}

func affiliatePreviewHTML(cssURL, label string) string {
	return `<div style="display:flex;min-height:100vh">
    <!-- Sidebar -->
    <div style="width:240px;background:var(--cms-card);border-right:1px solid var(--cms-border);padding:1.5rem;flex-shrink:0">
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:2rem;padding-bottom:1rem;border-bottom:1px solid var(--cms-border)">
        <div style="width:32px;height:32px;border-radius:8px;background:var(--cms-primary)"></div>
        <div><div style="font-weight:700;font-size:0.875rem">` + label + `</div><div style="font-size:0.75rem;color:var(--cms-muted)">Preview</div></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.25rem">
        <div style="padding:0.625rem 0.75rem;border-radius:8px;background:var(--cms-primary);color:#fff;font-size:0.8125rem;font-weight:600">
          <span style="margin-right:0.5rem">📊</span> Dashboard</div>
        <div style="padding:0.625rem 0.75rem;border-radius:8px;font-size:0.8125rem;color:var(--cms-muted)">
          <span style="margin-right:0.5rem">🔗</span> Komisi</div>
        <div style="padding:0.625rem 0.75rem;border-radius:8px;font-size:0.8125rem;color:var(--cms-muted)">
          <span style="margin-right:0.5rem">👥</span> Jaringan</div>
        <div style="padding:0.625rem 0.75rem;border-radius:8px;font-size:0.8125rem;color:var(--cms-muted)">
          <span style="margin-right:0.5rem">📋</span> Transaksi</div>
        <div style="padding:0.625rem 0.75rem;border-radius:8px;font-size:0.8125rem;color:var(--cms-muted)">
          <span style="margin-right:0.5rem">⚙️</span> Pengaturan</div>
      </div>
    </div>
    <!-- Main -->
    <div style="flex:1;padding:1.5rem;background:var(--cms-bg)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem">
        <div>
          <h1 style="font-size:1.5rem;font-weight:700">Dashboard Preview</h1>
          <p style="font-size:0.8125rem;color:var(--cms-muted);margin-top:0.25rem">Selamat datang, Mitra AkuGlow</p>
        </div>
        <div style="display:flex;gap:0.75rem;align-items:center">
          <span class="tag" style="background:var(--cms-primary);color:#fff">Live Preview</span>
          <div style="width:36px;height:36px;border-radius:50%;background:var(--cms-primary);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:0.875rem">A</div>
        </div>
      </div>
      <div class="grid-4" style="margin-bottom:2rem">
        <div class="card" style="border-left:3px solid var(--cms-primary)">
          <div style="font-size:0.75rem;color:var(--cms-muted);margin-bottom:0.25rem">Total Komisi</div>
          <div style="font-size:1.5rem;font-weight:800;color:var(--cms-text)">Rp 2.450.000</div>
          <div style="font-size:0.75rem;color:var(--cms-success);margin-top:0.25rem">↑ 12% minggu ini</div>
        </div>
        <div class="card" style="border-left:3px solid var(--cms-secondary)">
          <div style="font-size:0.75rem;color:var(--cms-muted);margin-bottom:0.25rem">Affiliate Aktif</div>
          <div style="font-size:1.5rem;font-weight:800;color:var(--cms-text)">47</div>
          <div style="font-size:0.75rem;color:var(--cms-muted);margin-top:0.25rem">Total jaringan</div>
        </div>
        <div class="card" style="border-left:3px solid var(--cms-accent)">
          <div style="font-size:0.75rem;color:var(--cms-muted);margin-bottom:0.25rem">Transaksi</div>
          <div style="font-size:1.5rem;font-weight:800;color:var(--cms-text)">128</div>
          <div style="font-size:0.75rem;color:var(--cms-muted);margin-top:0.25rem">Bulan ini</div>
        </div>
        <div class="card" style="border-left:3px solid var(--cms-success)">
          <div style="font-size:0.75rem;color:var(--cms-muted);margin-bottom:0.25rem">Peringkat</div>
          <div style="font-size:1.5rem;font-weight:800;color:var(--cms-text)">#3</div>
          <div style="font-size:0.75rem;color:var(--cms-muted);margin-top:0.25rem">Diamond Tier</div>
        </div>
      </div>
      <div class="grid-2" style="margin-bottom:2rem">
        <div class="card">
          <h3 style="font-size:0.875rem;font-weight:700;margin-bottom:1rem">Komisi Terbaru</h3>
          <div style="display:flex;flex-direction:column;gap:0.75rem">
            <div style="display:flex;justify-content:space-between"><span style="font-size:0.8125rem">Andi Pratama</span><span style="font-size:0.8125rem;font-weight:600;color:var(--cms-success)">+Rp 45.000</span></div>
            <div style="display:flex;justify-content:space-between"><span style="font-size:0.8125rem">Siti Rahma</span><span style="font-size:0.8125rem;font-weight:600;color:var(--cms-success)">+Rp 32.500</span></div>
            <div style="display:flex;justify-content:space-between"><span style="font-size:0.8125rem">Budi Santoso</span><span style="font-size:0.8125rem;font-weight:600;color:var(--cms-success)">+Rp 28.000</span></div>
          </div>
        </div>
        <div class="card">
          <h3 style="font-size:0.875rem;font-weight:700;margin-bottom:1rem">Aktivitas Terkini</h3>
          <div style="display:flex;flex-direction:column;gap:0.75rem">
            <div style="display:flex;gap:0.75rem;align-items:center">
              <div style="width:8px;height:8px;border-radius:50%;background:var(--cms-primary)"></div>
              <div><div style="font-size:0.8125rem">Pendaftaran baru</div><div style="font-size:0.6875rem;color:var(--cms-muted)">2 menit lalu</div></div>
            </div>
            <div style="display:flex;gap:0.75rem;align-items:center">
              <div style="width:8px;height:8px;border-radius:50%;background:var(--cms-success)"></div>
              <div><div style="font-size:0.8125rem">Komisi dicairkan</div><div style="font-size:0.6875rem;color:var(--cms-muted)">15 menit lalu</div></div>
            </div>
            <div style="display:flex;gap:0.75rem;align-items:center">
              <div style="width:8px;height:8px;border-radius:50%;background:var(--cms-accent)"></div>
              <div><div style="font-size:0.8125rem">Transaksi baru</div><div style="font-size:0.6875rem;color:var(--cms-muted)">1 jam lalu</div></div>
            </div>
          </div>
        </div>
      </div>
      <div style="font-size:0.75rem;color:var(--cms-muted);text-align:center;padding:2rem 0;border-top:1px solid var(--cms-border)">
        Tema CMS — perubahan langsung terlihat di preview ini
      </div>
    </div>
  </div>`
}

func merchantPreviewHTML(cssURL, label string) string {
	return `<div style="display:flex;min-height:100vh">
    <!-- Sidebar -->
    <div style="width:240px;background:var(--cms-card);border-right:1px solid var(--cms-border);padding:1.5rem;flex-shrink:0">
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:2rem;padding-bottom:1rem;border-bottom:1px solid var(--cms-border)">
        <div style="width:32px;height:32px;border-radius:8px;background:var(--cms-secondary)"></div>
        <div><div style="font-weight:700;font-size:0.875rem">` + label + `</div><div style="font-size:0.75rem;color:var(--cms-muted)">Preview</div></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.25rem">
        <div style="padding:0.625rem 0.75rem;border-radius:8px;background:var(--cms-secondary);color:#fff;font-size:0.8125rem;font-weight:600">
          <span style="margin-right:0.5rem">📊</span> Dashboard</div>
        <div style="padding:0.625rem 0.75rem;border-radius:8px;font-size:0.8125rem;color:var(--cms-muted)">
          <span style="margin-right:0.5rem">📦</span> Produk</div>
        <div style="padding:0.625rem 0.75rem;border-radius:8px;font-size:0.8125rem;color:var(--cms-muted)">
          <span style="margin-right:0.5rem">🛒</span> Pesanan</div>
        <div style="padding:0.625rem 0.75rem;border-radius:8px;font-size:0.8125rem;color:var(--cms-muted)">
          <span style="margin-right:0.5rem">💰</span> Keuangan</div>
        <div style="padding:0.625rem 0.75rem;border-radius:8px;font-size:0.8125rem;color:var(--cms-muted)">
          <span style="margin-right:0.5rem">📈</span> Laporan</div>
      </div>
    </div>
    <!-- Main -->
    <div style="flex:1;padding:1.5rem;background:var(--cms-bg)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem">
        <div>
          <h1 style="font-size:1.5rem;font-weight:700">Dashboard Preview</h1>
          <p style="font-size:0.8125rem;color:var(--cms-muted);margin-top:0.25rem">Selamat datang, Distributor</p>
        </div>
        <div style="display:flex;gap:0.75rem;align-items:center">
          <span class="tag" style="background:var(--cms-secondary);color:#fff">Live Preview</span>
          <div style="width:36px;height:36px;border-radius:50%;background:var(--cms-secondary);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:0.875rem">M</div>
        </div>
      </div>
      <div class="grid-4" style="margin-bottom:2rem">
        <div class="card" style="border-left:3px solid var(--cms-primary)">
          <div style="font-size:0.75rem;color:var(--cms-muted);margin-bottom:0.25rem">Total Penjualan</div>
          <div style="font-size:1.5rem;font-weight:800;color:var(--cms-text)">Rp 12.8 Jt</div>
          <div style="font-size:0.75rem;color:var(--cms-success);margin-top:0.25rem">↑ 8% minggu ini</div>
        </div>
        <div class="card" style="border-left:3px solid var(--cms-secondary)">
          <div style="font-size:0.75rem;color:var(--cms-muted);margin-bottom:0.25rem">Pesanan</div>
          <div style="font-size:1.5rem;font-weight:800;color:var(--cms-text)">47</div>
          <div style="font-size:0.75rem;color:var(--cms-muted);margin-top:0.25rem">5 perlu dikirim</div>
        </div>
        <div class="card" style="border-left:3px solid var(--cms-accent)">
          <div style="font-size:0.75rem;color:var(--cms-muted);margin-bottom:0.25rem">Produk Aktif</div>
          <div style="font-size:1.5rem;font-weight:800;color:var(--cms-text)">23</div>
          <div style="font-size:0.75rem;color:var(--cms-muted);margin-top:0.25rem">3 stok menipis</div>
        </div>
        <div class="card" style="border-left:3px solid var(--cms-success)">
          <div style="font-size:0.75rem;color:var(--cms-muted);margin-bottom:0.25rem">Pendapatan Bersih</div>
          <div style="font-size:1.5rem;font-weight:800;color:var(--cms-text)">Rp 9.2 Jt</div>
          <div style="font-size:0.75rem;color:var(--cms-muted);margin-top:0.25rem">Bulan ini</div>
        </div>
      </div>
      <div class="grid-2" style="margin-bottom:2rem">
        <div class="card">
          <h3 style="font-size:0.875rem;font-weight:700;margin-bottom:1rem">Pesanan Terbaru</h3>
          <div style="display:flex;flex-direction:column;gap:0.75rem">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div><div style="font-size:0.8125rem">#INV-001</div><div style="font-size:0.6875rem;color:var(--cms-muted)">Andi Pratama</div></div>
              <span class="badge" style="background:var(--cms-warning);color:#fff">Pending</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div><div style="font-size:0.8125rem">#INV-002</div><div style="font-size:0.6875rem;color:var(--cms-muted)">Siti Rahma</div></div>
              <span class="badge" style="background:var(--cms-success);color:#fff">Selesai</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div><div style="font-size:0.8125rem">#INV-003</div><div style="font-size:0.6875rem;color:var(--cms-muted)">Budi Santoso</div></div>
              <span class="badge" style="background:var(--cms-primary);color:#fff">Dikirim</span>
            </div>
          </div>
        </div>
        <div class="card">
          <h3 style="font-size:0.875rem;font-weight:700;margin-bottom:1rem">Stok Produk</h3>
          <div style="display:flex;flex-direction:column;gap:0.75rem">
            <div style="display:flex;justify-content:space-between"><span style="font-size:0.8125rem">Serum Vitamin C</span><span style="font-size:0.8125rem;font-weight:600;color:var(--cms-error)">5 pcs</span></div>
            <div style="display:flex;justify-content:space-between"><span style="font-size:0.8125rem">Toner Glowing</span><span style="font-size:0.8125rem;font-weight:600;color:var(--cms-warning)">12 pcs</span></div>
            <div style="display:flex;justify-content:space-between"><span style="font-size:0.8125rem">Moisturizer</span><span style="font-size:0.8125rem;font-weight:600;color:var(--cms-success)">45 pcs</span></div>
          </div>
        </div>
      </div>
      <div style="font-size:0.75rem;color:var(--cms-muted);text-align:center;padding:2rem 0;border-top:1px solid var(--cms-border)">
        Tema CMS — perubahan langsung terlihat di preview ini
      </div>
    </div>
  </div>`
}
