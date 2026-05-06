export default function LandingUpdatesSection() {
  return (
    <section className="landing-section mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <article id="haberler" className="landing-card rounded-2xl border border-white/12 bg-slate-950/60 p-8 backdrop-blur-xl">
          <p className="mb-3 font-display text-xs font-semibold tracking-[0.12em] text-[#8ddfff]">Haberler</p>
          <h3 className="font-display text-3xl font-semibold tracking-[0.01em] text-slate-100">Yakında</h3>
          <p className="mt-3 text-sm text-slate-300">
            FinCognis haber akışı bu alanda yayınlanacak.
          </p>
        </article>

        <article id="ekonomik-takvim" className="landing-card rounded-2xl border border-white/12 bg-slate-950/60 p-8 backdrop-blur-xl">
          <p className="mb-3 font-display text-xs font-semibold tracking-[0.12em] text-[#8ddfff]">Ekonomik Takvim</p>
          <h3 className="font-display text-3xl font-semibold tracking-[0.01em] text-slate-100">Yakında</h3>
          <p className="mt-3 text-sm text-slate-300">
            Önemli makro veri ve etkinlik takvimi bu alanda yer alacak.
          </p>
        </article>
      </div>
    </section>
  );
}
