-- =============================================================================
-- MULTI-MERCHANT eCOMMERCE + AFFILIATE MEMBERSHIP SYSTEM
-- Complete Database Schema (PostgreSQL 15+)
-- =============================================================================
-- Urutan pembuatan tabel sudah memperhatikan foreign key dependency
-- =============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- untuk full-text search

-- =============================================================================
-- SECTION 1: ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM ('buyer', 'merchant', 'affiliate', 'admin', 'superadmin');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'banned');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

CREATE TYPE merchant_status AS ENUM ('pending', 'active', 'suspended', 'rejected', 'closed');
CREATE TYPE merchant_tier AS ENUM ('regular', 'official', 'premium');

CREATE TYPE product_status AS ENUM ('draft', 'active', 'inactive', 'out_of_stock', 'deleted');
CREATE TYPE product_condition AS ENUM ('new', 'used', 'refurbished');
CREATE TYPE stock_movement_type AS ENUM ('purchase', 'sale', 'return', 'adjustment', 'transfer', 'damage');

CREATE TYPE order_status AS ENUM (
  'pending_payment',
  'paid',
  'processing',
  'ready_to_ship',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'refund_requested',
  'refund_processing',
  'refunded',
  'disputed'
);

CREATE TYPE merchant_order_status AS ENUM (
  'new',
  'confirmed',
  'processing',
  'packed',
  'handed_to_courier',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'refund_requested',
  'refunded'
);

CREATE TYPE payment_status AS ENUM ('unpaid', 'pending', 'paid', 'failed', 'expired', 'refunded', 'partially_refunded');
CREATE TYPE payment_method_type AS ENUM (
  'bank_transfer',
  'virtual_account',
  'credit_card',
  'debit_card',
  'qris',
  'gopay',
  'ovo',
  'dana',
  'shopeepay',
  'linkaja',
  'indomaret',
  'alfamart',
  'kredivo',
  'akulaku',
  'wallet_balance'
);

CREATE TYPE affiliate_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');
CREATE TYPE commission_status AS ENUM ('pending', 'approved', 'paid', 'rejected', 'cancelled');
CREATE TYPE withdrawal_status AS ENUM ('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled');
CREATE TYPE wallet_transaction_type AS ENUM (
  'commission_earned',
  'commission_reversed',
  'sale_revenue',
  'sale_revenue_reversed',
  'withdrawal_request',
  'withdrawal_completed',
  'withdrawal_rejected',
  'platform_fee',
  'refund_deduction',
  'bonus',
  'adjustment',
  'membership_fee'
);
CREATE TYPE wallet_owner_type AS ENUM ('merchant', 'affiliate', 'buyer');

CREATE TYPE notification_type AS ENUM (
  'order_new',
  'order_paid',
  'order_shipped',
  'order_delivered',
  'order_completed',
  'order_cancelled',
  'order_refund_requested',
  'order_refunded',
  'commission_earned',
  'commission_approved',
  'commission_paid',
  'withdrawal_requested',
  'withdrawal_approved',
  'withdrawal_completed',
  'withdrawal_rejected',
  'product_approved',
  'product_rejected',
  'merchant_verified',
  'merchant_suspended',
  'tier_upgraded',
  'membership_expiring',
  'review_received',
  'low_stock',
  'promo_started',
  'system'
);
CREATE TYPE notification_channel AS ENUM ('email', 'whatsapp', 'push', 'in_app', 'sms');

CREATE TYPE shipping_status AS ENUM ('pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned');
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected', 'hidden');
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y');
CREATE TYPE voucher_scope AS ENUM ('platform', 'merchant', 'product', 'category', 'shipping');
CREATE TYPE dispute_status AS ENUM ('open', 'under_review', 'resolved_buyer', 'resolved_merchant', 'escalated', 'closed');
CREATE TYPE verification_type AS ENUM ('email', 'phone', 'merchant_identity', 'affiliate_identity');
CREATE TYPE content_type AS ENUM ('banner', 'popup', 'announcement', 'email_template', 'whatsapp_template');
CREATE TYPE log_action AS ENUM ('create', 'update', 'delete', 'approve', 'reject', 'suspend', 'activate', 'login', 'logout', 'export', 'import');


-- =============================================================================
-- SECTION 2: USERS & AUTHENTICATION
-- =============================================================================

CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email             VARCHAR(255) NOT NULL UNIQUE,
  phone             VARCHAR(20) UNIQUE,
  phone_country_code VARCHAR(5) DEFAULT '+62',
  password_hash     TEXT NOT NULL,
  role              user_role NOT NULL DEFAULT 'buyer',
  status            user_status NOT NULL DEFAULT 'active',
  email_verified_at TIMESTAMPTZ,
  phone_verified_at TIMESTAMPTZ,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret  TEXT,
  last_login_at     TIMESTAMPTZ,
  last_login_ip     INET,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE TABLE user_profiles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name     VARCHAR(150) NOT NULL,
  display_name  VARCHAR(100),
  avatar_url    TEXT,
  gender        gender_type,
  date_of_birth DATE,
  bio           TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_addresses (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label          VARCHAR(50) NOT NULL DEFAULT 'Rumah',  -- Rumah, Kantor, dll
  recipient_name VARCHAR(150) NOT NULL,
  phone          VARCHAR(20) NOT NULL,
  address_line1  TEXT NOT NULL,
  address_line2  TEXT,
  district       VARCHAR(100),
  city           VARCHAR(100) NOT NULL,
  province       VARCHAR(100) NOT NULL,
  postal_code    VARCHAR(10) NOT NULL,
  country_code   CHAR(2) NOT NULL DEFAULT 'ID',
  latitude       DECIMAL(10, 8),
  longitude      DECIMAL(11, 8),
  is_default     BOOLEAN DEFAULT FALSE,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  device_info JSONB,        -- { ua, platform, browser }
  ip_address  INET,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE verification_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        verification_type NOT NULL,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE oauth_accounts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider       VARCHAR(50) NOT NULL,   -- google, facebook, apple
  provider_id    VARCHAR(255) NOT NULL,
  access_token   TEXT,
  refresh_token  TEXT,
  token_expires_at TIMESTAMPTZ,
  raw_data       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_id)
);

CREATE TABLE user_notification_preferences (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email_order          BOOLEAN DEFAULT TRUE,
  email_promo          BOOLEAN DEFAULT TRUE,
  email_system         BOOLEAN DEFAULT TRUE,
  whatsapp_order       BOOLEAN DEFAULT TRUE,
  whatsapp_promo       BOOLEAN DEFAULT FALSE,
  push_order           BOOLEAN DEFAULT TRUE,
  push_promo           BOOLEAN DEFAULT TRUE,
  push_system          BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- SECTION 3: LOCATIONS (Region/Area untuk pengiriman)
-- =============================================================================

CREATE TABLE countries (
  id           SERIAL PRIMARY KEY,
  code         CHAR(2) NOT NULL UNIQUE,
  name         VARCHAR(100) NOT NULL,
  phone_code   VARCHAR(10),
  currency     VARCHAR(10),
  is_active    BOOLEAN DEFAULT TRUE
);

CREATE TABLE provinces (
  id         SERIAL PRIMARY KEY,
  country_id INTEGER NOT NULL REFERENCES countries(id),
  name       VARCHAR(100) NOT NULL,
  code       VARCHAR(10),
  is_active  BOOLEAN DEFAULT TRUE
);

CREATE TABLE cities (
  id          SERIAL PRIMARY KEY,
  province_id INTEGER NOT NULL REFERENCES provinces(id),
  name        VARCHAR(100) NOT NULL,
  type        VARCHAR(30),   -- Kota / Kabupaten
  postal_code VARCHAR(10),
  is_active   BOOLEAN DEFAULT TRUE
);

CREATE TABLE districts (
  id       SERIAL PRIMARY KEY,
  city_id  INTEGER NOT NULL REFERENCES cities(id),
  name     VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE sub_districts (
  id          SERIAL PRIMARY KEY,
  district_id INTEGER NOT NULL REFERENCES districts(id),
  name        VARCHAR(100) NOT NULL,
  postal_code VARCHAR(10),
  is_active   BOOLEAN DEFAULT TRUE
);


-- =============================================================================
-- SECTION 4: MERCHANTS
-- =============================================================================

CREATE TABLE merchants (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  shop_name               VARCHAR(150) NOT NULL,
  slug                    VARCHAR(160) NOT NULL UNIQUE,
  description             TEXT,
  logo_url                TEXT,
  banner_url              TEXT,
  status                  merchant_status NOT NULL DEFAULT 'pending',
  tier                    merchant_tier NOT NULL DEFAULT 'regular',

  -- Kontak & Lokasi
  business_phone          VARCHAR(20),
  business_email          VARCHAR(255),
  business_address        TEXT,
  return_address          TEXT,
  province_id             INTEGER REFERENCES provinces(id),
  city_id                 INTEGER REFERENCES cities(id),
  postal_code             VARCHAR(10),
  latitude                DECIMAL(10, 8),
  longitude               DECIMAL(11, 8),

  -- Legalitas
  business_type           VARCHAR(50),    -- perorangan, CV, PT, dll
  business_name           VARCHAR(200),   -- nama usaha resmi
  npwp                    VARCHAR(30),
  ktp_number              VARCHAR(20),
  ktp_url                 TEXT,
  npwp_url                TEXT,
  business_license_url    TEXT,

  -- Bank untuk withdrawal
  bank_name               VARCHAR(100),
  bank_account_number     TEXT,           -- dienkripsi di aplikasi
  bank_account_name       VARCHAR(200),
  bank_branch             VARCHAR(100),

  -- Konfigurasi toko
  is_open                 BOOLEAN DEFAULT TRUE,
  min_order_amount        DECIMAL(15,2) DEFAULT 0,
  processing_days         INTEGER DEFAULT 1,
  return_policy           TEXT,
  custom_commission_rate  DECIMAL(5,4),   -- override platform rate, NULL = pakai default

  -- Statistik (di-cache, diupdate via trigger/job)
  total_products          INTEGER DEFAULT 0,
  total_orders            INTEGER DEFAULT 0,
  total_revenue           DECIMAL(15,2) DEFAULT 0,
  average_rating          DECIMAL(3,2) DEFAULT 0,
  total_reviews           INTEGER DEFAULT 0,

  -- Timestamps
  verified_at             TIMESTAMPTZ,
  verified_by             UUID REFERENCES users(id),
  suspended_at            TIMESTAMPTZ,
  suspended_reason        TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ
);

CREATE TABLE merchant_users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(50) NOT NULL,   -- 'owner', 'admin', 'packer', 'cs'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(merchant_id, user_id)
);

CREATE TABLE merchant_operating_hours (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL,  -- 0=Minggu, 1=Senin, ... 6=Sabtu
  open_time   TIME,
  close_time  TIME,
  is_closed   BOOLEAN DEFAULT FALSE,
  UNIQUE(merchant_id, day_of_week)
);

CREATE TABLE merchant_social_links (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  platform    VARCHAR(50) NOT NULL,   -- instagram, tiktok, facebook, website
  url         TEXT NOT NULL,
  is_active   BOOLEAN DEFAULT TRUE
);

CREATE TABLE merchant_shipping_methods (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id     UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  courier_code    VARCHAR(50) NOT NULL,   -- jne, jnt, sicepat, anteraja, gosend, grab
  service_code    VARCHAR(50) NOT NULL,   -- REG, YES, OKE, dll
  is_active       BOOLEAN DEFAULT TRUE,
  free_shipping_min_amount DECIMAL(15,2),   -- gratis ongkir kalau order >= nilai ini
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- SECTION 5: CATEGORIES & ATTRIBUTES
-- =============================================================================

CREATE TABLE categories (
  id                  SERIAL PRIMARY KEY,
  parent_id           INTEGER REFERENCES categories(id),
  name                VARCHAR(100) NOT NULL,
  slug                VARCHAR(110) NOT NULL UNIQUE,
  description         TEXT,
  icon_url            TEXT,
  banner_url          TEXT,
  commission_rate     DECIMAL(5,4) DEFAULT 0.05,   -- default 5%
  sort_order          INTEGER DEFAULT 0,
  is_active           BOOLEAN DEFAULT TRUE,
  is_featured         BOOLEAN DEFAULT FALSE,
  meta_title          VARCHAR(255),
  meta_description    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE attribute_groups (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,  -- Ukuran, Warna, Material, dll
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE attributes (
  id                SERIAL PRIMARY KEY,
  attribute_group_id INTEGER NOT NULL REFERENCES attribute_groups(id),
  name              VARCHAR(100) NOT NULL,  -- S, M, L, XL | Merah, Biru, dll
  sort_order        INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE category_attributes (
  category_id      INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  attribute_group_id INTEGER NOT NULL REFERENCES attribute_groups(id) ON DELETE CASCADE,
  is_required      BOOLEAN DEFAULT FALSE,
  is_filterable    BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (category_id, attribute_group_id)
);


-- =============================================================================
-- SECTION 6: PRODUCTS
-- =============================================================================

CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id     UUID NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  category_id     INTEGER NOT NULL REFERENCES categories(id),
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(270) NOT NULL UNIQUE,
  description     TEXT NOT NULL,
  short_description VARCHAR(500),
  condition       product_condition NOT NULL DEFAULT 'new',
  status          product_status NOT NULL DEFAULT 'draft',
  is_featured     BOOLEAN DEFAULT FALSE,
  weight          DECIMAL(10,3) NOT NULL DEFAULT 0,  -- gram
  dimension_length DECIMAL(10,2),   -- cm
  dimension_width  DECIMAL(10,2),
  dimension_height DECIMAL(10,2),

  -- Override komisi untuk produk ini (NULL = pakai rate kategori)
  commission_rate_override DECIMAL(5,4),

  -- SEO
  meta_title          VARCHAR(255),
  meta_description    TEXT,
  meta_keywords       TEXT[],

  -- Stats (di-cache)
  total_sold          INTEGER DEFAULT 0,
  total_views         INTEGER DEFAULT 0,
  average_rating      DECIMAL(3,2) DEFAULT 0,
  total_reviews       INTEGER DEFAULT 0,
  wishlist_count      INTEGER DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE product_images (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  alt_text    VARCHAR(255),
  sort_order  INTEGER DEFAULT 0,
  is_primary  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_variants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku             VARCHAR(100) NOT NULL UNIQUE,
  name            VARCHAR(255) NOT NULL,   -- misal: "Merah - XL"
  price           DECIMAL(15,2) NOT NULL,
  compare_price   DECIMAL(15,2),          -- harga coret
  cost_price      DECIMAL(15,2),          -- harga modal (private, untuk merchant)
  stock           INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  weight          DECIMAL(10,3),          -- override dari product
  is_active       BOOLEAN DEFAULT TRUE,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_variant_attributes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_variant_id  UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  attribute_id        INTEGER NOT NULL REFERENCES attributes(id),
  value               VARCHAR(255),   -- untuk nilai custom (misal warna hex)
  UNIQUE(product_variant_id, attribute_id)
);

CREATE TABLE product_variant_images (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  product_image_id   UUID NOT NULL REFERENCES product_images(id) ON DELETE CASCADE,
  UNIQUE(product_variant_id, product_image_id)
);

CREATE TABLE stock_movements (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  type               stock_movement_type NOT NULL,
  quantity           INTEGER NOT NULL,   -- positif = masuk, negatif = keluar
  stock_before       INTEGER NOT NULL,
  stock_after        INTEGER NOT NULL,
  reference_id       UUID,    -- bisa order_id, return_id, dll
  reference_type     VARCHAR(50),
  note               TEXT,
  created_by         UUID REFERENCES users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_attributes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_group_id INTEGER NOT NULL REFERENCES attribute_groups(id),
  name         VARCHAR(100) NOT NULL,   -- custom field name
  value        TEXT NOT NULL,
  sort_order   INTEGER DEFAULT 0
);

CREATE TABLE wishlists (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id         UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);



-- =============================================================================
-- SECTION 7: MEMBERSHIP & AFFILIATE
-- =============================================================================

CREATE TABLE membership_tiers (
  id                       SERIAL PRIMARY KEY,
  name                     VARCHAR(50) NOT NULL UNIQUE,  -- Bronze, Silver, Gold, Platinum
  level                    INTEGER NOT NULL UNIQUE,       -- 1, 2, 3, 4
  base_commission_rate     DECIMAL(5,4) NOT NULL,         -- 0.03 = 3%
  monthly_fee              DECIMAL(15,2) DEFAULT 0,       -- 0 = gratis
  yearly_fee               DECIMAL(15,2) DEFAULT 0,
  min_earnings_for_upgrade DECIMAL(15,2),                 -- auto-upgrade threshold
  min_referrals_for_upgrade INTEGER,
  max_withdrawal_per_month DECIMAL(15,2),
  min_withdrawal_amount    DECIMAL(15,2) DEFAULT 100000,
  withdrawal_fee           DECIMAL(15,2) DEFAULT 0,
  withdrawal_fee_percent   DECIMAL(5,4) DEFAULT 0,
  commission_hold_days     INTEGER DEFAULT 7,              -- hari sebelum komisi bisa dicairkan
  cookie_duration_days     INTEGER DEFAULT 30,
  benefits                 JSONB,   -- array of benefit strings
  badge_url                TEXT,
  color_hex                VARCHAR(7),
  is_active                BOOLEAN DEFAULT TRUE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE affiliate_members (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  membership_tier_id   INTEGER NOT NULL REFERENCES membership_tiers(id),
  ref_code             VARCHAR(20) NOT NULL UNIQUE,
  status               affiliate_status NOT NULL DEFAULT 'pending_verification',

  -- Identitas untuk verifikasi
  ktp_number           VARCHAR(20),
  ktp_url              TEXT,
  bank_name            VARCHAR(100),
  bank_account_number  TEXT,   -- dienkripsi
  bank_account_name    VARCHAR(200),
  identity_verified_at TIMESTAMPTZ,
  verified_by          UUID REFERENCES users(id),

  -- Statistik (di-cache, diupdate via job)
  total_clicks         BIGINT DEFAULT 0,
  total_conversions    INTEGER DEFAULT 0,
  total_earned         DECIMAL(15,2) DEFAULT 0,
  total_withdrawn      DECIMAL(15,2) DEFAULT 0,
  conversion_rate      DECIMAL(5,4) DEFAULT 0,

  -- Tier tracking
  tier_upgraded_at     TIMESTAMPTZ,
  tier_expires_at      TIMESTAMPTZ,    -- untuk tier berbayar

  joined_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE affiliate_tier_commissions (
  id                  SERIAL PRIMARY KEY,
  membership_tier_id  INTEGER NOT NULL REFERENCES membership_tiers(id) ON DELETE CASCADE,
  category_id         INTEGER REFERENCES categories(id) ON DELETE CASCADE,   -- NULL = semua kategori
  merchant_id         UUID REFERENCES merchants(id) ON DELETE CASCADE,        -- NULL = semua merchant
  commission_rate     DECIMAL(5,4) NOT NULL,
  is_active           BOOLEAN DEFAULT TRUE,
  valid_from          TIMESTAMPTZ,
  valid_until         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Urutan prioritas: merchant > category > tier default
  UNIQUE NULLS NOT DISTINCT (membership_tier_id, category_id, merchant_id)
);

CREATE TABLE membership_subscriptions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id        UUID NOT NULL REFERENCES affiliate_members(id) ON DELETE RESTRICT,
  membership_tier_id  INTEGER NOT NULL REFERENCES membership_tiers(id),
  billing_cycle       VARCHAR(10) NOT NULL DEFAULT 'monthly',   -- monthly, yearly
  amount_paid         DECIMAL(15,2) NOT NULL,
  payment_reference   TEXT,
  starts_at           TIMESTAMPTZ NOT NULL,
  ends_at             TIMESTAMPTZ NOT NULL,
  is_active           BOOLEAN DEFAULT TRUE,
  auto_renew          BOOLEAN DEFAULT FALSE,
  cancelled_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE affiliate_links (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id     UUID NOT NULL REFERENCES affiliate_members(id) ON DELETE CASCADE,
  target_url       TEXT NOT NULL,
  short_code       VARCHAR(20) NOT NULL UNIQUE,
  title            VARCHAR(255),
  description      TEXT,

  -- Optional spesifik target
  product_id       UUID REFERENCES products(id) ON DELETE SET NULL,
  merchant_id      UUID REFERENCES merchants(id) ON DELETE SET NULL,
  campaign_id      UUID,   -- untuk grouping

  -- Stats (di-cache)
  clicks_count     BIGINT DEFAULT 0,
  unique_clicks    BIGINT DEFAULT 0,
  conversions_count INTEGER DEFAULT 0,
  total_commission DECIMAL(15,2) DEFAULT 0,

  is_active        BOOLEAN DEFAULT TRUE,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE affiliate_clicks (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_link_id UUID NOT NULL REFERENCES affiliate_links(id) ON DELETE CASCADE,
  affiliate_id     UUID NOT NULL REFERENCES affiliate_members(id),
  session_id       VARCHAR(100),
  ip_address       INET NOT NULL,
  user_agent       TEXT,
  referrer_url     TEXT,
  country_code     CHAR(2),
  device_type      VARCHAR(20),    -- mobile, tablet, desktop
  browser          VARCHAR(50),
  os               VARCHAR(50),
  is_unique        BOOLEAN DEFAULT TRUE,
  is_converted     BOOLEAN DEFAULT FALSE,
  order_id         UUID,           -- diisi setelah konversi
  cookie_set_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clicked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE affiliate_commissions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id     UUID NOT NULL REFERENCES affiliate_members(id) ON DELETE RESTRICT,
  order_id         UUID NOT NULL,   -- FK ke orders (dibuat setelah tabel orders)
  order_item_id    UUID NOT NULL,   -- FK ke order_items
  product_id       UUID REFERENCES products(id) ON DELETE SET NULL,
  merchant_id      UUID REFERENCES merchants(id) ON DELETE SET NULL,

  gross_amount     DECIMAL(15,2) NOT NULL,    -- nilai item
  rate_applied     DECIMAL(5,4) NOT NULL,     -- rate yang dipakai
  amount           DECIMAL(15,2) NOT NULL,    -- komisi = gross × rate
  status           commission_status NOT NULL DEFAULT 'pending',

  click_id         UUID REFERENCES affiliate_clicks(id),

  approved_at      TIMESTAMPTZ,
  approved_by      UUID REFERENCES users(id),
  rejected_at      TIMESTAMPTZ,
  rejected_reason  TEXT,
  paid_at          TIMESTAMPTZ,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE affiliate_campaigns (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id  UUID NOT NULL REFERENCES affiliate_members(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  utm_source    VARCHAR(100),
  utm_medium    VARCHAR(100),
  utm_campaign  VARCHAR(100),
  is_active     BOOLEAN DEFAULT TRUE,
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- SECTION 8: CART & SESSIONS
-- =============================================================================

CREATE TABLE carts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id  VARCHAR(100),    -- untuk guest checkout
  ref_code    VARCHAR(20),     -- affiliate ref code dari cookie
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cart_items (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id            UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  merchant_id        UUID NOT NULL REFERENCES merchants(id),
  product_id         UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity           INTEGER NOT NULL DEFAULT 1,
  note               TEXT,    -- catatan ke merchant
  is_selected        BOOLEAN DEFAULT TRUE,
  added_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cart_id, product_variant_id)
);


-- =============================================================================
-- SECTION 9: ORDERS
-- =============================================================================

CREATE TABLE orders (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number          VARCHAR(30) NOT NULL UNIQUE,   -- ORD-20240101-XXXXX
  buyer_id              UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  -- Affiliate attribution
  affiliate_id          UUID REFERENCES affiliate_members(id) ON DELETE SET NULL,
  affiliate_ref_code    VARCHAR(20),
  affiliate_click_id    UUID REFERENCES affiliate_clicks(id) ON DELETE SET NULL,

  -- Alamat pengiriman (snapshot saat order dibuat)
  shipping_name         VARCHAR(150) NOT NULL,
  shipping_phone        VARCHAR(20) NOT NULL,
  shipping_address      TEXT NOT NULL,
  shipping_district     VARCHAR(100),
  shipping_city         VARCHAR(100) NOT NULL,
  shipping_province     VARCHAR(100) NOT NULL,
  shipping_postal_code  VARCHAR(10) NOT NULL,
  shipping_country_code CHAR(2) DEFAULT 'ID',
  shipping_latitude     DECIMAL(10,8),
  shipping_longitude    DECIMAL(11,8),

  -- Finansial
  subtotal              DECIMAL(15,2) NOT NULL,
  total_shipping_cost   DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_platform_fee    DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_commission      DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_discount        DECIMAL(15,2) NOT NULL DEFAULT 0,
  grand_total           DECIMAL(15,2) NOT NULL,
  total_weight          DECIMAL(10,3) DEFAULT 0,    -- gram

  -- Status
  status                order_status NOT NULL DEFAULT 'pending_payment',
  notes                 TEXT,   -- catatan dari pembeli (umum)
  cancel_reason         TEXT,
  cancelled_by          UUID REFERENCES users(id),
  cancelled_at          TIMESTAMPTZ,

  -- Timestamps status penting
  paid_at               TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  auto_complete_at      TIMESTAMPTZ,    -- deadline auto-complete

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_merchant_groups (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  merchant_id     UUID NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,

  status          merchant_order_status NOT NULL DEFAULT 'new',

  -- Finansial per merchant group
  subtotal        DECIMAL(15,2) NOT NULL,
  shipping_cost   DECIMAL(15,2) NOT NULL DEFAULT 0,
  is_insurance_applied BOOLEAN DEFAULT FALSE,
  insurance_fee   DECIMAL(15,2) DEFAULT 0,
  platform_fee    DECIMAL(15,2) NOT NULL DEFAULT 0,
  commission      DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount        DECIMAL(15,2) NOT NULL DEFAULT 0,
  merchant_payout DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- Pengiriman
  courier_code    VARCHAR(50),
  service_code    VARCHAR(50),
  service_name    VARCHAR(100),
  tracking_number VARCHAR(100),
  shipping_label_url TEXT,
  estimated_delivery_at TIMESTAMPTZ,
  shipped_at      TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,

  buyer_note      TEXT,
  merchant_note   TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(order_id, merchant_id)
);

CREATE TABLE order_items (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id              UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  order_merchant_group_id UUID NOT NULL REFERENCES order_merchant_groups(id) ON DELETE RESTRICT,
  merchant_id           UUID NOT NULL REFERENCES merchants(id),
  product_id            UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_variant_id    UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,

  -- Snapshot produk saat order dibuat
  product_name          VARCHAR(255) NOT NULL,
  variant_name          VARCHAR(255),
  sku                   VARCHAR(100),
  product_image_url     TEXT,

  -- Finansial per item
  quantity              INTEGER NOT NULL,
  unit_price            DECIMAL(15,2) NOT NULL,
  subtotal              DECIMAL(15,2) NOT NULL,  -- unit_price × quantity
  platform_fee_rate     DECIMAL(5,4) NOT NULL DEFAULT 0,
  platform_fee_amount   DECIMAL(15,2) NOT NULL DEFAULT 0,
  commission_rate       DECIMAL(5,4) NOT NULL DEFAULT 0,
  commission_amount     DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_amount       DECIMAL(15,2) NOT NULL DEFAULT 0,
  merchant_amount       DECIMAL(15,2) NOT NULL,   -- yang masuk ke merchant

  weight                DECIMAL(10,3),   -- gram

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_status_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID REFERENCES orders(id) ON DELETE CASCADE,
  group_id      UUID REFERENCES order_merchant_groups(id) ON DELETE CASCADE,
  status        VARCHAR(50) NOT NULL,
  note          TEXT,
  changed_by    UUID REFERENCES users(id),
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shipping_trackings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id      UUID NOT NULL REFERENCES order_merchant_groups(id) ON DELETE CASCADE,
  courier_code  VARCHAR(50) NOT NULL,
  tracking_number VARCHAR(100) NOT NULL,
  status        shipping_status NOT NULL DEFAULT 'pending',
  raw_data      JSONB,   -- response dari kurir API
  last_checked_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shipping_tracking_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipping_id     UUID NOT NULL REFERENCES shipping_trackings(id) ON DELETE CASCADE,
  status          VARCHAR(100) NOT NULL,
  description     TEXT,
  location        VARCHAR(255),
  event_time      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- SECTION 10: PAYMENTS
-- =============================================================================

CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id            UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
  payment_method      payment_method_type NOT NULL,
  status              payment_status NOT NULL DEFAULT 'unpaid',

  -- Payment gateway data
  gateway             VARCHAR(50) NOT NULL,    -- midtrans, xendit
  gateway_transaction_id TEXT,
  gateway_order_id    TEXT,
  gateway_response    JSONB,
  payment_url         TEXT,                    -- untuk redirect ke halaman bayar
  qr_code_url         TEXT,                    -- untuk QRIS

  -- Virtual Account
  va_number           VARCHAR(50),
  va_bank_code        VARCHAR(20),

  -- Amounts
  amount              DECIMAL(15,2) NOT NULL,
  fee_gateway         DECIMAL(15,2) DEFAULT 0,
  amount_received     DECIMAL(15,2),

  expires_at          TIMESTAMPTZ,
  paid_at             TIMESTAMPTZ,
  failed_at           TIMESTAMPTZ,
  failure_reason      TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_webhooks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gateway         VARCHAR(50) NOT NULL,
  event_type      VARCHAR(100),
  payload         JSONB NOT NULL,
  signature       TEXT,
  is_verified     BOOLEAN DEFAULT FALSE,
  is_processed    BOOLEAN DEFAULT FALSE,
  processed_at    TIMESTAMPTZ,
  error_message   TEXT,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refunds (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  group_id            UUID REFERENCES order_merchant_groups(id),
  payment_id          UUID NOT NULL REFERENCES payments(id),
  requested_by        UUID NOT NULL REFERENCES users(id),
  reason              TEXT NOT NULL,
  evidence_urls       TEXT[],

  amount              DECIMAL(15,2) NOT NULL,
  refund_method       VARCHAR(50),   -- same_method, wallet, bank_transfer
  status              VARCHAR(50) NOT NULL DEFAULT 'pending',

  -- Gateway refund
  gateway_refund_id   TEXT,
  gateway_response    JSONB,

  approved_by         UUID REFERENCES users(id),
  approved_at         TIMESTAMPTZ,
  rejected_by         UUID REFERENCES users(id),
  rejected_at         TIMESTAMPTZ,
  rejection_reason    TEXT,
  processed_at        TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- SECTION 11: WALLETS & PAYOUTS
-- =============================================================================

CREATE TABLE wallets (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id          UUID NOT NULL,
  owner_type        wallet_owner_type NOT NULL,
  balance           DECIMAL(15,2) NOT NULL DEFAULT 0,    -- siap dicairkan
  pending_balance   DECIMAL(15,2) NOT NULL DEFAULT 0,    -- menunggu hold selesai
  total_earned      DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_withdrawn   DECIMAL(15,2) NOT NULL DEFAULT 0,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_id, owner_type)
);

CREATE TABLE wallet_transactions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id         UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  type              wallet_transaction_type NOT NULL,
  amount            DECIMAL(15,2) NOT NULL,   -- positif = kredit, negatif = debit
  balance_before    DECIMAL(15,2) NOT NULL,
  balance_after     DECIMAL(15,2) NOT NULL,
  pending_before    DECIMAL(15,2),
  pending_after     DECIMAL(15,2),
  description       TEXT,
  reference_id      UUID,
  reference_type    VARCHAR(50),   -- order, commission, withdrawal, refund
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE withdrawal_requests (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id           UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  requester_id        UUID NOT NULL REFERENCES users(id),
  requester_type      wallet_owner_type NOT NULL,

  amount              DECIMAL(15,2) NOT NULL,
  fee                 DECIMAL(15,2) NOT NULL DEFAULT 0,
  net_amount          DECIMAL(15,2) NOT NULL,    -- amount - fee

  bank_name           VARCHAR(100) NOT NULL,
  bank_account_number TEXT NOT NULL,   -- snapshot saat request
  bank_account_name   VARCHAR(200) NOT NULL,
  bank_branch         VARCHAR(100),

  status              withdrawal_status NOT NULL DEFAULT 'pending',
  notes               TEXT,

  -- Admin processing
  reviewed_by         UUID REFERENCES users(id),
  reviewed_at         TIMESTAMPTZ,
  admin_note          TEXT,

  -- Disbursement
  disbursement_id     TEXT,    -- dari API disbursement gateway
  disbursement_reference TEXT,
  disbursement_response JSONB,
  processed_at        TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- SECTION 12: REVIEWS & RATINGS
-- =============================================================================

CREATE TABLE reviews (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id           UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  order_item_id      UUID NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
  buyer_id           UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  merchant_id        UUID NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  product_id         UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_variant_id UUID REFERENCES product_variants(id),

  rating             SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title              VARCHAR(255),
  body               TEXT,
  image_urls         TEXT[],
  video_url          TEXT,

  status             review_status NOT NULL DEFAULT 'pending',
  is_anonymous       BOOLEAN DEFAULT FALSE,

  -- Balasan merchant
  merchant_reply     TEXT,
  merchant_replied_at TIMESTAMPTZ,

  -- Moderasi
  moderated_by       UUID REFERENCES users(id),
  moderated_at       TIMESTAMPTZ,
  moderation_note    TEXT,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(order_item_id, buyer_id)
);

CREATE TABLE review_helpfulness (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id  UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);


-- =============================================================================
-- SECTION 13: VOUCHERS & PROMOTIONS
-- =============================================================================

CREATE TABLE vouchers (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                  VARCHAR(50) NOT NULL UNIQUE,
  name                  VARCHAR(255) NOT NULL,
  description           TEXT,
  scope                 voucher_scope NOT NULL DEFAULT 'platform',
  discount_type         discount_type NOT NULL,
  discount_value        DECIMAL(15,2) NOT NULL,  -- persen atau nominal
  max_discount_amount   DECIMAL(15,2),   -- cap untuk tipe percentage
  min_order_amount      DECIMAL(15,2) DEFAULT 0,
  max_uses              INTEGER,         -- NULL = unlimited
  max_uses_per_user     INTEGER DEFAULT 1,
  uses_count            INTEGER DEFAULT 0,

  -- Scope target
  merchant_id           UUID REFERENCES merchants(id) ON DELETE CASCADE,
  category_ids          INTEGER[],
  product_ids           UUID[],

  is_active             BOOLEAN DEFAULT TRUE,
  is_public             BOOLEAN DEFAULT TRUE,    -- FALSE = private/invite only
  starts_at             TIMESTAMPTZ NOT NULL,
  ends_at               TIMESTAMPTZ NOT NULL,

  created_by            UUID REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE order_vouchers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  voucher_id      UUID NOT NULL REFERENCES vouchers(id),
  voucher_code    VARCHAR(50) NOT NULL,
  discount_amount DECIMAL(15,2) NOT NULL,
  applied_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE flash_sales (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255) NOT NULL,
  banner_url      TEXT,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE flash_sale_items (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flash_sale_id      UUID NOT NULL REFERENCES flash_sales(id) ON DELETE CASCADE,
  product_variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  flash_price        DECIMAL(15,2) NOT NULL,
  quota              INTEGER NOT NULL,
  sold_count         INTEGER DEFAULT 0,
  is_active          BOOLEAN DEFAULT TRUE,
  UNIQUE(flash_sale_id, product_variant_id)
);


-- =============================================================================
-- SECTION 14: DISPUTES
-- =============================================================================

CREATE TABLE disputes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  group_id            UUID REFERENCES order_merchant_groups(id),
  opened_by           UUID NOT NULL REFERENCES users(id),
  against_type        VARCHAR(20) NOT NULL,   -- merchant, buyer
  against_id          UUID NOT NULL REFERENCES users(id),
  reason              VARCHAR(100) NOT NULL,
  description         TEXT NOT NULL,
  evidence_urls       TEXT[],
  status              dispute_status NOT NULL DEFAULT 'open',
  resolution          TEXT,
  resolved_by         UUID REFERENCES users(id),
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE dispute_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispute_id  UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES users(id),
  message     TEXT NOT NULL,
  attachment_urls TEXT[],
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- SECTION 15: NOTIFICATIONS
-- =============================================================================

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            notification_type NOT NULL,
  channel         notification_channel NOT NULL DEFAULT 'in_app',
  title           VARCHAR(255) NOT NULL,
  body            TEXT NOT NULL,
  data            JSONB,   -- extra payload (misal order_id, link, dll)
  image_url       TEXT,
  action_url      TEXT,    -- deep link atau URL
  is_read         BOOLEAN DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  failed_at       TIMESTAMPTZ,
  failure_reason  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_templates (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type        notification_type NOT NULL,
  channel     notification_channel NOT NULL,
  subject     VARCHAR(255),   -- untuk email
  body        TEXT NOT NULL,  -- template dengan placeholder {{variable}}
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(type, channel)
);


-- =============================================================================
-- SECTION 16: PLATFORM SETTINGS & CONFIGURATION
-- =============================================================================

CREATE TABLE platform_settings (
  id          SERIAL PRIMARY KEY,
  key         VARCHAR(100) NOT NULL UNIQUE,
  value       TEXT NOT NULL,
  type        VARCHAR(20) NOT NULL DEFAULT 'string',  -- string, number, boolean, json
  description TEXT,
  is_public   BOOLEAN DEFAULT FALSE,   -- apakah bisa diakses dari frontend
  updated_by  UUID REFERENCES users(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Data awal platform settings
INSERT INTO platform_settings (key, value, type, description, is_public) VALUES
  ('platform_name',              'Platform Kami',   'string',  'Nama platform',                       TRUE),
  ('platform_fee_rate',          '0.05',            'number',  'Platform fee default (5%)',            FALSE),
  ('affiliate_cookie_days',      '30',              'number',  'Durasi cookie affiliate (hari)',        FALSE),
  ('order_auto_complete_days',   '7',               'number',  'Auto-complete order setelah diterima', FALSE),
  ('commission_hold_days',       '7',               'number',  'Hold komisi sebelum approved',         FALSE),
  ('min_withdrawal_merchant',    '100000',          'number',  'Minimal withdrawal merchant',          FALSE),
  ('min_withdrawal_affiliate',   '100000',          'number',  'Minimal withdrawal affiliate',         FALSE),
  ('max_product_images',         '10',              'number',  'Maks gambar per produk',               TRUE),
  ('max_cart_items',             '50',              'number',  'Maks item di keranjang',               TRUE),
  ('payment_gateway',            'midtrans',        'string',  'Payment gateway utama',                FALSE),
  ('maintenance_mode',           'false',           'boolean', 'Mode maintenance',                     TRUE),
  ('registration_open',          'true',            'boolean', 'Registrasi merchant dibuka',           TRUE);

CREATE TABLE commission_rules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  merchant_id     UUID REFERENCES merchants(id) ON DELETE CASCADE,   -- NULL = semua merchant
  category_id     INTEGER REFERENCES categories(id) ON DELETE CASCADE, -- NULL = semua kategori
  product_id      UUID REFERENCES products(id) ON DELETE CASCADE,    -- NULL = semua produk
  platform_fee_rate DECIMAL(5,4) NOT NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  priority        INTEGER DEFAULT 0,   -- semakin tinggi, semakin prioritas
  valid_from      TIMESTAMPTZ,
  valid_until     TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE banners (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           VARCHAR(255),
  image_url       TEXT NOT NULL,
  mobile_image_url TEXT,
  link_url        TEXT,
  position        VARCHAR(50) NOT NULL DEFAULT 'home_main',   -- home_main, home_sub, category, dll
  sort_order      INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE contents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type        content_type NOT NULL,
  key         VARCHAR(100) NOT NULL UNIQUE,
  title       VARCHAR(255),
  body        TEXT,
  data        JSONB,
  is_active   BOOLEAN DEFAULT TRUE,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- SECTION 17: AUDIT & LOGS
-- =============================================================================

CREATE TABLE admin_activity_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id      UUID NOT NULL REFERENCES users(id),
  action        log_action NOT NULL,
  entity_type   VARCHAR(50) NOT NULL,    -- merchant, product, user, order, dll
  entity_id     UUID,
  description   TEXT NOT NULL,
  before_data   JSONB,
  after_data    JSONB,
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE system_logs (
  id          BIGSERIAL PRIMARY KEY,
  level       VARCHAR(10) NOT NULL,    -- info, warn, error, debug
  service     VARCHAR(50),
  message     TEXT NOT NULL,
  context     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);



-- =============================================================================
-- SECTION 18: SEARCH & ANALYTICS
-- =============================================================================

CREATE TABLE search_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id  VARCHAR(100),
  keyword     TEXT NOT NULL,
  filters     JSONB,
  results_count INTEGER,
  clicked_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  ip_address  INET,
  searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_recommendations (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id           UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  recommended_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  score                DECIMAL(5,4) DEFAULT 0,
  reason               VARCHAR(50),   -- frequently_bought_together, similar_category, trending
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, recommended_product_id)
);

CREATE TABLE platform_revenue_daily (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date            DATE NOT NULL UNIQUE,
  total_gmv       DECIMAL(15,2) DEFAULT 0,
  total_orders    INTEGER DEFAULT 0,
  total_platform_fee DECIMAL(15,2) DEFAULT 0,
  total_commission DECIMAL(15,2) DEFAULT 0,
  total_merchant_payout DECIMAL(15,2) DEFAULT 0,
  total_new_users INTEGER DEFAULT 0,
  total_new_merchants INTEGER DEFAULT 0,
  total_new_affiliates INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- SECTION 19: FOREIGN KEY YANG DITUNDA (circular dependency)
-- =============================================================================

-- affiliate_commissions ke orders dan order_items (dibuat setelah kedua tabel ada)
ALTER TABLE affiliate_commissions
  ADD CONSTRAINT fk_commission_order
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_commission_order_item
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE RESTRICT;

-- affiliate_clicks ke orders
ALTER TABLE affiliate_clicks
  ADD CONSTRAINT fk_click_order
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;


-- =============================================================================
-- SECTION 20: INDEXES (PERFORMANCE)
-- =============================================================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role_status ON users(role, status);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

-- Merchants
CREATE INDEX idx_merchants_user_id ON merchants(user_id);
CREATE INDEX idx_merchants_status ON merchants(status);
CREATE INDEX idx_merchants_slug ON merchants(slug);
CREATE INDEX idx_merchants_city ON merchants(city_id);

-- Products
CREATE INDEX idx_products_merchant ON products(merchant_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_deleted ON products(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_featured ON products(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
CREATE INDEX idx_products_description_fts ON products USING GIN (to_tsvector('indonesian', name || ' ' || COALESCE(description, '')));

-- Product Variants
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(sku);
CREATE INDEX idx_variants_active ON product_variants(is_active) WHERE is_active = TRUE;

-- Orders
CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_affiliate ON orders(affiliate_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_paid_at ON orders(paid_at);
CREATE INDEX idx_orders_ref_code ON orders(affiliate_ref_code);

-- Order Items
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_merchant ON order_items(merchant_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_order_items_group ON order_items(order_merchant_group_id);

-- Order Merchant Groups
CREATE INDEX idx_omg_order ON order_merchant_groups(order_id);
CREATE INDEX idx_omg_merchant ON order_merchant_groups(merchant_id);
CREATE INDEX idx_omg_status ON order_merchant_groups(status);

-- Payments
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_gateway_id ON payments(gateway_transaction_id);

-- Affiliate
CREATE INDEX idx_affiliate_user ON affiliate_members(user_id);
CREATE INDEX idx_affiliate_ref_code ON affiliate_members(ref_code);
CREATE INDEX idx_affiliate_tier ON affiliate_members(membership_tier_id);
CREATE INDEX idx_affiliate_status ON affiliate_members(status);

CREATE INDEX idx_aff_links_affiliate ON affiliate_links(affiliate_id);
CREATE INDEX idx_aff_links_short_code ON affiliate_links(short_code);
CREATE INDEX idx_aff_links_product ON affiliate_links(product_id);

CREATE INDEX idx_aff_clicks_link ON affiliate_clicks(affiliate_link_id);
CREATE INDEX idx_aff_clicks_clicked_at ON affiliate_clicks(clicked_at);
CREATE INDEX idx_aff_clicks_converted ON affiliate_clicks(is_converted);

CREATE INDEX idx_commissions_affiliate ON affiliate_commissions(affiliate_id);
CREATE INDEX idx_commissions_order ON affiliate_commissions(order_id);
CREATE INDEX idx_commissions_status ON affiliate_commissions(status);
CREATE INDEX idx_commissions_created ON affiliate_commissions(created_at);

-- Wallets
CREATE INDEX idx_wallets_owner ON wallets(owner_id, owner_type);
CREATE INDEX idx_wallet_tx_wallet ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_tx_type ON wallet_transactions(type);
CREATE INDEX idx_wallet_tx_created ON wallet_transactions(created_at DESC);

-- Withdrawals
CREATE INDEX idx_withdrawals_wallet ON withdrawal_requests(wallet_id);
CREATE INDEX idx_withdrawals_requester ON withdrawal_requests(requester_id);
CREATE INDEX idx_withdrawals_status ON withdrawal_requests(status);

-- Reviews
CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_merchant ON reviews(merchant_id);
CREATE INDEX idx_reviews_buyer ON reviews(buyer_id);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Cart
CREATE INDEX idx_cart_user ON carts(user_id);
CREATE INDEX idx_cart_session ON carts(session_id);
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);

-- Admin logs
CREATE INDEX idx_admin_logs_admin ON admin_activity_logs(admin_id);
CREATE INDEX idx_admin_logs_entity ON admin_activity_logs(entity_type, entity_id);
CREATE INDEX idx_admin_logs_created ON admin_activity_logs(created_at DESC);

-- Vouchers
CREATE INDEX idx_vouchers_code ON vouchers(code);
CREATE INDEX idx_vouchers_active ON vouchers(is_active, starts_at, ends_at);

-- Stock movements
CREATE INDEX idx_stock_movements_variant ON stock_movements(product_variant_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(type);

-- Refunds
CREATE INDEX idx_refunds_order ON refunds(order_id);
CREATE INDEX idx_refunds_status ON refunds(status);

-- Search
CREATE INDEX idx_search_logs_keyword ON search_logs(keyword);
CREATE INDEX idx_search_logs_created ON search_logs(searched_at DESC);


-- =============================================================================
-- SECTION 21: FUNCTIONS & TRIGGERS
-- =============================================================================

-- Function: auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger updated_at ke semua tabel yang relevan
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'users', 'user_profiles', 'user_addresses',
    'merchants', 'products', 'product_variants',
    'orders', 'order_merchant_groups',
    'payments', 'refunds',
    'wallets', 'withdrawal_requests',
    'affiliate_members', 'affiliate_links', 'affiliate_commissions',
    'reviews', 'disputes', 'vouchers',
    'membership_tiers', 'notification_templates',
    'commission_rules', 'affiliate_tier_commissions',
    'shipping_trackings', 'contents'
  ])
  LOOP
    EXECUTE format('
      CREATE TRIGGER trg_updated_at_%I
      BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    ', t, t);
  END LOOP;
END;
$$;

-- Function: generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  seq    TEXT;
  random_suffix TEXT;
BEGIN
  prefix := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-';
  random_suffix := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
  RETURN prefix || random_suffix;
END;
$$ LANGUAGE plpgsql;

-- Function: generate unique ref_code untuk affiliate
CREATE OR REPLACE FUNCTION generate_ref_code(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_code := UPPER(SUBSTRING(ENCODE(DIGEST(p_user_id::TEXT || NOW()::TEXT || RANDOM()::TEXT, 'sha256'), 'hex') FROM 1 FOR 8));
    SELECT EXISTS(SELECT 1 FROM affiliate_members WHERE ref_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Function: generate unique short_code untuk affiliate link
CREATE OR REPLACE FUNCTION generate_short_code()
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  i INTEGER;
BEGIN
  LOOP
    v_code := '';
    FOR i IN 1..7 LOOP
      v_code := v_code || SUBSTR(chars, FLOOR(RANDOM() * LENGTH(chars) + 1)::INTEGER, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM affiliate_links WHERE short_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger: auto-generate order_number saat insert
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_order_number
BEFORE INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION set_order_number();

-- Trigger: update merchant stats setelah produk berubah
CREATE OR REPLACE FUNCTION update_merchant_product_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE merchants SET total_products = total_products + 1 WHERE id = NEW.merchant_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'active' AND NEW.status = 'active' THEN
      UPDATE merchants SET total_products = total_products + 1 WHERE id = NEW.merchant_id;
    ELSIF OLD.status = 'active' AND NEW.status != 'active' THEN
      UPDATE merchants SET total_products = GREATEST(0, total_products - 1) WHERE id = NEW.merchant_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
    UPDATE merchants SET total_products = GREATEST(0, total_products - 1) WHERE id = OLD.merchant_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_merchant_product_count
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION update_merchant_product_count();

-- Trigger: update stok saat order_items dibuat
CREATE OR REPLACE FUNCTION deduct_stock_on_order()
RETURNS TRIGGER AS $$
DECLARE
  v_stock_before INTEGER;
BEGIN
  SELECT stock INTO v_stock_before FROM product_variants WHERE id = NEW.product_variant_id FOR UPDATE;

  UPDATE product_variants
  SET stock = stock - NEW.quantity
  WHERE id = NEW.product_variant_id;

  INSERT INTO stock_movements (
    product_variant_id, type, quantity,
    stock_before, stock_after, reference_id, reference_type
  ) VALUES (
    NEW.product_variant_id, 'sale', -NEW.quantity,
    v_stock_before, v_stock_before - NEW.quantity,
    NEW.order_id, 'order'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deduct_stock
AFTER INSERT ON order_items
FOR EACH ROW EXECUTE FUNCTION deduct_stock_on_order();

-- Trigger: update rata-rata rating produk setelah review
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET
    average_rating = (
      SELECT AVG(rating)::DECIMAL(3,2)
      FROM reviews
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
        AND status = 'approved'
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM reviews
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
        AND status = 'approved'
    )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_product_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_product_rating();

-- Function: hitung komisi affiliate yang berlaku untuk sebuah transaksi
CREATE OR REPLACE FUNCTION get_affiliate_commission_rate(
  p_affiliate_id UUID,
  p_category_id  INTEGER,
  p_merchant_id  UUID
) RETURNS DECIMAL(5,4) AS $$
DECLARE
  v_rate DECIMAL(5,4);
  v_tier_id INTEGER;
BEGIN
  SELECT membership_tier_id INTO v_tier_id FROM affiliate_members WHERE id = p_affiliate_id;

  -- Prioritas 1: override spesifik merchant untuk tier ini
  SELECT commission_rate INTO v_rate
  FROM affiliate_tier_commissions
  WHERE membership_tier_id = v_tier_id
    AND merchant_id = p_merchant_id
    AND category_id IS NULL
    AND is_active = TRUE
    AND (valid_from IS NULL OR valid_from <= NOW())
    AND (valid_until IS NULL OR valid_until >= NOW())
  LIMIT 1;
  IF v_rate IS NOT NULL THEN RETURN v_rate; END IF;

  -- Prioritas 2: override kategori untuk tier ini
  SELECT commission_rate INTO v_rate
  FROM affiliate_tier_commissions
  WHERE membership_tier_id = v_tier_id
    AND category_id = p_category_id
    AND merchant_id IS NULL
    AND is_active = TRUE
    AND (valid_from IS NULL OR valid_from <= NOW())
    AND (valid_until IS NULL OR valid_until >= NOW())
  LIMIT 1;
  IF v_rate IS NOT NULL THEN RETURN v_rate; END IF;

  -- Prioritas 3: base rate dari tier
  SELECT base_commission_rate INTO v_rate
  FROM membership_tiers mt
  JOIN affiliate_members am ON am.membership_tier_id = mt.id
  WHERE am.id = p_affiliate_id;

  RETURN COALESCE(v_rate, 0.03);  -- fallback 3%
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- SECTION 22: VIEWS (untuk kemudahan reporting)
-- =============================================================================

-- View: ringkasan order dengan info pembeli dan affiliate
CREATE VIEW v_order_summary AS
SELECT
  o.id,
  o.order_number,
  o.status,
  o.grand_total,
  o.total_commission,
  o.total_platform_fee,
  o.created_at,
  o.paid_at,
  o.completed_at,
  up.full_name AS buyer_name,
  u.email AS buyer_email,
  am.ref_code AS affiliate_ref_code,
  up2.full_name AS affiliate_name
FROM orders o
JOIN users u ON u.id = o.buyer_id
JOIN user_profiles up ON up.user_id = u.id
LEFT JOIN affiliate_members am ON am.id = o.affiliate_id
LEFT JOIN users u2 ON u2.id = am.user_id
LEFT JOIN user_profiles up2 ON up2.user_id = u2.id;

-- View: ringkasan komisi affiliate
CREATE VIEW v_affiliate_commission_summary AS
SELECT
  ac.id,
  ac.affiliate_id,
  up.full_name AS affiliate_name,
  am.ref_code,
  mt.name AS tier_name,
  ac.amount,
  ac.rate_applied,
  ac.status,
  ac.created_at,
  o.order_number,
  p.name AS product_name
FROM affiliate_commissions ac
JOIN affiliate_members am ON am.id = ac.affiliate_id
JOIN users u ON u.id = am.user_id
JOIN user_profiles up ON up.user_id = u.id
JOIN membership_tiers mt ON mt.id = am.membership_tier_id
JOIN orders o ON o.id = ac.order_id
LEFT JOIN products p ON p.id = ac.product_id;

-- View: dashboard merchant
CREATE VIEW v_merchant_dashboard AS
SELECT
  m.id AS merchant_id,
  m.shop_name,
  m.status,
  m.total_products,
  m.average_rating,
  w.balance AS wallet_balance,
  w.pending_balance AS wallet_pending,
  COUNT(DISTINCT o.id) FILTER (WHERE o.status NOT IN ('cancelled', 'refunded')) AS total_orders,
  SUM(omg.merchant_payout) FILTER (WHERE o.status = 'completed') AS total_revenue
FROM merchants m
LEFT JOIN wallets w ON w.owner_id = m.id AND w.owner_type = 'merchant'
LEFT JOIN order_merchant_groups omg ON omg.merchant_id = m.id
LEFT JOIN orders o ON o.id = omg.order_id
GROUP BY m.id, m.shop_name, m.status, m.total_products, m.average_rating, w.balance, w.pending_balance;

-- View: produk dengan info harga (ambil dari variant termurah)
CREATE VIEW v_product_listing AS
SELECT
  p.id,
  p.name,
  p.slug,
  p.status,
  p.average_rating,
  p.total_reviews,
  p.total_sold,
  c.name AS category_name,
  m.shop_name AS merchant_name,
  m.id AS merchant_id,
  MIN(pv.price) AS min_price,
  MAX(pv.price) AS max_price,
  SUM(pv.stock) AS total_stock,
  pi.url AS primary_image_url
FROM products p
JOIN categories c ON c.id = p.category_id
JOIN merchants m ON m.id = p.merchant_id
LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active = TRUE
LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = TRUE
WHERE p.deleted_at IS NULL AND p.status = 'active'
GROUP BY p.id, p.name, p.slug, p.status, p.average_rating, p.total_reviews,
         p.total_sold, c.name, m.shop_name, m.id, pi.url;


-- =============================================================================
-- SECTION 23: SEED DATA AWAL
-- =============================================================================

-- Negara
INSERT INTO countries (code, name, phone_code, currency) VALUES ('ID', 'Indonesia', '+62', 'IDR');

-- Membership Tiers
INSERT INTO membership_tiers (name, level, base_commission_rate, monthly_fee, yearly_fee, min_earnings_for_upgrade, commission_hold_days, cookie_duration_days, benefits, color_hex) VALUES
  ('Bronze',   1, 0.03, 0,      0,       NULL,         7,  30, '["Akses dasar affiliate", "Link tidak terbatas", "Laporan mingguan"]', '#CD7F32'),
  ('Silver',   2, 0.05, 50000,  500000,  5000000,      5,  30, '["Komisi 5%", "Prioritas support", "Laporan harian", "Bonus event"]', '#C0C0C0'),
  ('Gold',     3, 0.08, 150000, 1500000, 25000000,     3,  60, '["Komisi 8%", "Dedicated support", "Realtime analytics", "Exclusive deals", "Banner custom"]', '#FFD700'),
  ('Platinum', 4, 0.12, 300000, 3000000, 100000000,    1,  90, '["Komisi 12%", "Account manager", "Payout prioritas", "Akses API", "Co-marketing"]', '#E5E4E2');

-- Kategori utama
INSERT INTO categories (name, slug, commission_rate, sort_order, is_active, is_featured) VALUES
  ('Elektronik',          'elektronik',          0.03, 1,  TRUE, TRUE),
  ('Fashion Wanita',      'fashion-wanita',       0.07, 2,  TRUE, TRUE),
  ('Fashion Pria',        'fashion-pria',         0.07, 3,  TRUE, TRUE),
  ('Kesehatan & Kecantikan', 'kesehatan-kecantikan', 0.08, 4, TRUE, TRUE),
  ('Makanan & Minuman',   'makanan-minuman',      0.06, 5,  TRUE, TRUE),
  ('Rumah & Dapur',       'rumah-dapur',          0.06, 6,  TRUE, FALSE),
  ('Olahraga',            'olahraga',             0.06, 7,  TRUE, FALSE),
  ('Otomotif',            'otomotif',             0.04, 8,  TRUE, FALSE),
  ('Buku & Alat Tulis',   'buku-alat-tulis',      0.05, 9,  TRUE, FALSE),
  ('Mainan & Hobi',       'mainan-hobi',          0.07, 10, TRUE, FALSE),
  ('Ibu & Bayi',          'ibu-bayi',             0.07, 11, TRUE, FALSE),
  ('Properti & Industri', 'properti-industri',    0.03, 12, TRUE, FALSE);

-- Subcategori Elektronik
INSERT INTO categories (parent_id, name, slug, commission_rate, sort_order, is_active) VALUES
  (1, 'Smartphone',     'smartphone',      0.03, 1, TRUE),
  (1, 'Laptop',         'laptop',          0.03, 2, TRUE),
  (1, 'Headphone',      'headphone',       0.04, 3, TRUE),
  (1, 'Kamera',         'kamera',          0.03, 4, TRUE),
  (1, 'Aksesoris HP',   'aksesoris-hp',    0.06, 5, TRUE);

-- Attribute Groups
INSERT INTO attribute_groups (name) VALUES ('Ukuran'), ('Warna'), ('Material'), ('Berat'), ('Tipe');

-- Attributes - Ukuran
INSERT INTO attributes (attribute_group_id, name, sort_order) VALUES
  (1,'XS',1),(1,'S',2),(1,'M',3),(1,'L',4),(1,'XL',5),(1,'XXL',6),(1,'XXXL',7),
  (1,'36',8),(1,'37',9),(1,'38',10),(1,'39',11),(1,'40',12),(1,'41',13),(1,'42',14),(1,'43',15),(1,'44',16);

-- Attributes - Warna
INSERT INTO attributes (attribute_group_id, name, sort_order) VALUES
  (2,'Hitam',1),(2,'Putih',2),(2,'Merah',3),(2,'Biru',4),(2,'Hijau',5),(2,'Kuning',6),(2,'Orange',7),(2,'Pink',8),(2,'Ungu',9),(2,'Abu-abu',10),(2,'Coklat',11),(2,'Navy',12),(2,'Cream',13);

-- Superadmin user
INSERT INTO users (email, phone, password_hash, role, status, email_verified_at) VALUES
  ('admin@platform.com', '+628100000001', crypt('Admin@12345', gen_salt('bf', 12)), 'superadmin', 'active', NOW());

INSERT INTO user_profiles (user_id, full_name) VALUES
  ((SELECT id FROM users WHERE email = 'admin@platform.com'), 'Super Administrator');

-- =============================================================================
-- SCHEMA SELESAI
-- =============================================================================

-- Total: 70 tabel + 15 indexes per tabel utama + triggers + functions + views + seed data
-- Versi: 1.0.0
-- Kompatibel dengan: PostgreSQL 15+