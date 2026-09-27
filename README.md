# Kumo Izakaya — tek sayfalık site

Build adımı gerektirmeyen statik site. `index.html`'i doğrudan tarayıcıda açabilir, ya da `.claude/serve.ps1` ile yerel bir sunucu başlatabilirsiniz.

## Dosyalar

```
index.html
css/tokens.css       renkler, tip ölçeği, boşluklar VE tüm fotoğraf referansları
css/base.css          reset, temel tipografi, erişilebilirlik
css/layout.css        bölüm layoutları (hero, menü, mekân, rezervasyon...)
css/components.css    nav, menü sekmeleri, form, mühür/motif SVG stilleri
js/main.js             menü sekmeleri, header kontrastı, form doğrulama
js/i18n.js             TR/EN sözlüğü — dilin dokunulacağı tek dosya
assets/img/            gerçek fotoğraflar burada
assets/icons/          favicon PNG'leri, apple-touch-icon, OG image
favicon.ico            sekme ikonu (çok boyutlu)
```

## Favicon ve OG image

Favicon, sitenin kendi 雲 mührüyle aynı gerçek fontla (Shippori Mincho) üretildi — bir görsel üretim modeline değil, gerçek font glyph'ine dayanıyor, böylece karakter garanti doğru. `favicon.ico` (16/32/48px) ve `assets/icons/apple-touch-icon.png` (180px) `index.html`'in `<head>`'ine bağlı.

OG image (`assets/icons/og-image.jpg`, 1200×630) sosyal medyada paylaşılınca (WhatsApp, Twitter/X, LinkedIn vb.) görünen kart görseli. `og:title` / `og:description` diğer meta etiketleri gibi `data-i18n-content` taşıyor, yani `js/i18n.js`'deki `meta-title`/`meta-desc` anahtarlarını günceller güncellemez otomatik değişiyor.

Alan adı belli olduğunda `<head>`'e bir `<meta property="og:url" content="https://...">` eklemek iyi olur — şu an atlandı çünkü barındırma adresi henüz belli değil.

## Gerçek fotoğraf ekleme

Sitedeki her fotoğraf, `css/tokens.css` içindeki tek bir değişkenden besleniyor. `index.html` ya da diğer CSS dosyalarında hiçbir şeyi değiştirmenize gerek yok — yalnızca bu bloktaki satırı değiştirin:

```css
--img-hero:      url("../assets/img/kumo-hero.webp");
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

**Şu anki durum:** Hero, şef, mekân galerisi (2 kare + 1 geniş kare) ve tüm menü kategorisi fotoğrafları (Otsumami/Sashimi/Robata/Kanmi/Sake) gerçek fotoğraflardan geliyor. Placeholder kalmadı.

Kullanılmayan eski kırmızı-akçaağaç serisi (`kumo-hall.jpg`, `kumo-corridor.jpg`, `kumo-bar.jpg`, `kumo-private.jpg`) repodan silindi — yerlerini `kumo-lounge.webp`, `kumo-terrace.webp`, `kumo-interior.webp` aldı.

Fotoğraf değiştirirken:

1. Dosyayı `assets/img/` içine koyun, örn. `assets/img/kumo-hero.jpg`.
2. `tokens.css`'te ilgili satırı `--img-hero: url("../assets/img/kumo-hero.jpg");` olarak değiştirin.
3. Kaydedin, sayfayı yenileyin.

Önerilen fotoğraf oranları:
- `kumo-hero.jpg` — geniş, siyah-beyaza dönüştürüleceği için kontrastlı bir kare (bıçak, ateş, doku gibi bir yakın plan iyi çalışır)
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

## Rezervasyon formu

Form artık sayfanın içinde durmuyor — "Masa ayırt" butonuna (nav'da veya Rezervasyon bölümündeki karta) tıklayınca bir **pop-up (`<dialog>`)** içinde açılıyor. "Talep gönder" formu doğrular (alan bazlı, blur anında + gönderimde) ve pop-up içinde bir onay ekranı gösterir; **hiçbir yere gerçekten gönderim yapmaz**. Gerçek bir rezervasyon servisine veya e-posta uç noktasına bağlamak için `js/main.js` içindeki `form.addEventListener("submit", …)` bloğu düzenlenecek yerdir.

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
