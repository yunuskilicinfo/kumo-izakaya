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

  "hero-scroll-hint": { tr: "Kaydır", en: "Scroll" },
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
  "form-time-first": { tr: "Önce tarih ve kişi sayısı seçin", en: "Choose a date and party size first" },
  "form-time-loading": { tr: "Uygun saatler yükleniyor…", en: "Loading available times…" },
  "form-time-closed": { tr: "Bu tarihte kapalıyız. Salı – Cumartesi arası bekleriz.", en: "We're closed that day. Join us Tuesday – Saturday." },
  "form-time-none": { tr: "Bu tarih için uygun saat kalmadı. Başka bir gün ya da alan deneyin.", en: "No times left for that date. Try another day or area." },
  "form-time-full": { tr: "dolu", en: "full" },
  "form-time-failed": { tr: "Saatler yüklenemedi. Tekrar deneyin ya da bizi arayın.", en: "Couldn't load times. Try again or call us." },
  "form-party": { tr: "Kişi sayısı", en: "Party size" },
  "form-party-error": { tr: "Lütfen kişi sayısını seçin.", en: "Choose a party size." },
  "form-guests-1": { tr: "1 kişi", en: "1 guest" },
  "form-guests-2": { tr: "2 kişi", en: "2 guests" },
  "form-guests-3": { tr: "3 kişi", en: "3 guests" },
  "form-guests-4": { tr: "4 kişi", en: "4 guests" },
  "form-guests-5": { tr: "5 kişi", en: "5 guests" },
  "form-guests-6": { tr: "6 kişi", en: "6 guests" },
  "form-guests-7": { tr: "7 kişi (özel oda)", en: "7 guests (private room)" },
  "form-guests-8": { tr: "8 kişi (özel oda)", en: "8 guests (private room)" },
  "form-guests-more": { tr: "9 veya daha fazla (bizi arayın)", en: "9 or more (call us)" },
  "form-party-call": { tr: "9 ve üzeri gruplar için lütfen bizi arayın:", en: "For groups of 9 or more, please call us:" },
  "form-party-private": { tr: "7–8 kişilik masalar özel odada ayrılır.", en: "Tables of 7–8 are held in the private room." },
  "form-name": { tr: "Ad soyad", en: "Name" },
  "form-name-error": { tr: "Lütfen adınızı girin.", en: "Enter your name." },
  "form-phone": { tr: "Telefon", en: "Phone" },
  "form-phone-error": { tr: "Lütfen geçerli bir telefon numarası girin.", en: "Enter a valid phone number." },
  "form-email": { tr: "E-posta", en: "Email" },
  "form-email-error": { tr: "Onay e-postası için geçerli bir adres girin.", en: "Enter a valid email address for your confirmation." },
  "form-optional": { tr: "(opsiyonel)", en: "(optional)" },
  "form-private": { tr: "Özel oda talep ediyorum", en: "I'd like the private room" },
  "form-note": { tr: "Not", en: "Note" },
  "form-consent": { tr: "Kişisel verilerimin rezervasyon amacıyla işlenmesini kabul ediyorum.", en: "I agree to my personal data being processed for this reservation." },
  "form-consent-link": { tr: "Aydınlatma Metni", en: "Privacy Notice" },
  "form-consent-error": { tr: "Devam etmek için onay vermeniz gerekiyor.", en: "Please give your consent to continue." },
  "form-submit": { tr: "Masayı ayırt", en: "Book table" },
  "form-submitting": { tr: "Gönderiliyor…", en: "Booking…" },

  "err-slot-taken": { tr: "Bu saat az önce doldu. Saat listesini yeniledik, lütfen başka bir saat seçin.", en: "That time was just taken. We've refreshed the list — please pick another." },
  "err-duplicate": { tr: "Bu telefonla o gün için zaten bir rezervasyonunuz var. Değiştirmek için bizi arayın.", en: "This phone number already has a booking that day. Call us to change it." },
  "err-rate": { tr: "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin ya da bizi arayın.", en: "Too many attempts. Please try again shortly or call us." },
  "err-captcha": { tr: "Güvenlik doğrulaması tamamlanamadı. Sayfayı yenileyip tekrar deneyin.", en: "Security check failed. Refresh the page and try again." },
  "err-network": { tr: "Bağlantı kurulamadı. Lütfen tekrar deneyin ya da bizi arayın.", en: "Couldn't connect. Please try again or call us." },
  "err-server": { tr: "Bir şeyler ters gitti. Lütfen tekrar deneyin ya da bizi arayın.", en: "Something went wrong. Please try again or call us." },

  "confirm-title": { tr: "Rezervasyonunuz onaylandı", en: "Reservation confirmed" },
  "confirm-body-1": { tr: "Masanız ayrıldı:", en: "Your table is held for" },
  "confirm-body-2": { tr: "Onay e-postası adresinize gönderildi.", en: "A confirmation email is on its way." },
  "confirm-code": { tr: "Rezervasyon kodu", en: "Booking code" },
  "confirm-note": {
    tr: "Planınız değişirse e-postadaki bağlantıdan iptal edebilirsiniz. E-posta gelmediyse spam klasörüne bakın.",
    en: "If your plans change, cancel from the link in the email. Not there? Check your spam folder."
  },

  "cancel-title": { tr: "Rezervasyonu iptal et", en: "Cancel reservation" },
  "cancel-loading": { tr: "Rezervasyon bulunuyor…", en: "Finding your reservation…" },
  "cancel-notfound": { tr: "Bu bağlantıyla eşleşen bir rezervasyon bulamadık. Bağlantı eksik ya da hatalı olabilir; bizi arayın.", en: "We couldn't find a reservation for this link. It may be incomplete — please call us." },
  "cancel-when": { tr: "Tarih ve saat", en: "Date & time" },
  "cancel-party": { tr: "Kişi sayısı", en: "Party size" },
  "cancel-area": { tr: "Alan", en: "Area" },
  "cancel-area-hall": { tr: "Salon", en: "Main hall" },
  "cancel-area-private": { tr: "Özel oda", en: "Private room" },
  "cancel-confirm": { tr: "Rezervasyonu iptal et", en: "Cancel this reservation" },
  "cancel-working": { tr: "İptal ediliyor…", en: "Cancelling…" },
  "cancel-done": { tr: "Rezervasyonunuz iptal edildi.", en: "Your reservation has been cancelled." },
  "cancel-done-p": { tr: "Bir onay e-postası gönderdik. Sizi başka bir akşam bekleriz.", en: "We've sent a confirmation email. We hope to see you another evening." },
  "cancel-already": { tr: "Bu rezervasyon zaten iptal edilmiş ya da tamamlanmış.", en: "This reservation has already been cancelled or completed." },
  "cancel-past": { tr: "Bu rezervasyonun saati geçtiği için iptal edilemez.", en: "This reservation is in the past and can't be cancelled." },
  "cancel-failed": { tr: "İptal edilemedi. Lütfen bizi arayın.", en: "Couldn't cancel. Please call us." },
  "cancel-back": { tr: "Ana sayfaya dön", en: "Back to the site" },
  "cancel-need-help": { tr: "Yardım için:", en: "Need help?" },

  "chat-title": { tr: "Kumo Asistan", en: "Kumo Assistant" },
  "chat-open": { tr: "Soru sor", en: "Ask a question" },
  "chat-close": { tr: "Sohbeti kapat", en: "Close chat" },
  "chat-placeholder": { tr: "Bir soru yazın…", en: "Type a question…" },
  "chat-status-bot": { tr: "Yapay zekâ asistanı", en: "AI assistant" },
  "chat-status-staff": { tr: "Personelle görüşüyorsunuz", en: "Talking with our staff" },
  "chat-greeting": {
    tr: "Merhaba, ben Kumo Asistan, yapay zekâ destekli bir asistanım. Menü, saatler, adres ve rezervasyon hakkında soru sorabilirsiniz. Yanıtlarım hatalı olabilir; alerji gibi önemli konularda personelimize bağlanın.",
    en: "Hello, I'm Kumo Assistant, an AI-powered assistant. Ask me about the menu, opening hours, address or reservations. My answers can be wrong; for important matters such as allergies, please talk to our staff."
  },
  "chat-act-reserve": { tr: "Rezervasyon yap", en: "Make a reservation" },
  "chat-act-handoff": { tr: "Personele bağlan", en: "Talk to staff" },
  "chat-handoff-link": { tr: "Personelle konuşmak istiyorum", en: "I'd like to talk to staff" },
  "chat-handoff-default": { tr: "Personelle görüşmek istiyorum.", en: "I'd like to speak with staff." },
  "chat-consent": { tr: "Mesajlarım personele iletilsin ve 24 saat saklansın.", en: "Share my messages with staff and keep them for 24 hours." },
  "chat-consent-link": { tr: "Aydınlatma metni", en: "Privacy notice" },
  "chat-consent-go": { tr: "Personele bağlan", en: "Connect to staff" },
  "chat-consent-cancel": { tr: "Vazgeç", en: "Cancel" },
  "chat-handoff-started": {
    tr: "Personele iletildi. Cevap bu pencereye düşer; sayfayı kapatırsanız aynı tarayıcıyla geri dönüp görebilirsiniz.",
    en: "Sent to our staff. Their reply will appear in this window; if you close the page, come back with the same browser to see it."
  },
  "chat-handoff-closed": { tr: "Personel bu görüşmeyi kapattı.", en: "Our staff closed this conversation." },
  "chat-handoff-gone": { tr: "Bu görüşmenin süresi doldu. Yeni bir soru sorabilirsiniz.", en: "This conversation has expired. You can ask a new question." },
  "chat-err-rate": { tr: "Çok hızlı yazıyorsunuz, lütfen biraz bekleyin.", en: "You're typing too fast, please wait a moment." },
  "chat-err-down": {
    tr: "Şu an cevap veremiyorum. Lütfen bizi arayın: +90 538 547 02 89",
    en: "I can't answer right now. Please call us: +90 538 547 02 89"
  },

  /* ---- üyelik (index.html şeridi + hesap.html) ---- */
  "nav-account": { tr: "Üyelik", en: "Membership" },
  "nav-account-in": { tr: "Hesabım", en: "My account" },
  "reserve-member-guest": {
    tr: 'Üye misiniz? <a class="text-link" href="hesap.html">Giriş yapın</a> — bilgileriniz hazır gelsin, her ziyarette damga kazanın.',
    en: 'A member? <a class="text-link" href="hesap.html">Sign in</a> — your details are filled in and every visit earns a stamp.'
  },
  "reserve-member-in": {
    tr: "Üye olarak rezervasyon yapıyorsunuz; bu ziyaret sadakat kartınıza bir damga kazandırır.",
    en: "You're booking as a member; this visit earns a stamp on your loyalty card."
  },
  "confirm-member": {
    tr: 'Rezervasyon hesabınıza eklendi. <a class="text-link" href="hesap.html">Hesabım</a>',
    en: 'Added to your account. <a class="text-link" href="hesap.html">My account</a>'
  },

  "acc-meta-title": { tr: "Üyelik — Kumo Izakaya", en: "Membership — Kumo Izakaya" },
  "acc-title": { tr: "Üyelik", en: "Membership" },
  "acc-loading": { tr: "Yükleniyor…", en: "Loading…" },
  "acc-intro": { tr: "Kumo üyeliği ücretsizdir. Üye olarak:", en: "Kumo membership is free. As a member:" },
  "acc-perk-1": { tr: "Rezervasyon formu bilgilerinizle hazır gelir; rezervasyonlarınızı buradan görür, tek tıkla iptal edersiniz.", en: "The booking form comes pre-filled; see and cancel your reservations here in one tap." },
  "acc-perk-2": { tr: "Her tamamlanan ziyaret sadakat kartınıza bir damga ekler; kart dolunca ikram bizden.", en: "Every completed visit adds a stamp to your loyalty card; a full card earns a treat on us." },
  "acc-perk-3": { tr: "Misafirlerden daha ileri tarihlere masa ayırtabilirsiniz.", en: "You can book further ahead than guests." },
  "acc-perk-4": { tr: "Üyelere özel akşamlara (sake eşleşmeleri, şef masası) yer ayırtabilirsiniz.", en: "You can reserve seats at members-only evenings (sake pairings, chef's table)." },
  "acc-perk-5": { tr: "Doğum gününüzü eklerseniz o hafta küçük bir sürprizimiz olur.", en: "Add your birthday and we'll have a small surprise that week." },
  "acc-google": { tr: "Google ile devam et", en: "Continue with Google" },
  "acc-or": { tr: "veya e-postanıza gelen kodla", en: "or with a code sent to your email" },
  "acc-email": { tr: "E-posta", en: "Email" },
  "acc-send-code": { tr: "Giriş kodu gönder", en: "Send sign-in code" },
  "acc-code-sent": { tr: "E-postanıza 6 haneli bir kod gönderdik. Gelmediyse spam klasörüne bakın.", en: "We've emailed you a 6-digit code. Check your spam folder if it doesn't arrive." },
  "acc-code": { tr: "Kod", en: "Code" },
  "acc-verify": { tr: "Giriş yap", en: "Sign in" },
  "acc-change-email": { tr: "Farklı bir e-posta kullan", en: "Use a different email" },
  "acc-legal": {
    tr: 'Devam ederek üyelik kapsamındaki <a href="kvkk.html#uyelik">Aydınlatma Metni</a>’ni okuduğunuzu kabul edersiniz.',
    en: 'By continuing you confirm you have read the membership section of our <a href="kvkk.html#membership">Privacy Notice</a>.'
  },
  "acc-err-code": { tr: "Kod hatalı ya da süresi dolmuş.", en: "That code is wrong or has expired." },
  "acc-err-send": { tr: "Kod gönderilemedi. Biraz sonra tekrar deneyin.", en: "Couldn't send the code. Try again shortly." },
  "acc-err-email": { tr: "Geçerli bir e-posta adresi girin.", en: "Enter a valid email address." },
  "acc-err-oauth": { tr: "Giriş tamamlanamadı. Tekrar deneyin.", en: "Sign-in didn't complete. Please try again." },
  "acc-err-load": { tr: "Hesap bilgileri yüklenemedi. Sayfayı yenileyin.", en: "Couldn't load your account. Please refresh." },
  "acc-err-generic": { tr: "İşlem tamamlanamadı. Tekrar deneyin ya da bizi arayın.", en: "That didn't work. Try again or call us." },
  "acc-err-rate": { tr: "Çok fazla deneme yaptınız, biraz bekleyin.", en: "Too many attempts — please wait a moment." },
  "acc-hello": { tr: "Merhaba", en: "Hello" },
  "acc-signout": { tr: "Çıkış yap", en: "Sign out" },
  "acc-incomplete": { tr: "Özel akşamlara yer ayırtabilmek için profilinize adınızı ve telefonunuzu ekleyin.", en: "Add your name and phone number to your profile to reserve members' evenings." },
  "acc-card-h": { tr: "Sadakat kartı", en: "Loyalty card" },
  "acc-card-progress": { tr: "{n} / {total} damga", en: "{n} / {total} stamps" },
  "acc-card-reward": { tr: "Kart dolunca:", en: "When the card is full:" },
  "acc-card-how": { tr: "Hesabınızla yaptığınız her rezervasyon, ziyaretiniz tamamlanınca bir damga kazandırır.", en: "Every reservation made with your account earns a stamp once your visit is completed." },
  "acc-rewards-h": { tr: "Hazır ödülleriniz", en: "Your rewards" },
  "acc-reward-hint": { tr: "Masada bu kodu personele gösterin.", en: "Show this code to our staff at the table." },
  "acc-res-h": { tr: "Rezervasyonlarım", en: "My reservations" },
  "acc-res-upcoming": { tr: "Yaklaşan", en: "Upcoming" },
  "acc-res-past": { tr: "Geçmiş", en: "Past" },
  "acc-res-none": { tr: "Henüz hesabınızla yapılmış bir rezervasyon yok.", en: "No reservations made with your account yet." },
  "acc-res-new": { tr: "Masa ayırt", en: "Reserve a table" },
  "acc-res-cancel": { tr: "İptal et", en: "Cancel" },
  "acc-res-cancel-q": { tr: "Bu rezervasyon iptal edilsin mi?", en: "Cancel this reservation?" },
  "acc-res-cancelled": { tr: "Rezervasyon iptal edildi.", en: "Reservation cancelled." },
  "acc-status-confirmed": { tr: "Onaylı", en: "Confirmed" },
  "acc-status-cancelled": { tr: "İptal", en: "Cancelled" },
  "acc-status-completed": { tr: "Tamamlandı", en: "Completed" },
  "acc-status-no_show": { tr: "Gelinmedi", en: "No-show" },
  "acc-guests": { tr: "{n} kişi", en: "{n} guests" },
  "acc-events-h": { tr: "Üyelere özel akşamlar", en: "Members' evenings" },
  "acc-events-none": { tr: "Şu an açık bir özel akşam yok. Yeni akşamlar burada duyurulur.", en: "No members' evenings are open right now. New ones are announced here." },
  "acc-events-left": { tr: "{n} yer kaldı", en: "{n} seats left" },
  "acc-events-full": { tr: "Dolu", en: "Full" },
  "acc-events-party": { tr: "Kişi", en: "Guests" },
  "acc-events-book": { tr: "Yer ayırt", en: "Reserve" },
  "acc-events-mine": { tr: "Yeriniz ayrıldı · {n} kişi", en: "You're booked · {n} guests" },
  "acc-events-cancel": { tr: "Kaydı iptal et", en: "Cancel booking" },
  "acc-events-cancel-q": { tr: "Bu akşam için kaydınız iptal edilsin mi?", en: "Cancel your booking for this evening?" },
  "acc-events-booked": { tr: "Yeriniz ayrıldı. Onay e-postası gönderildi.", en: "You're booked. A confirmation email is on its way." },
  "acc-events-cancelled": { tr: "Kaydınız iptal edildi.", en: "Your booking was cancelled." },
  "acc-events-err-full": { tr: "Bu akşamda yeterli yer kalmadı.", en: "Not enough seats left for this evening." },
  "acc-events-err-dup": { tr: "Bu akşam için zaten kaydınız var.", en: "You're already booked for this evening." },
  "acc-profile-h": { tr: "Profil", en: "Profile" },
  "acc-name": { tr: "Ad soyad", en: "Name" },
  "acc-phone": { tr: "Telefon", en: "Phone" },
  "acc-bday": { tr: "Doğum günü (opsiyonel)", en: "Birthday (optional)" },
  "acc-bday-day": { tr: "Gün", en: "Day" },
  "acc-bday-month": { tr: "Ay", en: "Month" },
  "acc-lang": { tr: "E-posta dili", en: "Email language" },
  "acc-marketing": {
    tr: "Kumo Izakaya'nın özel akşam ve kampanyalarından e-posta ile haberdar olmak istiyorum. (İsteğe bağlı; dilediğiniz an buradan kapatabilirsiniz.)",
    en: "Email me about Kumo Izakaya's special evenings and offers. (Optional; you can turn this off here at any time.)"
  },
  "acc-save": { tr: "Kaydet", en: "Save" },
  "acc-saved": { tr: "Profiliniz kaydedildi.", en: "Your profile has been saved." },
  "acc-err-phone": { tr: "Geçerli bir telefon numarası girin.", en: "Enter a valid phone number." },
  "acc-err-bday": { tr: "Doğum gününü gün ve ay olarak eksiksiz seçin.", en: "Choose both the day and month of your birthday." },
  "acc-delete-h": { tr: "Hesabı sil", en: "Delete account" },
  "acc-delete-p": { tr: "Profiliniz, damgalarınız, ödülleriniz ve etkinlik kayıtlarınız kalıcı olarak silinir. Yaklaşan masa rezervasyonlarınız geçerli kalır.", en: "Your profile, stamps, rewards and event bookings are permanently deleted. Upcoming table reservations remain valid." },
  "acc-delete": { tr: "Hesabımı sil", en: "Delete my account" },
  "acc-delete-q": { tr: "Hesabınız kalıcı olarak silinsin mi? Bu işlem geri alınamaz.", en: "Permanently delete your account? This can't be undone." },
  "acc-deleted": { tr: "Hesabınız silindi.", en: "Your account has been deleted." },
  "acc-back": { tr: "Ana sayfaya dön", en: "Back to the site" },

  "footer-location": { tr: "İstanbul, Türkiye", en: "Istanbul, Turkey" },
  "footer-copyright": { tr: "© 2026 Kumo Izakaya. Tüm hakları saklıdır.", en: "© 2026 Kumo Izakaya. All rights reserved." }
};
