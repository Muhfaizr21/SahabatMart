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
	
	resp := APIResponse{
		Status: "success",
		Data:   data,
	}

	// If data is already a map with status/message, handle it
	if m, ok := data.(map[string]interface{}); ok {
		if s, ok := m["status"].(string); ok {
			resp.Status = s
		}
		if msg, ok := m["message"].(string); ok {
			resp.Message = msg
			delete(m, "message")
		}
		if d, ok := m["data"]; ok {
			resp.Data = d
		} else {
			resp.Data = m
		}
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
