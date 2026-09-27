/* ==========================================================================
   KUMO IZAKAYA — TR / EN dictionary
   Every entry mirrors a data-i18n / data-i18n-aria-label / data-i18n-content
   key in index.html. TR values match the HTML's own default text, so
   switching back to TR after EN is just another lookup, not a reload.
   Values may contain simple static HTML (e.g. <br>) and are applied with
   innerHTML — safe here because every value is authored in this file,
   never user input.
   ========================================================================== */

window.KUMO_I18N = {
  "meta-title": {
    tr: "Kumo Izakaya — Beşiktaş'ta İzakaya ve Omakase",
    en: "Kumo Izakaya — Izakaya & Omakase in Beşiktaş, Istanbul"
  },
  "meta-desc": {
    tr: "Kumo Izakaya, İstanbul Beşiktaş'ta ocak ateşi ve mevsimin balığı üzerine kurulu bir izakaya. Omakase, robata ve sake eşleşmeleri — masanızı ayırtın.",
    en: "Kumo Izakaya is an izakaya in Beşiktaş, Istanbul, built on coal fire and the season's fish. Omakase, robata, and sake pairings — reserve your table."
  },
  "skip-link": { tr: "İçeriğe geç", en: "Skip to content" },

  "nav-story": { tr: "Hikâye", en: "Story" },
  "nav-menu": { tr: "Menü", en: "Menu" },
  "nav-omakase": { tr: "Omakase", en: "Omakase" },
  "nav-venue": { tr: "Mekân", en: "Venue" },
  "nav-chef": { tr: "Şef", en: "Chef" },
  "nav-contact": { tr: "İletişim", en: "Contact" },
  "nav-reserve": { tr: "Masa ayırt", en: "Reserve a table" },

  "hero-photo-alt": {
    tr: "Karanlık bir masanın üzerine sarkan kiraz çiçeği dalları, siyah-beyaz çekim",
    en: "Cherry blossom branches hanging low over a dark table, in black and white"
  },
  "hero-sub": {
    tr: "Ateşin üstünde, bulutun altında bir sofra.",
    en: "A table beneath the cloud, above the fire."
  },

  "story-eyebrow": { tr: "Anlayış", en: "Philosophy" },
  "story-intro": {
    tr: "Kumo Izakaya, İstanbul Beşiktaş'ta ocak ateşinde hazırlanan yemeklerle hizmet veren bir izakaya ve omakase restoranıdır.",
    en: "Kumo Izakaya is an izakaya and omakase restaurant in Beşiktaş, Istanbul, serving dishes cooked over live coals."
  },
  "story-h": {
    tr: "Kumo, gökyüzünün en az sabit şekli demektir.",
    en: "Kumo means the sky's least fixed shape."
  },
  "story-p1": {
    tr: "Bulut hiçbir zaman aynı formda kalmaz; rüzgârla, ısıyla, ışıkla değişir. Izakaya kültürü de böyledir — tek bir sabit sunum değil, akşamın seyrine göre şekillenen bir sofra.",
    en: "A cloud never keeps one shape; it changes with wind, heat, light. Izakaya cooking works the same way — not one fixed presentation, but a table that takes its form from how the evening runs."
  },
  "story-p2": {
    tr: "Kumo'da masaya gelen her tabak, ocaktaki ateşin o anki haliyle, sabah pazarından gelen balıkla ve o akşamın konuklarıyla şekillenir.",
    en: "At Kumo, every plate is shaped by the fire as it is that moment, the fish that came from the morning market, and the guests at the table that night."
  },
  "story-pull": {
    tr: "Sabit olan tek şey, ocağın sıcaklığıdır.",
    en: "The only constant is the heat of the coals."
  },

  "menu-eyebrow": { tr: "Sofra", en: "The Table" },
  "menu-h": { tr: "Ocağın etrafında, kategori kategori", en: "Around the coals, category by category" },
  "menu-sub": { tr: "Fiyatlar Türk Lirası cinsindendir.", en: "Prices are in Turkish Lira." },

  "menu-photo-otsumami-alt": { tr: "Tsukune: ızgara tavuk köftesi ve çiğ yumurta sarısı", en: "Tsukune: grilled chicken meatballs with a raw egg yolk" },
  "menu-photo-sashimi-alt": { tr: "Otoro nigiri, iki adet, koyu bir tabakta", en: "Otoro nigiri, two pieces, on a dark plate" },
  "menu-photo-robata-alt": { tr: "Wagyu kushiyaki, şiş üzerinde ızgara edilmiş", en: "Wagyu kushiyaki, grilled on skewers" },
  "menu-photo-kanmi-alt": { tr: "Matcha tiramisu, matcha ve kakao tozuyla", en: "Matcha tiramisu, dusted with matcha and cocoa" },
  "menu-photo-sake-alt": { tr: "Bir kadeh sake, koyu bir zeminde", en: "A glass of sake, on a dark surface" },

  "cat-otsumami": { tr: "Otsumami", en: "Otsumami" },
  "cat-sashimi": { tr: "Sashimi & Nigiri", en: "Sashimi & Nigiri" },
  "cat-robata": { tr: "Robata", en: "Robata" },
  "cat-kanmi": { tr: "Kanmi", en: "Kanmi" },
  "cat-sake": { tr: "Sake", en: "Sake" },

  "cat-otsumami-desc": { tr: "Sake'nin yanına, ocak ısınırken.", en: "Alongside the sake, while the coals catch." },
  "cat-sashimi-desc": { tr: "Günün balığı, sabah pazarından.", en: "The day's fish, from the morning market." },
  "cat-robata-desc": { tr: "Binchotan kömüründe, doğrudan ateşin üstünde.", en: "Over binchotan coals, direct to the fire." },
  "cat-kanmi-desc": { tr: "Ocağın sonunda, hafif bir kapanış.", en: "A light close, after the coals." },
  "cat-sake-desc": { tr: "Sommelier eşliğinde, tabağa göre.", en: "Paired by our sommelier, dish by dish." },

  "dish-tsukune": { tr: "Tsukune", en: "Tsukune" },
  "dish-tsukune-desc": { tr: "Tavuk köftesi, tare sos, yumurta sarısı.", en: "Grilled chicken meatball, tare glaze, egg yolk." },
  "dish-edamame": { tr: "Edamame", en: "Edamame" },
  "dish-edamame-desc": { tr: "Deniz tuzu ile buharda.", en: "Steamed, sea salt." },
  "dish-agedashi": { tr: "Agedashi tofu", en: "Agedashi tofu" },
  "dish-agedashi-desc": { tr: "Kızarmış tofu, dashi suyu, bonito talaşı.", en: "Fried tofu, dashi broth, bonito flakes." },

  "dish-otoro": { tr: "Otoro nigiri (2 adet)", en: "Otoro nigiri (2 pieces)" },
  "dish-otoro-desc": { tr: "Ton balığının en yağlı kısmı, el yapımı.", en: "The fattiest cut of tuna, hand-formed." },
  "dish-hamachi": { tr: "Hamachi sashimi", en: "Hamachi sashimi" },
  "dish-hamachi-desc": { tr: "Yemyeşil zencefil ve shiso ile.", en: "With fresh ginger and shiso." },
  "dish-uni": { tr: "Uni gunkan", en: "Uni gunkan" },
  "dish-uni-desc": { tr: "Deniz kestanesi, nori, sushi pirinci.", en: "Sea urchin, nori, sushi rice." },

  "dish-wagyu": { tr: "Wagyu kushiyaki", en: "Wagyu kushiyaki" },
  "dish-wagyu-desc": { tr: "Şiş üzerinde, kaba deniz tuzu ile.", en: "Skewered, finished with coarse sea salt." },
  "dish-unagi": { tr: "Tütsülenmiş unagi", en: "Smoked unagi" },
  "dish-unagi-desc": { tr: "Tatlı soya glazürü, sansho biberi.", en: "Sweet soy glaze, sansho pepper." },
  "dish-nasu": { tr: "Közlenmiş patlıcan", en: "Charred eggplant" },
  "dish-nasu-desc": { tr: "Miso sos, susam.", en: "Miso dressing, sesame." },

  "dish-matcha": { tr: "Matcha tiramisu", en: "Matcha tiramisu" },
  "dish-matcha-desc": { tr: "Mascarpone, matcha, kakao.", en: "Mascarpone, matcha, cocoa." },
  "dish-kinako": { tr: "Kinako dondurma", en: "Kinako ice cream" },
  "dish-kinako-desc": { tr: "Kavrulmuş soya unu, kara pekmez.", en: "Roasted soy flour, black molasses." },

  "dish-junmai": { tr: "Junmai Daiginjo (kadeh)", en: "Junmai Daiginjo (glass)" },
  "dish-junmai-desc": { tr: "Yumuşak, meyvemsi, soğuk servis.", en: "Soft, fruit-forward, served cold." },
  "dish-tasting": { tr: "Sommelier seçimi (3 kadeh)", en: "Sommelier selection (3 glasses)" },
  "dish-tasting-desc": { tr: "Akşamın menüsüne göre eşleştirilir.", en: "Paired to that evening's menu." },

  "omakase-eyebrow": { tr: "Şefin masası", en: "Chef's Table" },
  "omakase-h": { tr: "Omakase, beş perde", en: "Omakase, five courses" },
  "omakase-sub": {
    tr: "Şefin o günkü seçimine bırakılan, mevsime göre değişen bir sıra.",
    en: "A sequence left to the chef's judgment that day, and to the season."
  },

  "kaiseki-1-name": { tr: "Sakizuke", en: "Sakizuke" },
  "kaiseki-1-desc": { tr: "Mevsimin ilk lokması, ocak henüz ısınmadan.", en: "The season's first bite, before the coals are hot." },
  "kaiseki-2-name": { tr: "Sashimi seçkisi", en: "Sashimi selection" },
  "kaiseki-2-desc": { tr: "Sabah pazarından üç balık, şefin tercihiyle.", en: "Three fish from the morning market, the chef's choice." },
  "kaiseki-3-name": { tr: "Robata ateşinden", en: "From the robata fire" },
  "kaiseki-3-desc": { tr: "Binchotan kömüründe, teker teker közlenir.", en: "Grilled one piece at a time over binchotan." },
  "kaiseki-4-name": { tr: "Nigiri serisi", en: "Nigiri series" },
  "kaiseki-4-desc": { tr: "Şefin elinde, tek tek, sırayla.", en: "Formed by hand, one at a time, in sequence." },
  "kaiseki-5-name": { tr: "Kanmi kapanışı", en: "Kanmi to close" },
  "kaiseki-5-desc": { tr: "Hafif bir tatlı, ocağın sönmesiyle.", en: "A light dessert, as the coals go out." },
  "omakase-price-note": { tr: "/ kişi · sake eşleşmesiyle +₺1.400", en: "/ person · +₺1,400 with sake pairing" },

  "venue-eyebrow": { tr: "Mekân", en: "The Room" },
  "venue-h": { tr: "Taşın, dumanın ve külün arasında", en: "Between stone, smoke and ash" },
  "venue-hall-alt": {
    tr: "Kiraz çiçeği dallarının altında, ahşap kafesli bir loca",
    en: "A wood-latticed booth beneath hanging cherry blossom branches"
  },
  "venue-corridor-alt": {
    tr: "Şehir manzaralı, fener ışıklı bir masa",
    en: "A lantern-lit table with a view of the city skyline"
  },
  "venue-private-alt": {
    tr: "Ahşap tavanlı, taş zeminli ana salon",
    en: "The main room, wood-ceilinged with a stone floor"
  },

  "chef-eyebrow": { tr: "Şef", en: "Chef" },
  "chef-photo-alt": {
    tr: "Şef, asma yaprak desenli bir tavan enstalasyonunun altında, tezgahta bir tabağı tamamlıyor",
    en: "The chef finishing a plate at the counter, beneath a hanging leaf-form ceiling installation"
  },
  "chef-name": { tr: "Ren Takahashi", en: "Ren Takahashi" },
  "chef-p1": {
    tr: "Ren, Osaka'daki bir robata ocağında ustalaştı; ateşin sıcaklığını gözle değil elle ölçmeyi orada öğrendi. Kumo'da her akşam aynı kurala bağlı kalıyor: balık ne kadar tazeyse, üzerindeki iş o kadar az olmalı.",
    en: "Ren trained at a robata grill in Osaka, where he learned to judge the fire's heat by hand rather than by eye. At Kumo he keeps one rule every night: the fresher the fish, the less should be done to it."
  },
  "chef-p2": { tr: "On iki yıldır mutfakta, son beşi kendi ocağının başında.", en: "Twelve years in kitchens, the last five at his own grill." },
  "chef-role": { tr: "Executive Chef", en: "Executive Chef" },

  "reserve-eyebrow": { tr: "Rezervasyon", en: "Reservations" },
  "reserve-h": { tr: "Bir masa ayırtın", en: "Reserve a table" },
  "reserve-cta-body": { tr: "Ocak her akşam ısınıyor. Bir masa bırakalım.", en: "The coals catch every evening. Let's hold you a table." },
  "dialog-close": { tr: "Kapat", en: "Close" },
  "reserve-address-label": { tr: "Adres", en: "Address" },
  "reserve-address-value": { tr: "Bulut Sokak No. 7<br>Beşiktaş, İstanbul", en: "7 Bulut Sokak<br>Beşiktaş, Istanbul" },
  "reserve-map-link": { tr: "Haritada aç", en: "Open in Maps" },
  "new-tab-hint": { tr: " (yeni sekmede açılır)", en: " (opens in a new tab)" },
  "reserve-map-title": { tr: "Kumo Izakaya harita", en: "Kumo Izakaya map" },
  "reserve-contact-label": { tr: "İletişim", en: "Contact" },
  "reserve-hours-label": { tr: "Çalışma Saatleri", en: "Hours" },
  "reserve-hours-days1": { tr: "Salı – Cumartesi", en: "Tuesday – Saturday" },
  "reserve-hours-days2": { tr: "Pazar, Pazartesi", en: "Sunday, Monday" },
  "reserve-hours-closed": { tr: "Kapalı", en: "Closed" },

  "form-error-title": { tr: "Bir sorun var", en: "There is a problem" },
  "form-date": { tr: "Tarih", en: "Date" },
  "form-date-error": { tr: "Lütfen bir tarih seçin.", en: "Choose a date." },
  "form-time": { tr: "Saat", en: "Time" },
  "form-time-error": { tr: "Lütfen bir saat seçin.", en: "Choose a time." },
  "form-select": { tr: "Seçin", en: "Select" },
  "form-party": { tr: "Kişi sayısı", en: "Party size" },
  "form-party-error": { tr: "Lütfen kişi sayısını seçin.", en: "Choose a party size." },
  "form-guests-1": { tr: "1 kişi", en: "1 guest" },
  "form-guests-2": { tr: "2 kişi", en: "2 guests" },
  "form-guests-3": { tr: "3 kişi", en: "3 guests" },
  "form-guests-4": { tr: "4 kişi", en: "4 guests" },
  "form-guests-5": { tr: "5 kişi", en: "5 guests" },
  "form-guests-6": { tr: "6 kişi", en: "6 guests" },
  "form-guests-more": { tr: "7 veya daha fazla (bizi arayın)", en: "7 or more (call us)" },
  "form-name": { tr: "Ad soyad", en: "Name" },
  "form-name-error": { tr: "Lütfen adınızı girin.", en: "Enter your name." },
  "form-phone": { tr: "Telefon", en: "Phone" },
  "form-phone-error": { tr: "Lütfen bir telefon numarası girin.", en: "Enter a phone number." },
  "form-email": { tr: "E-posta", en: "Email" },
  "form-email-error": { tr: "Lütfen geçerli bir e-posta girin.", en: "Enter a valid email address." },
  "form-optional": { tr: "(opsiyonel)", en: "(optional)" },
  "form-private": { tr: "Özel oda talep ediyorum", en: "I'd like the private room" },
  "form-note": { tr: "Not", en: "Note" },
  "form-submit": { tr: "Talep gönder", en: "Request table" },

  "confirm-title": { tr: "Talebiniz alındı", en: "Request received" },
  "confirm-body-1": { tr: "Sizin için not aldık:", en: "We've noted your table for" },
  "confirm-body-2": { tr: "Ekibimiz sizi arayarak onaylayacak.", en: "A member of our team will call to confirm." },
  "confirm-note": {
    tr: "Bu bir tasarım önizlemesidir — hiçbir talep gerçekten gönderilmedi.",
    en: "This is a design preview — no request was actually sent."
  },

  "footer-location": { tr: "İstanbul, Türkiye", en: "Istanbul, Turkey" },
  "footer-copyright": { tr: "© 2026 Kumo Izakaya. Tüm hakları saklıdır.", en: "© 2026 Kumo Izakaya. All rights reserved." }
};
