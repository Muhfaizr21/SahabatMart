package middleware

import (
	"sync"
	"time"

	"akuglow/backend/utils"
	"net"
	"net/http"
	"strings"
)

type client struct {
	lastSeen time.Time
	count    int
}

type rateLimiter struct {
	mu      sync.Mutex
	clients map[string]*client
	limit   int
	window  time.Duration
	name    string
}

var (
	rateLimiters  = make(map[string]*rateLimiter)
	rateLimiterMu sync.Mutex
)

func getRateLimiter(name string, limit int, window time.Duration) *rateLimiter {
	rateLimiterMu.Lock()
	defer rateLimiterMu.Unlock()

	if rl, ok := rateLimiters[name]; ok {
		return rl
	}

	rl := &rateLimiter{
		clients: make(map[string]*client),
		limit:   limit,
		window:  window,
		name:    name,
	}
	rateLimiters[name] = rl
	go rl.cleanup()
	return rl
}

func (rl *rateLimiter) cleanup() {
	for {
		time.Sleep(rl.window)
		rl.mu.Lock()
		now := time.Now()
		for ip, c := range rl.clients {
			if now.Sub(c.lastSeen) > rl.window {
				delete(rl.clients, ip)
			}
		}
		rl.mu.Unlock()
	}
}

// getRealIP extracts the actual client IP, correctly handling reverse proxies
// (Nginx, Cloudflare, etc.) that set X-Forwarded-For or X-Real-IP headers.
func getRealIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		ip := strings.TrimSpace(parts[0])
		if ip != "" {
			return ip
		}
	}
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return strings.TrimSpace(xri)
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func RateLimitMiddleware(name string, limit int, window time.Duration) func(http.Handler) http.Handler {
	rl := getRateLimiter(name, limit, window)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := getRealIP(r)

			rl.mu.Lock()
			if _, found := rl.clients[ip]; !found {
				rl.clients[ip] = &client{lastSeen: time.Now(), count: 0}
			}

			if time.Since(rl.clients[ip].lastSeen) > rl.window {
				rl.clients[ip].count = 0
				rl.clients[ip].lastSeen = time.Now()
			}

			rl.clients[ip].count++
			currentCount := rl.clients[ip].count
			rl.mu.Unlock()

			if currentCount > limit {
				utils.JSONError(w, http.StatusTooManyRequests, "Terlalu banyak permintaan. Silakan coba beberapa saat lagi.")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
