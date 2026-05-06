# 🧬 ADMIN SKIN JOURNEY - 4 FLOW SEMPURNA

## OVERVIEW ARSITEKTUR

```
Admin Input
    ↓
[FLOW 1] BIKIN PROGRAM
    ↓ (Program Created)
[FLOW 2] PENJELASAN DETAIL
    ↓ (Details Configured)
[FLOW 3] PRODUK YANG DIPAKAI 
    ↓ (Products Mapped)
[FLOW 4] CARA PAKAI (Step-by-Step Instructions)
    ↓ (Ready for Users)
User Receives Complete Program
```

---

# FLOW 1: BIKIN PROGRAM

## Definisi
Admin membuat blueprint program skincare yang akan diikuti user. Ini adalah **template awal** yang mendefinisikan kerangka kerja program.

## Tujuan
- Mendefinisikan nama, kategori, dan durasi program
- Menentukan target skin type dan skin concerns yang ditangani
- Menetapkan AI tracking metrics yang akan digunakan
- Membuat program dalam status DRAFT siap untuk detail

## Step-by-Step Admin Flow

### Step 1.1: Admin Membuka Form "Buat Program Baru"
```
Admin Dashboard
    ↓
[Klik "Tambah Program Baru"]
    ↓
Form Terbuka dengan Fields:
```

### Step 1.2: Input Data Program

**Field yang harus diisi:**

| Field | Tipe | Contoh | Keterangan |
|-------|------|--------|-----------|
| **Program Name** | Text | "Acne-Free Express 4 Weeks" | Nama unik program, mudah dipahami user |
| **Category** | Dropdown | "Acne Treatment" | Enum: Acne, Anti-Aging, Brightening, Hydration, Sensitivity |
| **Target Skin Type** | Multi-Select | [Oily, Combination] | User dengan tipe kulit ini bisa ikut program |
| **Target Skin Concerns** | Multi-Select | [Acne, Sebum Control, Inflammation] | Masalah kulit yang ditangani |
| **Duration (Weeks)** | Number | 4 | Berapa minggu program berlangsung (1-12) |
| **Frequency** | Dropdown | "Daily" | Enum: Daily, 3x/week, 2x/week, Weekly |
| **Expected Outcome** | Text Area | "Mengurangi jerawat 70-80%, sebum terkontrol" | Hasil yang diharapkan user |
| **Priority AI Metrics** | Multi-Select Checkbox | [Acne Score, Sebum Control, Brightness] | Metrik mana yang akan AI track |
| **Tags** | Text (comma-separated) | "premium, dermatologist" | Label program untuk filtering |
| **Status** | Radio | DRAFT (default) | Otomatis DRAFT saat buat |

### Step 1.3: Admin Mengisi Form

**Contoh Input Konkret:**

```
Program Name: "Acne-Free Express 4 Weeks"

Category: "Acne Treatment"

Target Skin Type:
  ☑ Oily
  ☑ Combination
  ☐ Dry
  ☐ Sensitive

Target Skin Concerns:
  ☑ Acne (Jerawat)
  ☑ Sebum Control (Kontrol Minyak)
  ☑ Inflammation (Radang)
  ☐ Dullness
  ☐ Sensitivity

Duration: 4 weeks

Frequency: Daily

Expected Outcome:
"Mengurangi jerawat hingga 70-80%, kontrol sebum optimal, 
kulit lebih cerah dan halus tanpa breakout"

Priority AI Metrics:
  ☑ Acne Score (akan track jumlah jerawat)
  ☑ Sebum Control (akan track production minyak)
  ☑ Brightness Score (akan track kecerahan)
  ☐ Hydration Level
  ☐ Texture Smoothness

Tags: "premium, dermatologist_recommended, all_age"

Status: DRAFT (otomatis)
```

### Step 1.4: Validasi Data

**Sistem cek:**
```
1. Program Name tidak kosong? ✓
   - Minimal 10 karakter? ✓
   - Maksimal 100 karakter? ✓
   - Tidak ada duplicate name? ✓

2. Category valid? ✓
   - Dari enum yang ada? ✓

3. Target Skin Type ada minimal 1? ✓

4. Target Skin Concerns ada minimal 1? ✓

5. Duration valid? ✓
   - Antara 1-12 minggu? ✓

6. Expected Outcome? ✓
   - Minimal 20 karakter? ✓

7. AI Metrics valid? ✓
   - Tidak ada metric yang conflicting? ✓

Hasil: ✅ VALID - Lanjut ke Step 1.5
```

### Step 1.5: Simpan ke Database

**Database Record dibuat:**

```sql
INSERT INTO SkinPrograms (
  name,
  description,
  category,
  target_skin_type,
  target_skin_concerns,
  duration_weeks,
  frequency,
  expected_outcome,
  ai_score_focus,
  tags,
  status,
  version,
  created_by,
  created_at
) VALUES (
  'Acne-Free Express 4 Weeks',
  '',  -- kosong, isi di Flow 2
  'acne_treatment',
  '["oily", "combination"]',
  '["acne", "sebum_control", "inflammation"]',
  4,
  'daily',
  'Mengurangi jerawat hingga 70-80%...',
  '{"acneScore": true, "sebumControl": true, "brightness": true}',
  '["premium", "dermatologist_recommended", "all_age"]',
  'DRAFT',
  1,
  'admin_user_123',
  NOW()
);
```

### Step 1.6: Success Response ke Admin

```json
{
  "status": "success",
  "message": "Program berhasil dibuat!",
  "data": {
    "programId": "prog_acne_express_001",
    "programName": "Acne-Free Express 4 Weeks",
    "status": "DRAFT",
    "version": 1,
    "createdAt": "2025-05-06T10:30:00Z",
    "progress": {
      "completed": [
        "✅ Step 1: Program Created"
      ],
      "next": "Step 2: Add Detailed Description",
      "remaining": [
        "Step 3: Configure Products",
        "Step 4: Add Usage Instructions"
      ]
    }
  }
}
```

### Step 1.7: UI Feedback ke Admin

```
✅ Program Berhasil Dibuat!

Program ID: prog_acne_express_001
Program Name: Acne-Free Express 4 Weeks
Status: DRAFT (belum bisa digunakan user)

Langkah Selanjutnya:
[1] ✅ Buat Program ← SUDAH SELESAI
[2] ⏳ Tambah Penjelasan Detail (LANJUT)
[3] ⏳ Tambah Produk yang Dipakai
[4] ⏳ Tambah Cara Pakai

[Lanjut ke Step 2] [Lihat Program] [Buat Program Baru]
```

---

# FLOW 2: PENJELASAN DETAIL PROGRAM

## Definisi
Admin memberikan penjelasan mendalam tentang program - mengapa efektif, apa timeline perubahannya, benefit apa saja, dan warning apa yang perlu diperhatikan.

## Tujuan
- User paham sains di balik program
- User tahu apa yang akan terjadi minggu ke minggu
- User punya ekspektasi realistis
- User tahu apa saja risikonya

## Step-by-Step Admin Flow

### Step 2.1: Admin Masuk ke Edit Program

```
Dashboard
    ↓
[Lihat: "Acne-Free Express 4 Weeks"]
    ↓
[Klik: "Edit Program Details"]
    ↓
Form Terbuka: "Penjelasan Detail"
```

### Step 2.2: Bagian A - Latar Belakang Sains

**Field:**
```
┌─ Bagian A: Latar Belakang Sains
│
├─ Judul (Heading)
│  Input: "Sains di Balik Program Ini"
│
├─ Konten Utama (Rich Text Editor)
│  Input: "Jerawat terbentuk dari kombinasi 4 faktor:
│         1. Overproduksi sebum
│         2. Penyumbatan pori
│         3. Bakteri P.acnes
│         4. Inflamasi
│         
│         Program ini mengatasi ke-4 faktor secara bersamaan..."
│
└─ Referensi Ilmiah (Repeatable Field)
   [+] Tambah Referensi
   
   Ref 1:
   - Nama: "Journal of Dermatological Science 2024"
   - Link: "https://..."
   
   Ref 2:
   - Nama: "Mayo Clinic Acne Guide"
   - Link: "https://..."
```

### Step 2.3: Bagian B - Timeline Perubahan Kulit

**Structure:**

```
┌─ Bagian B: Perjalanan Perubahan Kulit Anda

├─ Judul: "Apa yang Akan Terjadi Setiap Minggu"

├─ Phase 1: MINGGU PERTAMA (Adaptasi & Detox)
│  
│  ├─ Judul Phase: "Fase Adaptasi & Detox"
│  │
│  ├─ Deskripsi:
│  │  "Minggu pertama, kulit mulai beradaptasi dengan produk baru.
│  │   Anda mungkin mengalami purging (jerawat kecil muncul 
│  │   sementara saat kulit membersihkan diri). INI NORMAL dan 
│  │   menandakan produk bekerja."
│  │
│  ├─ Expectations (Bullet Points):
│  │  • Mungkin ada sedikit kemerahan atau iritasi ringan
│  │  • Sebum mulai terkontrol
│  │  • Pori mulai terlihat lebih kecil
│  │
│  └─ Tips/Saran:
│     "Jangan panik! Kurangi frekuensi jika terlalu sensitif.
│      Tetap gunakan sunscreen."
│
├─ Phase 2: MINGGU KEDUA (Penyeimbangan)
│  
│  ├─ Judul Phase: "Fase Penyeimbangan"
│  │
│  ├─ Deskripsi:
│  │  "Kulit mulai terbiasa. Purging berkurang. Anda akan mulai 
│  │   melihat jerawat aktif mulai mengempis."
│  │
│  ├─ Expectations:
│  │  • Jerawat lama mulai flat
│  │  • Sebum jauh lebih terkontrol
│  │  • Tekstur kulit lebih halus
│  │
│  └─ Tips:
│     "Konsistensi adalah kunci! Jangan skip langkah."
│
├─ Phase 3: MINGGU KETIGA (Pembersihan)
│  
│  ├─ Judul: "Fase Pembersihan"
│  │
│  ├─ Deskripsi:
│  │  "Jerawat aktif semakin berkurang. Bekas jerawat lama 
│  │   mulai memudar. Kulit terlihat lebih cerah."
│  │
│  ├─ Expectations:
│  │  • Pengurangan jerawat signifikan 50%+
│  │  • Kulit lebih cerah dan glowing
│  │  • Pori terlihat minimal
│  │
│  └─ Tips:
│     "Mulai perhatikan hasil! Dokumentasikan dengan foto."
│
└─ Phase 4: MINGGU KEEMPAT (Konsolidasi)
   
   ├─ Judul: "Fase Konsolidasi & Hasil Final"
   │
   ├─ Deskripsi:
   │  "Hasil maksimal tercapai. Kulit Anda sekarang bebas jerawat,
   │   cerah, dan sehat."
   │
   ├─ Expectations:
   │  • Pengurangan jerawat 70-80%
   │  • Kulit glowing dan smooth
   │  • Sebum kontrol permanen
   │
   └─ Tips:
      "Mulai berpikir maintenance routine agar hasil bertahan."
```

### Step 2.4: Bagian C - Benefit Program

**Structure:**

```
┌─ Bagian C: Keuntungan Program

├─ [+] Tambah Benefit

Benefit 1:
├─ Icon: "🎯"
├─ Judul: "Hasil Terukur & Terbukti"
└─ Deskripsi: "Dengan AI tracking setiap minggu, Anda bisa lihat 
   progress real-time melalui foto dan score changes"

Benefit 2:
├─ Icon: "⚗️"
├─ Judul: "Formula Berbasis Sains"
└─ Deskripsi: "Setiap produk dipilih berdasarkan research clinical 
   trials dan proven efficacy"

Benefit 3:
├─ Icon: "🛡️"
├─ Judul: "Aman untuk Semua Jenis Kulit"
└─ Deskripsi: "Dermatologist tested dan hypoallergenic - aman 
   bahkan untuk kulit sensitif"

Benefit 4:
├─ Icon: "⏱️"
├─ Judul: "Hasil Cepat & Nyata"
└─ Deskripsi: "Rata-rata user melihat perubahan signifikan 
   dalam 2-3 minggu"
```

### Step 2.5: Bagian D - Precautions/Warnings

**Structure:**

```
┌─ Bagian D: Hal-Hal yang Perlu Diperhatikan

├─ [+] Tambah Warning

Warning 1 (Type: DANGER):
├─ Badge: "⚠️ PENTING"
├─ Judul: "Purging Phase"
├─ Deskripsi: "Minggu 1-2 mungkin ada breakout kecil. Ini adalah 
│  proses detoksifikasi kulit, BUKAN kegagalan. Lanjutkan program."
└─ Action: "Jangan panik dan jangan berhenti"

Warning 2 (Type: CAUTION):
├─ Badge: "⚠️ HATI-HATI"
├─ Judul: "Jangan Mixing dengan Produk Lain"
├─ Deskripsi: "Selama program berjalan, hindari menggunakan produk 
│  anti-acne lain yang tidak dalam program ini. Bisa cause 
│  over-treatment."
└─ Action: "Gunakan HANYA produk dari program ini"

Warning 3 (Type: INFO):
├─ Badge: "ℹ️ INFO"
├─ Judul: "Sunscreen Wajib Pakai"
├─ Deskripsi: "Produk acne-fighting sering membuat kulit lebih 
│  sensitif terhadap UV. Sunscreen bukan opsional."
└─ Action: "Gunakan SPF 30+ setiap hari"
```

### Step 2.6: Bagian E - FAQ

**Structure:**

```
┌─ Bagian E: Pertanyaan yang Sering Ditanya

├─ [+] Tambah FAQ

Q&A 1:
├─ Pertanyaan: "Berapa lama hasil bisa dilihat?"
└─ Jawaban: "Rata-rata minggu ke-2 sampai 3 sudah terlihat 
   perubahan nyata. Namun setiap kulit berbeda - bisa lebih cepat 
   atau lambat. AI tracker kami akan membantu identifikasi progress 
   Anda."

Q&A 2:
├─ Pertanyaan: "Apa yang terjadi setelah program berakhir?"
└─ Jawaban: "Setelah 4 minggu, Anda bisa: (1) Lanjut maintenance 
   program, (2) Ganti ke program lain sesuai kebutuhan baru, atau 
   (3) Stop tracking. Hasil bisa bertahan 3-6 bulan dengan 
   skincare dasar."

Q&A 3:
├─ Pertanyaan: "Boleh pakai sebelum tidur atau pagi?"
└─ Jawaban: "Tergantung dari formula produk yang dipakai. Instruksi 
   spesifik ada di tiap step. Umumnya acne fighter lebih baik 
   malam, sunscreen pagi."
```

### Step 2.7: Admin Klik "Simpan"

**Sistem:**
```
1. Validasi semua field tidak kosong ✓
2. Cek minimum content requirement ✓
   - Science background: min 50 char ✓
   - Setiap phase: min 20 char ✓
   - Benefit: min 3 buah ✓
   - Warning: min 2 buah ✓
   - FAQ: min 2 buah ✓
3. Update database ✓
4. Buat success response ✓
```

### Step 2.8: Success Response

```json
{
  "status": "success",
  "message": "Penjelasan detail program berhasil disimpan!",
  "data": {
    "programId": "prog_acne_express_001",
    "progress": {
      "completed": [
        "✅ Step 1: Program Created",
        "✅ Step 2: Detailed Description Added"
      ],
      "next": "Step 3: Configure Products",
      "remaining": [
        "Step 4: Add Usage Instructions"
      ]
    }
  }
}
```

---

# FLOW 3: PRODUK YANG DIPAKAI

## Definisi
Admin menambahkan produk spesifik yang akan digunakan user dalam program, beserta urutan penggunaan dan tujuan setiap produk.

## Tujuan
- Definisikan produk mana saja yang dipakai
- Tentukan urutan penggunaan (step 1, 2, 3, dst)
- Jelaskan fungsi setiap produk
- Link ke database produk yang ada

## Step-by-Step Admin Flow

### Step 3.1: Admin Membuka Section "Produk"

```
Program: "Acne-Free Express 4 Weeks"
    ↓
[Tab: "Details"] [Tab: "Products"] ← KLIK SINI
    ↓
Form Terbuka: "Tambah Produk ke Program"
```

### Step 3.2: Admin Menambah Produk Step-by-Step

**Struktur UI:**

```
┌─ PRODUK YANG DIPAKAI DALAM PROGRAM
│
├─ [+] Tambah Produk Step
│
├─ STEP 1: PEMBERSIHAN
│  
│  ├─ Phase: Morning / Evening / Both
│  │  Pilihan: ○ Morning ○ Evening ● Both
│  │
│  ├─ Frekuensi: Daily / 3x/Week / 2x/Week / Weekly
│  │  Pilihan: ● Daily ○ 3x/Week ○ 2x/Week
│  │
│  ├─ Urutan Step: 1 (Pertama)
│  │
│  ├─ Nama Step: "Pembersihan Wajah"
│  │
│  ├─ Pilih Produk (Dropdown)
│  │  [Search/Select Product...]
│  │  Hasil: "Gentle Foaming Cleanser"
│  │  - ID: prod_cleanser_001
│  │  - Brand: Normaderm
│  │  - Harga: Rp 89.000
│  │
│  └─ Purpose/Penjelasan:
│     "Menghilangkan minyak berlebih dan detritus tanpa 
│      mengganggu skin barrier. Cocok untuk kulit oily."
│
├─ STEP 2: TONER
│  
│  ├─ Phase: ● Morning ○ Evening ○ Both
│  │
│  ├─ Frekuensi: ● Daily ○ 3x/Week
│  │
│  ├─ Urutan Step: 2 (Setelah Step 1)
│  │
│  ├─ Nama Step: "Toner/pH Balance"
│  │
│  ├─ Pilih Produk:
│  │  "BHA Balancing Toner"
│  │  - ID: prod_toner_bha_001
│  │  - Kandungan: 2% BHA
│  │
│  └─ Purpose:
│     "Melepas dead skin cells di pori (keratolytic action) dan 
│      menyeimbangkan pH kulit setelah pembersihan."
│
├─ STEP 3: SERUM ANTIBAKTERI
│  
│  ├─ Phase: ○ Morning ● Evening ○ Both
│  │
│  ├─ Frekuensi: ● Daily
│  │
│  ├─ Urutan Step: 3
│  │
│  ├─ Nama Step: "Serum Anti-Bakteri"
│  │
│  ├─ Pilih Produk:
│  │  "Zinc + Niacinamide Serum"
│  │  - ID: prod_serum_zinc_001
│  │
│  └─ Purpose:
│     "Membunuh bakteri P.acnes dan mengurangi inflamasi dengan 
│      niacinamide yang menenangkan."
│
├─ STEP 4: KRIM PELEMBAB
│  
│  ├─ Phase: ● Morning ● Evening (Both)
│  │
│  ├─ Frekuensi: ● Daily
│  │
│  ├─ Urutan Step: 4
│  │
│  ├─ Nama Step: "Moisturizer Lightweight"
│  │
│  ├─ Pilih Produk:
│  │  "Oil-Free Hydrating Gel Cream"
│  │  - ID: prod_moisturizer_gel_001
│  │
│  └─ Purpose:
│     "Melembabkan kulit tanpa menambah minyak. Penting untuk 
│      prevent over-drying dari active acne products."
│
├─ STEP 5: SUNSCREEN (Pagi Saja)
│  
│  ├─ Phase: ● Morning ○ Evening ○ Both
│  │
│  ├─ Frekuensi: ● Daily
│  │
│  ├─ Urutan Step: 5 (Last Step Morning)
│  │
│  ├─ Nama Step: "Sunscreen SPF 50+"
│  │
│  ├─ Pilih Produk:
│  │  "Mineral Sunscreen SPF 50 PA++++"
│  │  - ID: prod_sunscreen_mineral_001
│  │  - SPF: 50+
│  │
│  └─ Purpose:
│     "Perlindungan UV esensial. Acne products membuat kulit lebih 
│      sensitif. Cegah hyperpigmentation pada bekas jerawat."
│
└─ [Simpan] [Preview] [Batal]
```

### Step 3.3: Admin Detail Input untuk Setiap Step

**Contoh: STEP 3 - SERUM ANTI-BAKTERI**

```
Field yang Diisi:

1. Nama Step: "Serum Anti-Bakteri"
   → Ini judul yang akan dilihat user

2. Product Selection:
   [Search...] "Zinc + Niacinamide Serum"
   → Produk harus sudah ada di database produk

3. Phase: 
   ○ Morning
   ● Evening
   ○ Both
   → Kapan produk ini digunakan

4. Frequency:
   ● Daily
   ○ 3x/Week
   ○ 2x/Week
   → Berapa sering dalam seminggu

5. Order (Urutan):
   3
   → Step ke-3, jadi dipakai SETELAH Step 1 dan 2

6. Purpose/Tujuan:
   "Membunuh bakteri P.acnes yang menyebabkan jerawat 
    inflamasi. Niacinamide juga mengurangi kemerahan 
    dan menenangkan kulit yang iritasi."
   → Penjelasan mengapa produk ini penting

7. Additional Notes (Optional):
   "Tunggu 2-3 menit setelah toner sebelum mengaplikasikan 
    serum ini untuk hasil optimal."
   → Tips aplikasi
```

### Step 3.4: Logika Urutan Produk

**Sistem otomatis validasi urutan:**

```
MORNING ROUTINE:
Step 1: Cleanser (Pembersihan)
  ↓
Step 2: Toner (pH Balance)
  ↓
Step 3: Serum (Active Treatment) - TIDAK ADA, hanya di malam
  ↓
Step 4: Moisturizer (Hydration)
  ↓
Step 5: Sunscreen (Protection) ← WAJIB LAST

EVENING ROUTINE:
Step 1: Cleanser (Pembersihan)
  ↓
Step 2: Toner (pH Balance)
  ↓
Step 3: Serum (Active Treatment) ← DI SINI TEMPAT AKTIF
  ↓
Step 4: Moisturizer (Hydration)
  ↓
(NO SUNSCREEN - bukan pagi)

Validasi Sistem:
✓ Cleanser selalu step 1
✓ Toner selalu step 2
✓ Actives (serum) step 3
✓ Moisturizer step 4
✓ Sunscreen HANYA di pagi, selalu last
✓ Jangan ada duplikat kategori
```

### Step 3.5: Admin Klik "Simpan"

**Database Update:**

```sql
INSERT INTO ProgramProductSteps (
  program_id,
  step_number,
  step_name,
  phase,
  frequency,
  product_id,
  purpose,
  additional_notes,
  created_at
) VALUES
-- Step 1
('prog_acne_express_001', 1, 'Pembersihan Wajah', 'both', 'daily', 
 'prod_cleanser_001', 'Menghilangkan minyak berlebih...', 
 'Gunakan air hangat.', NOW()),

-- Step 2
('prog_acne_express_001', 2, 'Toner/pH Balance', 'morning', 'daily', 
 'prod_toner_bha_001', 'Melepas dead skin cells di pori...', 
 'Gunakan kapas.', NOW()),

-- ... dst untuk step 3, 4, 5
;
```

### Step 3.6: Success Response

```json
{
  "status": "success",
  "message": "Produk berhasil ditambahkan!",
  "data": {
    "programId": "prog_acne_express_001",
    "totalSteps": 5,
    "products": [
      {
        "stepNumber": 1,
        "stepName": "Pembersihan Wajah",
        "productName": "Gentle Foaming Cleanser"
      },
      {
        "stepNumber": 2,
        "stepName": "Toner/pH Balance",
        "productName": "BHA Balancing Toner"
      },
      {
        "stepNumber": 3,
        "stepName": "Serum Anti-Bakteri",
        "productName": "Zinc + Niacinamide Serum"
      },
      {
        "stepNumber": 4,
        "stepName": "Moisturizer",
        "productName": "Oil-Free Hydrating Gel Cream"
      },
      {
        "stepNumber": 5,
        "stepName": "Sunscreen",
        "productName": "Mineral Sunscreen SPF 50 PA++++"
      }
    ],
    "progress": {
      "completed": [
        "✅ Step 1: Program Created",
        "✅ Step 2: Detailed Description",
        "✅ Step 3: Products Configured"
      ],
      "next": "Step 4: Add Usage Instructions",
      "remaining": []
    }
  }
}
```

---

# FLOW 4: CARA PAKAI (Step-by-Step Instructions)

## Definisi
Admin membuat instruksi DETAIL untuk SETIAP STEP produk - berapa banyak, bagaimana aplikasi, berapa lama tunggu, apa urutan dengan produk lain.

## Tujuan
- User tahu PERSIS cara pakai setiap produk
- User tahu BERAPA banyak produk (dosage)
- User tahu KAPAN tunggu sebelum produk berikutnya
- User punya instruksi video/visual

## Step-by-Step Admin Flow

### Step 4.1: Admin Membuka "Instruksi Penggunaan"

```
Program: "Acne-Free Express 4 Weeks"
    ↓
[Tab: "Details"] [Tab: "Products"] [Tab: "Instructions"] ← KLIK SINI
    ↓
Form Terbuka: "Tambah Instruksi Detail Setiap Step"
```

### Step 4.2: Untuk SETIAP STEP, Admin Mengisi Detail

**STEP 1: PEMBERSIHAN WAJAH**

```
┌─ STEP 1: PEMBERSIHAN WAJAH (Morning & Evening)
│
├─ Product: "Gentle Foaming Cleanser"
│
├─ SECTION A: BERAPA BANYAK?
│  
│  Quantity: 
│  ├─ Amount: "1 pump or 5ml"
│  ├─ Visual: [Show finger size reference]
│  └─ Note: "Jangan lebih dari itu, bisa over-dry"
│
├─ SECTION B: STEP-BY-STEP CARA PAKAI
│
│  Step 1.1:
│  ├─ Judul: "Basahi Wajah dengan Air Hangat"
│  ├─ Instruksi: "Gunakan air hangat (bukan panas, bukan dingin). 
│  │              Air hangat membuka pori dan membuat pembersihan 
│  │              lebih efektif."
│  └─ Icon: 💧
│
│  Step 1.2:
│  ├─ Judul: "Keluarkan Produk"
│  ├─ Instruksi: "Keluarkan 1 pump (±5ml) cleanser ke telapak tangan. 
│  │              Jangan langsung dioleskan ke wajah."
│  └─ Icon: 🫧
│
│  Step 1.3:
│  ├─ Judul: "Busa-kan Produk"
│  ├─ Instruksi: "Gosok-gosok produk dengan kedua telapak tangan 
│  │              hingga berbusa banyak. Foam akan lebih gentle 
│  │              di kulit."
│  └─ Icon: 🤲
│
│  Step 1.4:
│  ├─ Judul: "Aplikasikan ke Wajah"
│  ├─ Instruksi: "Aplikasikan busa ke seluruh wajah dengan gerakan 
│  │              circular gentle. Fokus ke T-zone (dahi, hidung, 
│  │              dagu) yang berminyak. Hindari area mata."
│  └─ Icon: 🔄
│
│  Step 1.5:
│  ├─ Judul: "Massage Selama 60 Detik"
│  ├─ Instruksi: "Massage wajah selama 60 detik dengan gerakan 
│  │              upward. Jangan menggosok terlalu keras."
│  ├─ Timer: ⏱️ 60 detik
│  └─ Icon: ⏲️
│
│  Step 1.6:
│  ├─ Judul: "Bilas dengan Air Hangat"
│  ├─ Instruksi: "Bilas dengan air hangat hingga tidak ada residu 
│  │              produk tertinggal di wajah."
│  └─ Icon: 🚿
│
│  Step 1.7:
│  ├─ Judul: "Tap Dry dengan Towel Bersih"
│  ├─ Instruksi: "Gunakan towel bersih. TAP jangan GOSOK, untuk 
│  │              mencegah iritasi. Jangan sampai completely dry - 
│  │              skin masih sedikit lembab untuk step berikutnya."
│  └─ Icon: 🧴
│
├─ SECTION C: TIPS PENTING
│  
│  ⭐ Tip 1: "Cleanser ini cocok 2x sehari tanpa merusak skin 
│            barrier karena gentle formula."
│  
│  ⭐ Tip 2: "Jika kulit terasa sangat kering/tight setelah 
│            cleanse, gunakan setengah pump saja."
│  
│  ⭐ Tip 3: "Hindari menggunakan scrub manual bersamaan dengan 
│            cleanser ini - bisa over-exfoliate."
│
├─ SECTION D: COMMON MISTAKES
│  
│  ❌ Mistake 1: "Menggunakan terlalu banyak produk"
│     Akibat: "Wajah terasa over-cleaned dan tight"
│     Solusi: "Kurangi menjadi half pump"
│  
│  ❌ Mistake 2: "Menggosok terlalu keras"
│     Akibat: "Iritasi dan kemerahan"
│     Solusi: "Gunakan gerakan gentle, tidak perlu force"
│
├─ SECTION E: VISUAL REFERENCE
│  
│  [Video: 1 menit demo cara pakai]
│  [Foto: Before massage vs After]
│  [Foto: Reference jumlah produk]
│
└─ SECTION F: TRANSITION KE STEP BERIKUTNYA
   
   ⏱️ Waiting Time Sebelum Step 2:
   "Tunggu maksimal 1-2 menit sampai skin completely dry.
    Toner perlu skin yang kering untuk optimal absorption."
```

---

**STEP 2: TONER/PH BALANCE**

```
┌─ STEP 2: TONER/PH BALANCE (Morning Only)
│
├─ Product: "BHA Balancing Toner" (2% Salicylic Acid)
│
├─ SECTION A: BERAPA BANYAK?
│  
│  Quantity:
│  ├─ Amount: "3-4 drops ke cotton pad"
│  ├─ Visual: [Show cotton pad size]
│  └─ Note: "BHA toner ini concentrated, jangan banyak-banyak"
│
├─ SECTION B: STEP-BY-STEP
│
│  Step 2.1:
│  ├─ Judul: "Ambil Cotton Pad Bersih"
│  ├─ Instruksi: "Gunakan cotton pad yang sudah dibersihkan. 
│  │              Pilih yang lembut untuk mencegah iritasi."
│  └─ Icon: 🧵
│
│  Step 2.2:
│  ├─ Judul: "Tuang Toner ke Pad"
│  ├─ Instruksi: "Tuang 3-4 tetes toner ke cotton pad. Jangan 
│  │              terlalu banyak - seharusnya pad terlihat lembab, 
│  │              bukan basah."
│  └─ Icon: 💧
│
│  Step 2.3:
│  ├─ Judul: "Wipe ke Seluruh Wajah"
│  ├─ Instruksi: "Wipe perlahan-lahan ke seluruh wajah dengan 
│  │              gerakan upward. Fokus ke area T-zone dan area 
│  │              berjerawat. Hindari mata dan mulut."
│  ├─ Duration: 30-45 detik
│  └─ Icon: 🔄
│
│  Step 2.4:
│  ├─ Judul: "Tunggulah Sampai Kering"
│  ├─ Instruksi: "Biarkan toner kering di kulit sekitar 1 menit. 
│  │              Jangan terburu-buru ke step berikutnya - BHA 
│  │              perlu waktu untuk penetrasi ke dalam pori."
│  ├─ Timer: ⏱️ 60 detik
│  └─ Icon: ⏳
│
│  Step 2.5:
│  ├─ Judul: "Tunggu Sebelum Melanjutkan"
│  ├─ Instruksi: "Pastikan BHA sudah fully dry sebelum aplikasi 
│  │              produk berikutnya. Ini penting untuk efficacy."
│  └─ Icon: ✅
│
├─ SECTION C: PENTING! POIN-POIN KHUSUS
│
│  🚨 PURGING WARNING:
│  "BHA adalah active ingredient yang kerja keras. Minggu pertama 
│   Anda mungkin lihat jerawat baru muncul - ini PURGING, bukan 
│   reaksi buruk. Lanjutkan pemakaian."
│
│  ⚠️ SENSITIVITY WARNING:
│  "BHA bisa bikin kulit lebih sensitif terhadap UV. SELALU gunakan 
│   sunscreen di pagi hari - tidak ada alasan untuk skip ini."
│
│  💡 EFFICACY TIP:
│  "BHA paling efektif pada skin yang slightly acidic. Jangan 
│   cuci muka dengan sabun alkaline sebelum ini - gunakan cleanser 
│   pH-balanced saja."
│
├─ SECTION D: COMMON MISTAKES
│  
│  ❌ "Menggunakan terlalu banyak toner"
│     → Iritasi, over-drying, redness
│     → Gunakan 3-4 tetes saja
│  
│  ❌ "Skip toner karena takut iritasi"
│     → Tidak ada effect sama sekali
│     → Mulai dengan 2-3 tetes, naik gradually
│  
│  ❌ "Pakai di hari ke-1 langsung full routine"
│     → Over-sensitif skin
│     → Start dengan 2x seminggu dulu, naik to daily gradual
│
├─ SECTION E: VISUAL REFERENCE
│  
│  [Video: Proper toner wipe technique]
│  [Foto: Cotton pad drip amount]
│  [Before-After: Pore refinement results]
│
└─ SECTION F: TRANSITION KE STEP BERIKUTNYA
   
   ⏱️ Waiting Time Sebelum Step 3 (Hanya evening):
   "Untuk malam hari, tunggu 2-3 menit sebelum serum berikutnya 
    agar BHA sudah fully absorbed dan tidak mencampur dengan 
    produk berikutnya."
```

---

**STEP 3: SERUM ANTI-BAKTERI (Evening Only)**

```
┌─ STEP 3: SERUM ANTI-BAKTERI (Evening Only)
│
├─ Product: "Zinc + Niacinamide Serum"
│
├─ SECTION A: BERAPA BANYAK?
│
│  Quantity:
│  ├─ Amount: "3-4 drops"
│  ├─ Reference: "[Tampilkan gambar jari untuk ukuran]"
│  └─ Note: "Serum concentrated, sedikit saja cukup"
│
├─ SECTION B: STEP-BY-STEP (EVENING ROUTINE)
│
│  Context: "Di malam hari, sebelum ini sudah:
│            1. Cleanser (membersihkan)
│            2. Toner BHA (eksfoliasi kimia)
│            3. Sekarang serum ini (active treatment)"
│
│  Step 3.1:
│  ├─ Judul: "Pastikan Skin Fully Dry"
│  ├─ Instruksi: "Serum bekerja optimal pada skin yang fully dry. 
│  │              Jika masih ada toner yang basah, akan menurunkan 
│  │              efektivitas serum."
│  └─ Wait: Tunggu 2-3 menit dari Step 2
│
│  Step 3.2:
│  ├─ Judul: "Keluarkan Serum dari Bottle"
│  ├─ Instruksi: "Keluarkan 3-4 drops ke telapak tangan. Jangan 
│  │              langsung dioleskan ke wajah."
│  └─ Icon: 💧
│
│  Step 3.3:
│  ├─ Judul: "Rub Antar Kedua Telapak Tangan"
│  ├─ Instruksi: "Warm up serum dengan menggosok telapak tangan 
│  │              selama 3-5 detik. Serum yang warm lebih mudah 
│  │              penetrasi ke kulit."
│  └─ Timer: ⏱️ 5 detik
│
│  Step 3.4:
│  ├─ Judul: "Aplikasikan ke Wajah dengan Press Method"
│  ├─ Instruksi: "Tekan-tekan serum ke seluruh wajah, jangan 
│  │              spread seperti moisturizer. Metode ini better 
│  │              untuk penetrasi. Fokus ke area dengan jerawat."
│  └─ Duration: 30 detik
│
│  Step 3.5:
│  ├─ Judul: "Tunggu Sampai Fully Absorbed"
│  ├─ Instruksi: "Biarkan serum meresap 3-5 menit sebelum aplikasi 
│  │              layer selanjutnya. Jangan terburu-buru."
│  ├─ Timer: ⏱️ 3-5 menit
│  └─ Note: "Ini waktu Anda bisa sikat gigi atau skincare routine lain"
│
│  Step 3.6:
│  ├─ Judul: "Lanjut ke Moisturizer"
│  ├─ Instruksi: "Setelah serum fully absorbed, barulah aplikasi 
│  │              moisturizer di atas."
│  └─ Icon: ✅
│
├─ SECTION C: MECHANISM OF ACTION (Edukasi)
│
│  💡 Mengapa produk ini efektif:
│  
│  "Zinc adalah natural antimicrobial yang membunuh P. acnes 
│   bacteria yang menyebabkan jerawat inflamasi.
│   
│   Niacinamide (Vitamin B3) mengurangi sebum production, 
│   menenangkan inflamasi, dan memperkuat skin barrier.
│   
│   Kombinasi kedua bahan ini menciptakan environment yang 
│   hostile untuk bakteri jerawat sambil protecting skin."
│
├─ SECTION D: TIMELINE EKSPEKTASI
│
│  Day 1-3:
│  "Mungkin terasa sedikit warm/tingly pada area jerawat. 
│   Normal - serum sedang bekerja membunuh bakteri."
│
│  Day 4-7:
│  "Jerawat mulai terlihat flat dan kurang merah. 
│   Sebum production berkurang."
│
│  Day 8-14:
│  "Jerawat aktif significantly berkurang. 
│   Kulit lebih calm dan balanced."
│
│  Day 15+:
│  "Hasil maksimal. Jerawat baru jarang muncul."
│
├─ SECTION E: COMMON MISTAKES
│
│  ❌ "Menggunakan terlalu banyak serum"
│     → Tidak lebih baik, malah bisa irritasi
│     → 3-4 drops is enough
│
│  ❌ "Apply langsung setelah toner tanpa tunggu"
│     → Toner masih basah, serum akan tercampur
│     → Tunggu 2-3 menit untuk optimal layering
│
│  ❌ "Apply ke wet face"
│     → Efficacy berkurang drastis
│     → Pastikan fully dry sebelum serum
│
├─ SECTION F: VISUAL REFERENCE
│
│  [Video: Proper drop amount demonstration]
│  [Video: Press method vs spread method]
│  [Photo: Before-after jerawat improvement]
│  [Photo: Skin texture improvement over time]
│
└─ SECTION G: TRANSITION KE STEP 4
   
   ⏱️ Waiting Time Sebelum Step 4 (Moisturizer):
   "Setelah serum fully absorbed (3-5 menit), skin ready untuk 
    moisturizer. Moisturizer akan lock in semua serum dan toner 
    yang sudah di-apply."
```

---

**STEP 4: MOISTURIZER (Morning & Evening)**

```
┌─ STEP 4: MOISTURIZER LIGHTWEIGHT
│
├─ Product: "Oil-Free Hydrating Gel Cream"
│
├─ SECTION A: BERAPA BANYAK?
│
│  Quantity:
│  ├─ Amount: "Pea-sized amount (atau sebutir beras)"
│  ├─ Visual: [Tampilkan reference size]
│  └─ Note: "Gel cream ini concentrated, sedikit go a long way"
│
├─ SECTION B: STEP-BY-STEP
│
│  Step 4.1:
│  ├─ Judul: "Keluarkan Moisturizer"
│  ├─ Instruksi: "Keluarkan sebutir beras-sized amount moisturizer 
│  │              ke telapak tangan. Untuk oily skin, kurang banyak 
│  │              lebih baik daripada terlalu banyak."
│  └─ Icon: 💧
│
│  Step 4.2:
│  ├─ Judul: "Warm Up dengan Menggosok Telapak Tangan"
│  ├─ Instruksi: "Gosok produk dengan telapak tangan hingga sedikit 
│  │              warm dan mulai spread. Ini membuat aplikasi lebih 
│  │              smooth dan even."
│  └─ Duration: 5 detik
│
│  Step 4.3:
│  ├─ Judul: "Aplikasikan dengan Press & Pat Method"
│  ├─ Instruksi: "Pat moisturizer ke seluruh wajah dengan gerakan 
│  │              gentle menggunakan fingertips. Jangan spread 
│  │              seperti lotion biasa. Fokus ke area dry terlebih 
│  │              dahulu (cheeks, under eyes)."
│  └─ Duration: 30-45 detik
│
│  Step 4.4:
│  ├─ Judul: "Fokus ke Area Under-Eyes"
│  ├─ Instruksi: "Gunakan ring finger (jari terlemah) untuk tap-tap 
│  │              kecil di bawah mata. Area ini sangat sensitif dan 
│  │              perlu extra care."
│  └─ Caution: "Jangan drag - hanya tap-tap"
│
│  Step 4.5:
│  ├─ Judul: "Tunggu Sampai Fully Set"
│  ├─ Instruksi: "Biarkan moisturizer meresap 1-2 menit. Jangan 
│  │              langsung ke makeup atau tidur. Ini important untuk 
│  │              lock in semua layer sebelumnya."
│  ├─ Timer: ⏱️ 1-2 menit
│  └─ Icon: ⏳
│
├─ SECTION C: PENTING! MOISTURIZER MYTHS
│
│  ✅ MYTH BUSTED 1:
│  "Myth: Moisturizer membuat oily skin lebih berkilau
│   Truth: Oily skin yang tidak hydrated akan OVERPRODUCE sebum 
│           untuk compensate. Moisturizer actually REDUCES sebum 
│           production dalam jangka panjang."
│
│  ✅ MYTH BUSTED 2:
│  "Myth: Gel cream ini tidak moisturizing cukup untuk kulit saya
│   Truth: Lightweight gel cream ini cukup untuk oily skin. 
│           Jika masih terasa dry, issue bukan produk tapi 
│           hydration dari dalam (minum air)."
│
│  ✅ MYTH BUSTED 3:
│  "Myth: Saya tidak butuh moisturizer kalau pake serum
│   Truth: Serum adalah treatment, bukan moisturizer. Serum 
│           perlu di-lock in dengan moisturizer untuk efficacy 
│           maksimal."
│
├─ SECTION D: PAGI VS MALAM
│
│  🌅 MORNING APPLICATION:
│  └─ Tunggu 2 menit sebelum makeup/sunscreen
│     Moisturizer harus fully set sebelum layer produk berikutnya
│
│  🌙 EVENING APPLICATION:
│  └─ Tunggu 1-2 menit sebelum tidur
│     Moisturizer akan continue working selama Anda tidur
│
├─ SECTION E: VISUAL REFERENCE
│
│  [Video: Proper pea-sized amount]
│  [Video: Pat method vs spread method]
│  [Before-After: Skin hydration improvement]
│
└─ SECTION F: TRANSITION
   
   🌅 PAGI: Lanjut ke STEP 5 - SUNSCREEN
   🌙 MALAM: Selesai routine, siap tidur
```

---

**STEP 5: SUNSCREEN (Morning Only)**

```
┌─ STEP 5: SUNSCREEN SPF 50+ PA++++ (Morning Only)
│
├─ Product: "Mineral Sunscreen SPF 50 PA++++"
│
├─ SECTION A: BERAPA BANYAK?
│
│  Quantity:
│  ├─ Amount: "1/4 teaspoon atau dua jari jari (fingertip size)"
│  ├─ Visual: [Show reference measurement]
│  ├─ Breakdown: "Pagi: ~1 TSP total untuk seluruh wajah (1/4 TSP 
│  │              per area: forehead, cheeks, nose, chin)"
│  └─ Critical Note: "Ini jumlah yang MINIMUM untuk SPF 50 efficacy. 
│                     Jangan kurangi!"
│
├─ SECTION B: KENAPA SUNSCREEN WAJIB?
│
│  ⚠️ URGENT MESSAGE:
│  "Sebelum produk acne ini (BHA, Niacinamide, Zinc):
│   
│   ❌ Jangan apply tanpa sunscreen di pagi hari
│   
│   Alasan:
│   • Produk ini meningkatkan skin sensitivity 2-3x lipat
│   • UV damage akan mempercepat aging dan hyperpigmentation
│   • Bekas jerawat akan LEBIH mudah dark jika exposed UV
│   • Bisa cause melasma (brown patches) di wajah
│   
│   TL;DR: Sunscreen bukan luxury, ini OBLIGATION untuk program ini."
│
├─ SECTION C: STEP-BY-STEP
│
│  Step 5.1:
│  ├─ Judul: "Keluarkan Sunscreen"
│  ├─ Instruksi: "Keluarkan 1/4 teaspoon (atau dua fingersize drop) 
│  │              ke telapak tangan. JANGAN KURANGI jumlah ini - 
│  │              ini jumlah yang perlu untuk efficacy penuh."
│  └─ Critical: "Underdosing sunscreen = tidak punya protection"
│
│  Step 5.2:
│  ├─ Judul: "Warm Up dengan Tangan"
│  ├─ Instruksi: "Gosok sunscreen dengan telapak tangan hingga 
│  │              slightly warm dan menjadi consistency yang creamy. 
│  │              Ini membuat aplikasi lebih smooth."
│  └─ Duration: 5-10 detik
│
│  Step 5.3:
│  ├─ Judul: "Divide Sunscreen ke 5 Area"
│  ├─ Instruksi: "Bagi sunscreen ke area: forehead, cheeks (kanan-
│  │              kiri), nose, chin. Jangan apply semua sekaligus ke 
│  │              satu tempat - akan tidak even."
│  └─ Icon: 🎯
│
│  Step 5.4:
│  ├─ Judul: "Apply dengan Gentle Massaging Motion"
│  ├─ Instruksi: "Tap-tap dan gentle spread sunscreen ke setiap area 
│  │              dengan fingertips atau palm. Jangan terlalu keras. 
│  │              Fokus: wajah dan leher (sering lupa di leher!)."
│  └─ Duration: 1 menit
│
│  Step 5.5:
│  ├─ Judul: "Jangan Lupa Area T-Zone"
│  ├─ Instruksi: "Forehead, bridge of nose, nasolabial folds sering 
│  │              terlewat. Pastikan semua area tercovered termasuk 
│  │              di belakang telinga."
│  └─ Tip: "Most people miss di behind ear dan side of face"
│
│  Step 5.6:
│  ├─ Judul: "Set Selama 10-15 Menit"
│  ├─ Instruksi: "Tunggu 10-15 menit sebelum keluar rumah atau apply 
│  │              makeup. Sunscreen perlu time untuk fully set dan 
│  │              create protective barrier. Jangan terburu-buru."
│  ├─ Timer: ⏱️ 10-15 menit
│  └─ Important: "Ini adalah step yang paling banyak orang skip, 
│                  tapi paling penting!"
│
│  Step 5.7:
│  ├─ Judul: "Reapply Setiap 2 Jam di Luar"
│  ├─ Instruksi: "Jika Anda outdoor, reapply sunscreen setiap 2 jam. 
│  │              Atau setelah swimming, sweating, atau facial wipe. 
│  │              Carry sunscreen stick di tas untuk reapply."
│  └─ Critical: "Initial application saja tidak cukup untuk all-day 
│               protection"
│
├─ SECTION D: MINERAL vs CHEMICAL SUNSCREEN (Edukasi)
│
│  ℹ️ "Produk ini adalah MINERAL sunscreen (mengandung Zinc Oxide 
│       atau Titanium Dioxide):
│   
│   ✅ Keuntungan:
│   • Immediate protection setelah apply (tidak perlu absorb)
│   • Less irritating untuk sensitive/acne-prone skin
│   • Tidak ada white cast... well, minimal white cast
│   • Less risk of irritation atau allergic reaction
│   
│   ⚠️ Consideration:
│   • Bisa terasa sedikit heavy
│   • Mungkin ada white cast ringan (tapi bagus, tandanya 
│     coverage full)
│   • Texture mungkin different dari chemical sunscreen"
│
├─ SECTION E: SUNSCREEN MYTHS
│
│  ✅ MYTH 1:
│  "Myth: SPF 50 = 2x lebih protect dari SPF 30
│   Truth: SPF 50 blocks 98% UV, SPF 30 blocks 97% UV. 
│           Perbedaan cuma 1% tapi reapplication lebih penting!"
│
│  ✅ MYTH 2:
│  "Myth: Saya tidak perlu sunscreen kalau di dalam rumah
│   Truth: UV rays masuk lewat window. Plus jika Anda outdoor 
│           sesedikit saja (drive, jalan ke minimart), butuh 
│           sunscreen."
│
│  ✅ MYTH 3:
│  "Myth: Sunscreen bikin jerawat lebih parah
│   Truth: Sunscreen yang SALAH bisa trigger jerawat. Produk ini 
│           adalah non-comedogenic, jadi not an issue."
│
├─ SECTION F: TROUBLESHOOTING
│
│  Problem: "Sunscreen terasa terlalu berat/greasy"
│  Solution: "Gunakan lebih sedikit? Tapi TIDAK untuk efficacy. 
│             Mungkin ini bukan produk yang tepat untuk Anda. 
│             Coba gel sunscreen variant instead."
│
│  Problem: "Ada white cast"
│  Solution: "Ini normal untuk mineral sunscreen. Bisa dikurangi 
│             dengan blend well. Atau tunggu 10 menit, white cast 
│             akan fade."
│
│  Problem: "Pore terasa tersumbat setelah sunscreen"
│  Solution: "Pastikan Anda udah remove makeup dengan proper cleanser 
│             di malam hari. Jangan left over sunscreen overnight."
│
├─ SECTION G: VISUAL REFERENCE
│
│  [Video: Proper sunscreen amount & application technique]
│  [Photo: UV camera showing protected vs unprotected areas]
│  [Infographic: Sun protection factor breakdown]
│
└─ SECTION H: SELESAI PAGI ROUTINE
   
   ✅ Pagi routine selesai! Anda sudah:
   1. ✅ Cleanser (menghilangkan minyak)
   2. ✅ Toner (eksfoliasi & pH balance)
   3. ✅ Moisturizer (hydration)
   4. ✅ Sunscreen (protection)
   
   Skipped di pagi: Serum (hanya malam)
   Reason: Active ingredients lebih baik di malam hari untuk 
           safety dan efficacy maksimal.
```

---

### Step 4.3: Admin Menyimpan Semua Instruksi

**Database Insert:**

```sql
INSERT INTO ProgramInstructions (
  program_id,
  step_number,
  step_name,
  product_id,
  phase,
  amount,
  step_by_step_instructions,
  tips_and_warnings,
  common_mistakes,
  mechanism_explanation,
  wait_time_before_next,
  visual_references,
  created_at
) VALUES
-- STEP 1
('prog_acne_express_001', 1, 'Pembersihan Wajah', 'prod_cleanser_001', 
 'both', '1 pump (5ml)', '[JSON array dengan semua step 1.1 - 1.7]',
 '[JSON array dengan tips]', '[JSON array dengan mistakes]',
 'Cleanser membuka pori dan menghilangkan dirt...', 120, 
 '[video url, photo urls]', NOW()),

-- STEP 2  
('prog_acne_express_001', 2, 'Toner BHA', 'prod_toner_bha_001',
 'morning', '3-4 drops', '[JSON dengan step 2.1 - 2.5]',
 '[JSON dengan warnings about purging]', '[JSON]',
 'BHA exfoliate dead cells dalam pori...', 180,
 '[urls]', NOW()),

-- ... dst step 3, 4, 5
;
```

### Step 4.4: Success Response

```json
{
  "status": "success",
  "message": "Semua instruksi penggunaan berhasil disimpan!",
  "data": {
    "programId": "prog_acne_express_001",
    "totalSteps": 5,
    "instructionsCreated": [
      {
        "stepNumber": 1,
        "stepName": "Pembersihan Wajah",
        "amountRequired": "1 pump (5ml)",
        "waitTimeAfter": "120 detik"
      },
      {
        "stepNumber": 2,
        "stepName": "Toner BHA",
        "amountRequired": "3-4 drops",
        "waitTimeAfter": "180 detik"
      },
      {
        "stepNumber": 3,
        "stepName": "Serum Anti-Bakteri",
        "amountRequired": "3-4 drops",
        "waitTimeAfter": "300 detik"
      },
      {
        "stepNumber": 4,
        "stepName": "Moisturizer",
        "amountRequired": "Pea-sized",
        "waitTimeAfter": "120 detik"
      },
      {
        "stepNumber": 5,
        "stepName": "Sunscreen",
        "amountRequired": "1/4 teaspoon",
        "waitTimeAfter": "900 detik (15 menit before going out)"
      }
    ],
    "programStatus": "READY_FOR_PUBLICATION",
    "nextAction": "Program siap dipublish dan digunakan oleh user!"
  }
}
```

### Step 4.5: Program Completion Status

```
✅ PROGRAM SETUP COMPLETE!

Program: "Acne-Free Express 4 Weeks"
Status: READY TO PUBLISH

All 4 Flows Completed:
[✅] Flow 1: Program Created
     - Name, Category, Duration, Targets configured

[✅] Flow 2: Detailed Description Added
     - Science background, timeline, benefits, precautions, FAQs

[✅] Flow 3: Products Configured
     - 5 products linked in proper order
     - Each with clear purpose

[✅] Flow 4: Instructions Complete
     - 35+ detailed instruction steps
     - All amounts, timings, wait times specified
     - Tips, warnings, common mistakes included

Ready to publish: [PUBLISH PROGRAM] [PREVIEW] [EDIT]
```

---

## RINGKASAN FLOW SEMPURNA

```
┌────────────────────────────────────────────────────────────┐
│              ADMIN SKIN JOURNEY - 4 FLOW SUMMARY             │
├────────────────────────────────────────────────────────────┤
│                                                              │
│ [FLOW 1] BIKIN PROGRAM                                      │
│ └─ Input: Name, Category, Target, Duration                 │
│ └─ Output: Program ID, Status DRAFT                         │
│                                                              │
│ [FLOW 2] PENJELASAN DETAIL                                  │
│ └─ Input: Science, Timeline, Benefits, Warnings, FAQs       │
│ └─ Output: Detailed info for user education                 │
│                                                              │
│ [FLOW 3] PRODUK YANG DIPAKAI                                │
│ └─ Input: Product selection, Phase, Order, Purpose          │
│ └─ Output: 5 products mapped in correct sequence            │
│                                                              │
│ [FLOW 4] CARA PAKAI                                         │
│ └─ Input: Amount, Step-by-step, Tips, Wait times            │
│ └─ Output: 30+ detailed instruction steps per program       │
│                                                              │
│ FINAL: Program → PUBLISHED → User can enroll               │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

**Setiap Flow punya:**
- ✅ Clear input fields
- ✅ Step-by-step guidance
- ✅ Validation rules
- ✅ Database structure
- ✅ Success response
- ✅ User feedback

**Program baru siap setelah Flow 4 selesai!**