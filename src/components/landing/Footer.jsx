import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-surface border-t border-primary/5">
      <div className="flex flex-col md:flex-row justify-between items-center w-full px-8 py-12 max-w-7xl mx-auto gap-8">
        <div className="flex flex-col gap-4 text-center md:text-left">
          <Link href="/" className="text-lg font-bold text-primary font-headline">
            FinCognis
          </Link>
          <p className="text-primary/60 font-body text-sm tracking-wide">
            © 2024 FinCognis. Güvenli Finansal Zekâ.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-8">
          <a
            href="#analytics"
            className="text-primary/60 hover:text-secondary underline-offset-4 hover:underline transition-all duration-200"
          >
            Ürün
          </a>
          <a
            href="#security"
            className="text-primary/60 hover:text-secondary underline-offset-4 hover:underline transition-all duration-200"
          >
            Çözümler
          </a>
          <a
            href="#security"
            className="text-primary/60 hover:text-secondary underline-offset-4 hover:underline transition-all duration-200"
          >
            Güvenlik
          </a>
          <Link
            href="/tools"
            className="text-primary/60 hover:text-secondary underline-offset-4 hover:underline transition-all duration-200"
          >
            Araçlar
          </Link>
        </div>

        <div className="flex gap-4">
          <span className="material-symbols-outlined text-primary/40 hover:text-secondary cursor-pointer transition-colors">
            public
          </span>
          <span className="material-symbols-outlined text-primary/40 hover:text-secondary cursor-pointer transition-colors">
            terminal
          </span>
        </div>
      </div>
    </footer>
  );
}
