export default function SecureTransactions() {
  return (
    <section
      id="security"
      className="py-24 relative overflow-hidden bg-surface-container-low"
    >
      <div className="absolute top-0 right-0 w-1/3 h-full bg-secondary/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <p className="text-secondary font-label font-bold tracking-[0.2em] uppercase text-sm mb-4">
            Güvenli İşlemler
          </p>
          <h2 className="text-4xl md:text-5xl font-headline font-extrabold text-on-surface mb-6 leading-tight">
            Sıfır Güven Altyapısı.
          </h2>
          <p className="text-lg text-on-surface-variant mb-10 leading-relaxed">
            Her bayt veri AES-256 ile şifrelenir ve coğrafi olarak dağıtılmış
            kasalarda saklanır. Güvenliği bir özellik değil, temel kimliğimiz
            olarak ele alıyoruz.
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="mt-1 bg-secondary/10 p-2 rounded-lg flex-shrink-0">
                <span
                  className="material-symbols-outlined text-secondary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  encrypted
                </span>
              </div>
              <div>
                <h4 className="font-headline font-bold text-on-surface">
                  Uçtan Uca Şifreleme
                </h4>
                <p className="text-on-surface-variant text-sm">
                  Her işlem katmanında askeri düzeyde protokoller.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-1 bg-secondary/10 p-2 rounded-lg flex-shrink-0">
                <span
                  className="material-symbols-outlined text-secondary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  fingerprint
                </span>
              </div>
              <div>
                <h4 className="font-headline font-bold text-on-surface">
                  Biyometrik Çok Faktörlü Doğrulama
                </h4>
                <p className="text-on-surface-variant text-sm">
                  Davranış kalıpları dahil gelişmiş kimlik doğrulama.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 bg-secondary/10 blur-3xl rounded-full" />
          <div className="relative glass-panel p-8 rounded-3xl border border-outline-variant/20">
            <div className="flex justify-between items-center mb-8">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-error" />
                <div className="w-3 h-3 rounded-full bg-tertiary" />
                <div className="w-3 h-3 rounded-full bg-secondary" />
              </div>
              <span className="text-xs font-mono text-on-surface-variant">
                KASA_AKTİF_S01
              </span>
            </div>

            <div className="space-y-4">
              <div className="h-12 bg-surface-container-highest rounded-xl animate-pulse" />
              <div className="h-12 bg-surface-container-highest/60 rounded-xl" />
              <div className="h-32 bg-secondary/5 rounded-xl border border-secondary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary text-4xl">
                  fingerprint
                </span>
              </div>
              <div className="h-12 bg-surface-container-highest rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
