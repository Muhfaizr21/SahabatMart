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
	
	// Default response
	resp := map[string]interface{}{
		"status": "success",
	}

	// If data is a map, merge it to keep it "flat" for frontend compatibility
	if m, ok := data.(map[string]interface{}); ok {
		for k, v := range m {
			resp[k] = v
		}
	} else {
		// If it's a slice or primitive, put it in 'data' field
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
