package utils

import (
	"encoding/json"
	"net/http"
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
func ToStringPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
