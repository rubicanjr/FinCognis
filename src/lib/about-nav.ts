export interface AboutNavItem {
  label: string;
  href: string;
  description?: string;
}

export const ABOUT_NAV_ITEMS: AboutNavItem[] = [
  {
    label: "Misyon & Vizyon",
    href: "/hakkimizda/misyon-vizyon",
    description:
      "FinCognis'in hangi problemi çözmek için kurulduğunu ve uzun vadeli hedeflerini anlatır.",
  },
  {
    label: "Felsefe",
    href: "/hakkimizda/felsefe",
    description:
      "Karar kalitesi, metodoloji şeffaflığı ve yatırım dili güvenliği ilkelerimizi açıklar.",
  },
  {
    label: "Yol Haritası",
    href: "/hakkimizda/yol-haritasi",
    description:
      "Ürün gelişim fazları, planlanan modüller ve kamuya açık ilerleme yaklaşımımız.",
  },
  {
    label: "Topluluk & Erken Erişim",
    href: "/hakkimizda/topluluk-erken-erisim",
    description:
      "Topluluk katılım modeli, pilot kullanıcı programı ve erken erişim başvuru çerçevesi.",
  },
  {
    label: "Basında Biz / Güncellemeler",
    href: "/hakkimizda/basinda-biz-guncellemeler",
    description:
      "Basın görünürlüğü, duyurular ve ürün güncellemelerinin yayımlandığı merkez.",
  },
  {
    label: "CoreTeam",
    href: "/ekip",
  },
  {
    label: "İletişim",
    href: "/iletisim",
  },
];
