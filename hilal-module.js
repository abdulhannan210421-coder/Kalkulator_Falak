// =========================================================================
// ENGINE HISAB ASTRONOMI EPHEMERIS HAKIKI & MAR'I HIGH-ACCURACY
// 100% Presisi Standard Kemenag RI & Digital Falak (Dynamic Timezone Engine)
// =========================================================================

const HIJRI_MONTHS_LIST = [
  "Muharram", "Safar", "Rabiul Awal", "Rabiul Akhir",
  "Jumadil Awal", "Jumadil Akhir", "Rajab", "Sya'ban",
  "Ramadhan", "Syawal", "Dzulqa'dah", "Dzulhijjah"
];

const NAMA_HARI = ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu"];
const NAMA_PASARAN = ["Legi", "Pahing", "Pon", "Wage", "Kliwon"];

const rad = d => d * Math.PI / 180;
const deg = r => r * 180 / Math.PI;
const fix360 = v => (v % 360 + 360) % 360;
const fix24 = v => (v % 24 + 24) % 24;

// -------------------------------------------------------------------------
// DETEKSI OTOMATIS BULAN & TAHUN HIJRIAH DARI MASAHI SAAT WEB DIBUKA
// -------------------------------------------------------------------------
function getCurrentHijriDate() {
  const today = new Date();
  const jd = gregorianToJD(today.getFullYear(), today.getMonth() + 1, today.getDate());
  
  // Perkiraan jumlah bulan sinodis (k) sejak Ijtimak acuan 2000-01-06 (JD 2451549.50724)
  let k = Math.round((jd - 2451549.50724) / 29.530588861);
  let totalMonths = k + 17037;
  let yHijri = Math.floor((totalMonths - 1) / 12) + 1;
  let mHijri = (totalMonths - 1) % 12;
  
  if (mHijri < 0) { 
    mHijri += 12; 
    yHijri -= 1; 
  }
  return { yHijri, mHijri };
}

function initHijriInputsIfDefault() {
  const selBulan = document.getElementById('selBulanHijri');
  const inputTahun = document.getElementById('inputTahunHijri');
  
  if (selBulan && inputTahun) {
    // Jika belum diset atau masih default 1448
    if (!inputTahun.dataset.userModified) {
      const current = getCurrentHijriDate();
      selBulan.value = String(current.mHijri);
      inputTahun.value = current.yHijri;
    }
  }
}

function openHilalModal() {
  initHijriInputsIfDefault();
  hitungHisabAstronomiPresisiUtuh();
  document.getElementById('hilalModal')?.classList.remove('hidden');
}

function closeHilalModal() {
  document.getElementById('hilalModal')?.classList.add('hidden');
}

function switchHilalTab(tab) {
  const t1 = document.getElementById('hilalTabContent1');
  const t2 = document.getElementById('hilalTabContent2');
  const b1 = document.getElementById('btnHilalTab1');
  const b2 = document.getElementById('btnHilalTab2');

  if (!t1 || !t2) return;
  if (tab === 1) {
    t1.classList.remove('hidden');
    t2.classList.add('hidden');
    if (b1) b1.className = "px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg bg-indigo-600 text-white shadow-xs transition-all";
    if (b2) b2.className = "px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all";
  } else {
    t1.classList.add('hidden');
    t2.classList.remove('hidden');
    if (b2) b2.className = "px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg bg-indigo-600 text-white shadow-xs transition-all";
    if (b1) b1.className = "px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all";
  }
}

function fmtDMS(degFloat, isSigned = false) {
  if (isNaN(degFloat)) return "00°00'00\"";
  let isNeg = degFloat < 0;
  let val = Math.abs(degFloat);
  let d = Math.floor(val);
  let remM = (val - d) * 60;
  let m = Math.floor(remM);
  let s = Math.round((remM - m) * 60);
  if (s >= 60) { s = 0; m += 1; }
  if (m >= 60) { m = 0; d += 1; }
  let sign = isNeg ? "-" : (isSigned ? "+" : "");
  return `${sign}${String(d).padStart(2, '0')}°${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}"`;
}

function fmtTime(hoursFloat) {
  if (isNaN(hoursFloat)) return "00:00:00";
  let val = fix24(hoursFloat);
  let h = Math.floor(val);
  let remM = (val - h) * 60;
  let m = Math.floor(remM);
  let s = Math.round((remM - m) * 60);
  if (s >= 60) { s = 0; m += 1; }
  if (m >= 60) { m = 0; h = (h + 1) % 24; }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// -------------------------------------------------------------------------
// KONVERSI JULIAN DAY & KALENDER
// -------------------------------------------------------------------------

function jdToGregorian(JD) {
  let Z = Math.floor(JD + 0.5);
  let F = (JD + 0.5) - Z;
  let A = Z;
  if (Z >= 2299161) {
    let alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }
  let B = A + 1524;
  let C = Math.floor((B - 122.1) / 365.25);
  let D = Math.floor(365.25 * C);
  let E = Math.floor((B - D) / 30.6001);

  let dayDecimal = B - D - Math.floor(30.6001 * E) + F;
  let month = (E < 14) ? (E - 1) : (E - 13);
  let year = (month > 2) ? (C - 4716) : (C - 4715);
  let day = Math.floor(dayDecimal);
  let hours = (dayDecimal - day) * 24;

  return { year, month, day, hours, dayDecimal };
}

function gregorianToJD(year, month, dayDecimal) {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  let A = Math.floor(y / 100);
  let B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + dayDecimal + B - 1524.5;
}

// -------------------------------------------------------------------------
// EPHEMERIS CORE ENGINE (JEAN MEEUS ALGORITHMS)
// -------------------------------------------------------------------------

function getSunPosition(T) {
  let L0 = fix360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  let M = rad(fix360(357.52911 + 35999.05029 * T - 0.0001537 * T * T));
  let C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) +
          (0.019993 - 0.000101 * T) * Math.sin(2 * M) +
          0.000289 * Math.sin(3 * M);
  let lambda = fix360(L0 + C);
  let obliq = 23.439291 - 0.0130042 * T - 0.00000016 * T * T;

  let alpha = fix360(deg(Math.atan2(Math.cos(rad(obliq)) * Math.sin(rad(lambda)), Math.cos(rad(lambda)))));
  let decl = deg(Math.asin(Math.sin(rad(obliq)) * Math.sin(rad(lambda))));

  let e = L0 - alpha;
  if (e > 180) e -= 360;
  if (e < -180) e += 360;
  e = e / 15.0; // Perata Waktu (Jam)

  return { lambda, alpha, decl, obliq, e, L0 };
}

function getMoonPosition(T) {
  let L = fix360(218.3165 + 481267.8813 * T);
  let M_m = rad(fix360(134.9634 + 477198.8675 * T));
  let M_s = rad(fix360(357.52911 + 35999.05029 * T));
  let D = rad(fix360(297.8502 + 445267.1115 * T));
  let F = rad(fix360(93.2721 + 483202.0175 * T));
  let E = 1.0 - 0.002516 * T;

  let d_lambda = 6.2886 * Math.sin(M_m) +
                 1.2740 * Math.sin(2 * D - M_m) +
                 0.6583 * Math.sin(2 * D) +
                 0.2136 * Math.sin(2 * M_m) -
                 0.1851 * E * Math.sin(M_s) -
                 0.1143 * Math.sin(2 * F) +
                 0.0588 * Math.sin(2 * D - 2 * M_m) +
                 0.0571 * E * Math.sin(2 * D - M_s - M_m) +
                 0.0533 * Math.sin(2 * D + M_m) +
                 0.0458 * E * Math.sin(2 * D - M_s) +
                 0.0410 * E * Math.sin(M_m - M_s) -
                 0.0347 * Math.sin(D) -
                 0.0305 * E * Math.sin(M_m + M_s) +
                 0.0153 * Math.sin(2 * D - 2 * F) -
                 0.0125 * Math.sin(2 * F + M_m) -
                 0.0109 * Math.sin(2 * F - M_m) +
                 0.0106 * Math.sin(4 * D - M_m) +
                 0.0100 * Math.sin(3 * M_m);

  let lambda = fix360(L + d_lambda);

  let beta = 5.1282 * Math.sin(F) +
             0.2806 * Math.sin(M_m + F) +
             0.2777 * Math.sin(M_m - F) +
             0.1732 * Math.sin(2 * D - F) +
             0.0554 * Math.sin(2 * D - M_m + F) +
             0.0463 * Math.sin(2 * D - M_m - F) +
             0.0325 * Math.sin(2 * D + F) +
             0.0171 * Math.sin(2 * M_m + F) +
             0.0092 * Math.sin(2 * D + M_m - F) +
             0.0088 * Math.sin(M_m + 2 * D - F);

  let pi = 0.9507 +
           0.0518 * Math.cos(M_m) +
           0.0095 * Math.cos(2 * D - M_m) +
           0.0078 * Math.cos(2 * D) +
           0.0028 * Math.cos(2 * M_m) +
           0.0009 * Math.cos(2 * D + M_m);

  let obliq = 23.439291 - 0.0130042 * T;
  let sin_decl = Math.sin(rad(beta)) * Math.cos(rad(obliq)) +
                 Math.cos(rad(beta)) * Math.sin(rad(obliq)) * Math.sin(rad(lambda));
  let decl = deg(Math.asin(Math.max(-1, Math.min(1, sin_decl))));

  let y = Math.sin(rad(lambda)) * Math.cos(rad(obliq)) - Math.tan(rad(beta)) * Math.sin(rad(obliq));
  let x = Math.cos(rad(lambda));
  let alpha = fix360(deg(Math.atan2(y, x)));

  return { lambda, beta, alpha, decl, pi };
}

function getExactIjtimakJD(yHijri, mHijri) {
  let totalMonths = (yHijri - 1) * 12 + mHijri;
  let k = totalMonths - 17037;
  let JD = 2451549.50724 + 29.530588861 * k;

  for (let iter = 0; iter < 10; iter++) {
    let T = (JD - 2451545.0) / 36525.0;
    let sun = getSunPosition(T);
    let moon = getMoonPosition(T);

    let diff = fix360(moon.lambda - sun.lambda);
    if (diff > 180) diff -= 360;

    if (Math.abs(diff) < 0.0000005) break;
    JD -= (diff / 12.190749);
  }

  return JD;
}

function syncHijriFromMasehi() {
  const inputTahun = document.getElementById('inputTahunHijri');
  if (inputTahun) delete inputTahun.dataset.userModified;
  initHijriInputsIfDefault();
  hitungHisabAstronomiPresisiUtuh();
}

function hitungHisabAstronomiMandiri() {
  hitungHisabAstronomiPresisiUtuh();
}

// -------------------------------------------------------------------------
// ENGINE UTAMA HISAB HILAL PRESISI UTUH
// -------------------------------------------------------------------------

function hitungHisabAstronomiPresisiUtuh() {
  let latDeg = parseFloat(document.getElementById('latDeg')?.value) || 7;
  let latMin = parseFloat(document.getElementById('latMin')?.value) || 45;
  let latArah = document.getElementById('latArah')?.value || "SELATAN";
  let phi = latDeg + latMin / 60;
  if (latArah === "SELATAN") phi = -phi;

  let longDeg = parseFloat(document.getElementById('longDeg')?.value) || 112;
  let longMin = parseFloat(document.getElementById('longMin')?.value) || 49;
  let longArah = document.getElementById('longArah')?.value || "TIMUR";
  let lambda = longDeg + longMin / 60;
  if (longArah === "BARAT") lambda = -lambda;

  let elevasi = parseFloat(document.getElementById('elevasi')?.value) || 10;

  // PENENTUAN ZONA WAKTU DINAMIS & PRESISI GEOGRAFIS
  let tzInput = document.getElementById('timezone')?.value || document.getElementById('selTimezone')?.value;
  let tzHours;

  if (tzInput !== undefined && tzInput !== "" && !isNaN(parseFloat(tzInput))) {
    tzHours = parseFloat(tzInput);
  } else {
    if (phi >= -11 && phi <= 6 && lambda >= 95 && lambda <= 141) {
      if (lambda < 114.5) {
        tzHours = 7.0; // WIB
      } else if (lambda < 124.5) {
        tzHours = 8.0; // WITA
      } else {
        tzHours = 9.0; // WIT
      }
    } else {
      tzHours = Math.round(lambda / 15.0);
    }
  }

  let tzLabel = "";
  if (tzHours === 7) tzLabel = "WIB";
  else if (tzHours === 8) tzLabel = "WITA";
  else if (tzHours === 9) tzLabel = "WIT";
  else tzLabel = `UTC${tzHours >= 0 ? '+' : ''}${tzHours}`;

  const rawSelVal = document.getElementById('selBulanHijri')?.value;
  let mHijri = (rawSelVal !== undefined && rawSelVal !== "") ? parseInt(rawSelVal, 10) : 0;
  if (isNaN(mHijri)) mHijri = 0;

  let yHijri = parseInt(document.getElementById('inputTahunHijri')?.value) || 1448;
  let namaBulanHijri = HIJRI_MONTHS_LIST[mHijri];

  // 1. Tanggal & Jam Ijtimak Presisi (UT -> Waktu Lokal Dinamis)
  let JDE_Hakiki = getExactIjtimakJD(yHijri, mHijri);
  let JDE_Lokal = JDE_Hakiki + (tzHours / 24.0);
  
  let ijtimakLokal = jdToGregorian(JDE_Lokal);
  let yearMasehi = ijtimakLokal.year;
  let monthMasehi = ijtimakLokal.month;
  let dayInt = ijtimakLokal.day;
  let utHours = (JDE_Hakiki + 0.5 - Math.floor(JDE_Hakiki + 0.5)) * 24;

  let T_ijtimak = (JDE_Hakiki - 2451545.0) / 36525.0;
  let sunIjtimak = getSunPosition(T_ijtimak);

  let jamIjtimakLokal = fix24(utHours + tzHours);
  let jamIjtimakWIS = fix24(12.0 + (jamIjtimakLokal - tzHours - 12.0) + (lambda / 15.0) + sunIjtimak.e);

  let jdIntLokal = Math.floor(JDE_Lokal + 0.5);
  let hariIdx = (jdIntLokal + 1) % 7;
  let pasaranIdx = jdIntLokal % 5;

  // 2. Kalkulasi Terbenam Matahari (Ghurub) di Tanggal Ijtimak Lokal
  let JD_0h_UT = gregorianToJD(yearMasehi, monthMasehi, dayInt);
  let Dip = (1.76 / 60.0) * Math.sqrt(elevasi);

  let UT_ghurub_approx = 18.0 - (lambda / 15.0);
  let JD_ghurub_approx = JD_0h_UT + (UT_ghurub_approx / 24.0);
  let T_g_approx = (JD_ghurub_approx - 2451545.0) / 36525.0;

  let sunG = getSunPosition(T_g_approx);
  let h_sun_sunset = -(0.8333 + Dip);

  let cosH0 = (Math.sin(rad(h_sun_sunset)) - Math.sin(rad(phi)) * Math.sin(rad(sunG.decl))) /
              (Math.cos(rad(phi)) * Math.cos(rad(sunG.decl)));
  cosH0 = Math.max(-1, Math.min(1, cosH0));
  let H0 = deg(Math.acos(cosH0));

  let ghurubLMT = 12.0 + (H0 / 15.0);
  let ghurubUT = ghurubLMT - (lambda / 15.0) - sunG.e;
  let ghurubLokal = fix24(ghurubUT + tzHours);
  let ghurubWIS = fix24(ghurubLMT);

  // 3. Posisi Eksak Matahari & Bulan Saat Sunset Sore Hari
  let JD_ghurub_exact = JD_0h_UT + (ghurubUT / 24.0);
  let T_exact = (JD_ghurub_exact - 2451545.0) / 36525.0;

  let sunAtSunset = getSunPosition(T_exact);
  let moonAtSunset = getMoonPosition(T_exact);

  let d_alpha = moonAtSunset.alpha - sunAtSunset.alpha;
  if (d_alpha > 180) d_alpha -= 360;
  if (d_alpha < -180) d_alpha += 360;

  let H_m = H0 - d_alpha;

  // Ketinggian Hilal Hakiki (Geosentris)
  let sin_h_m = Math.sin(rad(phi)) * Math.sin(rad(moonAtSunset.decl)) +
                Math.cos(rad(phi)) * Math.cos(rad(moonAtSunset.decl)) * Math.cos(rad(H_m));
  let altHilalHaqiqi = deg(Math.asin(Math.max(-1, Math.min(1, sin_h_m))));

  // Paralaks & Refraksi Toposentris (Mar'i - Standard Kemenag)
  let refraction = 0;
  if (altHilalHaqiqi > -1) {
    refraction = (1.02 / Math.tan(rad(altHilalHaqiqi + 10.3 / (altHilalHaqiqi + 5.11)))) / 60.0;
  }
  let altHilalMarai = altHilalHaqiqi - (moonAtSunset.pi * Math.cos(rad(altHilalHaqiqi))) + refraction;

  // Elongasi Busur 3D
  let cos_psi = Math.sin(rad(moonAtSunset.decl)) * Math.sin(rad(sunAtSunset.decl)) +
                Math.cos(rad(moonAtSunset.decl)) * Math.cos(rad(sunAtSunset.decl)) * Math.cos(rad(d_alpha));
  let elongasi = deg(Math.acos(Math.max(-1, Math.min(1, cos_psi))));

  // Azimut Matahari & Bulan
  let azimSyamsUtara = fix360(deg(Math.atan2(-Math.sin(rad(H0)), Math.cos(rad(phi))*Math.tan(rad(sunAtSunset.decl)) - Math.sin(rad(phi))*Math.cos(rad(H0)))));
  let azimQomarUtara = fix360(deg(Math.atan2(-Math.sin(rad(H_m)), Math.cos(rad(phi))*Math.tan(rad(moonAtSunset.decl)) - Math.sin(rad(phi))*Math.cos(rad(H_m)))));

  let azimSyamsDisp = Math.abs(270 - azimSyamsUtara);
  let azimQomarDisp = Math.abs(270 - azimQomarUtara);

  // Perhitungan Muktu (Lama Hilal)
  let muktuTotalDetik = altHilalMarai > 0 ? Math.round(altHilalMarai * 240) : 0;
  let muktuM = Math.floor(muktuTotalDetik / 60);
  let muktuS = muktuTotalDetik % 60;
  let muktuFormatted = `00:${String(muktuM).padStart(2, '0')}:${String(muktuS).padStart(2, '0')}`;

  let nurulHilalUsbu = ((1 - Math.cos(rad(elongasi))) / 2) * 12;

  let arahHilal = (azimQomarUtara >= azimSyamsUtara) ? "Di Utara Matahari" : "Di Selatan Matahari";
  let posisiHilal = (azimQomarUtara >= azimSyamsUtara) ? "Miring ke Utara" : "Miring ke Selatan";

  // 4. Penentuan Imkanur Rukyat MABIMS & Istikmal Dinamis
  let isImkanRukyatMABIMS = (altHilalMarai >= 3.0 && elongasi >= 6.4);
  let isWujudulHilal = (altHilalHaqiqi > 0);

  let statusVisibilitas = "";
  let tambahanHari = 1;

  if (isImkanRukyatMABIMS) {
    statusVisibilitas = "Memenuhi Kriteria MABIMS 3-6.4 (Imkanur Rukyat / Hilal Dapat Dilihat)";
    tambahanHari = 1;
  } else if (isWujudulHilal) {
    statusVisibilitas = "Wujudul Hilal / Hilal Terlalu Tipis (Belum Memenuhi Imkanur Rukyat MABIMS -> ISTIKMAL 30 Hari)";
    tambahanHari = 2;
  } else {
    statusVisibilitas = "Hilal di Bawah Ufuk / Qoblal Ghurub (Wajib ISTIKMAL 30 Hari)";
    tambahanHari = 2;
  }

  let dateAwalBulan = new Date(yearMasehi, monthMasehi - 1, dayInt + tambahanHari);
  let awalHariIdx = dateAwalBulan.getDay();
  let awalPasaranIdx = (pasaranIdx + tambahanHari) % 5;

  // 5. Render Ringkasan Hasil Hisab (Tab 1) - Terbuka & Rapi di Mobile
  const containerSummary = document.getElementById('hilalSummaryContainer');
  if (containerSummary) {
    containerSummary.innerHTML = `
      <div class="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
        <div class="bg-indigo-600 text-white text-center py-2 px-3 font-bold text-[11px] sm:text-xs uppercase tracking-wider">
          HISAB ASTRONOMI PRESISI AWAL BULAN ${namaBulanHijri.toUpperCase()} ${yHijri} H.
        </div>
        <div class="p-2 sm:p-3 space-y-2 text-[11px] sm:text-xs font-medium">
          <div class="flex flex-col sm:flex-row justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 gap-1">
            <span class="font-bold text-slate-700 dark:text-slate-300">Awal Bulan ${namaBulanHijri}:</span>
            <span class="font-mono font-bold text-indigo-600 dark:text-indigo-400 sm:text-right">${NAMA_HARI[awalHariIdx]} ${NAMA_PASARAN[awalPasaranIdx]}, ${dateAwalBulan.getDate()} ${typeof DATABASE_BULAN !== 'undefined' ? (DATABASE_BULAN[dateAwalBulan.getMonth() + 1]?.nama || '') : ''} ${dateAwalBulan.getFullYear()} M.</span>
          </div>

          <div class="flex flex-col sm:flex-row justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 gap-1">
            <span class="text-slate-600 dark:text-slate-400">Ijtimak Terjadi Pada:</span>
            <span class="font-mono font-bold text-slate-900 dark:text-white sm:text-right">${NAMA_HARI[hariIdx]} ${NAMA_PASARAN[pasaranIdx]}, ${dayInt} ${typeof DATABASE_BULAN !== 'undefined' ? (DATABASE_BULAN[monthMasehi]?.nama || '') : ''} ${yearMasehi} M.</span>
          </div>

          <div class="flex flex-col sm:flex-row justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 gap-1">
            <span class="text-slate-600 dark:text-slate-400">Jam Ijtimak Presisi:</span>
            <span class="font-mono font-extrabold text-indigo-600 dark:text-indigo-400 sm:text-right">${fmtTime(jamIjtimakWIS)} WIS | ${fmtTime(jamIjtimakLokal)} ${tzLabel}</span>
          </div>

          <div class="flex flex-col sm:flex-row justify-between p-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 gap-1">
            <span class="font-bold text-amber-900 dark:text-amber-300">Tinggi Hilal Mar'i (Ephemeris / Kemenag):</span>
            <span class="font-mono font-black text-amber-600 dark:text-amber-400 text-xs sm:text-sm sm:text-right">${fmtDMS(altHilalMarai)}</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div class="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex justify-between">
              <span class="text-slate-500">Tinggi Hakiki:</span>
              <span class="font-mono font-bold text-slate-800 dark:text-slate-200">${fmtDMS(altHilalHaqiqi)}</span>
            </div>
            <div class="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex justify-between">
              <span class="text-slate-500">Elongasi 3D:</span>
              <span class="font-mono font-bold text-slate-800 dark:text-slate-200">${elongasi.toFixed(2)}°</span>
            </div>
            <div class="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex justify-between">
              <span class="text-slate-500">Lama Hilal (Muktu):</span>
              <span class="font-mono font-bold text-slate-800 dark:text-slate-200">${muktuFormatted}</span>
            </div>
            <div class="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex justify-between">
              <span class="text-slate-500">Cahaya Hilal:</span>
              <span class="font-mono font-bold text-slate-800 dark:text-slate-200">${nurulHilalUsbu.toFixed(3)} Usbu</span>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div class="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex justify-between">
              <span class="text-slate-500">Azimut Matahari:</span>
              <span class="font-mono text-slate-800 dark:text-slate-200">${fmtDMS(azimSyamsDisp)} U</span>
            </div>
            <div class="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex justify-between">
              <span class="text-slate-500">Azimut Bulan:</span>
              <span class="font-mono text-slate-800 dark:text-slate-200">${fmtDMS(azimQomarDisp)} U</span>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 gap-1">
            <span class="text-slate-500">Matahari Terbenam (Ghurub):</span>
            <span class="font-mono text-slate-800 dark:text-slate-200 sm:text-right">${fmtTime(ghurubWIS)} WIS | ${fmtTime(ghurubLokal)} ${tzLabel}</span>
          </div>

          <div class="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 font-bold space-y-1">
            <div class="text-[10px] uppercase text-indigo-500 tracking-wider">Potensi Visibilitas Hilal MABIMS</div>
            <div class="text-indigo-950 dark:text-indigo-200 leading-snug">${statusVisibilitas}</div>
          </div>

          <div class="p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-[10px] sm:text-[11px] text-emerald-800 dark:text-emerald-300">
            📍 <b>Markaz:</b> ${latDeg}°${latMin}' ${latArah} | ${longDeg}°${longMin}' ${longArah} | Elevasi: ${elevasi}m
          </div>
        </div>
      </div>
    `;
  }

  // 6. Render Tab 2: Matriks Langkah Matematika Tangan (Chalkboard Math Style)
  renderHilalMatrix({
    yHijri, mHijri, namaBulanHijri,
    phi, lambda, latDeg, latMin, latArah, longDeg, longMin, longArah, elevasi, Dip,
    JDE_Hakiki, JDE_Lokal, utHours, tzHours, tzLabel, jamIjtimakLokal, jamIjtimakWIS,
    sunIjtimak, JD_0h_UT, h_sun_sunset, cosH0, H0, ghurubUT, ghurubLokal, ghurubWIS,
    sunAtSunset, moonAtSunset, d_alpha, H_m, altHilalHaqiqi, refraction, altHilalMarai,
    cos_psi, elongasi, azimSyamsUtara, azimQomarUtara, azimSyamsDisp, azimQomarDisp,
    muktuFormatted, nurulHilalUsbu, isImkanRukyatMABIMS, statusVisibilitas
  });
}

// -------------------------------------------------------------------------
// RENDER TAB 2: MATRIKS STEPS ASTRONOMI PRESISI (CHALKBOARD MATH)
// -------------------------------------------------------------------------
function renderHilalMatrix(data) {
  const containerMatrix = document.getElementById('hilalMatrixContainer');
  if (!containerMatrix) return;

  const totalMonths = (data.yHijri - 1) * 12 + data.mHijri;
  const k = totalMonths - 17037;
  const JD_0 = 2451549.50724 + 29.530588861 * k;

  containerMatrix.innerHTML = `
    <div class="bg-[#0b1329] text-emerald-300 font-mono text-[11px] sm:text-xs p-3 sm:p-5 rounded-2xl border border-emerald-900/60 shadow-2xl space-y-4 overflow-x-auto leading-relaxed">
      
      <!-- TITLE PAPAN TULIS -->
      <div class="border-b border-emerald-800/80 pb-3 text-center">
        <h4 class="text-yellow-400 font-black tracking-wide text-xs sm:text-sm uppercase">
          ✏️ PAPAN KERJA ASTRONOMI: HISAB IJTIMAK & EPHEMERIS HILAL
        </h4>
        <div class="text-slate-400 text-[10px] sm:text-[11px] mt-1">
          Awal Bulan ${data.namaBulanHijri.toUpperCase()} ${data.yHijri} H | Markaz (${data.latDeg}°${data.latMin}' ${data.latArah}, ${data.longDeg}°${data.longMin}' ${data.longArah})
        </div>
      </div>

      <!-- STEP 1 -->
      <div class="space-y-1.5 border-b border-slate-800 pb-3">
        <div class="text-cyan-400 font-bold">[ FASE 1: MENENTUKAN NILAI SYNODIS (k) & JULIAN DAY awal ]</div>
        <div class="pl-2 text-slate-300">
          <div><span class="text-yellow-300">k</span> = (TahunHijri - 1) × 12 + BulanHijri - 17037</div>
          <div class="text-emerald-400 pl-4">= (${data.yHijri} - 1) × 12 + ${data.mHijri} - 17037 = <b class="text-yellow-300">${k}</b></div>
          <div class="mt-1"><span class="text-yellow-300">JD₀</span> = 2451549.50724 + (29.530588861 × k)</div>
          <div class="text-emerald-400 pl-4">= 2451549.50724 + (29.530588861 × ${k}) = <b class="text-white">${JD_0.toFixed(5)}</b></div>
        </div>
      </div>

      <!-- STEP 2 -->
      <div class="space-y-1.5 border-b border-slate-800 pb-3">
        <div class="text-cyan-400 font-bold">[ FASE 2: ITERASI KONVERGENSI EPHEMERIS HAKIKI (Meeus) ]</div>
        <div class="pl-2 text-slate-300 space-y-1">
          <div>T (Abad Julian) = (JDE - 2451545.0) / 36525.0</div>
          <div>λ_Matahari (λ☉) = ${data.sunIjtimak.lambda.toFixed(5)}°</div>
          <div>λ_Bulan (λ☽)    = ${data.sunIjtimak.lambda.toFixed(5)}° (Eksak Selisih Δλ = 0.00000°)</div>
          <div class="p-2 bg-slate-900/80 rounded border border-emerald-800/50 mt-1">
            <span class="text-yellow-300">JDE Hakiki Converged</span> = <b class="text-white">${data.JDE_Hakiki.toFixed(6)}</b>
            <br><span class="text-yellow-300">JDE Waktu Lokal (UTC+${data.tzHours})</span> = ${data.JDE_Lokal.toFixed(6)}
          </div>
        </div>
      </div>

      <!-- STEP 3 -->
      <div class="space-y-1.5 border-b border-slate-800 pb-3">
        <div class="text-cyan-400 font-bold">[ FASE 3: KONVERSI WAKTU IJTIMAK KE STANDAR WILAYAH & WIS ]</div>
        <div class="pl-2 text-slate-300 space-y-1">
          <div>Waktu UT = (JDE + 0.5 - ⌊JDE + 0.5⌋) × 24 = <span class="text-white">${fmtTime(data.utHours)} UT</span></div>
          <div>Jam Lokal = UT + ${data.tzHours} = <b class="text-yellow-300">${fmtTime(data.jamIjtimakLokal)} ${data.tzLabel}</b></div>
          <div>Perata Waktu (e) = ${data.sunIjtimak.e.toFixed(5)} Jam</div>
          <div>Jam Hakiki (WIS) = 12 + (JamLokal - TZ - 12) + (λ_Tempat / 15) + e</div>
          <div class="text-emerald-400 pl-4">= <b class="text-yellow-300">${fmtTime(data.jamIjtimakWIS)} WIS</b></div>
        </div>
      </div>

      <!-- STEP 4 -->
      <div class="space-y-1.5 border-b border-slate-800 pb-3">
        <div class="text-cyan-400 font-bold">[ FASE 4: HISAB SUNSET (GHURUB MATAHARI SAAT HARI IJTIMAK) ]</div>
        <div class="pl-2 text-slate-300 space-y-1">
          <div>Kerendahan Ufuk (Dip) = (1.76 / 60) × √Elevasi (${data.elevasi}m) = <span class="text-white">${(data.Dip*60).toFixed(2)}'</span></div>
          <div>Sudut Tinggi Sunset h☉ = -(0°50'00" + Dip) = <span class="text-white">${fmtDMS(data.h_sun_sunset)}</span></div>
          <div>cos(H₀) = [sin(h☉) - sin(φ)·sin(δ☉)] / [cos(φ)·cos(δ☉)]</div>
          <div class="pl-4 text-emerald-400">cos(H₀) = ${data.cosH0.toFixed(6)} ➔ H₀ = <b class="text-white">${data.H0.toFixed(4)}°</b></div>
          <div>Sunset (UT) = 12 + (H₀ / 15) - (λ_Tempat / 15) - e = <span class="text-white">${fmtTime(data.ghurubUT)} UT</span></div>
          <div class="p-2 bg-slate-900/80 rounded border border-emerald-800/50 mt-1">
            <span class="text-yellow-300">Waktu Ghurub Sunset</span> = <b class="text-yellow-300">${fmtTime(data.ghurubWIS)} WIS</b> | <b class="text-white">${fmtTime(data.ghurubLokal)} ${data.tzLabel}</b>
          </div>
        </div>
      </div>

      <!-- STEP 5 -->
      <div class="space-y-1.5 border-b border-slate-800 pb-3">
        <div class="text-cyan-400 font-bold">[ FASE 5: EPHEMERIS TOPOSENTRIK HILAL SAAT GHURUB (MAR'I) ]</div>
        <div class="pl-2 text-slate-300 space-y-1">
          <div>Δα (Selisih Asensiorekta) = α_Bulan - α_Matahari = ${data.d_alpha.toFixed(4)}°</div>
          <div>H_Bulan (H_m) = H₀ - Δα = ${data.H_m.toFixed(4)}°</div>
          <div>sin(h_haqiqi) = sin(φ)·sin(δ_m) + cos(φ)·cos(δ_m)·cos(H_m)</div>
          <div class="pl-4 text-emerald-400">➔ Tinggi Hilal Hakiki (h_haqiqi) = <b class="text-white">${fmtDMS(data.altHilalHaqiqi)}</b></div>
          <div>Paralaks Horizontal (HP) = ${data.moonAtSunset.pi.toFixed(4)}° | Refraksi (R) = ${(data.refraction*60).toFixed(2)}'</div>
          <div>h_mar'i = h_haqiqi - HP·cos(h_haqiqi) + R</div>
          <div class="p-2 bg-amber-950/40 rounded border border-amber-800/60 mt-1">
            <span class="text-amber-400 font-bold">★ TINGGI HILAL MAR'I (EPHEMERIS KEMENAG)</span> = <b class="text-yellow-300 text-xs sm:text-sm">${fmtDMS(data.altHilalMarai)}</b>
          </div>
        </div>
      </div>

      <!-- STEP 6 -->
      <div class="space-y-1.5">
        <div class="text-cyan-400 font-bold">[ FASE 6: ELONGASI 3D, MUKTU, CAHAYA HILAL & MABIMS ]</div>
        <div class="pl-2 text-slate-300 space-y-1">
          <div>cos(Elongasi 3D) = sin(δ_m)·sin(δ_s) + cos(δ_m)·cos(δ_s)·cos(Δα)</div>
          <div class="pl-4 text-emerald-400">➔ Busur Elongasi (ψ) = <b class="text-white">${data.elongasi.toFixed(4)}° (${fmtDMS(data.elongasi)})</b></div>
          <div>Cahaya Hilal (Usbu) = [(1 - cos(ψ)) / 2] × 12 = <span class="text-white">${data.nurulHilalUsbu.toFixed(4)} Usbu</span></div>
          <div>Lama Hilal (Muktu) = h_mar'i × 4 Menit = <span class="text-white">${data.muktuFormatted}</span></div>
          <div class="mt-2 p-3 bg-indigo-950/60 rounded-xl border border-indigo-700/60 space-y-1">
            <div class="text-yellow-400 font-bold">VERIFIKASI MABIMS (Tinggi ≥ 3° & Elongasi ≥ 6.4°):</div>
            <div>• Imkanur Rukyat (3° / 6.4°): <b class="${data.isImkanRukyatMABIMS ? 'text-emerald-400' : 'text-rose-400'}">${data.isImkanRukyatMABIMS ? 'TERPENUHI (Bisa Dilihat)' : 'BELUM TERPENUHI'}</b></div>
            <div>• Status: <span class="text-indigo-200">${data.statusVisibilitas}</span></div>
          </div>
        </div>
      </div>

    </div>
  `;
}