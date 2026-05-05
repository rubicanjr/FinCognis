# Ekonomik Takvim “Ralph Loop” Uygulama Planı (Karar-Tamam)

## Özet
Amaç: `/ekonomik-takvim` ekranında verinin ana kaynaktan düzenli gelmesini sağlamak, `INITIALIZING`/`503` döngüsünü bitirmek ve React `#418/#423` hydration hatalarını sıfırlamak.  
Kısıtlar: Redis/Upstash kaldırılacak, fallback API yok, state yönetimi sade `useEffect` tabanlı olacak, Playwright E2E kalıcı eklenecek.

## Mimari Değişiklikler
1. Veri katmanını tek yola indir:
- `/api/mirror/calendar` tek giriş olacak.
- `refresh` worker + Redis lock/cache zinciri devreden çıkarılacak.
- API her istekte ana kaynak scrape/fetch çalıştıracak; sonuç üretirse `READY`, üretmezse `SOURCE_UNAVAILABLE` (ama 5xx yerine kontrollü 200 JSON).

2. Yanıt sözleşmesini netleştir:
- `status: "READY" | "LOADING" | "SOURCE_UNAVAILABLE"`
- `tab`, `range`, `updatedAt`, `events`, `message`
- Event alanları mevcut typed şemayla korunacak (`id,time,currency,importance,eventTitle,actual,forecast,previous,impactLevel`).

3. Frontend state makinesi:
- `useEconomicCalendar` yalnızca `useEffect + useState + AbortController`.
- `tab/range` değişiminde tek fetch; sonsuz exponential poll kaldırılır.
- `READY`: tablo satırları.
- `SOURCE_UNAVAILABLE`: tek, sabit boş durum mesajı.
- `LOADING`: skeleton.
- Hydration güvenliği: client/server ilk render deterministic; tarih/locale metinleri render öncesi normalize edilir.

## Uygulama Adımları (Ralph Loop)
1. Forensic baseline:
- `/ekonomik-takvim` sayfasında network + console snapshot al.
- Hedeflenen mevcut sinyaller: `503`, React `#418/#423`, sürekli retry.

2. Backend sadeleştirme:
- `cache-port` bağımlılığını API yolundan kaldır.
- `mirror` fonksiyonlarını “direct fetch+parse” çalışacak şekilde ayır.
- `route.ts` içinde deterministic response üret.

3. Hook/UI hizalama:
- `useEconomicCalendar` yeni `status` sözleşmesini kullanır.
- Panel sadece bu statelere göre render eder; ekstra heuristik kaldırılır.
- Türkçe metinlerde encoding bozulmalarını düzelt.

4. Test sertleştirme:
- Unit: `READY`, `SOURCE_UNAVAILABLE`, parse-fail.
- Hook/component: loading/ready/unavailable geçişleri.
- API contract test: schema dışı payload reject.

5. Playwright kalıcı E2E:
- `@playwright/test` kurulumu + config.
- Test 1: `/ekonomik-takvim` açılışında console’da `#418/#423` yok.
- Test 2: `tab=economic, range=today` için tabloya en az 1 satır düşer (kaynak açıksa).
- Test 3: kaynak başarısız simülasyonunda UI kontrollü `SOURCE_UNAVAILABLE` gösterir, network 5xx spam üretmez.
- Test 4: `Yarın` tıklayınca yeni istek atılır ve ekran stabil kalır.

## Kabul Kriterleri
- Browser console: React `#418/#423` = 0.
- `/api/mirror/calendar` için tekrar eden `503` = 0.
- UI hiçbir durumda sonsuz “ilk kez hazırlanıyor” döngüsünde kalmaz.
- `npm run test` ve `npm run build` temiz geçer.
- Playwright suite pass.

## Assumptions
- Ana kaynak geçici olarak boş dönebilir; bu durumda ürün davranışı `SOURCE_UNAVAILABLE` olarak kabul edilir.
- Bu iterasyonda performans optimizasyonu (cache, queue, distributed lock) yapılmaz.
- CI entegrasyonu yerine önce repo-local Playwright stabilizasyonu tamamlanır.
