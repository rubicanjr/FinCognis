# Karar Öncesi Risk Görselleştirme: Yeni Nesil Yaklaşım

**Meta Açıklama**: "Riski hissetmek yerine görmek ister misiniz? Karar öncesi risk görselleştirme (risk dashboard) ile portföyünüzün röntgenini çekin ve sürprizleri sıfırlayın."

---

## Giriş: Kör Uçuşu Yapmak

Bir uçağın kokpitine girdiğinizi hayal edin. Göstergeler yok, radar yok, sadece dışarıyı görebildiğiniz küçük bir cam var. Bu uçakla okyanusu geçebilir misiniz?

Çoğu bireysel yatırımcı, portföyünü tam olarak böyle yönetir. "Hisse aldım, bekliyorum" derler. Ancak o hissenin portföyün genel riskini nasıl değiştirdiğini, faiz artışına ne kadar duyarlı olduğunu veya olası bir krizde ne kadar eriyeceğini **göremezler**. Riski sadece "hissederler".

Geleneksel finans platformları size sadece "Geçmiş Getiri" grafiğini gösterir. Oysa geçmiş getiri, dikiz aynasına bakarak araba kullanmaktır.

Bu yazıda, FinCognis'in devrim niteliğindeki "Karar Öncesi Risk Görselleştirme" (Pre-Decision Risk Visualization) yaklaşımını ve riski soyut bir kavram olmaktan çıkarıp, somut bir gösterge tablosuna (dashboard) nasıl dönüştüreceğinizi öğreneceksiniz.

---

## Karar Problemi: Riskin Soyutluğu

İnsan beyni, soyut kavramları (örneğin "Yüksek Risk") işlemekte çok kötüdür. Ancak görsel ve somut verileri (örneğin "Kırmızı Alarm" veya "10.000 TL Kayıp İhtimali") anında anlar ve tepki verir.

**Karar Hatası**: Yatırımcılar, bir hisseyi alırken sadece "Upside" (Yükseliş) potansiyelini zihinlerinde canlandırırlar. "Downside" (Düşüş) riski ise sadece soyut bir "Dikkatli ol" uyarısı olarak kalır. Risk görselleştirilmediği için, yatırımcı aldığı riskin büyüklüğünü ancak piyasa çöktüğünde (iş işten geçtiğinde) fark eder.

---

## Gerçek Senaryo: Gizli Korelasyon Tuzağı

**Olay**: Yatırımcı K, portföyünü "çeşitlendirmek" (riski bölmek) ister.

**Yatırımcı K'nın Portföyü**:
- %30 Teknoloji Hissesi (A Şirketi)
- %30 E-Ticaret Hissesi (B Şirketi)
- %40 Kripto Para (Bitcoin)

**Yatırımcı K'nın Algısı**: "3 farklı varlığa yatırım yaptım, portföyüm çok iyi çeşitlendirildi. Riskim düşük."

**Gerçeklik (Görünmeyen Risk)**: Bu 3 varlık da "Yüksek Büyüme / Yüksek Faiz Hassasiyeti" kategorisindedir. Yani aralarındaki **korelasyon (ilişki) çok yüksektir**.

**Sonuç**: Merkez Bankası faiz artırdığında, 3 varlık da aynı anda %40 düşer. Yatırımcı K, "çeşitlendirme" yaptığını sanırken aslında tüm parasını tek bir makro riske (faiz riskine) bağlamıştır.

**Hata Analizi**: Yatırımcı K, portföyünün "Risk Röntgenini" çekmediği için, varlıklar arasındaki gizli bağı (korelasyonu) göremedi. Riski sadece hissetti, görselleştirmedi.

---

## Hata Analizi: Geleneksel Platformların Yetersizliği

Bireysel yatırımcıların kullandığı standart borsa uygulamaları, risk yönetimi için değil, **işlem (al-sat) yaptırmak** için tasarlanmıştır.

| Geleneksel Platform Özelliği | Neden Yanıltıcıdır? | FinCognis Yaklaşımı |
|------------------------------|--------------------|---------------------|
| **Sadece Fiyat Grafiği** | Fiyatın geçmişini gösterir, gelecekteki riskleri (volatiliteyi) gizler. | **Downside Range (Düşüş Aralığı)**: Olası en kötü senaryoyu grafik üzerinde kırmızı alan olarak gösterir. |
| **Yeşil/Kırmızı Renkler** | Günlük %1 artışı yeşil (iyi), %1 düşüşü kırmızı (kötü) göstererek miyopik kararları tetikler. | **Risk Skoru (0-100)**: Günlük fiyata değil, portföyün yapısal sağlığına odaklanır. |
| **Sektörel Dağılım Pastası** | "Sanayi %50, Banka %50" der, ancak bu sektörlerin aynı makro şoka nasıl tepki vereceğini söylemez. | **Stres Testi Haritası**: "Faiz Şoku" anında portföyün hangi parçalarının kanayacağını gösterir. |

---

## FinCognis Yaklaşımı: Karar Öncesi Risk Dashboard'u

FinCognis, bir hisseyi almadan *önce* (Karar Öncesi), o işlemin portföyünüzün risk profilini nasıl değiştireceğini size görsel olarak sunar.

### Adım 1: "What-If" (Ne Olursa) Görselleştirmesi

Alım tuşuna basmadan önce, işlemi "Sepete Ekle" (Simüle Et) moduna alırsınız.

- **Eylem**: "Portföyüme %20 ağırlıkla X hissesini eklersem ne olur?"
- **Görsel Sonuç**: Sistem size iki grafik sunar:
  1. *Mevcut Portföy Risk Dağılımı*
  2. *Yeni Portföy Risk Dağılımı*
- **Fayda**: Eğer yeni hisse, portföyünüzün "Kırmızı (Yüksek Risk)" bölgesini %10'dan %40'a çıkarıyorsa, bu riski somut olarak görür ve işlemi yapmaktan vazgeçersiniz.

### Adım 2: Korelasyon Matrisi (Isı Haritası)

Portföyünüzdeki varlıkların birbirleriyle olan ilişkisini bir "Isı Haritası" (Heatmap) ile görürsünüz.

- **Koyu Kırmızı**: Varlıklar birlikte hareket ediyor (Çeşitlendirme yok, risk yüksek).
- **Koyu Yeşil**: Varlıklar ters hareket ediyor (Gerçek çeşitlendirme, risk düşük).
- **Fayda**: Yatırımcı K gibi "gizli korelasyon" tuzaklarına düşmezsiniz.

### Adım 3: Kuyruk Riski (Tail Risk) Radarı

Piyasadaki ekstrem olayların (Siyah Kuğuların) portföyünüze etkisini bir radar grafiğinde görürsünüz.

- **Eylem**: "2008 Krizi benzeri bir likidite şoku olursa portföyüm nerede kırılır?"
- **Görsel Sonuç**: Radar grafiği, portföyünüzün "Likidite" ekseninde içeri çöktüğünü gösterir.
- **Fayda**: Kriz gelmeden önce, portföyünüzün zayıf karnını görür ve oraya yama (hedge) yaparsınız.

---

## Karar Ağacı: Görsel Risk Yönetimi

```
YENİ BİR HİSSE ALMAYA KARAR VERDİNİZ
│
├─ Soru 1: Bu işlemi FinCognis'te "Simüle Et" modunda çalıştırdım mı?
│  ├─ HAYIR → Kör uçuşu yapıyorsun. Simülasyonu çalıştır.
│  └─ EVET → Soru 2'ye git
│
├─ Soru 2: Yeni hisse, portföyümün "Maksimum Düşüş" (Max Drawdown) riskini artırıyor mu?
│  ├─ EVET, ÇOK ARTIRIYOR → İşlemi iptal et veya ağırlığı düşür.
│  └─ HAYIR / KABUL EDİLEBİLİR → Soru 3'e git
│
├─ Soru 3: Korelasyon Isı Haritası'nda bu hisse, diğer hisselerimle "Koyu Kırmızı" mı?
│  ├─ EVET → Çeşitlendirme illüzyonu. Alma.
│  └─ HAYIR → ✅ RİSK GÖRSELLEŞTİRİLDİ VE ONAYLANDI. İşlemi yap.
```

---

## Senaryo Analizi: Kör Uçuşu vs Radar Destekli Uçuş

| Metrik | Geleneksel Yatırımcı (Kör Uçuşu) | FinCognis Yatırımcısı (Radar Destekli) |
|--------|----------------------------------|----------------------------------------|
| Risk Algısı | Soyut ("Dikkatli olmalıyım") | Somut ("Maksimum riskim %15") |
| Çeşitlendirme | Sektörel (Yanıltıcı) | Korelasyon Bazlı (Gerçek) |
| Karar Anı | Fiyat grafiğine bakarak (Miyopik) | Risk Dashboard'una bakarak (Holistik) |
| Kriz Anı Sürprizi | Çok Yüksek ("Bunu beklemiyordum") | Sıfır ("Bu senaryoyu zaten görmüştüm") |
| Portföy İstikrarı | Yüksek Volatilite (Dalgalı) | Düşük Volatilite (İstikrarlı) |

---

## Sonuç ve Aksiyon Planı

**Temel Bulgu**: Riski göremezseniz, onu yönetemezsiniz. Karar öncesi risk görselleştirme, yatırımcıyı "fiyat izleyicisi" olmaktan çıkarıp "risk yöneticisi"ne dönüştürür.

**Hemen Yapacağınız**:

1. ✅ Borsa uygulamanızdaki "Günlük Getiri" (Yeşil/Kırmızı) ekranına bakmayı bırakın. Bu ekran sizi sadece FOMO veya paniğe sürükler.
2. ✅ FinCognis platformuna portföyünüzü girin ve "Korelasyon Isı Haritası"nı açın. Hangi varlıklarınızın gizlice aynı riski taşıdığını tespit edin.
3. ✅ Yeni bir alım yapmadan önce mutlaka "What-If" (Ne Olursa) simülasyonunu çalıştırın. İşlemin portföy riskinizi nasıl değiştirdiğini gözlerinizle görün.
4. ✅ Portföyünüzün "Maksimum Düşüş" (Max Drawdown) grafiğinin çıktısını alın. O kırmızı alanın (kayıp ihtimalinin) psikolojik sınırlarınızı aşıp aşmadığına dürüstçe karar verin.

**Beklenen Sonuç**:
- Portföyünüzdeki "gizli mayınları" patlamadan önce temizleyeceksiniz.
- Kararlarınızı "Hisse yükselecek mi?" umuduyla değil, "Riskim ne kadar artacak?" matematiğiyle alacaksınız.
- Finansal piyasalarda kör uçuşu yapmayı bırakıp, tam donanımlı bir kokpitte güvenle yol alacaksınız.

---

## İç Bağlantılar

- [Karar Simülasyonu Nedir ve Neden Geleceğin Standardı?](/blog/karar-simulasyonu)
- ["Ne Olur?" Değil, "Ne Zaman Kırılır?" Diye Sormak](/blog/ne-zaman-kirilir)
- [Yatırımda Tahmin Değil, Koşul Analizi](/blog/kosul-analizi-yatirim)
- [Bir Kararı Simüle Etmek, Onu Neden Değiştirir?](/blog/simulasyon-karar-kalitesi)

---

## Kaynaklar

1. Tufte, E. R. (2001). *The Visual Display of Quantitative Information*. Graphics Press.
2. Taleb, N. N. (2004). *Fooled by Randomness: The Hidden Role of Chance in Life and in the Markets*. Random House.
3. FinCognis Platform Analysis (2024). "The Impact of Visual Risk Dashboards on Retail Investor Behavior" - Internal Research.

---

**Yazar Notu**: Rakamlar yalan söylemez, ancak rakamların nasıl sunulduğu beyninizi kandırabilir. Riski bir Excel tablosunda okumakla, onu kırmızı bir uyarı grafiğinde görmek arasında, iflas ile servet arasındaki fark kadar büyük bir uçurum vardır.

