package middleware

import (
	"SahabatMart/backend/utils"
	"net"
	"net/http"
	"strings"
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

// getRealIP extracts the actual client IP, correctly handling reverse proxies
// (Nginx, Cloudflare, etc.) that set X-Forwarded-For or X-Real-IP headers.
func getRealIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		// X-Forwarded-For may contain multiple IPs: "client, proxy1, proxy2"
		// The leftmost IP is the original client
		parts := strings.Split(xff, ",")
		ip := strings.TrimSpace(parts[0])
		if ip != "" {
			return ip
		}
	}
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return strings.TrimSpace(xri)
	}
	// Fallback to RemoteAddr for direct connections
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

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
			ip := getRealIP(r)

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
