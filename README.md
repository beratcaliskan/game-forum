# 🎮 Oyun Forum - Modern Gaming Community Platform

Gelişmiş özellikler ve modern tasarımla donatılmış, tam fonksiyonel oyun topluluğu platformu. Next.js 15, React 19, TypeScript ve Supabase teknolojileri kullanılarak geliştirilmiş profesyonel forum uygulaması.

## 📋 İçindekiler

- [Özellikler](#özellikler)
- [Teknoloji Stack](#teknoloji-stack)
- [Proje Yapısı](#proje-yapısı)
- [Sayfa Detayları](#sayfa-detayları)
- [Admin Panel](#admin-panel)
- [Veritabanı](#veritabanı)
- [Kurulum](#kurulum)
- [Geliştirme](#geliştirme)
- [Önemli Bileşenler](#önemli-bileşenler)

## ✨ Özellikler

### 🔐 Kullanıcı Yönetimi
- Güvenli kullanıcı kayıt ve giriş sistemi
- Email doğrulama ile hesap aktivasyonu  
- Rol bazlı yetkilendirme (Admin, Moderator, User)
- Kullanıcı profil yönetimi ve özelleştirme
- Kullanıcı takip sistemi
- Gizlilik ayarları

### 💬 Forum Sistemi
- Kategori bazlı konu organizasyonu
- Markdown desteği ile zengin metin editörü
- Konu ve yorum beğeni sistemi
- Gelişmiş arama ve filtreleme
- Konu sabitleme ve kilitleme
- Responsive tasarım

### 👥 Sosyal Özellikler
- Kullanıcı profil sayfaları
- Takip/Takipçi sistemi
- Aktivite geçmişi
- İstatistik gösterimi

### 📊 Admin Panel
- Kapsamlı yönetim dashboard'u
- Kullanıcı yönetimi ve moderasyon
- İçerik moderasyonu
- Raporlama sistemi
- Kategori yönetimi
- Real-time istatistikler

### 🎨 UI/UX
- Modern dark theme tasarımı
- Gaming temalı neon efektler
- Tamamen responsive tasarım
- Smooth animasyonlar
- Accessibility desteği

## 🛠 Teknoloji Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - Modern React with latest features
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework

### Backend & Database
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Relational database
- **Row Level Security** - Database security

### Authentication & Security
- **Supabase Auth** - User authentication
- **JWT Tokens** - Secure session management
- **Role-based Access Control** - Permission system

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript** - Static typing

## 📁 Proje Yapısı

```
oyun-forum/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Ana sayfa
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Global styles
│   ├── not-found.tsx             # 404 sayfası
│   ├── admin/                    # Admin panel
│   │   ├── page.tsx              # Admin dashboard
│   │   ├── users/                # Kullanıcı yönetimi
│   │   ├── threads/              # Konu yönetimi
│   │   ├── reports/              # Rapor yönetimi
│   │   └── categories/           # Kategori yönetimi
│   ├── auth/                     # Authentication sayfaları
│   │   ├── login/                # Giriş sayfası
│   │   └── register/             # Kayıt sayfası
│   ├── forum/                    # Forum sayfaları
│   │   ├── page.tsx              # Forum ana sayfası
│   │   ├── new/                  # Yeni konu oluşturma
│   │   └── thread/[id]/          # Konu detay sayfası
│   ├── profile/                  # Profil sayfaları
│   │   ├── page.tsx              # Kendi profilim
│   │   └── [username]/           # Kullanıcı profilleri
│   ├── settings/                 # Ayarlar sayfaları
│   │   ├── page.tsx              # Ayarlar ana sayfa
│   │   ├── profile/              # Profil ayarları
│   │   ├── privacy/              # Gizlilik ayarları
│   │   ├── account/              # Hesap ayarları
│   │   ├── appearance/           # Görünüm ayarları
│   │   └── notifications/        # Bildirim ayarları
│   ├── incelemeler/              # İnceleme sayfaları
│   └── haberler/                 # Haber sayfaları
├── components/                   # Reusable React components
│   ├── Header.tsx                # Navigation header
│   ├── Footer.tsx                # Site footer
│   ├── FollowModal.tsx           # Takip modalı
│   ├── ReportModal.tsx           # Rapor modalı
│   └── ReportActionModal.tsx     # Rapor işlem modalı
├── lib/                          # Utility functions
│   ├── supabase.ts               # Supabase client & functions
│   └── auth.tsx                  # Authentication context
├── database.sql                  # Database schema
├── test_reports.sql              # Test data
└── ...config files
```

## 📖 Sayfa Detayları

### 🏠 Ana Sayfa (`/`)
- **Amaç**: Platform girişi ve genel bakış
- **Özellikler**:
  - Son konular ve popüler içerikler
  - İnceleme öne çıkanları
  - Kullanıcı istatistikleri
  - Call-to-action butonları
  - Responsive hero section

### 🎮 Forum (`/forum`)
- **Amaç**: Ana forum alanı ve konu listesi
- **Özellikler**:
  - Kategori bazlı konu filtreleme
  - Gelişmiş arama sistemi
  - Sıralama seçenekleri (yeni, popüler, trend)
  - Konu oluşturma butonu (authenticated users)
  - Sayfalama ve infinite scroll

### ✍️ Yeni Konu (`/forum/new`)
- **Amaç**: Yeni forum konusu oluşturma
- **Özellikler**:
  - Markdown destekli editör
  - Kategori seçimi
  - Karakter sayısı limitleri
  - Önizleme modu
  - Form validasyonu
  - Community guidelines

### 💬 Konu Detayı (`/forum/thread/[id]`)
- **Amaç**: Forum konusu ve yorumlarını görüntüleme
- **Özellikler**:
  - Konu içeriği ve meta bilgiler
  - Nested comment system
  - Beğeni/dislike sistemi
  - Yorum yazma ve düzenleme
  - Sahip/moderator özel işlemleri
  - Related topics

### 👤 Profil Sayfaları (`/profile`)
- **Kendi Profilim** (`/profile`):
  - Kişisel dashboard
  - Son aktiviteler
  - İstatistikler
  - Hızlı ayarlar

- **Kullanıcı Profilleri** (`/profile/[username]`):
  - Kullanıcı bilgileri ve avatarı
  - Aktivite geçmişi (konular, yorumlar)
  - İstatistikler (toplam katkı, beğeniler)
  - Takip et/takibi bırak butonu
  - Gizlilik ayarlarına göre içerik filtresi

### ⚙️ Ayarlar (`/settings`)
- **Ana Ayarlar** (`/settings`):
  - Ayar kategorileri genel bakış
  - Hızlı erişim linkleri

- **Profil Ayarları** (`/settings/profile`):
  - Avatar yükleme/değiştirme
  - Display name ve bio düzenleme
  - Sosyal medya linkleri

- **Gizlilik Ayarları** (`/settings/privacy`):
  - Profil görünürlük kontrolleri
  - Aktivite paylaşım ayarları
  - Takip/takipçi gizliliği

- **Hesap Ayarları** (`/settings/account`):
  - Email değiştirme
  - Şifre güncelleme
  - Hesap güvenlik ayarları

### 📰 İncelemeler (`/incelemeler`)
- **Amaç**: Oyun incelemeleri bölümü
- **Özellikler**:
  - İnceleme kartları
  - Rating sistemi
  - Kategori filtreleme
  - Yeni inceleme yazma

### 📺 Haberler (`/haberler`)
- **Amaç**: Gaming haberleri bölümü
- **Özellikler**:
  - Haber listesi
  - Tarih bazlı sıralama
  - Kaynak linkleri
  - Sosyal paylaşım

## 🛡 Admin Panel

### 📊 Dashboard (`/admin`)
- **Amaç**: Genel yönetim merkezi
- **Özellikler**:
  - Real-time istatistikler
  - Son aktiviteler
  - Hızlı işlem butonları
  - System health monitoring

### 👥 Kullanıcı Yönetimi (`/admin/users`)
- **Amaç**: Kullanıcı hesaplarını yönetme
- **Özellikler**:
  - Kullanıcı listesi ve profilleri
  - Rol atama (Admin/Moderator/User)
  - Ban/unban işlemleri
  - Arama ve filtreleme
  - Kullanıcı istatistikleri

### 📝 Konu Yönetimi (`/admin/threads`)
- **Amaç**: Forum konularını moderasyon
- **Özellikler**:
  - Konu listesi ve detayları
  - Pin/unpin işlemleri
  - Lock/unlock fonksiyonları
  - Konu silme
  - Kategori değiştirme
  - Moderasyon logları

### 🚨 Rapor Yönetimi (`/admin/reports`)
- **Amaç**: Kullanıcı raporlarını işleme
- **Özellikler**:
  - Rapor listesi ve detayları
  - Status management (pending/resolved/dismissed)
  - Moderator notları
  - Toplu işlemler
  - Rapor istatistikleri

### 📁 Kategori Yönetimi (`/admin/categories`)
- **Amaç**: Forum kategorilerini yönetme
- **Özellikler**:
  - Kategori oluşturma/düzenleme
  - Açıklama ve meta bilgi yönetimi
  - Kategori sıralaması
  - İstatistikler (konu sayısı)

## 🗃 Veritabanı

### Kullanılan Tablolar
- **users** - Kullanıcı hesap bilgileri
- **profiles** - Kullanıcı profil detayları
- **categories** - Forum kategorileri
- **threads** - Forum konuları
- **posts** - Forum yorumları
- **likes** - Yorum beğenileri
- **thread_likes** - Konu beğenileri
- **follows** - Kullanıcı takip sistemi
- **reports** - Moderasyon raporları
- **user_settings** - Kullanıcı ayarları

### Güvenlik
- Row Level Security (RLS) policies
- Rol bazlı erişim kontrolü
- JWT token validation
- SQL injection protection

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+
- npm veya yarn
- Supabase account

### Adımlar

1. **Repository'yi klonlayın:**
```bash
git clone [repository-url]
cd oyun-forum
```

2. **Dependencies'leri kurun:**
```bash
npm install
```

3. **Environment variables'ları ayarlayın:**
```bash
# .env.local dosyası oluşturun
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Veritabanını kurun:**
```sql
-- database.sql dosyasını Supabase'de çalıştırın
-- RLS policies'leri etkinleştirin
```

5. **Development server'ı başlatın:**
```bash
npm run dev
```

6. **Tarayıcınızda açın:**
```
http://localhost:3000
```

## 🔧 Geliştirme

### Available Scripts
```bash
npm run dev          # Development server (hot reload)
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint kontrolü
npm run type-check   # TypeScript kontrolü
```
