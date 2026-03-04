require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.static('public'));

const EVDS_BASE_URL = "https://evds2.tcmb.gov.tr/service/evds/";

const seriesCodes = {
    tufe: "TP.FG.J0",      
    ufe: "TP.FG.I0",       
    faiz: "TP.AP01",      
    rezerv: "TP.AB.A02",  
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

        const bankaDolar = getLatest(seriesCodes.dolar);
        const piyasaRes = await axios.get('https://finans.truncgil.com/today.json').catch(() => null);
        const carsiDolar = piyasaRes ? parseFloat(piyasaRes.data["USD"]["Satış"].replace(",", ".")) : null;

        // VERİ YOKSA NULL DÖNER, ASLA SAHTE SAYI YOK!
        res.json({
            tufe: getLatest(seriesCodes.tufe),
            ufe: getLatest(seriesCodes.ufe),
            faiz: getLatest(seriesCodes.faiz),
            cariAcik: getLatest(seriesCodes.cari),
            rezerv: getLatest(seriesCodes.rezerv),
            m2Artis: getLatest(seriesCodes.m2),
            icBorc: getLatest(seriesCodes.icBorc),
            bankaDolar: bankaDolar,
            carsiDolar: carsiDolar
        });
    } catch (error) {
        res.status(500).json({ error: "API Hatası" });
    }
});

app.listen(3000, () => console.log("Radar Sunucusu Aktif!"));