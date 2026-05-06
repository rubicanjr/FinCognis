import sys
import os
os.environ['PYTHONIOENCODING'] = 'utf-8'
try:
    sys.stdout.reconfigure(encoding='utf-8')
except:
    pass

"""
SPY Deep OTM Put Options - Open Interest Analysis
===================================================
Yahoo Finance üzerinden SPY opsiyon zincirini çeker,
derin OTM (out-of-the-money) put opsiyonlarındaki açık pozisyon
(open interest) dağılımını raporlar.
"""

import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta

pd.set_option('display.max_rows', 200)
pd.set_option('display.width', 200)
pd.set_option('display.float_format', '{:,.2f}'.format)

def analyze_spy_deep_otm_puts():
    print("=" * 90)
    print("  SPY DERİN OTM PUT OPSİYONLARI - AÇIK POZİSYON (OPEN INTEREST) ANALİZİ")
    print("=" * 90)
    print(f"\n  Rapor Tarihi: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("-" * 90)

    # SPY ticker
    spy = yf.Ticker("SPY")

    # Güncel fiyat
    try:
        current_price = spy.fast_info['lastPrice']
    except:
        hist = spy.history(period="1d")
        current_price = hist['Close'].iloc[-1]

    print(f"\n  SPY Güncel Fiyat: ${current_price:,.2f}")

    # Mevcut vade tarihleri
    expirations = spy.options
    print(f"  Toplam Vade Sayısı: {len(expirations)}")

    # Yakın 6 vadeyi analiz et (daha kapsamlı görüntü için)
    selected_expirations = expirations[:6]
    print(f"  Analiz Edilen Vadeler: {', '.join(selected_expirations)}")

    # OTM eşikleri
    otm_10 = current_price * 0.90   # %10 OTM
    otm_15 = current_price * 0.85   # %15 OTM
    otm_20 = current_price * 0.80   # %20 OTM
    otm_30 = current_price * 0.70   # %30 OTM

    print(f"\n  OTM Eşik Değerleri:")
    print(f"    %10 OTM: Strike < ${otm_10:,.2f}")
    print(f"    %15 OTM: Strike < ${otm_15:,.2f}")
    print(f"    %20 OTM: Strike < ${otm_20:,.2f}")
    print(f"    %30 OTM: Strike < ${otm_30:,.2f}")
    print("=" * 90)

    all_deep_puts = []
    summary_rows = []

    for expiry in selected_expirations:
        try:
            chain = spy.option_chain(expiry)
            puts = chain.puts.copy()
            puts['expiry'] = expiry

            # DTE (days to expiration)
            exp_date = datetime.strptime(expiry, '%Y-%m-%d')
            dte = (exp_date - datetime.now()).days
            puts['DTE'] = dte

            # OTM yüzdesi hesapla
            puts['OTM_pct'] = ((current_price - puts['strike']) / current_price) * 100

            # Derin OTM: strike < %10 OTM (mevcut fiyatın %90'ından düşük)
            deep_otm = puts[puts['strike'] < otm_10].copy()

            if len(deep_otm) > 0:
                total_oi = deep_otm['openInterest'].sum()
                total_vol = deep_otm['volume'].sum() if 'volume' in deep_otm.columns else 0
                max_oi_row = deep_otm.loc[deep_otm['openInterest'].idxmax()]

                # Kategorik OI dağılımı
                oi_10_15 = deep_otm[(deep_otm['strike'] < otm_10) & (deep_otm['strike'] >= otm_15)]['openInterest'].sum()
                oi_15_20 = deep_otm[(deep_otm['strike'] < otm_15) & (deep_otm['strike'] >= otm_20)]['openInterest'].sum()
                oi_20_30 = deep_otm[(deep_otm['strike'] < otm_20) & (deep_otm['strike'] >= otm_30)]['openInterest'].sum()
                oi_30_plus = deep_otm[deep_otm['strike'] < otm_30]['openInterest'].sum()

                summary_rows.append({
                    'Vade': expiry,
                    'DTE': dte,
                    'Derin OTM Put Sayısı': len(deep_otm),
                    'Toplam OI': int(total_oi),
                    'Toplam Hacim': int(total_vol) if pd.notna(total_vol) else 0,
                    'En Yüksek OI Strike': f"${max_oi_row['strike']:,.0f}",
                    'En Yüksek OI': int(max_oi_row['openInterest']),
                    'OI (10-15% OTM)': int(oi_10_15),
                    'OI (15-20% OTM)': int(oi_15_20),
                    'OI (20-30% OTM)': int(oi_20_30),
                    'OI (30%+ OTM)': int(oi_30_plus),
                })

                # En yüksek OI'li derin OTM putları topla
                top_puts = deep_otm.nlargest(10, 'openInterest')[
                    ['strike', 'lastPrice', 'bid', 'ask', 'volume', 'openInterest', 'impliedVolatility', 'OTM_pct']
                ].copy()
                top_puts['expiry'] = expiry
                top_puts['DTE'] = dte
                all_deep_puts.append(top_puts)

        except Exception as e:
            print(f"  [HATA] {expiry} vadesi çekilemedi: {e}")

    # ==================== ÖZET TABLO ====================
    if summary_rows:
        summary_df = pd.DataFrame(summary_rows)
        print("\n")
        print("=" * 90)
        print("  1. VADE BAZLI DERİN OTM PUT AÇIK POZİSYON ÖZETİ")
        print("=" * 90)
        print(summary_df.to_string(index=False))

        # Toplam OI
        grand_total_oi = summary_df['Toplam OI'].sum()
        grand_total_vol = summary_df['Toplam Hacim'].sum()
        print(f"\n  GENEL TOPLAM - Derin OTM Put OI: {grand_total_oi:,}")
        print(f"  GENEL TOPLAM - Derin OTM Put Hacim: {grand_total_vol:,}")

    # ==================== EN YOĞUN KONTRATLAR ====================
    if all_deep_puts:
        combined = pd.concat(all_deep_puts, ignore_index=True)
        combined = combined.sort_values('openInterest', ascending=False).head(25)

        print("\n")
        print("=" * 90)
        print("  2. EN YÜKSEK AÇIK POZİSYONLU DERİN OTM PUT OPSİYONLARI (TOP 25)")
        print("=" * 90)

        display_df = combined.copy()
        display_df.columns = ['Strike', 'Son Fiyat', 'Bid', 'Ask', 'Hacim', 'Açık Pozisyon',
                              'IV', 'OTM %', 'Vade', 'DTE']
        display_df['IV'] = display_df['IV'].apply(lambda x: f"{x*100:.1f}%" if pd.notna(x) else "N/A")
        display_df['OTM %'] = display_df['OTM %'].apply(lambda x: f"{x:.1f}%")
        display_df['Strike'] = display_df['Strike'].apply(lambda x: f"${x:,.0f}")

        print(display_df.to_string(index=False))

    # ==================== OI YOĞUNLUK HARİTASI ====================
    if all_deep_puts:
        combined_all = pd.concat(all_deep_puts, ignore_index=True)
        strike_oi = combined_all.groupby('strike')['openInterest'].sum().sort_values(ascending=False).head(15)

        print("\n")
        print("=" * 90)
        print("  3. STRİKE BAZLI OI YOĞUNLUK HARİTASI (TÜM VADELER BİRLEŞİK)")
        print("=" * 90)
        print(f"  {'Strike':>10}  {'Toplam OI':>12}  {'OTM %':>8}  {'Görsel':>40}")
        print("  " + "-" * 75)

        max_oi = strike_oi.max() if len(strike_oi) > 0 else 1
        for strike, oi in strike_oi.items():
            otm_pct = ((current_price - strike) / current_price) * 100
            bar_len = int((oi / max_oi) * 35)
            bar = "#" * bar_len
            print(f"  ${strike:>8,.0f}  {oi:>12,}  {otm_pct:>6.1f}%  {bar}")

    # ==================== OLAĞANDIŞI AKTİVİTE ====================
    if all_deep_puts:
        combined_all = pd.concat(all_deep_puts, ignore_index=True)
        # Hacim/OI oranı yüksek olanlar (yeni pozisyon açılmış olabilir)
        combined_all['Vol/OI'] = combined_all['volume'] / combined_all['openInterest'].replace(0, float('nan'))
        unusual = combined_all[combined_all['Vol/OI'] > 0.5].sort_values('Vol/OI', ascending=False).head(10)

        if len(unusual) > 0:
            print("\n")
            print("=" * 90)
            print("  4. OLAGANDISI AKTIVITE (Hacim/OI > 0.50 - Yeni Pozisyon Sinyali)")
            print("=" * 90)
            unusual_display = unusual[['expiry', 'strike', 'lastPrice', 'volume', 'openInterest', 'OTM_pct', 'Vol/OI']].copy()
            unusual_display['OTM_pct'] = unusual_display['OTM_pct'].apply(lambda x: f"{x:.1f}%")
            unusual_display['strike'] = unusual_display['strike'].apply(lambda x: f"${x:,.0f}")
            unusual_display['Vol/OI'] = unusual_display['Vol/OI'].apply(lambda x: f"{x:.2f}")
            unusual_display.columns = ['Vade', 'Strike', 'Son Fiyat', 'Hacim', 'Acik Poz.', 'OTM %', 'Vol/OI']
            print(unusual_display.to_string(index=False))
            print("\n  * Hacim/OI > 0.50: O gun islem hacminin mevcut acik pozisyonun")
            print("    yarisindan fazla oldugunu gosterir -> yeni pozisyon aciliyor olabilir.")

    # ==================== YORUM ====================
    print("\n")
    print("=" * 90)
    print("  5. ANALİZ YORUMU")
    print("=" * 90)

    if summary_rows:
        nearest = summary_rows[0]
        farthest = summary_rows[-1]
        print(f"""
  • SPY şu an ${current_price:,.2f} seviyesinde işlem görmektedir.
  • En yakın vade ({nearest['Vade']}, {nearest['DTE']} gün) derin OTM put OI: {nearest['Toplam OI']:,}
  • En uzak analiz edilen vade ({farthest['Vade']}, {farthest['DTE']} gün) derin OTM put OI: {farthest['Toplam OI']:,}
  • Toplam {len(summary_rows)} vadede birleşik derin OTM put açık pozisyonu: {grand_total_oi:,}

  YÜKSEK OI SEVİYELERİ:
  • Yüksek derin OTM put OI, genellikle kurumsal hedge (koruma) pozisyonlarını
    veya "tail risk" (kuyruk riski) sigortasını yansıtır.
  • Hacim/OI oranı yüksek kontratlar, YENİ pozisyon açılımına işaret edebilir.
  • OI yoğunluğunun belirli strike seviyelerinde kümelenmesi, bu seviyelerin
    piyasa yapıcılar için önemli "pin" noktaları olduğunu gösterebilir.

  DİKKAT: Bu veriler ~15-20 dk gecikmeli Yahoo Finance verisidir.
  Gerçek zamanlı opsiyon verisi için profesyonel veri sağlayıcıları kullanın.
""")

    print("=" * 90)
    print("  Rapor Sonu")
    print("=" * 90)


if __name__ == "__main__":
    analyze_spy_deep_otm_puts()
