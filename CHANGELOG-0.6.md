# Ada Çağları 0.6 — İlk ekonomi geliştirmeleri

- On adada farklı kıyılar ve kaynak yerleşimleri; %75–130 tarımsal verimlilik koyun çiftliğinin döngüsünü etkiler.
- Sabit şehir 30 dünya saniyesinde 2 gıda ve 1 kıyafet tüketir. Karşılanan ihtiyaçlar sırasıyla 6 ve 12 altın getirir. 600 saniyelik siparişler ek ödül verir; süre dolarsa cezasız yenilenir.
- Stoka bağlı fiyatlar, açık onayla otomatik alım-satım, 20 ürün kapasiteli gemilerde gidiş satış/dönüş alış rotası. Miktar, korunacak stok ve fiyat sınırları ayarlanabilir.
- İki oyuncu arasında onaylı tek seferlik takas siparişleri. Karşılık malları onay anında ayrılır; teklif sahibinin boş ve durdurulmuş gemisi taşır.
- Test dünyasına sonlu stoklu gezgin tüccar; bakır dahil mevcut tüm ürünleri alıp satar. Her 60 dünya saniyesinde stoklar 10, para 200 yenilenir (üst sınırlarla).
- Dolu hedefte satılamayan yük gemide geri döner. Ana depo da doluysa gemide bekler. Takas yükü hedefte yer açılana kadar bekler.
- Bina taşıma 5 odun + 3 taş; yıkım 5 odun + 2 taş iade eder. İade için depoda yer gerekir. Kullanılan son limanı kaldırmadan önce ikinci liman gerekir.

## Kayıtlar
Eski dünyalar ilk erişimde aktarılır ve `backup-before-v06` anahtarına bir kez yedeklenir. Stok, teknoloji, bina konumları ve taşınan gemi yükleri korunur. Yeni kıyıların altında kalan mevcut binaların yakın çevresi korunmuş arazi olarak tutulur. Eski ücretsiz rotalar yüklerini koruyarak durdurulur; yeni ticaret kurallarıyla yeniden başlatılmalıdır. Test/ortak oda adları ve oyuncu kimlikleri değişmedi.

## Geliştirme
`npm test`, `npm run check`, `npm run build`. `src/index.html` ve `src/logic.mjs` kaynakları `node build.mjs` ile `src/assets.mjs` içine paketlenir. Cloudflare mevcut `npx wrangler deploy` komutuyla paketlenmiş dosyaları yayınlayabilir. Kaynakları değiştirdiğinde build çıktısını da commit et.

Bu sürüm ilk altı isteği kapsar; AI rakipler, yeni çağlar, koloniler ve yeni bina türleri eklenmedi.
