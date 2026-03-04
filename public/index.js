let myChart = null;

function goToSource(url) {
    if (confirm("Resmi veri kaynağına (TCMB/TÜİK/Investing) gidilsin mi?")) {
        window.open(url, '_blank');
    }
}

async function fetchMacroData() {
    const response = await fetch('http://localhost:3000/api/macro');
    if (!response.ok) throw new Error("Server hatası");
    return await response.json();
}

function calcPoints(value, minVal, maxVal, maxPoints) {
    let ratio = (value - minVal) / (maxVal - minVal);
    ratio = Math.max(0, Math.min(1, ratio)); 
    return Math.round(ratio * maxPoints);
}

async function runRadar() {
    const btn = document.getElementById('runBtn');
    btn.innerText = "Hesaplanıyor...";
    try {
        const data = await fetchMacroData();
        const currentCds = parseFloat(document.getElementById('cdsInput').value) || 250;
        
        // Makas Hesabı (Senin verdiğin rakamlara göre: 43.99 ve 44.5)
        const makas = ((data.carsiDolar - data.bankaDolar) / data.bankaDolar) * 100;
        const reelFaiz = data.faiz - data.tufe;
        const enfFarki = data.ufe - data.tufe;

        // 1000 Puanlık Veltus Endeksi
        let score = 0;
        score += calcPoints(Math.abs(makas), 0, 5, 200); // Makas mutlak değerce artınca risk artar
        score += calcPoints(-reelFaiz, 0, 20, 200);
        score += calcPoints(data.icBorc, 100, 130, 150);
        score += calcPoints(enfFarki, 0, 20, 100);
        score += calcPoints(-data.cariAcik, 0, 5, 100);
        score += calcPoints(-data.rezerv, 0, 50, 100);
        score += calcPoints(currentCds, 300, 600, 100);
        score += calcPoints(data.m2Artis, 2, 8, 50);

        score = Math.round(Math.min(1000, Math.max(0, score)));
        updateUI(data, makas, reelFaiz, enfFarki, score, currentCds);
        document.getElementById('statusText').innerText = "Güncel: " + new Date().toLocaleTimeString();
    } catch (err) {
        document.getElementById('statusText').innerText = "Hata!";
    } finally {
        btn.innerText = "Radarı Güncelle";
    }
}

function updateUI(data, makas, reelFaiz, enfFarki, score, cds) {
    const mainScore = document.getElementById('mainScore');
    const scoreBar = document.getElementById('scoreBar');
    const mainSummary = document.getElementById('mainSummary');

    const hue = 140 - (score / 1000 * 140);
    const color = `hsl(${hue}, 80%, 45%)`;

    mainScore.innerText = `${score} / 1000`;
    mainScore.style.color = color;
    scoreBar.style.width = `${(score / 1000) * 100}%`;
    scoreBar.style.backgroundColor = color;

    // Gauge Chart
    const ctx = document.getElementById('gaugeChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [score, 1000 - score],
                backgroundColor: [color, "#222"],
                borderWidth: 0, circumference: 180, rotation: 270, cutout: '85%'
            }]
        },
        options: { aspectRatio: 1.8, plugins: { legend: { display: false } } }
    });

    // Beyin / Özet
    let summary;
    if (score <= 300) summary = "🟢 GÜVENLİ LİMAN: Sistem stabil, TL'de kalınabilir.";
    else if (score <= 600) summary = "🟡 ISINAN EKONOMİ: Baraj doluyor, fiziki mala yavaş geçiş yapılmalı.";
    else if (score <= 850) summary = "🟠 STAGFLASYON RİSKİ: Durgunluk ve enflasyon! Üretici iflasları yakın.";
    else summary = "🔴 BARAJ PATLADI: Kur şoku! Fiziki varlıklar dışında her şey eriyor.";

    mainSummary.innerText = summary;
    mainSummary.style.color = color;
    mainSummary.style.backgroundColor = `${color}15`;

    // Kartlar - DOĞRU LİNKLERLE
    const grid = document.getElementById('cardGrid');
    grid.innerHTML = '';
    const cards = [
        { title: "Döviz Makası", val: `%${makas.toFixed(2)}`, desc: makas < -1 ? "Çarşı bankanın altında, arbitraj fırsatı." : "Makas stabil.", link: "https://www.doviz.com/" },
        { title: "Reel Faiz", val: `%${reelFaiz.toFixed(1)}`, desc: "TCMB - TÜFE Reel Getiri.", link: "https://www.tcmb.gov.tr/wps/wcm/connect/tr/tcmb+tr/main+menu/temel+faaliyetler/para+politikasi/merkez+bankasi+faiz+oranlari" },
        { title: "ÜFE-TÜFE Makası", val: `${enfFarki.toFixed(1)} P`, desc: "Üretici üzerindeki maliyet yükü.", link: "https://data.tuik.gov.tr/Kategori/GetKategori?p=Enflasyon-ve-Fiyat-106" },
        { title: "İç Borç Çevirme", val: `%${data.icBorc}`, desc: "Hazine'nin borçlanma hızı.", link: "https://www.hmb.gov.tr/kamu-borclanma-istatistikleri" },
        { title: "Cari İşlemler", val: `${data.cariAcik} Mr $`, desc: "Döviz dengesi.", link: "https://www.tcmb.gov.tr/wps/wcm/connect/tr/tcmb+tr/main+menu/istatistikler/odemeler+dengesi+ve+ilgili+istatistikler" },
        { title: "Net Rezerv", val: `${data.rezerv} Mr $`, desc: "Merkez Bankası müdahale gücü.", link: "https://www.tcmb.gov.tr/wps/wcm/connect/tr/tcmb+tr/main+menu/istatistikler/en+cok+kullanilan+veriler/banka-bilancosu-verileri" },
        { title: "M2 Para Arzı", val: `%${data.m2Artis}`, desc: "Likidite artış hızı.", link: "https://evds2.tcmb.gov.tr/index.php?/evds/serieDetail/TP.KS.A.M2.Y" },
        { title: "CDS Risk Primi", val: `${cds} Puan`, desc: "Ülke risk primi.", link: "https://tr.investing.com/rates-bonds/turkey-cds-5-year-usd" }
    ];

    cards.forEach(c => {
        grid.innerHTML += `
            <div class="card">
                <span class="source-link" onclick="goToSource('${c.link}')">🔗</span>
                <div><div class="card-title">${c.title}</div><div class="card-value">${c.val}</div></div>
                <div class="card-desc">${c.desc}</div>
            </div>`;
    });
}
window.onload = runRadar;