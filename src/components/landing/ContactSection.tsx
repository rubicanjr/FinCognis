import Link from "next/link";
import { Mail, Linkedin } from "lucide-react";

export default function ContactSection() {
  return (
    <section id="iletisim" className="landing-section mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="landing-card rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.62),rgba(2,6,23,0.84))] p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-10">
        <p className="mb-3 font-display text-xs font-semibold tracking-[0.12em] text-[#8ddfff]">İletişim</p>
        <h2 className="font-display text-4xl font-semibold tracking-[0.01em] text-slate-50 md:text-5xl">
          Bizimle İletişime Geçin
        </h2>
        <p className="mt-4 max-w-2xl text-slate-300">
          İş birlikleri, ürün geri bildirimleri ve stratejik görüşmeler için doğrudan iletişim kanalları.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <a
            href="mailto:rubi@fincognis.com"
            className="group flex items-center gap-4 rounded-xl border border-white/12 bg-slate-950/65 px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-[#22b7ff]/55"
          >
            <span className="rounded-lg border border-[#22b7ff]/30 bg-[#22b7ff]/12 p-2">
              <Mail className="h-5 w-5 text-[#8ddfff]" strokeWidth={1.5} />
            </span>
            <span>
              <span className="block font-display text-xs tracking-[0.08em] text-slate-400">Mail</span>
              <span className="text-sm font-semibold text-slate-100 group-hover:text-[#dff4ff]">rubi@fincognis.com</span>
            </span>
          </a>

          <Link
            href="https://www.linkedin.com/in/rubi-can-icliyurek/"
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-4 rounded-xl border border-white/12 bg-slate-950/65 px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-[#22b7ff]/55"
          >
            <span className="rounded-lg border border-[#22b7ff]/30 bg-[#22b7ff]/12 p-2">
              <Linkedin className="h-5 w-5 text-[#8ddfff]" strokeWidth={1.5} />
            </span>
            <span>
              <span className="block font-display text-xs tracking-[0.08em] text-slate-400">LinkedIn</span>
              <span className="text-sm font-semibold text-slate-100 group-hover:text-[#dff4ff]">rubi-can-icliyurek</span>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
