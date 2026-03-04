let myChart = null;

// HAFIZA (CACHE) VE UYARI SİSTEMİ
async function runRadar() {
    const btn = document.getElementById('runBtn');
    const status = document.getElementById('statusText');
    btn.innerText = "Veri Aranıyor...";

    try {
        const response = await fetch('http://localhost:3000/api/macro');
        if (!response.ok) throw new Error("API Kapalı");
        
        const data = await response.json();
        
        // Başarılıysa hafızaya al
        const cache = { data, timestamp: new Date().toLocaleString() };
        localStorage.setItem('veltus_cache', JSON.stringify(cache));
        
        processAndDisplay(data);
        status.innerText = "Canlı Veri: " + new Date().toLocaleTimeString();
        status.style.color = "var(--text-muted)";
    } catch (err) {
        // Hata varsa hafızadan yükle
        const cached = JSON.parse(localStorage.getItem('veltus_cache'));
        if (cached) {
            processAndDisplay(cached.data);
            status.innerText = `Veri Çekilemedi. Eski veriler gösteriliyor (Tarih: ${cached.timestamp})`;
            status.style.color = "var(--warm)";
        } else {
            status.innerText = "Bağlantı Hatası ve Kayıtlı Veri Yok!";
            status.style.color = "var(--danger)";
        }
    } finally {
        btn.innerText = "Radarı Güncelle";
    }
}

function processAndDisplay(data) {
    const cds = parseFloat(document.getElementById('cdsInput').value) || 250;
    
    // Değerler null ise "Bekleniyor" yazdıracağız, skor hesaplamayacağız
    const isDataComplete = Object.values(data).every(v => v !== null);
    
    let makas = (data.carsiDolar && data.bankaDolar) ? ((data.carsiDolar - data.bankaDolar) / data.bankaDolar) * 100 : null;
    let reelFaiz = (data.faiz && data.tufe) ? data.faiz - data.tufe : null;
    let enfFarki = (data.ufe && data.tufe) ? data.ufe - data.tufe : null;

    let score = 0;
    if (isDataComplete) {
        score += calcPoints(Math.abs(makas), 0, 5, 200);
        score += calcPoints(-reelFaiz, 0, 20, 200);
        score += calcPoints(data.icBorc || 110, 100, 130, 150);
        score += calcPoints(enfFarki, 0, 20, 100);
        score += calcPoints(-data.cariAcik, 0, 5, 100);
        score += calcPoints(-data.rezerv, 0, 50, 100);
        score += calcPoints(cds, 300, 600, 100);
        score += calcPoints(data.m2Artis, 2, 8, 50);
    }

    updateUI(data, makas, reelFaiz, enfFarki, Math.round(score), cds, isDataComplete);
}

function updateUI(data, makas, reelFaiz, enfFarki, score, cds, isDataComplete) {
    const mainScore = document.getElementById('mainScore');
    const mainSummary = document.getElementById('mainSummary');
    
    if (!isDataComplete) {
        mainScore.innerText = "Veri Bekleniyor...";
        mainScore.style.color = "var(--warm)";
    } else {
        const hue = 140 - (score / 1000 * 140);
        mainScore.innerText = `${score} / 1000`;
        mainScore.style.color = `hsl(${hue}, 80%, 45%)`;
    }

    const grid = document.getElementById('cardGrid');
    grid.innerHTML = '';

    const cards = [
        { title: "Döviz Makası", val: makas !== null ? `%${makas.toFixed(2)}` : "Bekleniyor...", link: "https://www.doviz.com/" },
        { title: "Reel Faiz", val: reelFaiz !== null ? `%${reelFaiz.toFixed(1)}` : "Bekleniyor...", link: "https://www.tcmb.gov.tr/wps/wcm/connect/tr/tcmb+tr/main+menu/temel+faaliyetler/para+politikasi/" },
        { title: "ÜFE-TÜFE Makası", val: enfFarki !== null ? `${enfFarki.toFixed(1)} P` : "Bekleniyor...", link: "https://data.tuik.gov.tr/Kategori/GetKategori?p=enflasyon-ve-fiyat-106" },
        { title: "İç Borç Çevirme", val: data.icBorc ? `%${data.icBorc}` : "Bekleniyor...", link: "https://www.hmb.gov.tr/kamu-finansi-istatistikleri" },
        { title: "Cari İşlemler", val: data.cariAcik ? `${data.cariAcik} Mr $` : "Bekleniyor...", link: "https://www.tcmb.gov.tr/wps/wcm/connect/tr/tcmb+tr/main+menu/istatistikler/odemeler+dengesi+ve+ilgili+istatistikler/" },
        { title: "Net Rezerv", val: data.rezerv ? `${data.rezerv} Mr $` : "Bekleniyor...", link: "https://evds2.tcmb.gov.tr/index.php?/evds/serieDetail/TP.AB.A02" },
        { title: "M2 Para Arzı", val: data.m2Artis ? `%${data.m2Artis}` : "Bekleniyor...", link: "https://evds2.tcmb.gov.tr/index.php?/evds/serieDetail/TP.KS.A.M2.Y" },
        { title: "CDS Risk Primi", val: `${cds} Puan`, link: "https://tr.investing.com/rates-bonds/turkey-cds-5-year-usd" }
    ];

    cards.forEach(c => {
        const isWaiting = c.val === "Bekleniyor...";
        grid.innerHTML += `
            <div class="card" style="${isWaiting ? 'border-color: var(--danger)' : ''}">
                <span class="source-link" onclick="goToSource('${c.link}')">🔗</span>
                <div><div class="card-title">${c.title}</div><div class="card-value" style="${isWaiting ? 'color: var(--danger); font-size: 18px;' : ''}">${c.val}</div></div>
                <div class="card-desc">${isWaiting ? 'Lütfen Manuel Kontrol Edin' : 'Veri Kaynaktan Alındı.'}</div>
            </div>`;
    });
}
// Diğer yardımcı fonksiyonlar (calcPoints vb.) aynı kalacak...
window.onload = runRadar;