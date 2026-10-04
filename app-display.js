/**
 * app-display.js
 * Modul khusus Tampilan Index, Ihtiyat, dan Sistem Pengawas Adzan Real-Time
 * (Tanpa mengubah logika perhitungan murni pada falak-engine.js)
 */

// State Pengawas Adzan
let adzanAktif = false;
let adzanSudahBunyiHariIni = {}; // Objek penanda agar adzan tidak berulang di menit yang sama

/**
 * Membantu penambahan menit (Ihtiyat) ke string waktu "HH:MM:SS" atau "HH:MM"
 */
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
    
    // Kembalikan format HH:MM:SS jika dari data awal mengandung detik
    if (parts.length === 3) {
        return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Mengambil data asli/murni dari DOM, menyimpan ke dataset raw,
 * lalu menambahkan Ihtiyat ke elemen tampilan di index.html
 */
function prosesDanTampilkanIhtiyat() {
    const inputIhtiyat = document.getElementById('inputIhtiyat');
    const ihtiyat = inputIhtiyat ? parseInt(inputIhtiyat.value, 10) || 0 : 0;

    // Daftar ID elemen sholat yang diberi ihtiyat (Istiwa & Lokal)
    const daftarSholat = [
        { idIstiwa: 'resSubuh', idLokal: 'resSubuhLokal' },
        { idIstiwa: 'resAsr', idLokal: 'resAsrLokal' },
        { idIstiwa: 'resMaghrib', idLokal: 'resMaghribLokal' },
        { idIstiwa: 'resIsya', idLokal: 'resIsyaLokal' }
    ];

    daftarSholat.forEach(item => {
        // Process Istiwa
        const elIstiwa = document.getElementById(item.idIstiwa);
        if (elIstiwa) {
            if (!elIstiwa.dataset.raw) {
                elIstiwa.dataset.raw = elIstiwa.innerText;
            }
            if (elIstiwa.dataset.raw && elIstiwa.dataset.raw !== '00:00:00') {
                elIstiwa.innerText = tambahIhtiyat(elIstiwa.dataset.raw, ihtiyat);
            }
        }

        // Process Lokal
        const elLokal = document.getElementById(item.idLokal);
        if (elLokal) {
            if (!elLokal.dataset.raw) {
                elLokal.dataset.raw = elLokal.innerText;
            }
            if (elLokal.dataset.raw && elLokal.dataset.raw !== '00:00:00') {
                elLokal.innerText = tambahIhtiyat(elLokal.dataset.raw, ihtiyat);
            }
        }
    });

    // Hitung Waktu Dzuhur (Istiwa 12.00 + Ihtiyat = 12:03:00)
    hitungkanKartuDzuhur(ihtiyat);
}

/**
 * Kalkulasi Kartu Dzuhur Khusus (Istiwa & Lokal)
 */
function hitungkanKartuDzuhur(ihtiyat) {
    const resDzuhur = document.getElementById('resDzuhur');
    const resDzuhurLokal = document.getElementById('resDzuhurLokal');

    // 1. Dzuhur Istiwa = 12:00:00 + ihtiyat
    const dzuhurIstiwa = tambahIhtiyat("12:00:00", ihtiyat);
    if (resDzuhur) resDzuhur.innerText = dzuhurIstiwa;

    // 2. Dzuhur Lokal = Menyesuaikan selisih jam Istiwa - Lokal saat ini
    if (resDzuhurLokal) {
        const liveJamIstiwa = document.getElementById('liveJamIstiwa');
        const liveJamLokal = document.getElementById('liveJamLokal');

        if (liveJamIstiwa && liveJamLokal && liveJamIstiwa.innerText !== '00:00:00') {
            // Hitung selisih waktu berdasarkan waktu jam yang berjalan
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            
            const timeIstiwa = new Date(`${dateStr}T${liveJamIstiwa.innerText}`);
            const timeLokal = new Date(`${dateStr}T${liveJamLokal.innerText}`);
            
            if (!isNaN(timeIstiwa.getTime()) && !isNaN(timeLokal.getTime())) {
                const diffMs = timeLokal.getTime() - timeIstiwa.getTime();
                const dzuhurBase = new Date(`${dateStr}T12:00:00`);
                const dzuhurLokalDate = new Date(dzuhurBase.getTime() + diffMs + (ihtiyat * 60000));
                
                const pad = (n) => String(n).padStart(2, '0');
                resDzuhurLokal.innerText = `${pad(dzuhurLokalDate.getHours())}:${pad(dzuhurLokalDate.getMinutes())}:${pad(dzuhurLokalDate.getSeconds())}`;
                return;
            }
        }
        resDzuhurLokal.innerText = dzuhurIstiwa;
    }
}

/**
 * Menghubungkan ulang fungsi hitungFalak agar memperbarui tampilan ihtiyat
 */
function initFalakEngineHook() {
    if (typeof window.hitungFalak === 'function' && !window.hitungFalak.hasHooked) {
        const originalHitungFalak = window.hitungFalak;
        window.hitungFalak = function () {
            // Bersihkan cache raw time saat parameter diubah
            ['resSubuh', 'resSubuhLokal', 'resAsr', 'resAsrLokal', 'resMaghrib', 'resMaghribLokal', 'resIsya', 'resIsyaLokal'].forEach(id => {
                const el = document.getElementById(id);
                if (el) delete el.dataset.raw;
            });

            // Jalankan perhitungan asli Falak Engine
            originalHitungFalak();

            // Tambahkan ihtiyat ke hasil UI
            prosesDanTampilkanIhtiyat();
        };
        window.hitungFalak.hasHooked = true;
    }
}

/**
 * Memicu Aktivasi Notifikasi & Membuka Akses Audio Browser
 */
function toggleAdzanAudio() {
    const btn = document.getElementById('btnToggleAdzan');
    const audioBiasa = document.getElementById('audioBiasa');

    if (!adzanAktif) {
        // Minta Izin Notifikasi Browser
        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }

        // Pemicu pancingan suara (memenuhi syarat browser autoplay policy)
        if (audioBiasa) {
            audioBiasa.volume = 0;
            audioBiasa.play().then(() => {
                audioBiasa.pause();
                audioBiasa.currentTime = 0;
                audioBiasa.volume = 1;
            }).catch(() => {});
        }

        adzanAktif = true;
        if (btn) {
            btn.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300');
            btn.classList.add('bg-emerald-600', 'text-white');
            btn.innerHTML = '🔔 Adzan: Aktif';
        }
        
        if (typeof showToast === 'function') {
            showToast('🔔 Notifikasi & Audio Adzan Berhasil Diaktifkan');
        }
    } else {
        adzanAktif = false;
        if (btn) {
            btn.classList.remove('bg-emerald-600', 'text-white');
            btn.classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300');
            btn.innerHTML = '🔕 Adzan: Mute';
        }
    }
}

/**
 * Real-time Engine Pengawas Waktu Adzan (Interval 1 Detik)
 */
function jalankanPengawasAdzanRealtime() {
    setInterval(() => {
        // Update terus posisi Dzuhur Lokal sesuai jam realtime
        const inputIhtiyat = document.getElementById('inputIhtiyat');
        const ihtiyat = inputIhtiyat ? parseInt(inputIhtiyat.value, 10) || 0 : 0;
        hitungkanKartuDzuhur(ihtiyat);

        if (!adzanAktif) return;

        const sekarang = new Date();
        const jamSekarang = String(sekarang.getHours()).padStart(2, '0') + ':' + 
                            String(sekarang.getMinutes()).padStart(2, '0');
        const hariIniKey = sekarang.toDateString();

        // Ambil Jadwal Waktu Sholat Lokal dari Kartu Tampilan UI
        const daftarWaktuSholat = [
            { nama: 'Subuh', id: 'resSubuhLokal', audio: 'audioSubuh' },
            { nama: 'Dzuhur', id: 'resDzuhurLokal', audio: 'audioBiasa' },
            { nama: 'Asar', id: 'resAsrLokal', audio: 'audioBiasa' },
            { nama: 'Maghrib', id: 'resMaghribLokal', audio: 'audioBiasa' },
            { nama: 'Isya', id: 'resIsyaLokal', audio: 'audioBiasa' }
        ];

        daftarWaktuSholat.forEach(sholat => {
            const el = document.getElementById(sholat.id);
            if (!el) return;

            const waktuSholat = el.innerText.substring(0, 5); // Ambil format HH:MM
            const pemicuKey = `${hariIniKey}-${sholat.nama}-${waktuSholat}`;

            if (jamSekarang === waktuSholat && !adzanSudahBunyiHariIni[pemicuKey]) {
                adzanSudahBunyiHariIni[pemicuKey] = true;

                // 1. Putar Suara Adzan
                const audioEl = document.getElementById(sholat.audio);
                if (audioEl) {
                    audioEl.currentTime = 0;
                    audioEl.play().catch(e => console.log('Autoplay diblokir browser:', e));
                }

                // 2. Tampilkan Notifikasi Desktop / HP
                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification(`Waktu Sholat ${sholat.nama} Telah Tiba`, {
                        body: `Saatnya menunaikan ibadah Sholat ${sholat.nama} untuk wilayah Anda.`,
                        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🕌</text></svg>'
                    });
                }
            }
        });
    }, 1000);
}

// Inisialisasi Otomatis saat DOM Dimuat
window.addEventListener('DOMContentLoaded', () => {
    initFalakEngineHook();
    prosesDanTampilkanIhtiyat();
    jalankanPengawasAdzanRealtime();
});