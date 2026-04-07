const brokersData = require('./brokers.json');

const BSMV_RATE = 0.05;          // %5
const BIST_PAYI_RATE = 0.000025; // yüzbinde 2.5
const TAKASBANK_FEE = 0.02;      // sabit 0.02 TL

/**
 * Verilen tutar ve broker adına göre komisyon detaylarını hesaplar.
 *
 * @param {number} tutar - İşlem tutarı (TL)
 * @param {string} brokerName - Broker adı (brokers.json'daki "name" alanı)
 * @returns {{ komisyon: number, bsmv: number, bistPayı: number, takasbank: number, toplam: number }}
 */
function calculateCommission(tutar, brokerName) {
  if (typeof tutar !== 'number' || tutar <= 0) {
    throw new Error('Tutar pozitif bir sayı olmalıdır.');
  }

  const broker = brokersData.brokers.find(
    (b) => b.name.toLowerCase() === brokerName.toLowerCase()
  );

  if (!broker) {
    const validNames = brokersData.brokers.map((b) => b.name).join(', ');
    throw new Error(
      `"${brokerName}" adında bir broker bulunamadı. Geçerli isimler: ${validNames}`
    );
  }

  // --- Komisyon ---
  let komisyon = tutar * broker.spotRate;

  // Minimum komisyon kontrolü
  if (broker.minCommission > 0 && komisyon < broker.minCommission) {
    komisyon = broker.minCommission;
  }

  // --- BSMV ---
  // Eğer broker oranına BSMV zaten dahilse tekrar eklenmez
  const bsmv = broker.bsmvIncluded ? 0 : komisyon * BSMV_RATE;

  // --- BIST Payı ---
  const bistPayı = tutar * BIST_PAYI_RATE;

  // --- Takasbank ---
  const takasbank = TAKASBANK_FEE;

  // --- Toplam ---
  const toplam = komisyon + bsmv + bistPayı + takasbank;

  // 2 ondalıklı yuvarla
  const round = (n) => Math.round(n * 100) / 100;

  return {
    komisyon:  round(komisyon),
    bsmv:      round(bsmv),
    bistPayı:  round(bistPayı),
    takasbank: round(takasbank),
    toplam:    round(toplam),
  };
}

module.exports = calculateCommission;

// --- CLI test ---
if (require.main === module) {
  const tutar = parseFloat(process.argv[2]) || 10000;
  const broker = process.argv[3] || 'BtcTurk';

  console.log(`\n📊 Komisyon Hesaplama`);
  console.log(`   Tutar : ${tutar.toLocaleString('tr-TR')} TL`);
  console.log(`   Broker: ${broker}\n`);

  try {
    const result = calculateCommission(tutar, broker);
    console.log(`   Komisyon   : ${result.komisyon.toFixed(2)} TL`);
    console.log(`   BSMV (%5)  : ${result.bsmv.toFixed(2)} TL`);
    console.log(`   BIST Payı  : ${result.bistPayı.toFixed(2)} TL`);
    console.log(`   Takasbank  : ${result.takasbank.toFixed(2)} TL`);
    console.log(`   ─────────────────────`);
    console.log(`   TOPLAM     : ${result.toplam.toFixed(2)} TL\n`);
  } catch (err) {
    console.error(`   ❌ Hata: ${err.message}\n`);
  }
}
