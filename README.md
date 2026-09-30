# Kumo Izakaya — tek sayfalık site

Build adımı gerektirmeyen statik site. `index.html`'i doğrudan tarayıcıda açabilir, ya da `.claude/serve.ps1` ile yerel bir sunucu başlatabilirsiniz.

## Dosyalar

```
index.html
css/tokens.css       renkler, tip ölçeği, boşluklar VE tüm fotoğraf referansları
css/base.css          reset, temel tipografi, erişilebilirlik
css/layout.css        bölüm layoutları (hero, menü, mekân, rezervasyon...)
css/components.css    nav, menü sekmeleri, form, mühür/motif SVG stilleri
js/main.js             menü sekmeleri, header kontrastı, dil, rezervasyon pop-up'ı
js/reserve.js          rezervasyon formu (bkz. "Rezervasyon sistemi")
js/i18n.js             TR/EN sözlüğü — dilin dokunulacağı tek dosya
js/hero-video.js       hero videosu: ilk scroll'da oynar, loop'a girer
assets/img/            gerçek fotoğraflar burada
assets/video/          hero.mp4 (masaüstü) ve hero-mobile.mp4 (telefon)
assets/icons/          favicon PNG'leri, apple-touch-icon, OG image
favicon.ico            sekme ikonu (çok boyutlu)
```

## Favicon ve OG image

Favicon, sitenin kendi 雲 mührüyle aynı gerçek fontla (Shippori Mincho) üretildi — bir görsel üretim modeline değil, gerçek font glyph'ine dayanıyor, böylece karakter garanti doğru. `favicon.ico` (16/32/48px) ve `assets/icons/apple-touch-icon.png` (180px) `index.html`'in `<head>`'ine bağlı.

OG image (`assets/icons/og-image.jpg`, 1200×630) sosyal medyada paylaşılınca (WhatsApp, Twitter/X, LinkedIn vb.) görünen kart görseli. `og:title` / `og:description` diğer meta etiketleri gibi `data-i18n-content` taşıyor, yani `js/i18n.js`'deki `meta-title`/`meta-desc` anahtarlarını günceller güncellemez otomatik değişiyor.

Alan adı belli olduğunda `<head>`'e bir `<meta property="og:url" content="https://...">` eklemek iyi olur — şu an atlandı çünkü barındırma adresi henüz belli değil.

## Hero videosu

Hero, tek ekran boyunda tam ekran bir videodur. Sayfa açılınca ilk kare durur; ziyaretçi **ilk kez kaydırınca** video oynamaya başlar ve sürekli loop'ta döner. Sayfa normal kaydırılır (`js/hero-video.js`). Dosyalar: `assets/video/hero.mp4` (masaüstü, 1280×720) ve `assets/video/hero-mobile.mp4` (telefon, dikey 608×1080 kırpma). Videoyu değiştirmek için aynı adlarla üzerine yazın.

Video siyah-beyaz gösterilir (CSS filtresi, `css/layout.css` → `.hero__video`). `prefers-reduced-motion` açık ziyaretçiler videoyu oynatmaz, tek bir sabit kare görür.

## Gerçek fotoğraf ekleme

Sitedeki her fotoğraf, `css/tokens.css` içindeki tek bir değişkenden besleniyor. `index.html` ya da diğer CSS dosyalarında hiçbir şeyi değiştirmenize gerek yok — yalnızca bu bloktaki satırı değiştirin:

```css
--img-chef:      url("../assets/img/kumo-chef.webp");
--img-dish-otsumami: url("../assets/img/kumo-dish-otsumami.webp");
--img-dish-robata:   url("../assets/img/kumo-dish-robata.webp");
--img-dish-sashimi:  url("../assets/img/kumo-dish-sashimi.webp");
--img-dish-kanmi:    url("../assets/img/kumo-dish-kanmi.webp");
--img-dish-sake:     url("../assets/img/kumo-dish-sake.webp");
--img-hall:      url("../assets/img/kumo-lounge.webp");
--img-corridor:  url("../assets/img/kumo-terrace.webp");
--img-private:   url("../assets/img/kumo-interior.webp");
```

**Şu anki durum:** Hero artık video (yukarıya bakın); şef, mekân galerisi (2 kare + 1 geniş kare) ve tüm menü kategorisi fotoğrafları (Otsumami/Sashimi/Robata/Kanmi/Sake) gerçek fotoğraflardan geliyor. Placeholder kalmadı.

Kullanılmayan eski kırmızı-akçaağaç serisi (`kumo-hall.jpg`, `kumo-corridor.jpg`, `kumo-bar.jpg`, `kumo-private.jpg`) repodan silindi — yerlerini `kumo-lounge.webp`, `kumo-terrace.webp`, `kumo-interior.webp` aldı.

Fotoğraf değiştirirken:

1. Dosyayı `assets/img/` içine koyun, örn. `assets/img/kumo-hero.jpg`.
2. `tokens.css`'te ilgili satırı `--img-hero: url("../assets/img/kumo-hero.jpg");` olarak değiştirin.
3. Kaydedin, sayfayı yenileyin.

Önerilen fotoğraf oranları:
- `kumo-chef.jpg` — dikey, yaklaşık 4:5
- menü kategori fotoğrafları — dikey, yaklaşık 4:5

Her `role="img"` öğesinin `data-i18n-aria-label` değeri, o fotoğrafın gerçekte ne gösterdiğini anlatır (`js/i18n.js` içinde). Fotoğrafı değiştirdiğinizde, ekran okuyucu kullanıcıları için bu açıklamayı da güncelleyin.

## Dil (TR/EN)

Tüm çevrilebilir metin `index.html` içinde `data-i18n="anahtar"` (veya `data-i18n-aria-label`, `data-i18n-content`) taşır. Gerçek TR ve EN metinleri tek bir dosyada, `js/i18n.js`'de tutulur. İçeriği düzenlemek için:

1. `js/i18n.js`'de ilgili anahtarı bulun.
2. `tr` ve/veya `en` değerini güncelleyin.
3. HTML'e dokunmanıza gerek yok — anahtar aynı kaldığı sürece otomatik uygulanır.

Yeni bir metin eklerseniz: HTML'de öğeye `data-i18n="yeni-anahtar"` verin ve `js/i18n.js`'ye `"yeni-anahtar": { tr: "...", en: "..." }` satırını ekleyin.

Sayfa varsayılan olarak Türkçe açılır. `?lang=en` ile doğrudan İngilizce açılabilir. Ziyaretçinin son seçimi tarayıcıda hatırlanır (localStorage; gizli sekmede veya engellenmişse sorunsuz TR'ye düşer).

## İçerik

Menü, fiyatlar, adres, saatler, şef adı ve biyografisi **yer tutucu** içeriktir — hepsi `js/i18n.js` içinde düz metin olarak durur, kolayca değiştirilebilir. Yayına almadan önce gerçek bilgilerle değiştirin.

## Rezervasyon sistemi

Rezervasyon artık gerçek: kapasite kontrollü, anında onaylanan, e-posta/Telegram bildirimli ve yönetim panelli. Site yine statik; arka uç Supabase'de (Frankfurt, proje `qcvcvbugvbpxyimeonuf`).

```
Tarayıcı (index.html · iptal.html · admin.html)
   │ fetch
   ▼
Supabase Edge Function "booking"            Postgres (Europe/Istanbul saatiyle)
  /availability ── rpc ─►  get_availability()   ← doluluk, PII döndürmez
  /reserve      ── rpc ─►  create_reservation() ← alan başına kilitli, kapasite atomik
  /cancel       ── rpc ─►  cancel_reservation_by_token()
  /admin        (Supabase Auth JWT + admin_users kontrolü)
  /reminders    ◄─ pg_cron (15 dk'da bir, Vault'taki sırla)
      ├─► Resend        müşteri + restoran e-postası
      ├─► Telegram Bot  personel bildirimi
      └─► WhatsApp API  (WHATSAPP_* secret'ları girilince açılır)
```

Tarayıcı tablolara **doğrudan erişemez** (`anon` rolünde hiçbir yetki yok). Tüm yazma işlemleri Edge Function → service role üzerinden yapılır; yönetim paneli ise yalnızca `admin_users` içindeki hesaplarla RLS üzerinden okur.

### Kurallar (varsayılan — hepsi panelden **Ayarlar**'dan değişir)

| | |
|---|---|
| Salon / özel oda kapasitesi | 30 / 8 kişi (birbirinden bağımsız) |
| Oturma süresi | 2 saat; başlangıçlar 30 dakikada bir |
| Saatler | Salı–Cumartesi 18:00–22:00 (son oturuş); Pazar, Pazartesi kapalı |
| Önceden / ileri | en az 2 saat, en fazla 60 gün |
| Grup | 1–6 kişi salon **veya** özel oda · 7–8 kişi yalnızca özel oda (formda otomatik seçilir) · 9+ "bizi arayın" |
| Aynı telefon | aynı güne yalnızca 1 onaylı rezervasyon |
| Hız sınırı | IP başına saatte 5 rezervasyon denemesi |

Kapasite mantığının tamamı tek yerde: `public.slot_status()` (`supabase/migrations/`). Bir slot, oturma süresi boyunca her 30 dakikalık dilimde `dolu + kişi ≤ kapasite` ise uygundur; hem saat listesi hem de kayıt anındaki son kontrol aynı fonksiyonu kullanır.

### Dosyalar

```
supabase/migrations/…_reservations.sql   tablolar, RLS, kapasite fonksiyonları, cron işleri
supabase/functions/booking/index.ts      tüm API (availability · reserve · cancel · admin · reminders)
js/config.js       API adresi, Turnstile SITE key, admin girişi için publishable key (hepsi herkese açık değerler)
js/reserve.js      form: canlı saat listesi, doğrulama, gönderim (metinler js/i18n.js'de)
iptal.html + js/cancel.js   e-postadaki bağlantıyla iptal
kvkk.html          aydınlatma metni (TASLAK — yayından önce hukuki kontrol)
admin.html + js/admin.js + css/admin.css   yönetim paneli
js/page.js · css/pages.css   iptal/kvkk/admin sayfalarının ortak kabuğu
vercel.json        admin/iptal için noindex + güvenlik başlıkları
```

### Kurulum: sizin girmeniz gereken gizli anahtarlar

Edge Function'ın gizli anahtarları **Supabase Dashboard → Edge Functions → Secrets** bölümüne girilir (koda/repoya asla yazılmaz). Hiçbiri girilmese bile rezervasyon çalışır; ilgili bildirim kanalı sessizce atlanır.

| Secret | Nereden | Ne işe yarar |
|---|---|---|
| `RESEND_API_KEY` | resend.com → API Keys | e-postalar (onay, hatırlatma, iptal, restoran bildirimi) |
| `RESTAURANT_EMAIL` | kendi adresiniz | yeni rezervasyon/iptal bildirimi (panelde Ayarlar'dan da girilebilir) |
| `MAIL_FROM` | alan adı doğrulanınca, örn. `Kumo Izakaya <rezervasyon@alanadi.com>` | gönderen adresi. Boşsa `onboarding@resend.dev` (Resend **test modu: yalnızca kendi hesap adresinize** gönderir) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Telegram'da @BotFather → `/newbot`; botu personel grubuna ekleyip gruba bir mesaj yazın, sonra `https://api.telegram.org/bot<TOKEN>/getUpdates` içindeki `chat.id` | personele anlık mesaj |
| `TURNSTILE_SECRET` | Cloudflare → Turnstile → widget ekle (hostname: Vercel alan adınız + `localhost`) | spam koruması. **Site key**'i `js/config.js` → `turnstileSiteKey`'e yazın (şu an Cloudflare'in herkese açık test anahtarı var) |
| `CRON_SECRET` | SQL Editor'da: `select decrypted_secret from vault.decrypted_secrets where name='cron_secret';` çıkan değeri aynen girin | 24 saat hatırlatma job'unun kimlik doğrulaması |
| `SITE_URL` | sitenin adresi, örn. `https://kumo-izakaya.vercel.app` | e-postalardaki iptal bağlantısının kökü (yoksa isteğin geldiği adres kullanılır) |
| `ALLOWED_ORIGINS` (opsiyonel) | virgülle ayrılmış ek adresler | CORS. `localhost` ve `kumo-izakaya*.vercel.app` zaten izinli |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_TO`, `WHATSAPP_TEMPLATE` | Meta Business → WhatsApp Cloud API; gövdesinde tek `{{1}}` parametresi olan, onaylı bir şablon | WhatsApp bildirimi (Meta onayı gerekir; şimdilik kapalı) |

**Yönetici hesabı** (bunu siz yaparsınız, şifreyi kimseyle paylaşmayın):
1. Supabase → Authentication → Users → **Add user** (e-posta + şifre, "Auto Confirm" işaretli).
2. SQL Editor'da: `insert into admin_users (user_id) select id from auth.users where email = 'sizin@adresiniz';`
3. `…/admin.html` adresinden giriş yapın.

### Alan adı gelince

1. Resend'de alan adını doğrulayın (DNS kayıtları) → `MAIL_FROM` secret'ını güncelleyin. Bunun ardından e-postalar gerçek müşterilere gider.
2. Turnstile widget'ına yeni hostname'i ekleyin; `SITE_URL` ve (gerekirse) `ALLOWED_ORIGINS` secret'larını güncelleyin.
3. `robots.txt`, `sitemap.xml`, `<link rel="canonical">` ve `og:url` adreslerini güncelleyin.

### Bilinen sınırlar

- Yayına almadan önce `kvkk.html` taslağı hukukçuya gösterilmeli; firma unvanı/adres doldurulmalı. Kayıtlar tarihinden 12 ay sonra otomatik silinir (cron).
- Tarih/saat dönüşümü Türkiye'nin sabit UTC+3 saatine göre yapılır (yaz saati uygulaması yok).
- Personel bildirimi (Telegram/WhatsApp/e-posta) ve müşteri e-postaları en iyi çabayla gönderilir: gönderim başarısız olursa rezervasyon yine de kaydedilir, hata Edge Function loglarına düşer.
- Hatırlatma yalnızca 24 saatten önce alınmış rezervasyonlar için gider (son dakika rezervasyonuna hatırlatma anlamsız).

## Palet

Renk paleti kül grisi ve neredeyse-beyaz kağıt arasında geçiş yapar (`--sumi`, `--washi`), tek bir sıcak vurgu olan pirinç/altın (`--kin`) ile. Önceki kırmızı lake/akçaağaç vurgusu (`--momiji`) kaldırıldı; aynı değişken adı korundu ama artık nötr bir kül grisi taşıyor, böylece onu kullanan yapısal öğeleri (aktif sekme çizgisi, rezervasyon butonu, checkbox) tek tek değiştirmek gerekmedi.

## Scroll animasyonu

Sayfa aşağı kaydırıldıkça bölüm başlıkları, mekân fotoğrafları ve omakase adımları hafifçe belirerek girer (Zuma referansı). `js/main.js` içindeki `IntersectionObserver` bloğu bunu yönetir; `prefers-reduced-motion` açık olan ziyaretçilerde ve JavaScript kapalıyken içerik doğrudan görünür durumda kalır.

## Tarayıcı desteği

CSS custom properties, `:focus-visible`, `aspect-ratio` ve `URLSearchParams` kullanır — güncel Chrome, Safari, Firefox ve Edge'de sorunsuz çalışır.

## Yerel önizleme

```powershell
powershell -ExecutionPolicy Bypass -File .claude/serve.ps1 -Port 8431
```

ardından `http://localhost:8431/` adresini açın.
