const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.static('public'));

app.get('/api/macro', async (req, res) => {
    let bankaDolar = null;
    let carsiDolar = null;
    
    try {
        console.log("Trunçgil'den anlık döviz kurları çekiliyor...");
        const piyasaRes = await axios.get('https://finans.truncgil.com/today.json', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36' },
            timeout: 5000
        });
        
        if (piyasaRes.data && piyasaRes.data["USD"]) {
            carsiDolar = parseFloat(piyasaRes.data["USD"]["Satış"].replace(",", "."));
            bankaDolar = parseFloat(piyasaRes.data["USD"]["Alış"].replace(",", "."));
            console.log(`[🟢 BAŞARILI] Çarşı: ${carsiDolar} | Banka: ${bankaDolar}`);
        }
    } catch (err) {
        console.log(`[❌ HATA] Döviz çekilemedi: ${err.message}`);
    }

    // Sadece döviz verisini Frontend'e yolluyoruz. Diğerleri Frontend'in kendi hafızasından (Manuel) gelecek.
    res.json({ bankaDolar, carsiDolar });
});

app.listen(3000, () => console.log("Hibrit Veltus Motoru Çalışıyor -> http://localhost:3000"));