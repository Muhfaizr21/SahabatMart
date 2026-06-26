package services

import (
	"encoding/json"
	"fmt"

	"akuglow/backend/models"
	"gorm.io/gorm"
)

type CMSService struct {
	DB *gorm.DB
}

func NewCMSService(db *gorm.DB) *CMSService {
	return &CMSService{DB: db}
}

// ─── Theme ─────────────────────────────────────────────────────────────────────

func (s *CMSService) GetTheme(platform models.CMSPlatform) (*models.SiteTheme, error) {
	var theme models.SiteTheme
	err := s.DB.Where("platform = ?", platform).First(&theme).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			theme = *models.DefaultTheme(platform)
			s.DB.Create(&theme)
			return &theme, nil
		}
		return nil, err
	}
	return &theme, nil
}

func (s *CMSService) UpdateTheme(platform models.CMSPlatform, upd func(t *models.SiteTheme)) (*models.SiteTheme, error) {
	theme, err := s.GetTheme(platform)
	if err != nil {
		return nil, err
	}
	upd(theme)
	if err := s.DB.Save(theme).Error; err != nil {
		return nil, err
	}
	return theme, nil
}

func (s *CMSService) PublishTheme(platform models.CMSPlatform) (*models.SiteTheme, error) {
	return s.UpdateTheme(platform, func(t *models.SiteTheme) {
		t.IsPublished = true
	})
}

// ─── Sections ──────────────────────────────────────────────────────────────────

func (s *CMSService) ListSections(platform models.CMSPlatform, page string) ([]models.SiteSection, error) {
	var sections []models.SiteSection
	q := s.DB.Where("platform = ?", platform)
	if page != "" {
		q = q.Where("page = ?", page)
	}
	err := q.Order(`"order" ASC, created_at ASC`).Find(&sections).Error
	return sections, err
}

func (s *CMSService) GetSection(id string) (*models.SiteSection, error) {
	var sec models.SiteSection
	err := s.DB.First(&sec, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &sec, nil
}

func (s *CMSService) CreateSection(sec *models.SiteSection) error {
	if sec.Content == nil {
		sec.Content = json.RawMessage("{}")
	}
	return s.DB.Create(sec).Error
}

func (s *CMSService) UpdateSection(id string, upd func(*models.SiteSection)) (*models.SiteSection, error) {
	sec, err := s.GetSection(id)
	if err != nil {
		return nil, err
	}
	upd(sec)
	if err := s.DB.Save(sec).Error; err != nil {
		return nil, err
	}
	return sec, nil
}

func (s *CMSService) DeleteSection(id string) error {
	return s.DB.Delete(&models.SiteSection{}, "id = ?", id).Error
}

func (s *CMSService) ReorderSections(platform models.CMSPlatform, page string, order []string) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		for i, id := range order {
			if err := tx.Model(&models.SiteSection{}).Where("id = ?", id).
				Update(`"order"`, i).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// ─── Menus ─────────────────────────────────────────────────────────────────────

func (s *CMSService) GetMenu(platform models.CMSPlatform, location string) (*models.SiteMenu, error) {
	var menu models.SiteMenu
	err := s.DB.Where("platform = ? AND location = ?", platform, location).First(&menu).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			menu = models.SiteMenu{Platform: platform, Location: location, Name: location + " menu", Items: []*models.MenuItem{}}
			s.DB.Create(&menu)
			return &menu, nil
		}
		return nil, err
	}
	return &menu, nil
}

func (s *CMSService) UpsertMenu(platform models.CMSPlatform, location string, items []*models.MenuItem) (*models.SiteMenu, error) {
	menu, err := s.GetMenu(platform, location)
	if err != nil {
		return nil, err
	}
	menu.Items = items
	if err := s.DB.Save(menu).Error; err != nil {
		return nil, err
	}
	return menu, nil
}

// ─── Assets ────────────────────────────────────────────────────────────────────

func (s *CMSService) ListAssets(platform models.CMSPlatform, category string) ([]models.SiteAsset, error) {
	var assets []models.SiteAsset
	q := s.DB.Order("created_at DESC")
	if platform != "" {
		q = q.Where("platform = ?", platform)
	}
	if category != "" {
		q = q.Where("category = ?", category)
	}
	err := q.Find(&assets).Error
	return assets, err
}

func (s *CMSService) CreateAsset(asset *models.SiteAsset) error {
	return s.DB.Create(asset).Error
}

func (s *CMSService) DeleteAsset(id string) error {
	return s.DB.Delete(&models.SiteAsset{}, "id = ?", id).Error
}

// ─── Page Content ──────────────────────────────────────────────────────────────

func (s *CMSService) GetPageContent(platform models.CMSPlatform, page string) (*models.SitePageContent, error) {
	var pc models.SitePageContent
	err := s.DB.Where("platform = ? AND page = ?", platform, page).First(&pc).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			pc = models.SitePageContent{Platform: platform, Page: page, Content: models.DefaultPageContent(page)}
			s.DB.Create(&pc)
			return &pc, nil
		}
		return nil, err
	}
	return &pc, nil
}

func (s *CMSService) UpdatePageContent(platform models.CMSPlatform, page string, content json.RawMessage) (*models.SitePageContent, error) {
	pc, err := s.GetPageContent(platform, page)
	if err != nil {
		return nil, err
	}
	pc.Content = content
	if err := s.DB.Save(pc).Error; err != nil {
		return nil, err
	}
	return pc, nil
}

// ─── Public API ────────────────────────────────────────────────────────────────

func (s *CMSService) GetPublishedCMS(platform models.CMSPlatform) (*models.PublicCMSData, error) {
	theme, err := s.GetTheme(platform)
	if err != nil {
		return nil, err
	}
	// Return published theme if exists, otherwise everything
	if !theme.IsPublished {
		theme = models.DefaultTheme(platform)
	}

	sections, err := s.ListSections(platform, "")
	if err != nil {
		return nil, err
	}

	var menus []models.SiteMenu
	s.DB.Where("platform = ?", platform).Find(&menus)

	return &models.PublicCMSData{
		Theme:    theme,
		Sections: sections,
		Menus:    menus,
	}, nil
}

// ─── Preview CSS ───────────────────────────────────────────────────────────────

func (s *CMSService) GeneratePreviewCSS(platform models.CMSPlatform) (string, error) {
	theme, err := s.GetTheme(platform)
	if err != nil {
		return "", err
	}

	base := theme.Typography.BaseSize
	if base == "" {
		base = "16px"
	}

	css := fmt.Sprintf(`/* CMS Theme — %s */
:root {
  --cms-primary: %[2]s;
  --cms-secondary: %[3]s;
  --cms-accent: %[4]s;
  --cms-bg: %[5]s;
  --cms-text: %[6]s;
  --cms-muted: %[7]s;
  --cms-border: %[8]s;
  --cms-card: %[9]s;
  --cms-success: %[10]s;
  --cms-warning: %[11]s;
  --cms-error: %[12]s;
  --cms-font-family: %[13]s;
  --cms-heading-font: %[14]s;
  --cms-base-size: %[15]s;
  --cms-section-padding: %[16]s;
  --cms-container-width: %[17]s;
  --cms-border-radius: %[18]s;
  --cms-gap: %[19]s;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: %[15]s; }
body { font-family: var(--cms-font-family); color: var(--cms-text); background: var(--cms-bg); line-height: 1.6; }
h1, h2, h3, h4, h5, h6 { font-family: var(--cms-heading-font); font-weight: 700; line-height: 1.2; }
.container { max-width: var(--cms-container-width); margin: 0 auto; padding: 0 1rem; }
.section { padding: var(--cms-section-padding) 0; }
.btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.75rem 1.5rem;
  border-radius: var(--cms-border-radius); font-weight: 600; font-size: 0.875rem;
  transition: all 0.2s; cursor: pointer; text-decoration: none; border: 0; }
.btn-primary { background: var(--cms-primary); color: #fff; }
.btn-primary:hover { opacity: 0.9; }
.btn-secondary { background: var(--cms-secondary); color: #fff; }
.card { background: var(--cms-card); border: 1px solid var(--cms-border);
  border-radius: var(--cms-border-radius); padding: 1.5rem; }
`,
		platform,
		theme.Colors.Primary, theme.Colors.Secondary, theme.Colors.Accent,
		theme.Colors.Background, theme.Colors.Text, theme.Colors.Muted,
		theme.Colors.Border, theme.Colors.Card, theme.Colors.Success,
		theme.Colors.Warning, theme.Colors.Error,
		theme.Typography.FontFamily, theme.Typography.HeadingFont,
		base,
		theme.Spacing.SectionPadding, theme.Spacing.ContainerWidth,
		theme.Spacing.BorderRadius, theme.Spacing.Gap)

	if theme.CustomCSS != "" {
		css += "\n/* Custom CSS */\n" + theme.CustomCSS + "\n"
	}

	return css, nil
}

// GenerateOverrideCSS generates CSS that overrides Tailwind utility classes
// with CMS theme variables so live pages reflect CMS changes.
func (s *CMSService) GenerateOverrideCSS(platform models.CMSPlatform) (string, error) {
	theme, err := s.GetTheme(platform)
	if err != nil {
		return "", err
	}
	p := theme.Colors.Primary
	s2 := theme.Colors.Secondary
	a := theme.Colors.Accent
	su := theme.Colors.Success
	w := theme.Colors.Warning
	e := theme.Colors.Error

	genShades := func(hex string) map[string]string {
		return map[string]string{
			"50":  lighten(hex, 0.92), "100": lighten(hex, 0.82),
			"200": lighten(hex, 0.65), "400": lighten(hex, 0.35),
			"500": lighten(hex, 0.15), "600": hex, "700": darken(hex, 0.15),
		}
	}

	type rule struct{ color string; shades map[string]string }
	rules := []rule{
		{"indigo", genShades(p)}, {"purple", genShades(s2)},
		{"amber", genShades(a)}, {"rose", genShades(a)},
		{"emerald", genShades(su)}, {"green", genShades(su)},
		{"red", genShades(e)}, {"yellow", genShades(w)},
	}

	var bld string
	bld += "/* CMS Override - " + string(platform) + " */\n"
	bld += ":root { --cms-primary: " + p + "; --cms-secondary: " + s2 + "; --cms-accent: " + a
	bld += "; --cms-success: " + su + "; --cms-warning: " + w + "; --cms-error: " + e + "; }\n"

	for _, r := range rules {
		for sh, h := range r.shades {
			bld += fmt.Sprintf(".text-%s-%s,.hover\\:text-%s-%s:hover,.group:hover .group-hover\\:text-%s-%s,.focus\\:text-%s-%s:focus{color:%s!important}\n", r.color, sh, r.color, sh, r.color, sh, r.color, sh, h)
			bld += fmt.Sprintf(".bg-%s-%s,.hover\\:bg-%s-%s:hover,.focus\\:bg-%s-%s:focus,.dark\\:bg-%s-%s{background-color:%s!important}\n", r.color, sh, r.color, sh, r.color, sh, r.color, sh, h)
			bld += fmt.Sprintf(".border-%s-%s,.hover\\:border-%s-%s:hover,.focus\\:border-%s-%s:focus,.dark\\:border-%s-%s{border-color:%s!important}\n", r.color, sh, r.color, sh, r.color, sh, r.color, sh, h)
			bld += fmt.Sprintf(".ring-%s-%s,.focus\\:ring-%s-%s:focus{--tw-ring-color:%s!important}\n", r.color, sh, r.color, sh, h)
			bld += fmt.Sprintf(".from-%s-%s{--tw-gradient-from:%s!important}.via-%s-%s{--tw-gradient-via:%s!important}.to-%s-%s{--tw-gradient-to:%s!important}\n", r.color, sh, h, r.color, sh, h, r.color, sh, h)
		}
	}

	if theme.CustomCSS != "" {
		bld += "\n" + theme.CustomCSS + "\n"
	}
	return bld, nil
}

// Simple hex lighten/darken helpers (imperfect but functional)
func lighten(hex string, factor float64) string {
	if len(hex) < 7 { return hex }
	r, g, b := parseHex(hex)
	r = int(float64(r) + (255-float64(r))*factor)
	g = int(float64(g) + (255-float64(g))*factor)
	b = int(float64(b) + (255-float64(b))*factor)
	if r > 255 { r = 255 }; if g > 255 { g = 255 }; if b > 255 { b = 255 }
	return fmt.Sprintf("#%02x%02x%02x", r, g, b)
}

func darken(hex string, factor float64) string {
	if len(hex) < 7 { return hex }
	r, g, b := parseHex(hex)
	r = int(float64(r) * (1 - factor))
	g = int(float64(g) * (1 - factor))
	b = int(float64(b) * (1 - factor))
	if r < 0 { r = 0 }; if g < 0 { g = 0 }; if b < 0 { b = 0 }
	return fmt.Sprintf("#%02x%02x%02x", r, g, b)
}

func parseHex(hex string) (int, int, int) {
	if len(hex) >= 7 {
		var r, g, b int
		fmt.Sscanf(hex, "#%02x%02x%02x", &r, &g, &b)
		return r, g, b
	}
	return 0, 0, 0
}
