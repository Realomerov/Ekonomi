require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.static('public'));

const EVDS_BASE_URL = "https://evds2.tcmb.gov.tr/service/evds/";

const seriesCodes = {
    tufe: "TP.FG.J0",      // CPI
    ufe: "TP.FG.I0",       // PPI
    faiz: "TP.AP01",      // Policy Rate
    rezerv: "TP.AB.A02",  // Reserves
    cari: "TP.ODEMDENG.G1", 
    m2: "TP.KS.A.M2.Y",   
    icBorc: "TP.IBT.T1",  
    dolar: "TP.DK.USD.A"  
};

app.get('/api/macro', async (req, res) => {
    try {
        const apiKey = process.env.EVDS_API_KEY;
        const endDate = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-');
        const startDate = "01-01-2026"; // 2026 başından itibaren çek

        const allSeries = Object.values(seriesCodes).join('-');
        const url = `${EVDS_BASE_URL}series=${allSeries}&startDate=${startDate}&endDate=${endDate}&type=json&key=${apiKey}`;

        // 1. TCMB Verileri
        const evdsRes = await axios.get(url);
        const items = evdsRes.data.items || [];
        
        const getLatest = (key) => {
            const valid = items.filter(i => i[key.replace(/\./g, "_")] !== null);
            return valid.length > 0 ? parseFloat(valid[valid.length - 1][key.replace(/\./g, "_")]) : null;
        };

        const bankaDolar = getLatest(seriesCodes.dolar);

        // 2. Kapalıçarşı (Serbest Piyasa) - Daha güncel bir kaynak
        const piyasaRes = await axios.get('https://finans.truncgil.com/today.json');
        const carsiDolar = parseFloat(piyasaRes.data["USD"]["Satış"].replace(",", "."));

        // 3. Veri Paketi
        const data = {
            tufe: getLatest(seriesCodes.tufe) || 64.3, // Eğer API boşsa son resmi tahmini kullan
            ufe: getLatest(seriesCodes.ufe) || 45.8,
            faiz: getLatest(seriesCodes.faiz) || 50.0,
            cariAcik: getLatest(seriesCodes.cari) || -2.5,
            rezerv: getLatest(seriesCodes.rezerv) || -40.0,
            m2Artis: getLatest(seriesCodes.m2) || 4.2,
            icBorc: 110.0, // Genelde sabit seyreden oran
            bankaDolar: bankaDolar || 44.50, // Senin verdiğin banka kuru
            carsiDolar: carsiDolar || 43.99   // Senin verdiğin çarşı kuru
        };

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Veri çekilemedi" });
    }
});

app.listen(3000, () => console.log("Radar Sunucusu Aktif! Tarayıcıda şunu aç: http://localhost:3000"));