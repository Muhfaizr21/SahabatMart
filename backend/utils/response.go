package utils

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
)

type APIResponse struct {
	Status  string      `json:"status"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Meta    interface{} `json:"meta,omitempty"`
}

func JSONResponse(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	
	resp := map[string]interface{}{
		"status": "success",
	}

	// Jika data adalah map, kita "merge" agar tetap datar untuk kompatibilitas frontend
	if m, ok := data.(map[string]interface{}); ok {
		for k, v := range m {
			resp[k] = v
		}
	} else if data != nil {
		// Jika struct atau primitive, masukkan ke field 'data'
		resp["data"] = data
	}

	json.NewEncoder(w).Encode(resp)
}

func JSONError(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(APIResponse{
		Status:  "error",
		Message: message,
	})
}

// JSONErrorInternal logs the actual error but sends a generic message to the client
func JSONErrorInternal(w http.ResponseWriter, err error, message string) {
	log.Printf("❌ [INTERNAL_ERROR] %v", err)
	if message == "" {
		message = "Terjadi kesalahan internal pada server"
	}
	JSONError(w, http.StatusInternalServerError, message)
}
func ToStringPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func QueryInt(r *http.Request, key string, defaultValue int) int {
	val := r.URL.Query().Get(key)
	if val == "" {
		return defaultValue
	}
	i, err := strconv.Atoi(val)
	if err != nil {
		return defaultValue
	}
	return i
}

func FormatNumber(n float64) string {
	s := fmt.Sprintf("%.0f", n)
	if len(s) <= 3 {
		return s
	}
	var res []string
	for i := len(s); i > 0; i -= 3 {
		start := i - 3
		if start < 0 {
			start = 0
		}
		res = append([]string{s[start:i]}, res...)
	}
	return strings.Join(res, ".")
}

func FormatIDR(n float64) string {
	return "Rp" + FormatNumber(n)
}
