import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-primary/5 bg-surface">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-8 px-8 py-12 md:flex-row">
        <div className="flex flex-col gap-4 text-center md:text-left">
          <Link href="/" className="font-headline text-lg font-bold text-primary">
            FinCognis
          </Link>
          <p className="font-body text-sm tracking-wide text-primary/60">© 2026 FinCognis. Guvenli Finansal Zeka.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-8">
          <a href="#analytics" className="text-primary/60 transition-all duration-200 hover:text-secondary hover:underline">
            Urun
          </a>
          <a href="#security" className="text-primary/60 transition-all duration-200 hover:text-secondary hover:underline">
            Cozumler
          </a>
          <a href="#security" className="text-primary/60 transition-all duration-200 hover:text-secondary hover:underline">
            Guvenlik
          </a>
          <Link href="/tools" className="text-primary/60 transition-all duration-200 hover:text-secondary hover:underline">
            Araclar
          </Link>
        </div>

        <div className="flex gap-4">
          <span className="material-symbols-outlined cursor-pointer text-primary/40 transition-colors hover:text-secondary">
            public
          </span>
          <span className="material-symbols-outlined cursor-pointer text-primary/40 transition-colors hover:text-secondary">
            terminal
          </span>
        </div>
      </div>
    </footer>
  );
}
