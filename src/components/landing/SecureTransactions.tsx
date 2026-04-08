export default function SecureTransactions() {
  return (
    <section id="security" className="relative overflow-hidden bg-surface-container-low py-24">
      <div className="pointer-events-none absolute right-0 top-0 h-full w-1/3 bg-secondary/5 blur-[120px]" />

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-2">
        <div>
          <p className="mb-4 font-label text-sm font-bold uppercase tracking-[0.2em] text-secondary">Guvenilir Hesaplama</p>
          <h2 className="mb-6 font-headline text-4xl font-extrabold leading-tight text-on-surface md:text-5xl">
            FinCognis Guven Katmani.
          </h2>
          <p className="mb-10 text-lg leading-relaxed text-on-surface-variant">
            Komisyon, korelasyon ve stres hesaplari; surumlenmis veri seti, izlenebilir model adimlari ve tekrar uretilebilir sonuc mantigi ile calisir.
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex-shrink-0 rounded-lg bg-secondary/10 p-2">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  encrypted
                </span>
              </div>
              <div>
                <h4 className="font-headline font-bold text-on-surface">Kaynak Verisi Butunlugu</h4>
                <p className="text-sm text-on-surface-variant">Broker ve piyasa verileri tek sema ile dogrulanir, hatali dosya otomatik reddedilir.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-1 flex-shrink-0 rounded-lg bg-secondary/10 p-2">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  fingerprint
                </span>
              </div>
              <div>
                <h4 className="font-headline font-bold text-on-surface">Model Izlenebilirligi</h4>
                <p className="text-sm text-on-surface-variant">Her arac ciktiyi kalem kalem aciklar: maliyet kirilimi, risk metrigi ve senaryo etkisi.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-secondary/10 blur-3xl" />
          <div className="glass-panel relative rounded-3xl border border-outline-variant/20 p-8">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex gap-2">
                <div className="h-3 w-3 rounded-full bg-error" />
                <div className="h-3 w-3 rounded-full bg-tertiary" />
                <div className="h-3 w-3 rounded-full bg-secondary" />
              </div>
              <span className="font-mono text-xs text-on-surface-variant">KASA_AKTIF_S01</span>
            </div>

            <div className="space-y-4">
              <div className="h-12 animate-pulse rounded-xl bg-surface-container-highest" />
              <div className="h-12 rounded-xl bg-surface-container-highest/60" />
              <div className="flex h-32 items-center justify-center rounded-xl border border-secondary/20 bg-secondary/5">
                <span className="material-symbols-outlined text-4xl text-secondary">fingerprint</span>
              </div>
              <div className="h-12 rounded-xl bg-surface-container-highest" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
