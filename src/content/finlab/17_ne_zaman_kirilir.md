# "Ne Olur?" Değil, "Ne Zaman Kırılır?" Diye Sormak

**Meta Açıklama**: "Yatırımda doğru soruyu sormak başarının yarısıdır. Stress test ve tail risk analizi ile portföyünüzün kırılma noktasını nasıl bulacağınızı öğrenin."

---

## Giriş: Yanlış Soruya Doğru Cevap Aramak

Yatırımcıların %90'ı güne aynı soruyu sorarak başlar: *"Piyasa ne olur? Hisse ne olur? Dolar ne olur?"*

Bu soru, finansal medyanın, analistlerin ve YouTube fenomenlerinin varlık sebebidir. Herkes bu soruya bir cevap verir. Ancak bu soru, **yanlış bir sorudur**.

Yanlış soruya verilen doğru bir cevap bile sizi kurtaramaz. Çünkü "Ne olur?" sorusu, geleceği tahmin etmeye çalışır ve daha önce gördüğümüz gibi, gelecek tahmin edilemez.

Başarılı yatırımcılar (ve risk yöneticileri) ise tamamen farklı bir soru sorarlar: **"Ne zaman kırılır?"**

Bu yazıda, FinCognis'in temel felsefelerinden biri olan "Kırılma Noktası Analizi"ni (Break-even & Stress Testing) ve portföyünüzü yıkıcı kuyruk risklerinden (Tail Risk) nasıl koruyacağınızı öğreneceksiniz.

---

## Karar Problemi: Kırılganlık İllüzyonu

"Ne olur?" diye soran yatırımcı, sürekli bir **optimizasyon** peşindedir. En yüksek getiriyi kovalarken, portföyünün ne kadar kırılgan hale geldiğini fark etmez.

Nassim Nicholas Taleb'in *Antifragile* (Antikırılgan) kavramında belirttiği gibi, bir sistemin (veya portföyün) gücü, normal zamanlarda ne kadar iyi çalıştığıyla değil, şok anlarında ne kadar dayanabildiğiyle ölçülür.

**Karar Hatası**: Yatırımcılar, portföylerini sadece "normal" piyasa koşullarına göre inşa ederler. Ekstrem olayları (Siyah Kuğuları) "ihtimal dışı" görerek yok sayarlar. Ancak finansal piyasalarda ekstrem olaylar, istatistiksel olarak sanıldığından çok daha sık yaşanır (Fat Tails / Kalın Kuyruklar).

---

## Gerçek Senaryo: Kaldıraçlı İşlem ve Kırılma Noktası

**Olay**: 2021 yılında, BIST'te sürekli yükselen bir hisse senedi.

### Yatırımcı G ("Ne Olur?" Diye Soran)
- **Soru**: "Bu hisse ne olur?"
- **Cevap (Analist)**: "Şirket çok iyi, %50 daha yükselir."
- **Karar**: Yatırımcı G, daha fazla kazanmak için VİOP'ta (Vadeli İşlemler) 1'e 5 kaldıraçla alım yapar.
- **Sonuç**: Hisse gerçekten de yıl sonunda %50 yükselir. Ancak yıl içinde, sadece 2 günlüğüne %25'lik sert bir düzeltme (düşüş) yaşar.
- **Kırılma**: 1'e 5 kaldıraç kullanan Yatırımcı G'nin portföyü, hisse %20 düştüğü anda "Margin Call" (Teminat Tamamlama Çağrısı) yer ve sıfırlanır. Hisse sonradan yükselse bile, Yatırımcı G oyundan çoktan atılmıştır.

### Yatırımcı H ("Ne Zaman Kırılır?" Diye Soran - FinCognis)
- **Soru**: "Bu pozisyon ne zaman kırılır? (Beni ne zaman iflas ettirir?)"
- **Analiz**: "Eğer 1'e 5 kaldıraç kullanırsam, hisse %20 düştüğünde param sıfırlanır. Bu hissenin geçmişte 2 günde %20 düştüğü oldu mu? Evet, 3 kez oldu."
- **Karar**: "Kırılma noktası çok yakın. Kaldıraç kullanmayacağım, sadece spot piyasadan alacağım."
- **Sonuç**: %25'lik düzeltmede portföyü erir ama sıfırlanmaz. Yıl sonundaki %50'lik yükselişten kârını alır.

**Hata Analizi**: Yatırımcı G'nin "Ne olur?" tahmini doğruydu (Hisse yükseldi). Ancak "Ne zaman kırılır?" sorusunu sormadığı için, yolculuk sırasındaki bir tümsekte arabası parçalandı.

---

## Hata Analizi: Kırılganlığı Gizleyen 3 Metrik

Yatırımcılar genellikle portföylerinin gücünü yanlış metriklerle ölçerler:

| Yanlış Metrik | Neden Yanıltıcıdır? | Doğru Metrik (FinCognis) |
|---------------|--------------------|--------------------------|
| **Ortalama Getiri** | Bir yıl %100 kazanıp, ertesi yıl %50 kaybederseniz, ortalama getiriniz %25 görünür. Ama paranız aslında aynı kalmıştır (Bileşik getiri illüzyonu). | **Maksimum Düşüş (Max Drawdown)**: Portföyün zirveden dibe ne kadar eridiği. |
| **Volatilite (Standart Sapma)** | Sadece "normal" dalgalanmaları ölçer. Ekstrem şokları (Kuyruk Risklerini) göstermez. | **Stres Testi Kaybı**: Belirli bir kriz senaryosunda (örn: 2008 krizi) portföyün ne kadar eriyeceği. |
| **Kazanma Oranı (Win Rate)** | 10 işlemin 9'unda 1.000 TL kazanıp, 1 işlemde 20.000 TL kaybedebilirsiniz. Kazanma oranınız %90'dır ama iflas etmişsinizdir. | **Risk/Ödül Oranı (Risk/Reward)**: Kaybettiğinizde ne kadar kaybettiğiniz, kazandığınızdan daha önemlidir. |

---

## FinCognis Yaklaşımı: Kırılma Noktası Analizi (Stress Testing)

Portföyünüzün "Kırılma Noktasını" bulmak için FinCognis'in 3 aşamalı Stres Testi'ni uygulayın:

### Adım 1: "Amca/Dayı" Testi (Kişisel Kırılma Noktası)

Finansal kırılma noktasından önce, **psikolojik kırılma noktanızı** bulmalısınız.

- **Soru**: "Portföyüm yüzde kaç eridiğinde, gece uykum kaçar ve panikle her şeyi satarım?"
- **Gerçeklik**: Çoğu yatırımcı "Ben %30 düşüşe dayanırım" der, ancak %15 düşüşte panik satışı yapar.
- **Kural**: Kendi psikolojik kırılma noktanızı (örn: %15) belirleyin. Portföyünüzün riskini, bu noktaya asla ulaşmayacak şekilde ayarlayın.

### Adım 2: Tersine Stres Testi (Reverse Stress Testing)

Geleneksel stres testi "Piyasa %30 düşerse bana ne olur?" diye sorar. Tersine stres testi ise sondan başa doğru gider.

- **Soru**: "Portföyümün %50 erimesi (iflas etmem) için piyasada tam olarak ne olması gerekir?"
- **Eylem**: FinCognis platformunda bu soruyu sorduğunuzda, sistem size zayıf karnınızı gösterir. "Eğer faizler %40'a çıkar ve teknoloji hisseleri %30 düşerse, portföyün %50 erir."
- **Sonuç**: Artık düşmanınızı (sizi iflas ettirecek senaryoyu) biliyorsunuz. O senaryoya karşı önlem alabilirsiniz.

### Adım 3: Kuyruk Riski (Tail Risk) Koruması

Kırılma noktanızı bulduktan sonra, o noktaya ulaşmanızı engelleyecek bir "sigorta" (hedge) almalısınız.

- **Eylem**: Portföyünüzün %2-3'lük küçük bir kısmını, piyasa çöktüğünde devasa kârlar getirecek varlıklara (Put opsiyonları, VIX endeksi fonları veya altın gibi ters korele varlıklar) ayırın.
- **Sonuç**: Normal zamanlarda bu %2'lik kısım zarar eder (sigorta primi ödersiniz). Ancak piyasa kırıldığında, bu küçük kısım tüm portföyünüzü kurtarır.

---

## Karar Ağacı: Kırılma Noktası Yönetimi

```
PORTFÖYÜNÜZÜ OLUŞTURDUNUZ
│
├─ Soru 1: Psikolojik kırılma noktamı (Max Drawdown toleransımı) biliyor muyum?
│  ├─ HAYIR → Belirle (Örn: -%15).
│  └─ EVET → Soru 2'ye git
│
├─ Soru 2: Tersine Stres Testi yaptım mı? (Beni neyin iflas ettireceğini biliyor muyum?)
│  ├─ HAYIR → FinCognis'te test et ve zayıf karnını bul.
│  └─ EVET → Soru 3'e git
│
├─ Soru 3: Beni iflas ettirecek senaryoya karşı bir "sigortam" (Hedge) var mı?
│  ├─ HAYIR → Portföyün %2-3'ü ile ters korele bir varlık al.
│  └─ EVET → ✅ PORTFÖYÜN ANTİKIRILGAN. Artık rahat uyuyabilirsin.
```

---

## Senaryo Analizi: Kırılgan vs Antikırılgan Portföy

| Metrik | Kırılgan Portföy ("Ne Olur?" Odaklı) | Antikırılgan Portföy (FinCognis) |
|--------|--------------------------------------|----------------------------------|
| Temel Soru | "Nasıl daha çok kazanırım?" | "Nasıl hayatta kalırım?" |
| Optimizasyon | Sadece "Güneşli Hava" senaryosuna göre | Tüm hava koşullarına göre |
| Kaldıraç Kullanımı | Yüksek (Kârı maksimize etmek için) | Yok veya Çok Düşük |
| Siyah Kuğu (Kriz) Etkisi | İflas veya yıllarca süren toparlanma | Sınırlı zarar, kriz sonrası hızlı büyüme |
| Psikolojik Durum | Sürekli piyasa tahmini yapma stresi | Tahmin yapmaya gerek duymamanın huzuru |

---

## Sonuç ve Aksiyon Planı

**Temel Bulgu**: Piyasada ne olacağını bilemezsiniz, ancak portföyünüzün ne zaman kırılacağını hesaplayabilirsiniz. Hayatta kalmak, en yüksek getiriyi elde etmekten daha önemlidir; çünkü oyundan atılan biri bir daha kazanamaz.

**Hemen Yapacağınız**:

1. ✅ "Piyasa ne olur?" sorusunu lügatınızdan çıkarın. Analistlerin yıl sonu tahminlerini okumayı bırakın.
2. ✅ FinCognis platformunda "Tersine Stres Testi"ni çalıştırın. Sizi finansal olarak yıkacak olan o spesifik senaryoyu (faiz şoku, kur şoku vb.) bulun.
3. ✅ Psikolojik kırılma noktanızı dürüstçe belirleyin. Eğer %20 düşüş sizi panikletecekse, portföyünüzün riskini maksimum %15 düşüş yaşayacak şekilde yeniden yapılandırın.
4. ✅ Portföyünüze küçük bir "Kuyruk Riski Sigortası" (Hedge) eklemeyi düşünün.

**Beklenen Sonuç**:
- Krizler sizin için bir "son" değil, sadece portföyünüzün stres testinden geçtiği anlar olacak.
- Piyasayı tahmin etme yükünden kurtulup, zihinsel enerjinizi koruyacaksınız.
- Uzun vadede, krizlerde iflas edenlerin bıraktığı fırsatları toplayarak servetinizi büyüteceksiniz.

---

## İç Bağlantılar

- [Karar Simülasyonu Nedir ve Neden Geleceğin Standardı?](/blog/karar-simulasyonu)
- [Karar Öncesi Risk Görselleştirme: Yeni Nesil Yaklaşım](/blog/risk-gorsellestirme)
- [Risk-Off Dönemlerinde En Sık Yapılan Hata](/blog/risk-off-hata)
- [Yatırımda Tahmin Değil, Koşul Analizi](/blog/kosul-analizi-yatirim)

---

## Kaynaklar

1. Taleb, N. N. (2012). *Antifragile: Things That Gain from Disorder*. Random House.
2. Marks, H. (2011). *The Most Important Thing: Uncommon Sense for the Thoughtful Investor*. Columbia University Press.
3. FinCognis Platform Analysis (2024). "Reverse Stress Testing and Retail Portfolio Survivability" - Internal Research.

---

**Yazar Notu**: Finansal piyasalarda yaşlı yatırımcılar vardır ve cesur yatırımcılar vardır. Ancak "yaşlı ve cesur" yatırımcı yoktur. Cesurlar kırılır, riskini yönetenler yaşlanır.

