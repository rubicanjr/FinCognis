import { promises as fs } from "node:fs";
import path from "node:path";

export type FinlabEntry = {
  id: number;
  title: string;
  keyword: string;
  concept: string;
  file: string;
};

export type FinlabSeries = {
  title: string;
  subtitle: string;
  entries: FinlabEntry[];
};

export type FinlabEntryResolved = FinlabEntry & {
  slug: string;
  contentHtml: string;
};

const BLOG_CONTENT_DIR = path.join(process.cwd(), "src", "content", "finlab");

export const FINLAB_SERIES: FinlabSeries[] = [
  {
    title: "Seri 1 · Karar Odaklı Çekirdek",
    subtitle:
      "Yatırım kararlarının temelini oluşturan kritik sorular ve sistematik eleme yaklaşımı.",
    entries: [
      { id: 1, title: "Yatırım Kararı Almadan Önce Sormanız Gereken 5 Kritik Soru", keyword: "yatırım kararı verirken nelere dikkat", concept: "5 Soru Framework'ü", file: "01_yatirim_karar_5_soru.md" },
      { id: 2, title: "Doğru Hisseyi Seçmek Değil, Yanlış Kararı Elemek", keyword: "yatırımda en sık yapılan hatalar", concept: "Negatif Screening (6 Filtre)", file: "02_yanlis_karar_elemek.md" },
      { id: 3, title: "Karar Anında Yaptığınız 3 Sistematik Hata", keyword: "karar hataları yatırım", concept: "3 Hata Türü (Zamansal, Duygusal, Bilişsel)", file: "03_3_sistematik_hata.md" },
      { id: 4, title: "Veriye Sahipsiniz Ama Hâlâ Yanlış Karar Veriyorsunuz: Neden?", keyword: "veri vs karar kalitesi", concept: "Bilgi Paradoksu ve 5-7 Kritik Veri Sistemi", file: "04_veri_vs_karar.md" },
      { id: 5, title: "Bir Kararın \"İyi\" Olduğunu Nasıl Anlarsınız?", keyword: "karar kalitesi ölçümü", concept: "Outcome Bias ve Karar Kalitesi Matrisi", file: "05_karar_kalitesi_olcumu.md" },
    ],
  },
  {
    title: "Seri 2 · Simülasyon / Senaryo",
    subtitle:
      "Piyasa şoklarına karşı portföy davranışını simüle eden senaryo odaklı karar çerçeveleri.",
    entries: [
      { id: 6, title: "BIST Düşerken Almak: Hangi Koşullarda Mantıklı?", keyword: "BIST düşerken hisse almak", concept: "Düşüşün Anatomisi (Sistemik vs Duygusal)", file: "06_bist_duserken_almak.md" },
      { id: 7, title: "Faiz Artarken Hisse Alınır mı? Bir Senaryo Analizi", keyword: "faiz artarken yatırım", concept: "Faiz Hassasiyeti ve Sektörel Rotasyon", file: "07_faiz_artarken_hisse.md" },
      { id: 8, title: "Risk-Off Dönemlerinde En Sık Yapılan Hata", keyword: "risk-off yatırım stratejisi", concept: "Flight-to-Safety Hatası ve Kademeli Risk Azaltma", file: "08_risk_off_hata.md" },
      { id: 9, title: "Aynı Veriyle 2 Farklı Karar: Neden Sonuçlar Değişiyor?", keyword: "veri yorumlama farklılığı", concept: "Çerçeveleme Etkisi (Framing Effect)", file: "09_ayni_veri_farkli_karar.md" },
      { id: 10, title: "1 Ay vs 1 Yıl: Zaman Ufku Kararı Nasıl Bozar?", keyword: "zaman ufku yatırım stratejisi", concept: "Miyopik Kayıptan Kaçınma (Myopic Loss Aversion)", file: "10_zaman_ufku_karar.md" },
    ],
  },
  {
    title: "Seri 3 · Davranışsal Finans",
    subtitle:
      "Psikolojik tuzakların karar kalitesi üzerindeki etkisini analiz eden davranış odaklı seri.",
    entries: [
      { id: 11, title: "Yatırımcılar Veriden Değil, Hikâyeden Neden Etkilenir?", keyword: "yatırımcı psikolojisi karar", concept: "Narrative Bias (Hikâye Yanlılığı)", file: "11_hikaye_vs_veri.md" },
      { id: 12, title: "\"Kaçırma Korkusu\" Kararlarınızı Nasıl Sabote Ediyor?", keyword: "FOMO yatırım hatası", concept: "FOMO ve Sosyal Kanıt (Social Proof)", file: "12_fomo_yatirim.md" },
      { id: 13, title: "Zarar Kesemeyen Yatırımcının Psikolojisi", keyword: "zarar kesme psikolojisi", concept: "Disposition Effect (Elden Çıkarma Etkisi)", file: "13_zarar_kesme_psikolojisi.md" },
      { id: 14, title: "Karar Yorgunluğu: En Pahalı Hata Türü", keyword: "karar yorgunluğu yatırım", concept: "Decision Fatigue ve Karar Otomasyonu", file: "14_karar_yorgunlugu.md" },
      { id: 15, title: "Kendine Güven mi, Aşırı Güven mi?", keyword: "aşırı güven hatasının maliyeti", concept: "Overconfidence Bias ve Pre-Mortem Analizi", file: "15_asiri_guven_hatasi.md" },
    ],
  },
  {
    title: "Seri 4 · FinCognis Perspektifi",
    subtitle:
      "FinCognis'in karar simülasyonu yaklaşımını uygulamalı ve stratejik bir çerçevede sunar.",
    entries: [
      { id: 16, title: "Karar Simülasyonu Nedir ve Neden Geleceğin Standardı?", keyword: "karar simülasyonu yatırım", concept: "Tahmin vs Simülasyon (Prediction vs Simulation)", file: "16_karar_simulasyonu_nedir.md" },
      { id: 17, title: "\"Ne Olur?\" Değil, \"Ne Zaman Kırılır?\" Diye Sormak", keyword: "portföy stres testi", concept: "Kırılma Noktası Analizi (Break-even)", file: "17_ne_zaman_kirilir.md" },
      { id: 18, title: "Yatırımda Tahmin Değil, Koşul Analizi", keyword: "koşullu olasılık yatırım", concept: "Koşullu Olasılık (Conditional Probability)", file: "18_kosul_analizi_yatirim.md" },
      { id: 19, title: "Karar Öncesi Risk Görselleştirme: Yeni Nesil Yaklaşım", keyword: "risk görselleştirme portföy", concept: "Risk Dashboard ve Korelasyon Isı Haritası", file: "19_risk_gorsellestirme.md" },
      { id: 20, title: "Bir Kararı Simüle Etmek, Onu Neden Değiştirir?", keyword: "pre-mortem analizi yatırım", concept: "Pre-Mortem (Ölüm Öncesi) Analizi", file: "20_simulasyon_karar_kalitesi.md" },
    ],
  },
  {
    title: "Seri 5 · Agresif / Dikkat Çeken",
    subtitle:
      "Yatırımcının konfor alanını kırıp rasyonel sorumluluk ve hata yönetimi disiplini kurar.",
    entries: [
      { id: 21, title: "Çoğu Yatırım Kararı Aslında Hatalıdır", keyword: "yatırımda hata yönetimi", concept: "Hata Yapma Korkusu (Atychiphobia)", file: "21_cogu_karar_hatalidir.md" },
      { id: 22, title: "Kazanç Değil, Hata Azaltma Oyunu", keyword: "yatırım stratejisi oluşturma", concept: "Loser's Game (Kaybedenin Oyunu)", file: "22_hata_azaltma_oyunu.md" },
      { id: 23, title: "Piyasa Değil, Sen Yanılıyorsun", keyword: "yatırım psikolojisi", concept: "Kendine Atfetme Yanlılığı (Self-Attribution Bias)", file: "23_piyasa_degil_sen_yaniliyorsun.md" },
      { id: 24, title: "Doğru Analiz, Yanlış Karar: Nasıl Mümkün?", keyword: "yatırım kararı nasıl verilir", concept: "Uygulama Boşluğu (Execution Gap)", file: "24_dogru_analiz_yanlis_karar.md" },
      { id: 25, title: "Veri Artıyor, Karar Kalitesi Düşüyor", keyword: "finansal veri analizi", concept: "Bilgi Zehirlenmesi (Information Overload)", file: "25_veri_artiyor_karar_dusuyor.md" },
    ],
  },
];

const TABLE_ROW_REGEX = /^\s*\|.*\|\s*$/;

export function toFinlabSlug(entry: FinlabEntry): string {
  return `${String(entry.id).padStart(2, "0")}-${entry.file.replace(/\.md$/i, "")}`;
}

function fixMojibake(value: string): string {
  if (!/[Ãâ]/.test(value)) return value;
  const repaired = Buffer.from(value, "latin1").toString("utf8");
  const badCharCount = (repaired.match(/�/g) ?? []).length;
  if (badCharCount > Math.max(1, Math.floor(repaired.length * 0.01))) return value;
  return repaired;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function applyInlineMarkdown(value: string): string {
  let output = escapeHtml(value);
  output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/`([^`]+)`/g, "<code>$1</code>");
  output = output.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>',
  );
  return output;
}

function parseTableCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isTableSeparatorLine(line: string): boolean {
  if (!TABLE_ROW_REGEX.test(line)) return false;
  const cells = parseTableCells(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{1,}:?$/.test(cell.replaceAll(" ", "")));
}

function isBlockBoundary(lines: string[], index: number): boolean {
  const line = lines[index]?.trim() ?? "";
  if (!line) return true;
  if (/^#{1,6}\s+/.test(line)) return true;
  if (/^---+$/.test(line)) return true;
  if (/^\s*[-*]\s+/.test(lines[index])) return true;
  if (/^\s*\d+\.\s+/.test(lines[index])) return true;
  if (TABLE_ROW_REGEX.test(lines[index]) && isTableSeparatorLine(lines[index + 1] ?? "")) return true;
  return false;
}

function stripFirstH1(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  if (lines.length > 0 && /^#\s+/.test(lines[0])) {
    return lines.slice(1).join("\n").trimStart();
  }
  return markdown;
}

function markdownToHtml(markdown: string): string {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const html: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      i += 1;
      continue;
    }

    if (/^---+$/.test(line)) {
      html.push('<hr class="my-6 border-white/15" />');
      i += 1;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 6);
      const content = applyInlineMarkdown(headingMatch[2].trim());
      if (level === 2) {
        html.push(`<h2 class="mt-8 text-2xl font-semibold text-slate-100">${content}</h2>`);
      } else if (level === 3) {
        html.push(`<h3 class="mt-6 text-xl font-semibold text-slate-200">${content}</h3>`);
      } else {
        html.push(`<h${level} class="mt-5 text-lg font-semibold text-slate-200">${content}</h${level}>`);
      }
      i += 1;
      continue;
    }

    if (TABLE_ROW_REGEX.test(rawLine) && isTableSeparatorLine(lines[i + 1] ?? "")) {
      const headers = parseTableCells(rawLine);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && TABLE_ROW_REGEX.test(lines[i])) {
        rows.push(parseTableCells(lines[i]));
        i += 1;
      }

      const thead = `<thead><tr>${headers
        .map((cell) => `<th class="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[#8ddfff]">${applyInlineMarkdown(cell)}</th>`)
        .join("")}</tr></thead>`;
      const tbody = `<tbody>${rows
        .map((row) => `<tr class="border-t border-white/10">${row.map((cell) => `<td class="px-3 py-2 align-top text-sm text-slate-200">${applyInlineMarkdown(cell)}</td>`).join("")}</tr>`)
        .join("")}</tbody>`;

      html.push(`<div class="my-5 overflow-x-auto rounded-xl border border-white/12 bg-[#051024]/70"><table class="min-w-full border-collapse">${thead}${tbody}</table></div>`);
      continue;
    }

    if (/^\s*[-*]\s+/.test(rawLine)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, "").trim());
        i += 1;
      }
      html.push(`<ul class="my-4 list-disc space-y-1 pl-6 text-slate-200">${items.map((item) => `<li>${applyInlineMarkdown(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(rawLine)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, "").trim());
        i += 1;
      }
      html.push(`<ol class="my-4 list-decimal space-y-1 pl-6 text-slate-200">${items.map((item) => `<li>${applyInlineMarkdown(item)}</li>`).join("")}</ol>`);
      continue;
    }

    const paragraphLines: string[] = [];
    while (i < lines.length && !isBlockBoundary(lines, i)) {
      paragraphLines.push(lines[i].trim());
      i += 1;
    }
    if (paragraphLines.length > 0) {
      html.push(`<p class="my-4 leading-7 text-slate-200">${applyInlineMarkdown(paragraphLines.join(" "))}</p>`);
    }
  }

  return html.join("\n");
}

async function readBlogMarkdown(fileName: string): Promise<string> {
  const fullPath = path.join(BLOG_CONTENT_DIR, fileName);
  const raw = await fs.readFile(fullPath, "utf8");
  return fixMojibake(raw);
}

export function getAllFinlabEntries(): Array<FinlabEntry & { slug: string; seriesTitle: string }> {
  return FINLAB_SERIES.flatMap((series) =>
    series.entries.map((entry) => ({
      ...entry,
      slug: toFinlabSlug(entry),
      seriesTitle: series.title,
    })),
  );
}

export async function getFinlabEntryBySlug(slug: string): Promise<FinlabEntryResolved | null> {
  const found = getAllFinlabEntries().find((entry) => entry.slug === slug);
  if (!found) return null;
  const markdown = await readBlogMarkdown(found.file);
  const contentHtml = markdownToHtml(stripFirstH1(markdown));
  return {
    id: found.id,
    title: found.title,
    keyword: found.keyword,
    concept: found.concept,
    file: found.file,
    slug: found.slug,
    contentHtml,
  };
}

