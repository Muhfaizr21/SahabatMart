package utils

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
)

// NotificationHub mengelola koneksi SSE untuk real-time updates
type NotificationHub struct {
	clients map[string]chan string
	mu      sync.Mutex
}

var Hub = &NotificationHub{
	clients: make(map[string]chan string),
}

func (h *NotificationHub) AddClient(userID string) chan string {
	h.mu.Lock()
	defer h.mu.Unlock()
	
	ch := make(chan string, 10)
	h.clients[userID] = ch
	return ch
}

func (h *NotificationHub) RemoveClient(userID string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	
	if ch, ok := h.clients[userID]; ok {
		close(ch)
		delete(h.clients, userID)
	}
}

func (h *NotificationHub) Broadcast(userID string, payload interface{}) {
	h.mu.Lock()
	defer h.mu.Unlock()
	
	data, _ := json.Marshal(payload)
	if ch, ok := h.clients[userID]; ok {
		select {
		case ch <- string(data):
		default:
			// Buffer full, skip
		}
	}
}

// SSEHandler adalah endpoint untuk client mendengarkan notifikasi
func SSEHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		http.Error(w, "User ID required", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	clientChan := Hub.AddClient(userID)
	defer Hub.RemoveClient(userID)

	flusher, _ := w.(http.Flusher)

	// Kirim pesan koneksi berhasil
	fmt.Fprintf(w, "data: {\"status\":\"connected\"}\n\n")
	flusher.Flush()

	for {
		select {
		case msg := <-clientChan:
			fmt.Fprintf(w, "data: %s\n\n", msg)
			flusher.Flush()
		case <-r.Context().Done():
			return
		}
	}
}
