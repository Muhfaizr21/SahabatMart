package middleware

import (
	"SahabatMart/backend/utils"
	"net/http"
	"sync"
	"time"
)

type client struct {
	lastSeen time.Time
	count    int
}

var (
	mu      sync.Mutex
	clients = make(map[string]*client)
)

func RateLimitMiddleware(limit int, window time.Duration) func(http.Handler) http.Handler {
	// Cleanup old entries periodically
	go func() {
		for {
			time.Sleep(window)
			mu.Lock()
			for ip, c := range clients {
				if time.Since(c.lastSeen) > window {
					delete(clients, ip)
				}
			}
			mu.Unlock()
		}
	}()

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := r.RemoteAddr

			mu.Lock()
			if _, found := clients[ip]; !found {
				clients[ip] = &client{lastSeen: time.Now(), count: 0}
			}

			if time.Since(clients[ip].lastSeen) > window {
				clients[ip].count = 0
				clients[ip].lastSeen = time.Now()
			}

			clients[ip].count++
			currentCount := clients[ip].count
			mu.Unlock()

			if currentCount > limit {
				utils.JSONError(w, http.StatusTooManyRequests, "Terlalu banyak permintaan. Silakan coba beberapa saat lagi.")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
