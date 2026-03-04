let myChart = null;

function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('mainContainer').classList.toggle('shifted');
}

// 0 ile 1000 arasındaki Ana Baraj Skoru için Puan Hesaplayıcı
function calcPoints(value, minVal, maxVal, maxPoints) {
    if (value === null || isNaN(value)) return 0;
    let ratio = (value - minVal) / (maxVal - minVal);
    ratio = Math.max(0, Math.min(1, ratio)); 
    return Math.round(ratio * maxPoints);
}

// HER KARTIN KENDİNE ÖZEL "RENK VE YORUM" ZEKASI
function getCardDynamicStatus(type, val) {
    let ratio = 0; // 0 = En İyi (Yeşil), 1 = En Kötü (Kırmızı)
    let text = "";

    if (type === 'makas') {
        ratio = Math.max(0, Math.min(1, val / 5)); // 0% ile 5% arası
        if (val < 1.5) text = "Makas ideal, piyasa sakin.";
        else if (val < 3.5) text = "Fiziki talep artıyor, makas açılıyor.";
        else text = "Çarşı koptu, döviz kıtlığı sinyali!";
    } 
    else if (type === 'reelFaiz') {
        ratio = Math.max(0, Math.min(1, (5 - val) / 20)); // +5% (İyi) ile -15% (Kötü) arası
        if (val > 2) text = "Pozitif getiri, TL cazip ve kraldır.";
        else if (val > -5) text = "Getiri sınırda, enflasyon baskısı hissediliyor.";
        else text = "Ağır negatif faiz, TL hızla eriyor!";
    } 
    else if (type === 'enfFarki') {
        ratio = Math.max(0, Math.min(1, val / 20)); // 0 ile 20 puan fark arası
        if (val < 2) text = "Üretici maliyetleri ve enflasyon dengeli.";
        else if (val < 10) text = "Maliyet baskısı tolere edilebilir seviyede.";
        else text = "Büyük zamlar kapıda, üretici maliyetten eziliyor!";
    } 
    else if (type === 'icBorc') {
        ratio = Math.max(0, Math.min(1, (val - 100) / 30)); // %100 (İyi) ile %130 (Kötü)
        if (val < 100) text = "Borç yükü hafifliyor, Hazine rahat.";
        else if (val < 115) text = "Borç çevrimi yönetilebilir sınırda.";
        else text = "Hazine borç sarmalında, risk çok yüksek!";
    } 
    else if (type === 'cari') {
        ratio = Math.max(0, Math.min(1, (-val + 1) / 6)); // +1 Mr Fazla (İyi) ile -5 Mr Açık (Kötü)
        if (val >= 0) text = "Cari fazla, ülkeye taze döviz giriyor.";
        else if (val > -3) text = "Yönetilebilir ve olağan cari açık.";
        else text = "Tehlikeli boyutta döviz kanaması var!";
    } 
    else if (type === 'rezerv') {
        ratio = Math.max(0, Math.min(1, (80 - val) / 80)); // 80 Mr (İyi) ile 0 Mr (Kötü)
        if (val > 60) text = "Merkez'in cephanesi sağlam, kur güvende.";
        else if (val > 20) text = "Rezervler eriyor, müdahale gücü zayıflıyor.";
        else text = "Merkez Bankası savunmasız, kurşun bitmek üzere!";
    } 
    else if (type === 'm2') {
        ratio = Math.max(0, Math.min(1, val / 8)); // %0 (İyi) ile %8 (Kötü)
        if (val < 3) text = "Para basımı yavaş, likidite kontrol altında.";
        else if (val < 6) text = "Para arzı istikrarlı ancak yakından izlenmeli.";
        else text = "Matbaa tam gaz çalışıyor, paranın değeri düşüyor!";
    } 
    else if (type === 'cds') {
        ratio = Math.max(0, Math.min(1, (val - 200) / 400)); // 200 (İyi) ile 600 (Kötü)
        if (val < 300) text = "Yabancı yatırımcı ülkeye güveniyor.";
        else if (val < 450) text = "Risk primimiz yüksek, dış borçlanma pahalı.";
        else text = "İflas riski fiyatlanıyor, ekonomi kırmızı alarmda!";
    }

    // Matematiksel Yumuşak Renk Geçişi (Gradient HSL)
    // ratio 0 ise Hue=120 (Yeşil), ratio 1 ise Hue=0 (Kırmızı)
    const hue = 120 - (ratio * 120); 
    const color = `hsl(${hue}, 80%, 45%)`;
    
    return { color, text };
}

function loadMemoryToInputs() {
    const saved = localStorage.getItem('veltus_macro_data');
    if (saved) {
        const d = JSON.parse(saved);
        document.getElementById('inpTufe').value = d.tufe || '';
        document.getElementById('inpUfe').value = d.ufe || '';
        document.getElementById('inpFaiz').value = d.faiz || '';
        document.getElementById('inpCari').value = d.cariAcik || '';
        document.getElementById('inpRezerv').value = d.rezerv || '';
        document.getElementById('inpM2').value = d.m2Artis || '';
        document.getElementById('inpBorc').value = d.icBorc || '';
        document.getElementById('inpCds').value = d.cds || '';
        return d;
    }
    return {};
}

function saveManualData() {
    const data = {
        tufe: parseFloat(document.getElementById('inpTufe').value),
        ufe: parseFloat(document.getElementById('inpUfe').value),
        faiz: parseFloat(document.getElementById('inpFaiz').value),
        cariAcik: parseFloat(document.getElementById('inpCari').value),
        rezerv: parseFloat(document.getElementById('inpRezerv').value),
        m2Artis: parseFloat(document.getElementById('inpM2').value),
        icBorc: parseFloat(document.getElementById('inpBorc').value),
        cds: parseFloat(document.getElementById('inpCds').value)
    };
    localStorage.setItem('veltus_macro_data', JSON.stringify(data));
    toggleMenu(); 
    initRadar(); 
}

async function initRadar() {
    const statusText = document.getElementById('statusText');
    let bankaDolar = null, carsiDolar = null;

    try {
        const response = await fetch('/api/macro');
        if (response.ok) {
            const apiData = await response.json();
            bankaDolar = apiData.bankaDolar;
            carsiDolar = apiData.carsiDolar;
            statusText.innerText = "Döviz: CANLI | Makro: HAFIZA";
            statusText.style.color = "var(--safe)";
        }
    } catch (err) {
        statusText.innerText = "Döviz API Koptu!";
        statusText.style.color = "var(--danger)";
    }

    const macroData = loadMemoryToInputs();
    const finalData = { bankaDolar, carsiDolar, ...macroData };
    calculateAndDraw(finalData);
}

function calculateAndDraw(data) {
    let makas = (data.carsiDolar && data.bankaDolar) ? ((data.carsiDolar - data.bankaDolar) / data.bankaDolar) * 100 : null;
    let reelFaiz = (!isNaN(data.faiz) && !isNaN(data.tufe)) ? data.faiz - data.tufe : null;
    let enfFarki = (!isNaN(data.ufe) && !isNaN(data.tufe)) ? data.ufe - data.tufe : null;

    let score = 0;
    score += calcPoints(makas !== null ? Math.abs(makas) : 0, 0, 5, 200);
    score += calcPoints(reelFaiz !== null ? -reelFaiz : 0, 0, 20, 200); 
    score += calcPoints(enfFarki !== null ? enfFarki : 0, 0, 20, 100);
    score += calcPoints(!isNaN(data.cds) ? data.cds : 0, 200, 600, 100); 
    score += calcPoints(!isNaN(data.m2Artis) ? data.m2Artis : 0, 2, 8, 50);
    score += calcPoints(!isNaN(data.icBorc) ? data.icBorc : 100, 100, 130, 150);

    // DİNAMİK RİSK AZALTICI
    if (!isNaN(data.cariAcik)) {
        if (data.cariAcik < 0) score += Math.min(100, Math.abs(data.cariAcik) * 15); 
        else score -= Math.min(100, data.cariAcik * 15); 
    }
    if (!isNaN(data.rezerv)) {
        if (data.rezerv < 0) score += Math.min(150, Math.abs(data.rezerv) * 2); 
        else score -= Math.min(150, data.rezerv * 1.5); 
    }

    score = Math.round(Math.min(1000, Math.max(0, score)));
    updateUI(data, makas, reelFaiz, enfFarki, score);
}

function updateUI(data, makas, reelFaiz, enfFarki, score) {
    // ANA EKRAN GÜNCELLEMESİ (BÜYÜK SKOR)
    const mainHue = 140 - (score / 1000 * 140);
    const mainColor = `hsl(${mainHue}, 80%, 45%)`;
    
    document.getElementById('mainScore').innerText = `${score} / 1000`;
    document.getElementById('mainScore').style.color = mainColor;

    const scoreBar = document.getElementById('scoreBar');
    scoreBar.style.width = `${(score / 1000) * 100}%`;
    scoreBar.style.backgroundColor = mainColor;

    let summary;
    if (score <= 300) summary = "🟢 GÜVENLİ LİMAN: Baraj stabil. Nakit akışı güvende.";
    else if (score <= 600) summary = "🟡 ISINAN EKONOMİ: Baraj doluyor. Fiziki varlıklara yavaş geçiş yapılabilir.";
    else if (score <= 850) summary = "🟠 STAGFLASYON RİSKİ: Üretici eziliyor, nakit akışını koru.";
    else summary = "🔴 BARAJ PATLADI: Kur şoku kapıda! Sistem kilitleniyor.";

    const sumBox = document.getElementById('mainSummary');
    sumBox.innerText = summary;
    sumBox.style.color = mainColor;
    sumBox.style.backgroundColor = `${mainColor}15`;
    sumBox.style.borderLeftColor = mainColor;

    const ctx = document.getElementById('gaugeChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: { datasets: [{ data: [score, 1000 - score], backgroundColor: [mainColor, "#222"], borderWidth: 0, circumference: 180, rotation: 270, cutout: '85%' }] },
        options: { aspectRatio: 1.8, plugins: { legend: { display: false }, tooltip: { enabled: false } } }
    });

    // ALT KARTLAR (HER BİRİNE ÖZEL GRADYAN VE YORUM)
    const grid = document.getElementById('cardGrid');
    grid.innerHTML = '';
    
    let cariMetin = "Menüden Girin", rezervMetin = "Menüden Girin";
    if (!isNaN(data.cariAcik)) cariMetin = data.cariAcik >= 0 ? `+${data.cariAcik} Mr $` : `${data.cariAcik} Mr $`;
    if (!isNaN(data.rezerv)) rezervMetin = data.rezerv >= 0 ? `+${data.rezerv} Mr $` : `${data.rezerv} Mr $`;

    const cards = [
        { id: 'makas', title: "Döviz Makası", valStr: makas !== null ? `%${makas.toFixed(2)}` : "Oto Çekiliyor...", valNum: makas, link: "https://www.doviz.com/" },
        { id: 'reelFaiz', title: "Reel Faiz", valStr: reelFaiz !== null ? `%${reelFaiz.toFixed(1)}` : "Menüden Girin", valNum: reelFaiz, link: "https://www.tcmb.gov.tr/" },
        { id: 'enfFarki', title: "ÜFE-TÜFE Farkı", valStr: enfFarki !== null ? `${enfFarki.toFixed(1)} P` : "Menüden Girin", valNum: enfFarki, link: "https://data.tuik.gov.tr/" },
        { id: 'icBorc', title: "İç Borç Çevirme", valStr: !isNaN(data.icBorc) ? `%${data.icBorc}` : "Menüden Girin", valNum: data.icBorc, link: "https://www.hmb.gov.tr/kamu-finansmani-raporlari" },
        { id: 'cari', title: "Cari İşlemler", valStr: cariMetin, valNum: data.cariAcik, link: "https://evds2.tcmb.gov.tr/" },
        { id: 'rezerv', title: "Net Rezerv", valStr: rezervMetin, valNum: data.rezerv, link: "https://evds2.tcmb.gov.tr/" },
        { id: 'm2', title: "M2 Para Arzı", valStr: !isNaN(data.m2Artis) ? `%${data.m2Artis}` : "Menüden Girin", valNum: data.m2Artis, link: "https://evds2.tcmb.gov.tr/" },
        { id: 'cds', title: "CDS Primi", valStr: !isNaN(data.cds) ? `${data.cds} Puan` : "Menüden Girin", valNum: data.cds, link: "https://tr.investing.com/" }
    ];

    cards.forEach(c => {
        const isEmpty = c.valStr === "Menüden Girin" || c.valStr === "Oto Çekiliyor...";
        
        // EĞER VERİ VARSA O KARTIN ÖZEL RENGİNİ VE YORUMUNU AL
        let cardStyle = { color: 'var(--text-muted)', text: "Veri eksik." };
        if (!isEmpty) {
            cardStyle = getCardDynamicStatus(c.id, c.valNum);
        }

        grid.innerHTML += `
            <div class="card" style="border-left: 4px solid ${isEmpty ? '#334155' : cardStyle.color};">
                <a class="source-link" href="${c.link}" target="_blank" title="Kaynağa Git">🔗</a>
                <div class="card-title">${c.title}</div>
                <div class="card-value" style="color: ${cardStyle.color}; font-size: ${isEmpty ? '18px' : '28px'}">${c.valStr}</div>
                <div class="card-desc" style="color: ${isEmpty ? 'var(--text-muted)' : '#94a3b8'}">${cardStyle.text}</div>
            </div>`;
    });
}

window.onload = initRadar;