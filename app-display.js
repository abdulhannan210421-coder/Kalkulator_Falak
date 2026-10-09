/**
 * app-display.js
 * Modul khusus Tampilan Index, Ihtiyat, Animasi Parameter, dan Sistem Pengawas Adzan Real-Time
 */

let adzanAktif = true;
let notifServiceAktif = true;
let adzanSudahBunyiHariIni = {}; 
let dzuhurLokalTerakhir = ""; 
let isParamOpen = true;

const DAFTAR_INPUT_PENGATURAN = [
    'latDeg', 'latMin', 'latArah',
    'longDeg', 'longMin', 'longArah',
    'elevasi', 'inputIhtiyat', 'selectKriteriaImkan'
];

function tambahIhtiyat(waktuStr, menitIhtiyat) {
    if (!waktuStr || waktuStr === '-' || waktuStr === '00:00:00') return waktuStr;

    const parts = waktuStr.split(':');
    let jam = parseInt(parts[0], 10);
    let menit = parseInt(parts[1], 10);
    let detik = parts[2] ? parseInt(parts[2], 10) : 0;

    if (isNaN(jam) || isNaN(menit)) return waktuStr;

    let date = new Date();
    date.setHours(jam, menit + parseInt(menitIhtiyat || 0, 10), detik);

    const pad = (num) => String(num).padStart(2, '0');
    
    if (parts.length === 3) {
        return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function kirimJadwalKeAndroidNative() {
    if (!window.AndroidAdzan || !adzanAktif) return;

    const getText = (id) => {
        const el = document.getElementById(id);
        return (el && el.innerText && el.innerText !== '00:00:00' && el.innerText !== '-') ? el.innerText.trim() : '';
    };

    const subuh = getText('resSubuhLokal');
    const dzuhur = getText('resDzuhurLokal');
    const ashar = getText('resAsrLokal');
    const maghrib = getText('resMaghribLokal');
    const isya = getText('resIsyaLokal');

    if (!subuh || !dzuhur || !ashar || !maghrib || !isya) return;

    const daftarSholat = [
        { nama: 'Subuh', waktu: subuh },
        { nama: 'Dzuhur', waktu: dzuhur },
        { nama: 'Ashar', waktu: ashar },
        { nama: 'Maghrib', waktu: maghrib },
        { nama: 'Isya', waktu: isya }
    ];

    daftarSholat.forEach(sholat => {
        const parts = sholat.waktu.split(':');
        if (parts.length >= 2) {
            const jam = parseInt(parts[0], 10);
            const menit = parseInt(parts[1], 10);
            const detik = parts[2] ? parseInt(parts[2], 10) : 0;

            if (!isNaN(jam) && !isNaN(menit)) {
                let targetWaktu = new Date();
                targetWaktu.setHours(jam, menit, detik, 0);

                if (targetWaktu.getTime() <= Date.now()) {
                    targetWaktu.setDate(targetWaktu.getDate() + 1);
                }

                window.AndroidAdzan.setAlarm(targetWaktu.getTime(), sholat.nama);
            }
        }
    });
}

function prosesDanTampilkanIhtiyat() {
    const inputIhtiyat = document.getElementById('inputIhtiyat');
    const ihtiyat = inputIhtiyat ? parseInt(inputIhtiyat.value, 10) || 0 : 0;

    const daftarSholat = [
        { idIstiwa: 'resSubuh', idLokal: 'resSubuhLokal' },
        { idIstiwa: 'resAsr', idLokal: 'resAsrLokal' },
        { idIstiwa: 'resMaghrib', idLokal: 'resMaghribLokal' },
        { idIstiwa: 'resIsya', idLokal: 'resIsyaLokal' }
    ];

    daftarSholat.forEach(item => {
        const elIstiwa = document.getElementById(item.idIstiwa);
        if (elIstiwa && elIstiwa.innerText && elIstiwa.innerText !== '00:00:00' && elIstiwa.innerText !== '-') {
            if (!elIstiwa.dataset.raw) {
                elIstiwa.dataset.raw = elIstiwa.innerText;
            }
            elIstiwa.innerText = tambahIhtiyat(elIstiwa.dataset.raw, ihtiyat);
        }

        const elLokal = document.getElementById(item.idLokal);
        if (elLokal && elLokal.innerText && elLokal.innerText !== '00:00:00' && elLokal.innerText !== '-') {
            if (!elLokal.dataset.raw) {
                elLokal.dataset.raw = elLokal.innerText;
            }
            elLokal.innerText = tambahIhtiyat(elLokal.dataset.raw, ihtiyat);
        }
    });

    hitungkanKartuDzuhur(ihtiyat);
    kirimJadwalKeAndroidNative();
    syncDataToWidget();
}

function hitungkanKartuDzuhur(ihtiyat) {
    const resDzuhur = document.getElementById('resDzuhur');
    const resDzuhurLokal = document.getElementById('resDzuhurLokal');

    const dzuhurIstiwa = tambahIhtiyat("12:00:00", ihtiyat);
    if (resDzuhur) resDzuhur.innerText = dzuhurIstiwa;

    if (resDzuhurLokal) {
        const now = new Date();
        const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + (now.getUTCSeconds() + now.getUTCMilliseconds() / 1000) / 3600;

        let longDeg = typeof getInputValue === 'function' ? getInputValue('longDeg', 112) : 112;
        let longMin = typeof getInputValue === 'function' ? getInputValue('longMin', 45) : 45;
        let longArah = document.getElementById('longArah')?.value || "TIMUR";
        let lon = longDeg + longMin / 60;
        if (longArah === "BARAT") lon = -lon;

        const start = new Date(now.getUTCFullYear(), 0, 0);
        const diff = now - start;
        const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

        const gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + (utcHours - 12) / 24);
        const eqTimeMin = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));

        let solarTimeHours = utcHours + (lon / 15) + (eqTimeMin / 60);
        solarTimeHours = (solarTimeHours % 24 + 24) % 24;

        let offset = typeof currentUtcOffset !== 'undefined' ? currentUtcOffset : 7;
        let targetLocalHours = (utcHours + offset) % 24;
        if (targetLocalHours < 0) targetLocalHours += 24;

        let diffHours = solarTimeHours - targetLocalHours;
        if (diffHours > 12) diffHours -= 24;
        if (diffHours < -12) diffHours += 24;

        let dzuhurIstiwaVal = 12.0 + (parseInt(ihtiyat || 0, 10) / 60);
        let dzuhurLokalVal = (dzuhurIstiwaVal - diffHours + 24) % 24;

        let lh = Math.floor(dzuhurLokalVal);
        let rem = (dzuhurLokalVal - lh) * 60;
        let lm = Math.floor(rem);
        let ls = Math.round((rem - lm) * 60);
        if (ls === 60) { ls = 0; lm += 1; }
        if (lm === 60) { lm = 0; lh = (lh + 1) % 24; }

        const pad = n => String(n).padStart(2, '0');
        const hasilDzuhurLokal = `${pad(lh)}:${pad(lm)}:${pad(ls)}`;

        resDzuhurLokal.innerText = hasilDzuhurLokal;

        if (dzuhurLokalTerakhir !== hasilDzuhurLokal) {
            dzuhurLokalTerakhir = hasilDzuhurLokal;
            kirimJadwalKeAndroidNative();
            syncDataToWidget();
        }
    }
}

function initFalakEngineHook() {
    if (typeof window.hitungFalak === 'function' && !window.hitungFalak.hasHooked) {
        const originalHitungFalak = window.hitungFalak;
        window.hitungFalak = function () {
            ['resSubuhLokal', 'resThuluLokal', 'resDhuhaLokal', 'resAsrLokal', 'resMaghribLokal', 'resIsyaLokal',
             'resSubuh', 'resAsr', 'resMaghrib', 'resIsya'].forEach(id => {
                const el = document.getElementById(id);
                if (el) delete el.dataset.raw;
            });

            originalHitungFalak();
            prosesDanTampilkanIhtiyat();
        };
        window.hitungFalak.hasHooked = true;
    }

    if (typeof window.updateLokalPrayerTimes === 'function' && !window.updateLokalPrayerTimes.hasHooked) {
        const originalUpdateLokal = window.updateLokalPrayerTimes;
        window.updateLokalPrayerTimes = function (R) {
            ['resSubuhLokal', 'resThuluLokal', 'resDhuhaLokal', 'resAsrLokal', 'resMaghribLokal', 'resIsyaLokal'].forEach(id => {
                const el = document.getElementById(id);
                if (el) delete el.dataset.raw;
            });

            originalUpdateLokal(R);
            prosesDanTampilkanIhtiyat();
        };
        window.updateLokalPrayerTimes.hasHooked = true;
    }
}

function loadAdzanState() {
    const saved = localStorage.getItem('adzanAktif');
    adzanAktif = (saved === null || saved === 'true');
    updateAdzanButtonUI();
    syncAdzanStateToNative();
}

function toggleAdzanAudio() {
    const audioBiasa = document.getElementById('audioBiasa');

    if (!adzanAktif) {
        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }

        if (audioBiasa) {
            audioBiasa.volume = 0;
            audioBiasa.play().then(() => {
                audioBiasa.pause();
                audioBiasa.currentTime = 0;
                audioBiasa.volume = 1;
            }).catch(() => {});
        }

        adzanAktif = true;
        localStorage.setItem('adzanAktif', 'true');
        
        if (typeof showToast === 'function') {
            showToast('🔔 Notifikasi & Audio Adzan Berhasil Diaktifkan');
        }
        
        syncAdzanStateToNative();
        kirimJadwalKeAndroidNative();
    } else {
        adzanAktif = false;
        localStorage.setItem('adzanAktif', 'false');
        
        if (typeof showToast === 'function') {
            showToast('🔕 Adzan Berhasil Dimutekan');
        }

        syncAdzanStateToNative();
    }
    updateAdzanButtonUI();
}

function syncAdzanStateToNative() {
    if (window.AndroidAdzan && window.AndroidAdzan.setAdzanActive) {
        window.AndroidAdzan.setAdzanActive(adzanAktif);
    }
}

function updateAdzanButtonUI() {
    const btn = document.getElementById('btnToggleAdzan');
    if (!btn) return;
    if (adzanAktif) {
        btn.className = "flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all duration-200 bg-emerald-600 text-white shadow-md flex items-center justify-center gap-1";
        btn.innerHTML = '🔔 Adzan: Aktif';
    } else {
        btn.className = "flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all duration-200 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-2xs flex items-center justify-center gap-1";
        btn.innerHTML = '🔕 Adzan: Mute';
    }
}

function loadNotifServiceState() {
    const saved = localStorage.getItem('notifServiceAktif');
    notifServiceAktif = saved === null ? true : (saved === 'true');
    updateNotifServiceUI();
    syncNotifServiceToNative();
}

function togglePersistentNotif() {
    notifServiceAktif = !notifServiceAktif;
    localStorage.setItem('notifServiceAktif', notifServiceAktif ? 'true' : 'false');
    updateNotifServiceUI();
    syncNotifServiceToNative();
    if (typeof showToast === 'function') {
        showToast(notifServiceAktif ? '🔔 Notifikasi Bilah Status Diaktifkan' : '🔕 Notifikasi Bilah Status Dinonaktifkan');
    }
}

function updateNotifServiceUI() {
    const btn = document.getElementById('btnToggleNotifService');
    if (!btn) return;
    if (notifServiceAktif) {
        btn.className = "px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0";
        btn.innerHTML = "✅ Aktif";
    } else {
        btn.className = "px-3 py-1.5 bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all shadow-xs shrink-0";
        btn.innerHTML = "❌ Nonaktif";
    }
}

function syncNotifServiceToNative() {
    if (window.AndroidAdzan && window.AndroidAdzan.setNotifServiceActive) {
        window.AndroidAdzan.setNotifServiceActive(notifServiceAktif);
    }
}

function toggleParameterSection(userInitiated = false) {
    const container = document.getElementById('paramContentContainer');
    const chevron = document.getElementById('chevronParamIcon');
    if (!container) return;

    if (userInitiated) {
        isParamOpen = !isParamOpen;
    } else {
        isParamOpen = false;
    }

    if (isParamOpen) {
        container.style.maxHeight = container.scrollHeight + "px";
        if (chevron) chevron.style.transform = "rotate(0deg)";
    } else {
        container.style.maxHeight = "0px";
        if (chevron) chevron.style.transform = "rotate(180deg)";
    }
}

function jalankanPengawasAdzanRealtime() {
    // Pengawas adzan sepenuhnya ditangani oleh AlarmManager Native
}

function saveAllSettingsToLocalStorage() {
    DAFTAR_INPUT_PENGATURAN.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            localStorage.setItem(`pref_${id}`, el.value);
        }
    });
}

function loadAllSettingsFromLocalStorage() {
    DAFTAR_INPUT_PENGATURAN.forEach(id => {
        const el = document.getElementById(id);
        const savedValue = localStorage.getItem(`pref_${id}`);
        if (el && savedValue !== null) {
            el.value = savedValue;
        }
    });
}

function initAutoSaveListeners() {
    DAFTAR_INPUT_PENGATURAN.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                saveAllSettingsToLocalStorage();
                if (typeof window.hitungFalak === 'function') {
                    window.hitungFalak(); // Hitung ulang astronomis koordinat baru
                } else {
                    prosesDanTampilkanIhtiyat();
                }
            });
            el.addEventListener('input', () => {
                saveAllSettingsToLocalStorage();
            });
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    // 1. Muat pengaturan tersimpan TERLEBIH DAHULU agar input HTML terisi
    loadAllSettingsFromLocalStorage();
    initAutoSaveListeners();

    // 2. Pasang hook engine
    initFalakEngineHook();

    // 3. Jalankan rumus falak utama jika tersedia
    if (typeof window.hitungFalak === 'function') {
        window.hitungFalak();
    } else {
        prosesDanTampilkanIhtiyat();
    }

    // 4. Muat status adzan dan notifikasi
    loadAdzanState();
    loadNotifServiceState();
    loadChimeState();
    jalankanPengawasAdzanRealtime();

    const container = document.getElementById('paramContentContainer');
    if (container) {
        container.style.maxHeight = container.scrollHeight + "px";
        setTimeout(() => {
            toggleParameterSection(false);
        }, 400);
    }
});

async function syncDataToWidget() {
    const getText = (id) => {
        const el = document.getElementById(id);
        return el ? el.innerText.trim() : '-';
    };

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const localDateISO = `${yyyy}-${mm}-${dd}T${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

    const liveJamIstiwaStr = getText('liveJamIstiwa'); 

    let istiwaOffsetMs = 0;
    let selisihMenit = 0;
    if (liveJamIstiwaStr && liveJamIstiwaStr !== '00:00:00' && liveJamIstiwaStr !== '-') {
        const dateStr = `${yyyy}-${mm}-${dd}`;
        
        const istiwaDate = new Date(`${dateStr}T${liveJamIstiwaStr}`);
        const hpLocalDate = new Date(`${dateStr}T${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`);
        
        if (!isNaN(istiwaDate.getTime()) && !isNaN(hpLocalDate.getTime())) {
            istiwaOffsetMs = istiwaDate.getTime() - hpLocalDate.getTime();
            selisihMenit = Math.round(istiwaOffsetMs / 60000);
        }
    }

    const selisihFormatted = (selisihMenit >= 0 ? "+" : "") + selisihMenit + "m";

    const widgetData = {
        updatedAt: localDateISO,
        tanggalHijri: getTodayHijriFormatted(),
        istiwaOffsetMs: istiwaOffsetMs,
        selisih: selisihFormatted,
        schedules: {
            subuh: {
                lokal: getText('resSubuhLokal'),
                istiwa: getText('resSubuh')
            },
            dzuhur: {
                lokal: getText('resDzuhurLokal'),
                istiwa: getText('resDzuhur')
            },
            ashar: {
                lokal: getText('resAsrLokal'),
                istiwa: getText('resAsr')
            },
            maghrib: {
                lokal: getText('resMaghribLokal'),
                istiwa: getText('resMaghrib')
            },
            isya: {
                lokal: getText('resIsyaLokal'),
                istiwa: getText('resIsya')
            }
        }
    };

    const jsonString = JSON.stringify(widgetData);

    if (window.AndroidAdzan && window.AndroidAdzan.updateWidgetData) {
        window.AndroidAdzan.updateWidgetData(jsonString);
    }
}

let audioAdzanSedangPutar = null;

function tampilkanPopUpAdzan(namaSholat, audioEl) {
    audioAdzanSedangPutar = audioEl;

    if (window.AndroidAdzan && window.AndroidAdzan.setMaxVolume) {
        window.AndroidAdzan.setMaxVolume();
    }

    if (audioEl) {
        audioEl.onended = () => {
            if (window.AndroidAdzan && window.AndroidAdzan.restoreVolume) {
                window.AndroidAdzan.restoreVolume();
            }
            const modal = document.getElementById('modalAdzanControl');
            if (modal) modal.classList.add('hidden');
        };
    }

    const modal = document.getElementById('modalAdzanControl');
    const title = document.getElementById('adzanTitle');
    if (title) title.innerText = `Adzan ${namaSholat} Berkumandang`;
    if (modal) modal.classList.remove('hidden');
}

function hentikanAdzan() {
    if (audioAdzanSedangPutar) {
        audioAdzanSedangPutar.pause();
        audioAdzanSedangPutar.currentTime = 0;
    }

    if (window.AndroidAdzan && window.AndroidAdzan.restoreVolume) {
        window.AndroidAdzan.restoreVolume();
    }

    const modal = document.getElementById('modalAdzanControl');
    if (modal) modal.classList.add('hidden');
}

function kecilkanVolumeAdzan() {
    if (audioAdzanSedangPutar) {
        audioAdzanSedangPutar.volume = 0.1;
    }

    if (window.AndroidAdzan && window.AndroidAdzan.restoreVolume) {
        window.AndroidAdzan.restoreVolume();
    }

    const modal = document.getElementById('modalAdzanControl');
    if (modal) modal.classList.add('hidden');
}

window.handleBackPress = function() {
    const daftarModal = [
        'modalAdzanControl', 
        'mainMenuModal', 
        'detailBulanModal', 
        'mapModal', 
        'infoModal', 
        'rubuModal', 
        'lookupModal'
    ];

    for (let id of daftarModal) {
        const modalEl = document.getElementById(id);
        if (modalEl && !modalEl.classList.contains('hidden')) {
            modalEl.classList.add('hidden');
            return true;
        }
    }

    const tabContent1 = document.getElementById('tabContent1');
    if (tabContent1 && tabContent1.classList.contains('hidden')) {
        if (typeof switchMainTab === 'function') {
            switchMainTab(1);
            return true;
        }
    }

    return false;
};

// --- SAKELAR LONCENG JAM (3 JAMAN) ---
let chimeAktif = true;

function loadChimeState() {
    const saved = localStorage.getItem('chimeAktif');
    chimeAktif = saved === null ? true : (saved === 'true');
    updateChimeUI();
    syncChimeToNative();
}

function toggleChime() {
    chimeAktif = !chimeAktif;
    localStorage.setItem('chimeAktif', chimeAktif ? 'true' : 'false');
    updateChimeUI();
    syncChimeToNative();
    if (typeof showToast === 'function') {
        showToast(chimeAktif ? '🔔 Lonceng Jam Kelipatan 3 Diaktifkan' : '🔕 Lonceng Jam Dinonaktifkan');
    }
}

function updateChimeUI() {
    const btn = document.getElementById('btnToggleChime');
    if (!btn) return;
    if (chimeAktif) {
        btn.className = "px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0";
        btn.innerHTML = "🔔 Lonceng: Aktif";
    } else {
        btn.className = "px-3 py-1.5 bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all shadow-xs shrink-0";
        btn.innerHTML = "🔕 Lonceng: Off";
    }
}

function syncChimeToNative() {
    if (window.AndroidAdzan && window.AndroidAdzan.setChimeActive) {
        window.AndroidAdzan.setChimeActive(chimeAktif);
    }
}

// HELPER: MENGAMBIL KALENDER HARI INI (HARI, PASARAN, TANGGAL HIJRI, BULAN, TAHUN H)
function getTodayHijriFormatted() {
    const now = new Date();
    const gYear = now.getFullYear();
    const gMonth = now.getMonth() + 1;
    const gDay = now.getDate();

    let hariIdx = now.getDay();
    let pasaranIdx = 0;
    if (typeof getHariPasaran === 'function') {
        const hp = getHariPasaran(gYear, gMonth, gDay);
        hariIdx = hp.hariIdx;
        pasaranIdx = hp.pasaranIdx;
    }

    const namaHari = (typeof NAMA_HARI !== 'undefined' && NAMA_HARI[hariIdx]) ? NAMA_HARI[hariIdx] : "Ahad";
    const namaPasaran = (typeof NAMA_PASARAN !== 'undefined' && NAMA_PASARAN[pasaranIdx]) ? NAMA_PASARAN[pasaranIdx] : "Legi";

    let dHijri = 1, mHijri = 0, yHijri = 1448;
    try {
        const cur = (typeof getCurrentHijriDate === 'function') ? getCurrentHijriDate() : { yHijri: 1448, mHijri: 0 };
        mHijri = cur.mHijri;
        yHijri = cur.yHijri;

        if (typeof getExactIjtimakJD === 'function' && typeof getMoonDataAtSunset === 'function' && typeof checkImkanRukyah === 'function') {
            const modeKriteria = document.getElementById('selectKriteriaImkan')?.value || 'IMKAN_2_6';
            const tzHours = (typeof window.currentUtcOffset === 'number') ? window.currentUtcOffset : 7.0;

            const JDE_Hakiki = getExactIjtimakJD(yHijri, mHijri);
            const ijtimakLokal = jdToGregorian(JDE_Hakiki + (tzHours / 24.0));
            const mSunset = getMoonDataAtSunset(ijtimakLokal.year, ijtimakLokal.month, ijtimakLokal.day);
            const evalCurrent = checkImkanRukyah(modeKriteria, mSunset, JDE_Hakiki);

            const dateAwalBulan = new Date(ijtimakLokal.year, ijtimakLokal.month - 1, ijtimakLokal.day + evalCurrent.tambahanHari);
            const todayZero = new Date(gYear, gMonth - 1, gDay);
            const diffDays = Math.floor((todayZero - dateAwalBulan) / (1000 * 60 * 60 * 24)) + 1;

            if (diffDays >= 1 && diffDays <= 30) {
                dHijri = diffDays;
            } else if (diffDays < 1) {
                let prevM = mHijri - 1;
                let prevY = yHijri;
                if (prevM < 0) { prevM = 11; prevY -= 1; }
                const JDE_Prev = getExactIjtimakJD(prevY, prevM);
                const ijtPrevLokal = jdToGregorian(JDE_Prev + (tzHours / 24.0));
                const mSunsetPrev = getMoonDataAtSunset(ijtPrevLokal.year, ijtPrevLokal.month, ijtPrevLokal.day);
                const evalPrev = checkImkanRukyah(modeKriteria, mSunsetPrev, JDE_Prev);
                const dateAwalPrev = new Date(ijtPrevLokal.year, ijtPrevLokal.month - 1, ijtPrevLokal.day + evalPrev.tambahanHari);
                dHijri = Math.floor((todayZero - dateAwalPrev) / (1000 * 60 * 60 * 24)) + 1;
                mHijri = prevM;
                yHijri = prevY;
            } else if (diffDays > 30) {
                let nextM = (mHijri + 1) % 12;
                let nextY = mHijri === 11 ? yHijri + 1 : yHijri;
                const JDE_Next = getExactIjtimakJD(nextY, nextM);
                const ijtNextLokal = jdToGregorian(JDE_Next + (tzHours / 24.0));
                const mSunsetNext = getMoonDataAtSunset(ijtNextLokal.year, ijtNextLokal.month, ijtNextLokal.day);
                const evalNext = checkImkanRukyah(modeKriteria, mSunsetNext, JDE_Next);
                const dateAwalNext = new Date(ijtNextLokal.year, ijtNextLokal.month - 1, ijtNextLokal.day + evalNext.tambahanHari);
                const diffNext = Math.floor((todayZero - dateAwalNext) / (1000 * 60 * 60 * 24)) + 1;
                if (diffNext >= 1) {
                    dHijri = diffNext;
                    mHijri = nextM;
                    yHijri = nextY;
                }
            }
        }
    } catch (e) {
        console.error("Gagal kalkulasi tanggal Hijriah widget:", e);
    }

    const namaBulan = (typeof HIJRI_MONTHS_LIST !== 'undefined' && HIJRI_MONTHS_LIST[mHijri]) ? HIJRI_MONTHS_LIST[mHijri] : "Hijriah";

    return `${namaHari}, ${namaPasaran} ${dHijri} ${namaBulan} ${yHijri} H`;
}
