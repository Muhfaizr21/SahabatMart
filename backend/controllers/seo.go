package controllers

import (
	"encoding/xml"
	"net/http"
	"os"
	"strings"
	"time"

	"akuglow/backend/models"
	"akuglow/backend/utils"
)

type URL struct {
	Loc        string  `xml:"loc"`
	LastMod    string  `xml:"lastmod,omitempty"`
	ChangeFreq string  `xml:"changefreq,omitempty"`
	Priority   float32 `xml:"priority,omitempty"`
}

type URLSet struct {
	XMLName xml.Name `xml:"http://www.sitemaps.org/schemas/sitemap/0.9 urlset"`
	URLs    []URL    `xml:"url"`
}

// GenerateSitemap generates an XML sitemap for SEO
func (ac *AdminController) GenerateSitemap(w http.ResponseWriter, r *http.Request) {
	baseURL := os.Getenv("FRONTEND_URL")
	if baseURL == "" {
		baseURL = models.FrontendURL
	}
	baseURL = strings.TrimSuffix(baseURL, "/")

	var urlSet URLSet

	// Static Pages
	urlSet.URLs = append(urlSet.URLs, URL{
		Loc:        baseURL + "/",
		ChangeFreq: "daily",
		Priority:   1.0,
	})
	urlSet.URLs = append(urlSet.URLs, URL{
		Loc:        baseURL + "/shop",
		ChangeFreq: "daily",
		Priority:   0.9,
	})
	urlSet.URLs = append(urlSet.URLs, URL{
		Loc:        baseURL + "/blog",
		ChangeFreq: "daily",
		Priority:   0.8,
	})
	urlSet.URLs = append(urlSet.URLs, URL{
		Loc:        baseURL + "/peluang-bisnis",
		ChangeFreq: "weekly",
		Priority:   0.7,
	})

	// Dynamic Products
	var products []models.Product
	if err := ac.DB.Select("id, slug, updated_at").Find(&products).Error; err == nil {
		for _, p := range products {
			productSlug := p.Slug
			if productSlug == "" {
				productSlug = p.ID
			}
			urlSet.URLs = append(urlSet.URLs, URL{
				Loc:        baseURL + "/product/" + productSlug,
				LastMod:    p.UpdatedAt.Format(time.RFC3339),
				ChangeFreq: "weekly",
				Priority:   0.6,
			})
		}
	}

	// Dynamic Blogs
	var blogs []models.BlogPost
	if err := ac.DB.Select("slug, updated_at").Where("status = 'published'").Find(&blogs).Error; err == nil {
		for _, b := range blogs {
			urlSet.URLs = append(urlSet.URLs, URL{
				Loc:        baseURL + "/blog/" + b.Slug,
				LastMod:    b.UpdatedAt.Format(time.RFC3339),
				ChangeFreq: "monthly",
				Priority:   0.5,
			})
		}
	}

	// Output XML
	w.Header().Set("Content-Type", "application/xml")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(xml.Header))
	
	encoder := xml.NewEncoder(w)
	encoder.Indent("", "  ")
	if err := encoder.Encode(urlSet); err != nil {
		utils.JSONError(w, http.StatusInternalServerError, "Gagal generate sitemap")
		return
	}
}
