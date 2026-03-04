require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.static('public'));

const EVDS_BASE_URL = "https://evds2.tcmb.gov.tr/service/evds/";

const seriesCodes = {
    tufe: "TP.FG.J0",      // CPI (Yıllık)
    ufe: "TP.FG.I0",       // PPI (Yıllık)
    faiz: "TP.AP01",      // Politika Faizi
    rezerv: "TP.AB.A02",  // Brüt Rezervler
    cari: "TP.ODEMDENG.G1", 
    m2: "TP.KS.A.M2.Y",   
    icBorc: "TP.IBT.T1",  
    dolar: "TP.DK.USD.A"  
};

app.get('/api/macro', async (req, res) => {
    try {
        const apiKey = process.env.EVDS_API_KEY;
        const endDate = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-');
        const startDate = "01-01-2026"; 

        const allSeries = Object.values(seriesCodes).join('-');
        const url = `${EVDS_BASE_URL}series=${allSeries}&startDate=${startDate}&endDate=${endDate}&type=json&key=${apiKey}`;

        const evdsRes = await axios.get(url);
        const items = evdsRes.data.items || [];
        
        const getLatest = (key) => {
            const valid = items.filter(i => i[key.replace(/\./g, "_")] !== null);
            return valid.length > 0 ? parseFloat(valid[valid.length - 1][key.replace(/\./g, "_")]) : null;
        };

        // Piyasa verisi çekimi
        const piyasaRes = await axios.get('https://finans.truncgil.com/today.json').catch(() => null);
        const carsiDolar = piyasaRes ? parseFloat(piyasaRes.data["USD"]["Satış"].replace(",", ".")) : 43.99;

        // VERİLERİ AYRI AYRI ÇEKİP PAKETLİYORUZ (HİÇBİRİ SABİT DEĞİL)
        const data = {
            tufe: getLatest(seriesCodes.tufe),
            ufe: getLatest(seriesCodes.ufe),
            faiz: getLatest(seriesCodes.faiz),
            cariAcik: getLatest(seriesCodes.cari),
            rezerv: getLatest(seriesCodes.rezerv),
            m2Artis: getLatest(seriesCodes.m2),
            icBorc: getLatest(seriesCodes.icBorc) || 110.0,
            bankaDolar: getLatest(seriesCodes.dolar) || 44.50,
            carsiDolar: carsiDolar
        };

        res.json(data);
    } catch (error) {
        console.error("Backend Veri Hatası:", error.message);
        res.status(500).json({ error: "Veri Çekilemedi" });
    }
});

app.listen(3000, () => console.log("Radar Sunucusu Aktif! Tarayıcıda şunu aç: http://localhost:3000"));