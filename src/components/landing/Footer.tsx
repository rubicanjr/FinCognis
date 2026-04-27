import Link from "next/link";
import { Globe, TerminalSquare } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-[#22b7ff]/20 bg-[#030915]/55 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-8 px-6 py-12 md:flex-row">
        <div className="flex flex-col gap-4 text-center md:text-left">
          <Link href="/" className="font-display text-lg font-semibold tracking-[0.02em] text-[#eaf6ff]">
            FinCognis
          </Link>
          <p className="text-sm tracking-wide text-slate-400">© 2026 FinCognis. Güvenli Finansal Zekâ.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-8">
          <Link href="/#karsilastir" className="font-display text-slate-400 transition-all duration-200 hover:text-[#8ddfff] hover:underline">
            Karşılaştırma Modu
          </Link>
          <Link href="/#profil-kesif" className="font-display text-slate-400 transition-all duration-200 hover:text-[#8ddfff] hover:underline">
            Profil Keşif Modu
          </Link>
          <Link href="/#metrik-rehberi" className="font-display text-slate-400 transition-all duration-200 hover:text-[#8ddfff] hover:underline">
            Metrik Rehberi
          </Link>
          <Link href="/#uyum-bildirimi" className="font-display text-slate-400 transition-all duration-200 hover:text-[#8ddfff] hover:underline">
            Uyum Bildirimi
          </Link>
          <Link href="/tools" className="font-display text-slate-400 transition-all duration-200 hover:text-[#8ddfff] hover:underline">
            Araçlar (/tools)
          </Link>
        </div>

        <div className="flex gap-4">
          <Globe className="cursor-pointer text-slate-400 transition-colors hover:text-[#8ddfff]" strokeWidth={1.5} />
          <TerminalSquare className="cursor-pointer text-slate-400 transition-colors hover:text-[#8ddfff]" strokeWidth={1.5} />
        </div>
      </div>
    </footer>
  );
}
