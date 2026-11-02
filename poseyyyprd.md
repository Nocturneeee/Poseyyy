# Product Requirements Document (PRD): Photobooth-io (Skybound Studio)

**Document Version:** 1.0.0  
**Status:** Approved / In Implementation  
**Product:** photobooth-io  
**Theme & Design System:** Sky Blue & White Minimalist (`Skybound Studio`)  
**Primary Platform:** Responsive Web (Desktop & Mobile Web)

---

## 1. Executive Summary & Vision

### 1.1 Product Vision
**photobooth-io** adalah platform photobooth virtual berbasis browser yang memungkinkan pengguna mengabadikan momen spontan secara instan, estetis, dan 100% gratis. Tanpa perlu mengunduh aplikasi, login akun, atau membayar koin, pengguna dapat memilih berbagai template strip foto populer, mengambil foto dengan webcam/kamera HP, menerapkan filter dan stiker, serta mengunduh hasil cetak berkualitas tinggi (300 DPI) tanpa watermark.

### 1.2 Key Differentiators
1. **100% Client-Side Privacy:** Seluruh proses pengambilan foto, penerapan filter, dan rendering canvas dilakukan langsung di memori browser (RAM). Foto pengguna **tidak pernah diunggah** ke cloud atau server eksternal.
2. **Zero Barrier to Entry:** Tanpa registrasi, tanpa login, tanpa instalasi aplikasi, dan bebas biaya selamanya.
3. **Studio Aesthetic & Presisi:** Template photo strip terinspirasi tren photobooth Korea/Y2K/Retro dengan format cetak standar industri (2x6 inch strip, 4x6 inch card).
4. **Performa Ringan:** Pemuatan kilat dengan arsitektur HTML5 Canvas dan WebRTC Camera API.

---

## 2. Target Audience & Personas

* **Gen Z & Millennial Socializers (Primer):** Mencari keseruan berfoto bersama teman, pasangan, atau solo dengan filter estetik untuk dibagikan ke Instagram Story, TikTok, atau dicetak fisik.
* **Event & Party Hosts (Sekunder):** Membutuhkan solusi photobooth virtual instan untuk acara ulang tahun, kumpul virtual, atau komunitas tanpa sewa alat mahal.
* **Content Creators & Digital Scrapbookers:** Mengoleksi photostrip digital bertanggal untuk dokumentasi jurnal estetik.

---

## 3. Brand Identity & Design System Specification

### 3.1 Visual Language
* **Konsep:** Bersih, ramah, playful namun rapi (*modern minimalist studio vibe*).
* **Warna Utama (Sky Blue):**
  * Primary Accent: `#0284c7` (Sky Blue 600) / `#0ea5e9` (Sky Blue 500)
  * Surface Background: `#faf8ff` ke `#f0f8ff` (Light Sky Tint)
  * Card Container: `#ffffff` dengan border halus `#e2e8f0` dan soft shadow `rgba(2, 132, 199, 0.06)`
  * Dark Studio Mode (Kamera): `#0b1329` hingga `#111827` untuk kontras maksimal saat viewfinder aktif.
* **Tipografi:** Plus Jakarta Sans / Nunito / Poppins (Sans-serif membulat, modern, mudah dibaca).
* **Bentuk & Sudut:** Sudut melengkung halus (*rounded corners* `16px` – `24px` pada card & container, `9999px` pill untuk buttons & badges).

---

## 4. Arsitektur Informasi & Cakupan Halaman

Sistem web photobooth-io terdiri dari 5 halaman inti yang terhubung secara seamless:

| No | Halaman | Tujuan Utama | Komponen Kunci |
|---|---|---|---|
| 1 | **Home / Landing Page** | Pengenalan produk, daya tarik visual, dan konversi cepat ke kamera. | Hero dengan floating photo-strip 3D mockup, 4 langkah cara kerja, grid fitur utama, galeri inspirasi pengguna, CTA banner bawah. |
| 2 | **Choose Layout** | Galeri pemilihan frame & layout strip foto sebelum pemotretan. | Filter pills (All, 3-Cut, 4-Cut, 2x2, Retro Film), search bar, kartu template interaktif dengan preview grid kosong, spesifikasi dimensi cetak. |
| 3 | **Camera Studio** | Ruang pengambilan gambar interaktif via webcam / kamera perangkat. | Top status bar (counter 0/4, switch camera, countdown 3s, image upload), widescreen camera viewfinder, mirror/flash toggle, shutter button, real-time filter dock. |
| 4 | **About & FAQ** | Edukasi filosofi produk, privasi client-side, dan pemecahan masalah teknis. | Split card: "Our Story" dengan 4 pilar fitur, dan Interactive Accordion FAQ (troubleshooting izin kamera, resolusi cetak, dukungan HP). |
| 5 | **Contact** | Sarana feedback, kolaborasi event/wedding, dan ide template baru. | Split view: Info kontak resmi (email, response time, medsos) + Form kirim pesan interaktif. |

---

## 5. Rincian Fungsionalitas & User Journey

### Flow Pengguna Inti:
`Home` $\rightarrow$ `Pilih Layout` $\rightarrow$ `Buka Studio Kamera` $\rightarrow$ `Ambil 3-4 Foto (Timer)` $\rightarrow$ `Pilih Filter & Frame` $\rightarrow$ `Download HD (PNG)`

### 5.1 Fitur Studio Kamera (Core Engine)
1. **WebRTC Video Stream:** Deteksi otomatis kamera internal/eksternal pengguna dengan dialog izin ramah pengguna.
2. **Countdown Shutter:** Hitungan mundur visual 3 detik per jepretan dengan flash screen effect (putih instan) untuk mensimulasikan flash kamera asli.
3. **Shot Progress Tracker:** Indikator dinamis pose (misal: 1/4, 2/4, 3/4, 4/4) yang menampilkan preview mini thumbnail di bilah samping.
4. **Filter Real-Time (CSS / Canvas):**
   * *Normal* (Natural clean)
   * *Sky Blue Soft* (Atmospheric cool tint)
   * *B&W Film* (Classic high-contrast mono)
   * *Warm Glow* (Golden hour aesthetic)
   * *Vintage Fade* (Nostalgia 90s grain)
   * *Cyberpunk* (Neon vivid)
   * *K-Pop Beauty* (Silky pastel glow)
5. **Mirror & Flip Mode:** Opsi cermin horizontal agar pengguna melihat pose natural sesuai cermin.

### 5.2 Fitur Export & Rendering
* Resolusi ekspor standar: 300 DPI siap cetak (format 2x6 inci atau 4x6 inci).
* Format unduhan: PNG lossless / JPEG tajam.
* Watermark-Free guarantee: Tidak ada watermark paksa yang menutupi foto kenangan pengguna.

---

## 6. Spesifikasi Non-Fungsional & Keamanan Data

1. **Privasi & Keamanan Data (Zero-Knowledge):**
   * Tidak ada API endpoint yang menerima file blob gambar atau video stream.
   * Seluruh kompilasi strip foto dieksekusi di HTML5 `<canvas>` browser client.
   * Data memori kamera otomatis ter-garbage collect saat tab ditutup atau di-refresh.
2. **Performa:**
   * First Contentful Paint (FCP) $\le 1.2$ detik pada jaringan 4G standar.
   * Frame rate kamera stabil pada 30-60 FPS (1080p stream).
3. **Kompatibilitas:**
   * Didukung penuh di Chrome, Safari (iOS & macOS), Edge, Firefox, dan browser in-app (Instagram / TikTok Webview).

---

## 7. Roadmap & Fitur Fase Berikutnya (Phase 2 & 3)

* **Fase 2 (Kustomisasi Lanjutan):**
  * Canvas Drag-and-Drop Stickers (bintang, pita, kacamata, doodle Y2K).
  * Color Picker untuk frame background (pastel solid, checkered pattern, gradient).
  * Custom text & date stamp aesthetic di kaki strip foto.
* **Fase 3 (Social & Sharing):**
  * Pembuatan GIF mini animasi 4-frame dari hasil jepretan.
  * Web Share API instan langsung ke WhatsApp dan Instagram Stories.
  * Mode kolaborasi Photobooth Event dengan QR Code sinkronisasi mobile.
