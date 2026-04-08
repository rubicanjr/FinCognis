import "./globals.css";

export const metadata = {
  title: "FinCognis | Güvenli Finansal Zekâ",
  description:
    "Yüksek frekanslı analitik ve kurumsal düzeyde güvenlik. Fintech operasyonlarınızı mutlak güvenle ölçeklendirin.",
  keywords: [
    "fintech",
    "financial intelligence",
    "analytics",
    "security",
    "SaaS",
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;700;800&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface text-on-surface">{children}</body>
    </html>
  );
}
