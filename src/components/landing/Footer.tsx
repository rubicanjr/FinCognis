import Link from "next/link";
import { Globe, TerminalSquare } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-outline-variant/35 bg-surface-container-low">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-8 px-8 py-12 md:flex-row">
        <div className="flex flex-col gap-4 text-center md:text-left">
          <Link href="/" className="font-headline text-lg font-bold text-primary">
            FinCognis
          </Link>
          <p className="font-body text-sm tracking-wide text-on-surface-variant">© 2026 FinCognis. Güvenli Finansal Zekâ.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-8">
          <a href="#analytics" className="text-on-surface-variant transition-all duration-200 hover:text-secondary hover:underline">
            Ürün
          </a>
          <a href="#security" className="text-on-surface-variant transition-all duration-200 hover:text-secondary hover:underline">
            Çözümler
          </a>
          <a href="#security" className="text-on-surface-variant transition-all duration-200 hover:text-secondary hover:underline">
            Güvenlik
          </a>
          <Link href="/tools" className="text-on-surface-variant transition-all duration-200 hover:text-secondary hover:underline">
            Araçlar
          </Link>
        </div>

        <div className="flex gap-4">
          <Globe className="cursor-pointer text-on-surface-variant transition-colors hover:text-secondary" strokeWidth={1.5} />
          <TerminalSquare className="cursor-pointer text-on-surface-variant transition-colors hover:text-secondary" strokeWidth={1.5} />
        </div>
      </div>
    </footer>
  );
}
