import { Fingerprint, ShieldCheck } from "lucide-react";

export default function SecureTransactions() {
  return (
    <section id="security" className="relative overflow-hidden bg-surface-container-low py-24">
      <div className="pointer-events-none absolute right-0 top-0 h-full w-1/3 bg-info-container blur-[120px]" />

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-2">
        <div>
          <p className="mb-4 font-label text-sm font-bold uppercase tracking-[0.2em] text-secondary">
            Güvenilir Hesaplama
          </p>
          <h2 className="mb-6 font-headline text-4xl font-extrabold leading-tight text-on-surface md:text-5xl">
            FinCognis Güven Katmanı.
          </h2>
          <p className="mb-10 text-lg leading-relaxed text-on-surface-variant">
            Komisyon, korelasyon ve stres hesapları; sürümlenmiş veri seti, izlenebilir model adımları ve tekrar üretilebilir
            sonuç mantığı ile çalışır.
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex-shrink-0 rounded-lg bg-info-container p-2">
                <ShieldCheck className="h-5 w-5 text-secondary" strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="font-headline font-bold text-on-surface">Kaynak Verisi Bütünlüğü</h4>
                <p className="text-sm text-on-surface-variant">
                  Broker ve piyasa verileri tek şema ile doğrulanır, hatalı dosya otomatik reddedilir.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-1 flex-shrink-0 rounded-lg bg-info-container p-2">
                <Fingerprint className="h-5 w-5 text-secondary" strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="font-headline font-bold text-on-surface">Model İzlenebilirliği</h4>
                <p className="text-sm text-on-surface-variant">
                  Her araç çıktıyı kalem kalem açıklar: maliyet kırılımı, risk metriği ve senaryo etkisi.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-info-container blur-3xl" />
          <div className="glass-panel relative rounded-3xl p-8">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex gap-2">
                <div className="h-3 w-3 rounded-full bg-error" />
                <div className="h-3 w-3 rounded-full bg-warning" />
                <div className="h-3 w-3 rounded-full bg-success" />
              </div>
              <span className="font-mono text-xs text-on-surface-variant">KASA_AKTIF_S01</span>
            </div>

            <div className="space-y-4">
              <div className="h-12 animate-pulse rounded-xl border border-outline-variant/30 bg-surface-container-high" />
              <div className="h-12 rounded-xl border border-outline-variant/30 bg-surface-container-high" />
              <div className="flex h-32 items-center justify-center rounded-xl border border-outline-variant/35 bg-surface-container">
                <Fingerprint className="h-10 w-10 text-secondary" strokeWidth={1.5} />
              </div>
              <div className="h-12 rounded-xl border border-outline-variant/30 bg-surface-container-high" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
