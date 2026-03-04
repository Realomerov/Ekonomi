const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.static('public'));

// SIFIR SAHTE VERİ PRENSİBİ
let cachedData = {
    tufe: null, ufe: null, faiz: null, cariAcik: null, 
    rezerv: null, m2Artis: null, icBorc: null, 
    bankaDolar: null, carsiDolar: null
};

async function ahtapotArkaPlandaCalis() {
    console.log("\n==================================================");
    console.log("KAZIYICI (SCRAPER) AHTAPOT UYANDI: EVDS Bypass Ediliyor...");
    
    try {
        const axiosConfig = {
            headers: {
                // TCMB bizi normal bir Google Chrome kullanıcısı sansın diye kimlik gizliyoruz
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36'
            },
            timeout: 10000 
        };

        // 1. ADIM: TRUNÇGİL (Döviz Kurları - %100 Çalışıyor)
        let bankaDolar = null;
        let carsiDolar = null;
        try {
            console.log("[⏳] Trunçgil Serbest Piyasa Taranıyor...");
            const piyasaRes = await axios.get('https://finans.truncgil.com/today.json', axiosConfig);
            if (piyasaRes.data && piyasaRes.data["USD"]) {
                carsiDolar = parseFloat(piyasaRes.data["USD"]["Satış"].replace(",", "."));
                bankaDolar = parseFloat(piyasaRes.data["USD"]["Alış"].replace(",", "."));
                console.log(`[🟢 BAŞARILI] Kurlar: Çarşı ${carsiDolar} | Banka ${bankaDolar}`);
            }
        } catch (err) { 
            console.log(`[❌] Trunçgil Bağlantısı Koptu: ${err.message}`);
        }

        // 2. ADIM: TCMB ANA SAYFASINI KAZIMA (API Key Olmadan Doğrudan Siteden Çekim)
        let tufe = null;
        let faiz = null;
        try {
            console.log("[⏳] TCMB Ana Sayfası Kazınıyor (Web Scraping)...");
            const tcmbRes = await axios.get('https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR', axiosConfig);
            const html = tcmbRes.data;

            // HTML içinden "Tüketici Fiyat Endeksi (TÜFE)" metnini bul ve yanındaki rakamı al
            const tufeMatch = html.match(/Tüketici Fiyat Endeksi.*?%(\d+,\d+)/is) || html.match(/TÜFE.*?%?(\d+,\d+)/is);
            if (tufeMatch) {
                tufe = parseFloat(tufeMatch[1].replace(',', '.'));
                console.log(`[🟢 BAŞARILI] Ana Sayfadan TÜFE Kazındı: ${tufe}`);
            } else {
                console.log(`[🟡] TCMB Ana sayfasında TÜFE bulunamadı.`);
            }

            // HTML içinden "Politika Faizi" metnini bul ve yanındaki rakamı al
            const faizMatch = html.match(/Politika Faizi.*?%(\d+,\d+)/is) || html.match(/faizi.*?%?(\d+,\d+)/is);
            if (faizMatch) {
                faiz = parseFloat(faizMatch[1].replace(',', '.'));
                console.log(`[🟢 BAŞARILI] Ana Sayfadan Politika Faizi Kazındı: ${faiz}`);
            } else {
                console.log(`[🟡] TCMB Ana sayfasında Faiz bulunamadı.`);
            }

        } catch (err) {
            console.log(`[❌] TCMB Ana Sayfa Kazıma Başarısız: ${err.message}`);
        }

        // 3. ADIM: DÜRÜSTLÜK (Gelen veri neyse o, gerisi null)
        cachedData = {
            tufe: tufe,
            ufe: null, // Ana sayfada ilan edilmediği için dürüstçe null bırakıyoruz
            faiz: faiz,
            cariAcik: null, // Ana sayfada yok
            rezerv: null, // Ana sayfada yok
            m2Artis: null, // Ana sayfada yok
            icBorc: null, // Ana sayfada yok
            bankaDolar: bankaDolar,
            carsiDolar: carsiDolar
        };

        console.log("GÜNCELLEME TAMAMLANDI! Ulaşılabilen Tüm Gerçek Veriler Hafızada.");
        console.log("==================================================\n");

    } catch (error) {
        console.error("SİSTEM ÇÖKTÜ:", error.message);
    }
}

// Sistemi Başlat
ahtapotArkaPlandaCalis();
setInterval(ahtapotArkaPlandaCalis, 300000);

app.get('/api/macro', (req, res) => {
    res.json(cachedData);
});

app.listen(3000, () => console.log("Veltus Kazıyıcı Motoru -> http://localhost:3000"));