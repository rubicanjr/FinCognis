import Image from "next/image";

export default function AnalyticsBento() {
  return (
    <section id="analytics" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mb-16 text-left">
        <p className="mb-4 font-label text-sm font-bold uppercase tracking-[0.2em] text-secondary">Gelismis Analitik</p>
        <h2 className="font-headline text-4xl font-extrabold text-on-surface md:text-5xl">Veriden icgoruye, aninda.</h2>
      </div>

      <div className="grid h-auto grid-cols-1 gap-6 md:h-[600px] md:grid-cols-12">
        <div className="glass-panel group relative flex flex-col justify-between overflow-hidden rounded-3xl p-8 md:col-span-8">
          <div className="relative z-10">
            <h3 className="mb-4 font-headline text-2xl font-bold">Ongorulu Likidite Motorlari</h3>
            <p className="max-w-md text-on-surface-variant">
              Makine ogrenimiyle nakit akis tahmini yapin. Anomalileri bilancoyu etkilemeden once tespit edin.
            </p>
          </div>
          <div className="relative z-10 mt-8 flex gap-4">
            <div className="rounded-xl bg-surface-container-highest p-4">
              <p className="mb-1 font-label text-xs font-bold uppercase text-on-tertiary-container">Anlik Akis</p>
              <p className="font-headline text-2xl font-bold text-secondary">+14,2%</p>
            </div>
            <div className="rounded-xl bg-surface-container-highest p-4">
              <p className="mb-1 font-label text-xs font-bold uppercase text-on-tertiary-container">Risk Faktoru</p>
              <p className="font-headline text-2xl font-bold text-error">Dusuk</p>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 w-1/2 opacity-20 transition-opacity duration-500 group-hover:opacity-40">
            <Image
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5zIkeWmUaXPxHWIrmXWSFcMjTTad6uhVNuqAEqOpF3q8K9WGFgBTmEHH3da48i72NVygBEYissyC47XHJx7OzboSXNop_2KqCVihQvkHfrUH2iNfF4Zo6u9X_4MfW4GuUK7fANFkX0Js__Zy1SSJa8-4Q6WN6-W2JtE7qM-Zh3vphwRY_3aqNfYm9tynl-6WOphQygQxH5N0RvIweVJP_EbaOFp6paq-DHOMVhGhRDwGPzRPx1VVOG2Ho_ZzOdGTXm1atvux1dyie"
              alt="Analitik Gorsel"
              width={600}
              height={400}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <div className="flex flex-col rounded-3xl border border-outline-variant/10 bg-surface-container-high p-8 md:col-span-4">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
            <span className="material-symbols-outlined text-secondary">query_stats</span>
          </div>
          <h3 className="mb-4 font-headline text-2xl font-bold">Duygu Analizi</h3>
          <p className="mb-auto text-on-surface-variant">
            40.000+ haber kaynagi ve sosyal sinyalden piyasa trendlerini izleyin.
          </p>
        </div>

        <div className="glass-panel flex flex-col items-center justify-center rounded-3xl p-8 text-center md:col-span-4">
          <span className="material-symbols-outlined mb-4 text-5xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            speed
          </span>
          <h3 className="font-headline text-xl font-bold">Milisaniye-alti Islem</h3>
          <p className="mt-2 text-sm text-on-surface-variant">Gercek zamanli portfoy dengeleme icin kurumsal gecikme.</p>
        </div>

        <div className="glass-panel flex flex-col items-center gap-8 rounded-3xl border border-outline-variant/10 p-8 md:col-span-8 md:flex-row">
          <div className="w-full md:w-1/3">
            <h3 className="mb-4 font-headline text-2xl font-bold">Birlesik API</h3>
            <p className="text-on-surface-variant">Tek uc nokta ile dakikalar icinde canliya alin.</p>
          </div>
          <div className="w-full overflow-x-auto rounded-xl bg-surface-container-lowest p-4 font-mono text-sm text-secondary-fixed-dim md:w-2/3">
            <code>GET /v1/intelligence/stream?precision=high</code>
            <br />
            <code>{`{ "status": "active", "throughput": "8GB/s" }`}</code>
          </div>
        </div>
      </div>
    </section>
  );
}
