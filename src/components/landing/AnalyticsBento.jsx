import Image from "next/image";

export default function AnalyticsBento() {
  return (
    <section id="analytics" className="py-24 px-6 max-w-7xl mx-auto">
      <div className="mb-16 text-left">
        <p className="text-secondary font-label font-bold tracking-[0.2em] uppercase text-sm mb-4">
          Gelişmiş Analitik
        </p>
        <h2 className="text-4xl md:text-5xl font-headline font-extrabold text-on-surface">
          Veriden içgörüye, anında.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-auto md:h-[600px]">
        {/* Öngörülü Likidite — 8 col */}
        <div className="md:col-span-8 glass-panel rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10">
            <h3 className="text-2xl font-headline font-bold mb-4">
              Öngörülü Likidite Motorları
            </h3>
            <p className="text-on-surface-variant max-w-md">
              Makine öğrenimiyle %99,8 doğrulukla nakit akışı tahmini yapın.
              Anomalileri bilançonuzu etkilemeden önce tespit edin.
            </p>
          </div>
          <div className="mt-8 relative z-10">
            <div className="flex gap-4">
              <div className="p-4 bg-surface-container-highest rounded-xl">
                <p className="text-xs text-on-tertiary-container font-label uppercase font-bold mb-1">
                  Anlık Akış
                </p>
                <p className="text-2xl font-headline font-bold text-secondary">
                  +14,2%
                </p>
              </div>
              <div className="p-4 bg-surface-container-highest rounded-xl">
                <p className="text-xs text-on-tertiary-container font-label uppercase font-bold mb-1">
                  Risk Faktörü
                </p>
                <p className="text-2xl font-headline font-bold text-error">
                  Düşük
                </p>
              </div>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 w-1/2 opacity-20 group-hover:opacity-40 transition-opacity duration-500">
            <Image
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5zIkeWmUaXPxHWIrmXWSFcMjTTad6uhVNuqAEqOpF3q8K9WGFgBTmEHH3da48i72NVygBEYissyC47XHJx7OzboSXNop_2KqCVihQvkHfrUH2iNfF4Zo6u9X_4MfW4GuUK7fANFkX0Js__Zy1SSJa8-4Q6WN6-W2JtE7qM-Zh3vphwRY_3aqNfYm9tynl-6WOphQygQxH5N0RvIweVJP_EbaOFp6paq-DHOMVhGhRDwGPzRPx1VVOG2Ho_ZzOdGTXm1atvux1dyie"
              alt="Analitik Görsel"
              width={600}
              height={400}
              className="object-cover h-full w-full"
            />
          </div>
        </div>

        {/* Duygu Analizi — 4 col */}
        <div className="md:col-span-4 bg-surface-container-high rounded-3xl p-8 flex flex-col border border-outline-variant/10">
          <div className="bg-secondary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-secondary">
              query_stats
            </span>
          </div>
          <h3 className="text-2xl font-headline font-bold mb-4">
            Duygu Analizi
          </h3>
          <p className="text-on-surface-variant mb-auto">
            40.000+ küresel haber kaynağı ve sosyal sinyallerden piyasa
            trendlerini izleyin; eyleme dönüştürülebilir sinyallere çevirin.
          </p>
          <div className="pt-6 border-t border-outline-variant/10">
            <a
              className="text-secondary font-bold flex items-center gap-2 group/link"
              href="#"
            >
              Daha Fazla{" "}
              <span className="material-symbols-outlined group-hover/link:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </a>
          </div>
        </div>

        {/* Milisaniye-altı İşlem — 4 col */}
        <div className="md:col-span-4 glass-panel rounded-3xl p-8 flex flex-col justify-center items-center text-center">
          <span
            className="material-symbols-outlined text-5xl text-primary mb-4"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            speed
          </span>
          <h3 className="text-xl font-headline font-bold">
            Milisaniye-altı İşlem
          </h3>
          <p className="text-on-surface-variant text-sm mt-2">
            Gerçek zamanlı portföy dengeleme için kurumsal düzeyde gecikme.
          </p>
        </div>

        {/* Birleşik API — 8 col */}
        <div className="md:col-span-8 glass-panel rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 border border-outline-variant/10">
          <div className="w-full md:w-1/3">
            <h3 className="text-2xl font-headline font-bold mb-4">
              Birleşik API
            </h3>
            <p className="text-on-surface-variant">
              Tüm finansal temelleriniz için tek uç nokta. Haftalar değil,
              dakikalar içinde canlıya alın.
            </p>
          </div>
          <div className="w-full md:w-2/3 bg-surface-container-lowest p-4 rounded-xl font-mono text-sm text-secondary-fixed-dim overflow-x-auto">
            <code>GET /v1/intelligence/stream?precision=high</code>
            <br />
            <code>{`{ "status": "active", "throughput": "8GB/s" }`}</code>
          </div>
        </div>
      </div>
    </section>
  );
}
