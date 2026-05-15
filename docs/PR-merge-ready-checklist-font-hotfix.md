# Merge-Ready Review Checklist (Hotfix: Font Stack + Landing Cleanup)

**PR:** _(link ekleyin)_  
**Branch:** `codex/tools-criteria-hotfix`  
**Target:** `main`

## 1) Scope doğrulaması

- [ ] Değişiklikler yalnızca hotfix kapsamındaki dosyalarda:
  - `src/app/globals.css`
  - `tailwind.config.js`
  - `src/components/landing/HeroSection.tsx`
  - `docs/QA-hotfix-font-update.md`
- [ ] Backend/service/test mantığında istenmeyen regresyon yok

## 2) Font migration doğrulaması

- [ ] Global stack Inter olarak güncellenmiş:
  - `Inter, -apple-system, BlinkMacSystemFont, Roboto, Arial, Helvetica, sans-serif`
- [ ] Tailwind `theme.extend.fontFamily` alanları Inter stack ile uyumlu
- [ ] Landing + Tools üzerinde eski Kusanagi odaklı kritik kullanım temizlenmiş

## 3) Landing UI doğrulaması

- [ ] H1 metni doğru:
  - `FİNANSAL KARARLAR VERİYLE ŞEKİLLENİYOR FINCOGNIS İLE NETLEŞİYOR`
- [ ] CTA metni doğru: `ARACI AÇ`
- [ ] Metrikler doğru:
  - `60 Milyon TL+`
  - `+30 yıllık tecrübe`
- [ ] Görsel hiyerarşi bozulmamış (satır kırılımı, spacing, hizalama)

## 4) Tools UI doğrulaması

- [ ] Form elemanları (input/select/button) font tutarlı
- [ ] Kart/metrik alanları font tutarlı
- [ ] SVG text alanlarında font fallback sorunu yok

## 5) Responsive + tema doğrulaması

- [ ] 390px / 768px / 1280px ekranlarda taşma yok
- [ ] Light/Dark mode’da okunurluk/kontrast sorunu yok
- [ ] Hover/focus/active durumlarında font veya layout shift yok

## 6) Teknik doğrulama

- [ ] DevTools Network’te Inter font asset’leri yükleniyor
- [ ] Console’da font/CSS warning yok
- [ ] Hard refresh sonrası görünüm tutarlı

## 7) Dokümantasyon doğrulaması

- [ ] `docs/QA-hotfix-font-update.md` mevcut ve kullanılabilir
- [ ] QA sonucu formu ekip tarafından doldurulabilir netlikte

## 8) Merge gate (final)

- [ ] Tüm checklist maddeleri PASS
- [ ] Reviewer onayı alındı
- [ ] Merge strategy seçildi (squash/rebase/merge commit)
- [ ] Merge sonrası deploy + smoke test planı hazır

## Post-Merge Quick Smoke (5 dk)

- [ ] `/` açılıyor, Hero tipografi doğru
- [ ] `/tools` açılıyor, font tutarlılığı korunuyor
- [ ] Kritik CTA’lar tıklanabilir, görsel regresyon yok
