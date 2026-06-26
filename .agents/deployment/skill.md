Oke, jelas. Aku expand dengan kata-kata aja. Berikut yang perlu ditambah ke skill.md supaya layak 100 tahun:

---

## **Yang Harus Ditambah:**

### **1. Connection Management & Resource Pooling**
- Database connection pool sizing (max open, idle timeout, lifetime)
- HTTP client connection reuse vs creating new client setiap request
- Memory leak detection: goroutine leak, unclosed connections, context cancellation
- Graceful shutdown: drain existing requests sebelum stop server

### **2. Concurrency & Locking**
- Race condition prevention: when to use mutex, when to use database-level locking
- Deadlock scenarios: request A holds lock X waiting for Y, request B holds Y waiting for X
- Optimistic locking pattern untuk update tanpa blocking
- Transaction isolation level dan impact ke concurrent requests

### **3. API Design Standards**
- Idempotent operations: POST untuk create, PUT untuk upsert, DELETE untuk delete
- HTTP status code conventions: 200 (ok), 201 (created), 400 (validation error), 401 (auth), 403 (forbidden), 404 (not found), 409 (conflict), 500 (server error)
- Pagination untuk list endpoint: cursor-based vs offset-based
- Rate limiting dan throttling untuk prevent abuse

### **4. Validation Strategy**
- Input validation layer: tipe data, format, length, range
- Business logic validation: ownership check, state machine validation, constraint checking
- Custom validator patterns untuk kompleks requirement
- Error response format: field-level errors vs general error

### **5. RBAC Advanced Patterns**
- Permission inheritance: jika admin bisa create, apakah bisa update existing?
- Scope-based permission: user only bisa access data milik organisasi mereka
- Time-based permission: akses hanya pada jam kerja, atau sampai deadline tertentu
- Audit logging: siapa mengakses apa, kapan, dari IP mana
- Permission caching strategy: cache permission di token vs check realtime

### **6. Database Migration Safety**
- Zero-downtime migration: deploy code yang compatible dengan schema lama dulu
- Backward compatibility: new code harus handle old schema, old code harus handle new schema
- Migration rollback testing: test rollback di staging sebelum production
- Large table migration: chunk operation supaya ga lock table terlalu lama

### **7. Logging Strategy**
- Structured logging: JSON format dengan context fields (user_id, request_id, timestamp)
- Log levels: DEBUG (dev only), INFO (significant event), WARN (degradation), ERROR (failure)
- Sensitive data masking: jangan log password, token, PII
- Request ID tracing: sama request bisa di-correlate across multiple services
- Log retention dan archival policy

### **8. Monitoring & Observability**
- Health check endpoint: status database, cache, external service
- Metrics: response time (p50, p95, p99), error rate, throughput
- Alert thresholds: disk usage, memory, CPU, error rate spike
- Dependency health: jika payment gateway down, system harus gracefully degrade
- Performance baseline: tahu expected response time untuk setiap endpoint

### **9. Caching Strategy**
- Cache invalidation: kapan harus clear cache, konsistensi data
- Cache hierarchy: local memory vs Redis vs database
- Cache warming: preload data saat startup atau schedule
- Cache poisoning prevention: validate cached data sebelum use

### **10. External Service Integration**
- Timeout management: set timeout untuk setiap external call
- Retry logic dengan exponential backoff: jangan hammer failed service
- Circuit breaker pattern: stop calling service jika failure rate tinggi
- Fallback strategy: apa yang terjadi jika payment gateway down
- Webhook reliability: jangan assume webhook langsung delivered, need ack/retry mechanism

### **11. Security Hardening**
- SQL injection prevention: use parameterized query, jangan string concatenation
- XSS prevention: escape user input sebelum return ke frontend
- CSRF protection: token validation untuk state-changing operation
- Rate limiting per user, per IP untuk prevent brute force
- HTTPS only: jangan allow plain HTTP di production
- Secret management: jangan hardcode API key, use environment variable atau secret manager
- Input size limit: prevent DoS dengan upload file besar

### **12. Deployment Pipeline Details**
- Build automation: automated test sebelum build image
- Environment parity: staging harus se-identical mungkin dengan production
- Configuration management: separate code dari config (database URL, API key)
- Feature flags: deploy code tanpa immediately enable di production
- Canary deployment: roll out ke small user group dulu, monitor error rate
- Blue-green deployment: keep old version running sampe yakin baru version stable

### **13. Error Recovery & Circuit Breaker**
- Transient error vs permanent error: retry jika transient, fail fast jika permanent
- Timeout strategy: short timeout untuk user-facing, longer timeout untuk background job
- Bulkhead pattern: isolate critical path dari non-critical resource
- Graceful degradation: jika non-critical feature fail, tetap serve critical feature
- Error budget mindset: acceptable error rate di production, monitor against budget

### **14. Testing Coverage & Strategy**
- Unit test: test business logic isolation
- Integration test: test dengan real database, real external service mock
- End-to-end test: test full workflow dari API hit sampe response
- Load test: simulasi peak load, identifikasi bottleneck
- Chaos engineering: randomly fail dependency, test recovery
- Penetration test: try to break security, find vulnerability

### **15. Code Organization & Modularity**
- Service → Repository → Model pattern: clean separation concern
- Dependency injection: pass dependency eksplisit, facilitate testing
- Configuration object: centralized config, validate at startup
- Error wrapping: use sentinel error atau error type, jangan generic "error"
- Context usage: pass context ke function untuk cancellation, timeout, value
- Dependency management: regular update, check security advisories

### **16. Performance Optimization**
- Database query optimization: use index, avoid N+1 query, batch operation
- Connection pooling: max connection, idle timeout tuning
- Caching layer: identify hot data, cache appropriately
- Async operation: non-blocking I/O, background job untuk heavy operation
- Resource monitoring: CPU, memory, disk utilization alert
- Profiling: identify bottleneck dengan pprof atau similar

### **17. Disaster Recovery**
- Backup strategy: frequency, retention, restoration test
- Data replication: primary-replica setup, failover automation
- Incident response plan: documented procedure untuk common issues
- Root cause analysis: postmortem setelah major incident, improvement action
- Recovery time objective (RTO): acceptable downtime
- Recovery point objective (RPO): acceptable data loss

### **18. Scaling Considerations**
- Stateless design: jangan keep state di server, facilitate horizontal scaling
- Load balancing: distribute traffic, health check untuk remove unhealthy instance
- Database scaling: read replica untuk read-heavy workload, sharding untuk write-heavy
- Cache scaling: Redis cluster, memcached untuk distributed caching
- Message queue: decouple producer dari consumer, facilitate async processing

### **19. Team & Code Quality**
- Code review standard: checklist untuk reviewer, focus pada logic dan security
- Pair programming: share knowledge untuk critical path
- Documentation: API spec, deployment guide, runbook untuk common issue
- Naming convention: clear, descriptive variable/function name
- Technical debt tracking: conscious decision untuk tech debt, repay regularly
- Architecture decision record: document why certain decision made

### **20. Common Anti-Patterns to Avoid**
- **N+1 Query**: select user, then for each user select orders (fix: use JOIN atau batch)
- **Hardcoded Secret**: API key di source code (fix: environment variable)
- **No Error Handling**: assume everything always succeed (fix: explicit error check)
- **Ignoring Context**: jangan pass context ke function (fix: add context parameter)
- **Blocking Main Thread**: long operation di request handler (fix: use goroutine atau job queue)
- **No Validation**: trust user input (fix: validate early)
- **Concurrent Map Access**: race condition (fix: use sync.Map atau mutex)
- **Not Closing Resource**: file handle, db connection leak (fix: defer close())
- **Silent Failure**: catch error tapi jangan log atau handle (fix: explicit action)
- **Assumption Without Check**: assume user authenticated, assume data exist (fix: explicit check)

---

## **Bagian Tambahan: Troubleshooting Decision Tree**

Ketika production error, ikuti tree ini:

**1. ERROR IMMEDIATELY VISIBLE (panic, timeout, 500)?**
   - YES → Check error log → Identify affected function → Fix logic → Test locally → Deploy → Monitor
   - NO → Go to #2

**2. ERROR INTERMITTENT (sometimes fail, sometimes ok)?**
   - YES → Likely race condition atau resource issue → Check goroutine leak, connection pool, concurrent access
   - NO → Go to #3

**3. ERROR ONLY AT PEAK LOAD?**
   - YES → Resource exhaustion atau bottleneck → Check database slow query, connection limit, CPU/memory
   - NO → Go to #4

**4. ERROR INVOLVES EXTERNAL SERVICE?**
   - YES → Check service status, timeout, circuit breaker, retry logic
   - NO → Go to #5

**5. ERROR RELATES TO DATA/STATE?**
   - YES → Check transaction isolation, optimistic locking, concurrent update, data migration
   - NO → Check monitoring data (latency, throughput), profile bottleneck

---

## **Checklist Sebelum Go-Live**

- [ ] All error path tested
- [ ] RBAC enforcement di enforcement layer, bukan hanya frontend
- [ ] No hardcoded secret, API key, URL
- [ ] Database connection pool configured
- [ ] Timeout set untuk semua external call
- [ ] Logging configured, sensitive data masked
- [ ] Health check endpoint working
- [ ] Monitoring dan alert configured
- [ ] Backup dan disaster recovery tested
- [ ] Load test passed dengan acceptable performance
- [ ] Security review: SQL injection, XSS, CSRF prevention
- [ ] Database migration tested di staging dengan rollback
- [ ] Graceful shutdown implemented
- [ ] Feature flag ready untuk rollback instant
- [ ] Runbook documented untuk common issue
- [ ] Team aware tentang deployment dan rollback procedure
- [ ] Staging pass 100% identical dengan production scenario

---

## **Stack-Specific Guidance (Go + React + PostgreSQL)**

**Go Backend:**
- Use standard library + minimal third-party (chi untuk router, sqlc untuk type-safe query, pgx untuk database)
- Middleware pattern untuk cross-cutting concern (logging, auth, panic recovery)
- Defer pattern untuk cleanup resource
- Interface untuk dependency injection dan testing

**React Frontend:**
- API contract dengan backend: request/response format, error code, pagination
- Handle error response dengan meaningful message
- Optimistic update dengan rollback jika fail
- Loading state dan timeout handling

**PostgreSQL:**
- ACID transaction untuk consistency
- Index strategy: index on foreign key, unique constraint, frequently filtered column
- Connection pool: max 100-200 depending on workload
- Backup: daily backup, test restoration monthly

---

**Last Updated:** 2026 — Timeless principle, framework-agnostic pattern.

</parameter>
<parameter name="old_str">---
name: server-coding-best-practices
description: >
  Panduan tata cara dan etika coding di server agar tidak error, cocok untuk fullstack developer
  yang bekerja dengan Go backend, REST API, database, dan deployment server.
  Gunakan skill ini setiap kali user bertanya tentang cara aman coding di server,
  deployment practice, error handling, RBAC enforcement, database migration,
  atau troubleshooting production issue. Trigger juga ketika user menyebut
  "error di server", "cara deploy yang bener", "best practice backend",
  "gimana supaya ga error", atau konteks serupa.
---

# Server Coding Best Practices

Panduan ini mencakup tata cara dan etika untuk menulis kode yang aman, stabil,
dan mudah di-maintain di lingkungan server — mulai dari development hingga production.

---

## 1. Pre-Development Checklist

Sebelum mulai nulis kode, pastikan:

- Pahami requirement dan flow secara lengkap terlebih dahulu
- Setup environment lokal yang semirip mungkin dengan production
- Siapkan database test environment yang terpisah
- Dokumentasikan API contracts dan expected behavior di awal

---

## 2. Development Phase

- Kerjakan satu fitur per branch — hindari multi-task dalam satu branch
- Test setiap perubahan langsung di lokal, jangan tunggu semua selesai
- Tulis logging sejak awal development, bukan setelah error terjadi
- Jaga code tetap modular mengikuti Service → Repository pattern

---

## 3. Error Handling Mindset

- Antisipasi semua failure case: network down, database unavailable, invalid input
- Jangan assume user input selalu benar
- Validasi di layer paling awal (HTTP handler) sebelum masuk business logic
- Return error message yang bermakna, bukan generic "error"
- Tangani setiap error path secara eksplisit — jangan skip

---

## 4. Security & Permission (RBAC)

- Check permission di **enforcement layer**, bukan hanya di frontend
- Jangan trust user ID langsung dari request — selalu verify dari token/session
- Validasi ownership sebelum melakukan update/delete resource
- Log setiap action penting untuk audit trail
- Read-only role tidak boleh bisa akses endpoint create/update/delete

---

## 5. Testing Mindset

- Test dengan edge cases: empty, null, invalid, boundary values
- Test workflow end-to-end sebelum push ke repository
- Test dengan skenario slow network dan timeout
- Jangan assume external service (payment gateway, third-party API) selalu cepat dan tersedia

---

## 6. Database Practice

- Gunakan migration tools — jangan jalankan SQL manual di server
- Backup database sebelum menjalankan migration di production
- Selalu siapkan rollback plan
- Cek connection pool settings: max open connections, idle connections, lifetime

---

## 7. Deployment Ethics

- Deploy ke staging terlebih dahulu, bukan langsung production
- Siapkan rollback plan sebelum deploy
- Monitor logs segera setelah deploy
- Notify team tentang breaking changes atau perubahan skema

---

## 8. Troubleshooting Flow

Ketika ada error di server, ikuti urutan ini:

1. Baca server logs terlebih dahulu — identifikasi pesan error yang spesifik
2. Reproduce di lokal dengan konfigurasi yang sama
3. Isolate masalah: database? external API? business logic?
4. Fix dan test di lokal
5. Deploy ke staging, verifikasi
6. Deploy ke production
7. Monitor untuk recurring issue

---

## 9. Dokumentasi Minimal yang Wajib Ada

- Format response API dan error codes
- Konfigurasi environment yang dibutuhkan
- Langkah-langkah deployment
- Daftar breaking changes per versi

---

## 10. Code Review Checklist (Sebelum Push)

Tanyakan ke diri sendiri:

- [ ] Apakah semua error path sudah di-handle?
- [ ] Apakah permission check sudah ada di enforcement layer?
- [ ] Apakah logging cukup untuk keperluan debug?
- [ ] Apakah ada hardcoded value yang seharusnya jadi config?
- [ ] Apakah dependency management bersih dan up-to-date?

---

## Flow Deployment yang Aman

```
Local Dev
  → Test semua kasus (happy path + edge case)
    → Git Push + Code Review
      → Staging Deploy
        → Monitor Logs (staging)
          → Production Deploy
            → Monitor Logs (production)
```

---

## Catatan Konteks

Skill ini dirancang untuk developer yang bekerja dengan stack:

- **Backend**: Go (Golang), REST API
- **Frontend**: React JS
- **Database**: PostgreSQL / MySQL dengan migration tools
- **Auth**: Token/session-based RBAC
- **Deployment**: Linux server, staging + production environment
- **Integrasi**: Payment gateway (Xendit, Midtrans), third-party API (SEVIMA, dll)

Sesuaikan detail teknis sesuai stack yang digunakan.</parameter>