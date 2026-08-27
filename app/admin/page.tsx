"use client"
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { toPng } from 'html-to-image' 

// --- LOGO LİNKLERİ ---
const AMATOR_MERKEZ_LOGO = "https://upload.wikimedia.org/wikipedia/tr/0/0a/TFF_logo.png?utm_source=tr.wikipedia.org&utm_campaign=index&utm_content=original";
const GELISIM_SOL_LOGO = "https://upload.wikimedia.org/wikipedia/tr/0/0a/TFF_logo.png?utm_source=tr.wikipedia.org&utm_campaign=index&utm_content=original";
const GELISIM_SAG_LOGO = "https://upload.wikimedia.org/wikipedia/tr/0/0a/TFF_logo.png?utm_source=tr.wikipedia.org&utm_campaign=index&utm_content=original"; 

type EkranTuru = 'giris' | 'dashboard' | 'gorevKartlari' | 'skorRapor' | 'mazeretBildir' | 'bultenArama' | 'istatistiklerim';

const raporTurunuBelirle = (kategori: any) => {
    if (!kategori) return 'amator';
    const kat = String(kategori).toLocaleUpperCase('tr-TR');
    if (kat.includes('GELİŞİM') || kat.includes('AKADEMİ') || kat.includes('ELİT')) return 'gelisim';
    if (kat.includes('PROF') || kat.includes('NESİNE') || kat.includes('KADIN') || kat.includes('BÖLGESEL') || kat.includes('BAL') || kat.includes('3. LİG') || kat.includes('2. LİG')) return 'yok';
    return 'amator';
}

const detayliRaporGosterilirMi = (kategori: any) => {
  if (!kategori) return true;
  const kat = String(kategori).toLocaleUpperCase('tr-TR');
  if (kat.includes('GELİŞİM') || kat.includes('TFF') || kat.includes('PROF') || kat.includes('KADIN') || kat.includes('ELİT') || kat.includes('AKADEMİ') || kat.includes('BÖLGESEL') || kat.includes('BAL')) {
      return false; 
  }
  return true; 
}

const formatKategori = (rawKategori: any) => {
    if (!rawKategori) return 'BELİRTİLMEMİŞ LİG';
    let kat = String(rawKategori).toLocaleUpperCase('tr-TR').trim();
    if (kat.includes('GELİŞİM')) return kat.match(/U\s*(\d{2})/) ? `TFF U${kat.match(/U\s*(\d{2})/)?.[1]} GELİŞİM LİGİ` : 'TFF GELİŞİM LİGİ';
    if (kat.includes('SÜPER AMATÖR')) return 'SÜPER AMATÖR LİG';
    if (kat.includes('1.') && kat.includes('AMATÖR')) return '1. AMATÖR LİG';
    if (kat.match(/U\s*(\d{2})/) && !kat.includes('PROF') && !kat.includes('KADIN') && !kat.includes('ELİT')) return `İZMİR U${kat.match(/U\s*(\d{2})/)?.[1]} LİGİ`;
    return kat;
}

const gelisimOrganizasyon = [
    { id: 'ambulans', text: '1. Müsabakada Ambulans Bulunduruldu mu?' },
    { id: 'doktor', text: '2. Müsabakada ev sahibi takım tarafından doktor görevlendirildi mi?' },
    { id: 'anons', text: '3. Anons sistemi çalışıyor mu?' },
    { id: 'sedyeci', text: '4. Müsabakada ev sahibi takım tarafından sedyeci (2 kişi) görevlendirildi mi?' }
];

const gelisimTeknik = [
    { id: 'soyunma_odasi', text: '1. Hakem ve Takım Soyunma Odası' }, { id: 'oyun_alani', text: '2. Oyun Alanı' },
    { id: 'kale_aglari', text: '3. Kale ve Ağları' }, { id: 'saha_cizgileri', text: '4. Saha Çizgileri' },
    { id: 'kose_gonderleri', text: '5. Köşe Gönderleri' }, { id: 'teknik_alan', text: '6. Teknik Alan' },
    { id: 'yedek_kulubeleri', text: '7. Yedek Kulübeleri' }, { id: 'skor_tabelasi', text: '8. Skor Tabelası' },
    { id: 'oyuncu_degistirme', text: '9. Oyuncu Değiştirme Tabelası' }
];

const guvenliTarih = (tarihMetni: string | null | undefined) => {
    if (!tarihMetni) return "-";
    try { return new Date(tarihMetni).toLocaleDateString('tr-TR'); } 
    catch (e) { return tarihMetni; }
}

const guvenliSaat = (saatMetni: any) => {
    if (!saatMetni) return "-";
    try { return String(saatMetni).substring(0, 5); } 
    catch (e) { return "-"; }
}

const getZaman = (mac: any) => {
    if (!mac || !mac.tarih) return 0;
    try {
        const parcaTarih = String(mac.tarih).split('-');
        let saat = 0, dakika = 0;
        if (mac.saat) {
            const parcaSaat = String(mac.saat).split(':');
            saat = parseInt(parcaSaat[0] || '0', 10);
            dakika = parseInt(parcaSaat[1] || '0', 10);
        }
        const d = new Date(parseInt(parcaTarih[0]), parseInt(parcaTarih[1])-1, parseInt(parcaTarih[2]), saat, dakika);
        return isNaN(d.getTime()) ? 0 : d.getTime();
    } catch (e) { return 0; }
};

const siralamaFiltresi = (a: any, b: any) => getZaman(a) - getZaman(b);

export default function AdminPage() {
  const [sifre, setSifre] = useState('')
  const [girisYapildi, setGirisYapildi] = useState(false)
  const [hata, setHatasi] = useState('')
  const [tumMaclar, setTumMaclar] = useState<any[]>([])
  const [sezonlukMaclar, setSezonlukMaclar] = useState<any[]>([]) 
  const [tumKomiserler, setTumKomiserler] = useState<any[]>([])
  const [tumMazeretler, setTumMazeretler] = useState<any[]>([]) // YENİ: Mazeret veritabanı
  const [globalAktifHaftaNo, setGlobalAktifHaftaNo] = useState<number>(1)
  const [yukleniyor, setYukleniyor] = useState(true)

  const [acikMacId, setAcikMacId] = useState<number | null>(null)
  const [acikTffMacId, setAcikTffMacId] = useState<number | null>(null) 

  const [kategoriKirmiziAcik, setKategoriKirmiziAcik] = useState(true)
  const [kategoriDisiplinAcik, setKategoriDisiplinAcik] = useState(true)
  const [kategoriOlaysizAcik, setKategoriOlaysizAcik] = useState(true)
  const [kategoriTebellugAcik, setKategoriTebellugAcik] = useState(true)
  const [kategoriBekleyenAcik, setKategoriBekleyenAcik] = useState(true)
  const [kategoriSicilAcik, setKategoriSicilAcik] = useState(false) 
  const [seciliSicilKomiserId, setSeciliSicilKomiserId] = useState<string>('') 

  const girisKontrol = (e: React.FormEvent) => {
    e.preventDefault()
    if (sifre === '1923') { setGirisYapildi(true); setHatasi(''); } 
    else { setHatasi('Hatalı şifre. Operasyon Merkezine giriş reddedildi.') }
  }

  const cumaBul = (tarihMetni: string) => {
    if (!tarihMetni) return 0
    try {
      const parcalar = String(tarihMetni).split('-')
      if (parcalar.length !== 3) return 0
      const d = new Date(Number(parcalar[0]), Number(parcalar[1]) - 1, Number(parcalar[2]))
      const gun = d.getDay()
      const fark = gun >= 5 ? gun - 5 : gun + 2
      d.setDate(d.getDate() - fark)
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    } catch (e) { return 0; }
  }

  useEffect(() => { if (girisYapildi) { veriGetir() } }, [girisYapildi])

  const veriGetir = async () => {
    setYukleniyor(true)
    try {
      let maclarVerisi: any[] = []; let sayfa = 0; const limit = 1000; let veriKaldimi = true;
      while (veriKaldimi) {
        const { data, error } = await supabase.from('musabakalar').select('*').range(sayfa * limit, (sayfa + 1) * limit - 1)
        if (error) break;
        if (data && Array.isArray(data) && data.length > 0) {
          maclarVerisi = [...maclarVerisi, ...data]
          if (data.length < limit) veriKaldimi = false; else sayfa++;
        } else { veriKaldimi = false }
      }
      setSezonlukMaclar(maclarVerisi);
      
      const { data: komiserlerData } = await supabase.from('komiserler').select('*')
      if (komiserlerData) setTumKomiserler(komiserlerData)

      // YENİ: Mazeretleri Çek
      const { data: mazeretlerData } = await supabase.from('mazeretler').select('*')
      if (mazeretlerData) setTumMazeretler(mazeretlerData)

      if (maclarVerisi.length > 0) {
        const cumalar = maclarVerisi.map(mac => mac?.tarih ? cumaBul(mac.tarih) : 0).filter(t => t > 0)
        const essizCumalar = Array.from(new Set(cumalar)).sort((a, b) => a - b)
        if(essizCumalar.length > 0) {
            setGlobalAktifHaftaNo(essizCumalar.length)
            const aktifCumaTarihi = essizCumalar[essizCumalar.length - 1]
            const aktifHaftaMaclari = maclarVerisi.filter(mac => mac?.tarih && cumaBul(mac.tarih) === aktifCumaTarihi)
            aktifHaftaMaclari.sort(siralamaFiltresi);
            setTumMaclar(aktifHaftaMaclari)
        }
      }
    } catch (err) { console.error(err) }
    setYukleniyor(false)
  }

  const komiserIsmiBul = (id: any) => {
    const komiser = tumKomiserler.find(k => String(k.komiser_id) === String(id))
    return komiser ? komiser.ad_soyad : 'Atanmamış'
  }

  const toggleMac = (id: number) => { setAcikMacId(acikMacId === id ? null : id); setAcikTffMacId(null); }
  const toggleTff = (id: number) => { setAcikTffMacId(acikTffMacId === id ? null : id) }

  // -------------------------------------------------------------
  // KIRPILMA HATASINI ÇÖZEN YENİLENMİŞ FOTOĞRAF İNDİRME FONKSİYONU
  // -------------------------------------------------------------
  const tffTutanakIndir = async (mac: any) => {
    const element = document.getElementById(`admin-tff-form-${mac.id}`);
    if (element) {
      try {
        const style = document.createElement('style');
        style.innerHTML = '.tff-no-print { display: none !important; }';
        document.head.appendChild(style);

        const fullWidth = element.scrollWidth;
        const fullHeight = element.scrollHeight;

        const dataURL = await toPng(element as HTMLElement, { 
            backgroundColor: '#ffffff', 
            pixelRatio: 2, 
            cacheBust: true, 
            width: fullWidth,   
            height: fullHeight, 
            style: { 
                fontFamily: 'sans-serif',
                transform: 'scale(1)', 
                transformOrigin: 'top left',
                margin: '0' 
            } 
        });

        const link = document.createElement('a'); 
        link.href = dataURL; 
        link.download = `OPERASYON_TFF_Raporu_${mac.ev_sahibi}_vs_${mac.misafir_takim}.png`;
        document.body.appendChild(link); 
        link.click(); 
        document.body.removeChild(link); 
        document.head.removeChild(style);
      } catch (err) { alert("Resmi Tutanak indirilirken cihazınızdan kaynaklı bir sorun oluştu."); }
    }
  }

  const renderMazeretDetay = (m: any, hedefHafta: number) => {
      if (!m) return <div className="text-slate-400 italic text-sm p-4 bg-slate-900/50 rounded-lg border border-slate-700">Bu personel önümüzdeki hafta ({hedefHafta}. Hafta) için henüz mazeret bildirmemiştir. Standart olarak göreve <b className="text-green-500">AÇIKTIR.</b></div>;
      if (m.komple_yok) return <div className="bg-red-950/40 border border-red-800/60 text-red-400 p-4 rounded-lg font-bold text-center shadow-inner">❌ BU KOMİSER {hedefHafta}. HAFTA İÇİN KOMPLE KAPALIDIR (GÖREV ALAMAYACAK) <br/><span className="text-xs font-normal mt-2 block text-red-300">Ek Not: {m.aciklama || 'Not girilmemiş.'}</span></div>;
      
      const d = m.detaylar || {};
      if (d.mod === 'full') return (
          <div className="bg-emerald-950/30 border border-emerald-800/50 p-4 rounded-lg shadow-inner">
              <h5 className="text-emerald-400 font-bold mb-3 flex items-center gap-2">✅ TÜM HAFTA MÜSAİT (7/24)</h5>
              <div className="flex gap-4 text-xs font-mono text-slate-300 mb-2">
                  <span className={`px-2 py-1 rounded ${d.genelMerkez ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700' : 'bg-slate-800 text-slate-500 line-through border border-slate-700'}`}>MERKEZ GÖREVİ</span>
                  <span className={`px-2 py-1 rounded ${d.genelDeplasman ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700' : 'bg-slate-800 text-slate-500 line-through border border-slate-700'}`}>DEPLASMAN GÖREVİ</span>
              </div>
              {m.aciklama && <div className="text-xs text-emerald-200/60 mt-3 border-t border-emerald-900/50 pt-2 font-serif italic">Açıklama Notu: {m.aciklama}</div>}
          </div>
      );

      if (d.mod === 'secmeli') {
          const gunler = d.gunler || {};
          const aktifGunler = Object.keys(gunler).filter(k => gunler[k].active);
          if (aktifGunler.length === 0) return <div className="bg-amber-950/30 border border-amber-800/50 text-amber-400 p-4 rounded-lg text-sm shadow-inner">⚠️ Seçmeli müsaitlik bildirmiş ancak hiçbir gün seçmemiş.</div>;
          
          return (
              <div className="bg-blue-950/20 border border-blue-900/50 p-4 rounded-lg shadow-inner">
                  <h5 className="text-blue-400 font-bold mb-3 flex items-center gap-2">📅 SADECE SEÇİLİ GÜNLERDE MÜSAİT</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {aktifGunler.map(g => {
                          const gd = gunler[g];
                          return (
                              <div key={g} className="bg-slate-800/80 border border-slate-700 p-3 rounded flex flex-col shadow-sm">
                                  <span className="font-bold text-slate-200 capitalize mb-2 border-b border-slate-700 pb-1">{g}</span>
                                  <div className="flex justify-between text-[10px] text-slate-400 mb-2">
                                      <span className={`px-1.5 py-0.5 rounded ${gd.merkez ? 'bg-green-900/30 text-green-400 border border-green-800/50' : 'bg-slate-900 line-through opacity-50'}`}>Merkez</span>
                                      <span className={`px-1.5 py-0.5 rounded ${gd.deplasman ? 'bg-blue-900/30 text-blue-400 border border-blue-800/50' : 'bg-slate-900 line-through opacity-50'}`}>Deplasman</span>
                                  </div>
                                  <span className="text-[10px] font-mono text-amber-300 bg-amber-950/40 px-2 py-1 rounded text-center border border-amber-900/50">
                                      {gd.tumGun ? 'TÜM GÜN MÜSAİT' : `${gd.baslangic} - ${gd.bitis}`}
                                  </span>
                              </div>
                          )
                      })}
                  </div>
                  {m.aciklama && <div className="text-xs text-blue-200/60 mt-4 border-t border-blue-900/30 pt-2 font-serif italic">Açıklama Notu: {m.aciklama}</div>}
              </div>
          )
      }
      return null;
  }

  if (!girisYapildi) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700">
          <div className="text-center mb-8"><span className="text-5xl block mb-4">🛡️</span><h1 className="text-2xl font-black text-white tracking-widest uppercase">OPERASYON MERKEZİ GİRİŞİ</h1></div>
          <form onSubmit={girisKontrol} className="space-y-6">
            <div><input type="password" value={sifre} onChange={(e: any) => setSifre(e.target.value)} className="w-full bg-slate-900 text-white border border-slate-600 rounded-lg px-4 py-3 text-center tracking-[0.5em] font-mono text-xl focus:outline-none focus:border-red-500 transition-colors" placeholder="••••" /></div>
            {hata && <p className="text-red-500 text-sm font-bold text-center">{hata}</p>}
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors tracking-widest">GİRİŞ YAP</button>
          </form>
          <div className="mt-6 text-center"><Link href="/" className="text-slate-500 hover:text-slate-300 text-sm underline transition-colors">Saha Komiseri Portalına Dön</Link></div>
        </div>
      </div>
    )
  }

  const emniyetlikMaclar = tumMaclar.filter(m => m.skor_girildi && m.olay_durumu === 'emniyetlik_olay')
  const teknikMaclar = tumMaclar.filter(m => m.skor_girildi && (m.olay_durumu === 'teknik_olay' || m.olay_durumu === 'hava_muhalefeti' || m.olay_durumu === 'saha_sorunu'))
  const olaysizMaclar = tumMaclar.filter(m => m.skor_girildi && m.olay_durumu === 'olaysiz')
  const bekleyenMaclar = tumMaclar.filter(m => m.tebellug_edildi && !m.skor_girildi)
  const tebellugBekleyenKomiserler = Array.from(tumMaclar.filter(m => !m.tebellug_edildi).reduce((map, mac) => {
        if (!map.has(mac.komiser_id)) { map.set(mac.komiser_id, { id: mac.komiser_id, isim: komiserIsmiBul(mac.komiser_id), count: 0 }); }
        map.get(mac.komiser_id).count++; return map;
  }, new Map()).values()).sort((a: any, b: any) => a.isim.localeCompare(b.isim, 'tr-TR'));

  const VarYokKutusu = ({ alan, raporDetay }: { alan: string, raporDetay: any }) => (
      <><div className="flex items-center gap-2 cursor-pointer mb-1 pointer-events-none"><span className="w-8 text-slate-700">VAR</span><div className="w-4 h-4 border border-black flex items-center justify-center text-xs font-bold bg-white text-black">{raporDetay[alan] === 'var' ? 'X' : ''}</div></div><div className="flex items-center gap-2 cursor-pointer pointer-events-none"><span className="w-8 text-slate-700">YOK</span><div className="w-4 h-4 border border-black flex items-center justify-center text-xs font-bold bg-white text-black">{raporDetay[alan] === 'yok' ? 'X' : ''}</div></div></>
  );
  const EvetHayirKutusu = ({ alan, raporDetay }: { alan: string, raporDetay: any }) => (
      <div className="flex items-center gap-4 pointer-events-none"><div className="flex items-center gap-1 cursor-pointer"><span className="w-8 text-right text-slate-700">Evet</span><div className="w-4 h-4 border border-black flex items-center justify-center text-xs font-bold bg-white text-black">{raporDetay[alan] === 'evet' ? 'X' : ''}</div></div><div className="flex items-center gap-1 cursor-pointer"><span className="w-8 text-right text-slate-700">Hayır</span><div className="w-4 h-4 border border-black flex items-center justify-center text-xs font-bold bg-white text-black">{raporDetay[alan] === 'hayir' ? 'X' : ''}</div></div></div>
  );

  const RaporDurumKarti = ({ mac, tip }: { mac: any, tip: 'emniyet' | 'teknik' | 'olaysiz' | 'bekleyen' | 'tebellug' }) => {
    let renkSiniflari = { bg: "bg-slate-800", border: "border-slate-700", text: "text-slate-300", badge: "bg-slate-700 text-slate-300" };
    if (tip === 'emniyet') { renkSiniflari = { bg: "bg-red-950/20", border: "border-red-600", text: "text-red-500", badge: "bg-red-600 text-white" }; } 
    else if (tip === 'teknik') { renkSiniflari = { bg: "bg-amber-950/20", border: "border-amber-500", text: "text-amber-500", badge: "bg-amber-600 text-white" }; } 
    else if (tip === 'olaysiz') { renkSiniflari = { bg: "bg-slate-800/80", border: "border-slate-700", text: "text-slate-300", badge: "bg-slate-900 text-white" }; } 
    else if (tip === 'tebellug') { renkSiniflari = { bg: "bg-purple-950/30", border: "border-purple-500", text: "text-purple-400", badge: "bg-purple-600 text-white" }; }

    const isAcik = acikMacId === mac.id; const isTffAcik = acikTffMacId === mac.id;
    const safeRaporDetay = mac.tff_rapor_detaylari || {};
    const ihracEvListesi = Array.isArray(safeRaporDetay.ihrac_ev) ? safeRaporDetay.ihrac_ev : [];
    const ihracMisListesi = Array.isArray(safeRaporDetay.ihrac_mis) ? safeRaporDetay.ihrac_mis : [];
    const evLen = ihracEvListesi.length; const misLen = ihracMisListesi.length;
    const maxSatir = evLen > misLen ? evLen : misLen;

    const komiserTamIsim = komiserIsmiBul(mac.komiser_id);
    const komiserIlkIsim = typeof komiserTamIsim === 'string' ? komiserTamIsim.split(' ')[0] : 'KOMİSER';

    const raporTuru = raporTurunuBelirle(mac.kategori_adi);
    const detayliGoster = raporTuru !== 'yok';
    const detayliGonderilmis = mac.tff_rapor_detaylari?.detayli_kaydedildi === true;

    return (
      <div className={`mb-3 rounded-xl border-l-4 overflow-hidden shadow-md transition-all ${renkSiniflari.border}`}>
        <button onClick={() => toggleMac(mac.id)} className={`w-full text-left p-4 flex justify-between items-center ${renkSiniflari.bg} hover:brightness-125 transition-all focus:outline-none`}>
            <div className="flex-1 pr-4">
                <div className="flex items-center flex-wrap gap-2 mb-2">
                  {tip !== 'olaysiz' && tip !== 'bekleyen' && tip !== 'tebellug' && (<span className={`${renkSiniflari.badge} text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider`}>{tip === 'emniyet' ? 'EMNİYETLİK' : (mac.olay_durumu || '').replace('_', ' ')}</span>)}
                  <span className="text-blue-400 text-[10px] font-bold uppercase tracking-wider">{mac.kategori_adi}</span>
                  {mac.tebellug_edildi ? (<span className="text-[9px] bg-emerald-900/30 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ml-1">✓ TEBELLÜĞ EDİLDİ</span>) : (<span className="text-[9px] bg-purple-900/40 text-purple-300 border border-purple-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ml-1 animate-pulse">⏳ TEBELLÜĞ BEKLİYOR</span>)}
                </div>
                
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className="font-bold text-lg md:text-xl text-white">{mac.ev_sahibi || '-'}</h3>
                  {mac.skor_girildi ? (
                    mac.mac_durumu === 'takimlar_cikmadi' ? (
                      <span className="bg-slate-700 text-slate-300 text-xs font-bold px-3 py-1 rounded border border-slate-600">ÇIKMADI</span>
                    ) : mac.mac_durumu === 'yarida_kaldi' ? (
                      <span className="bg-red-900/80 text-red-200 text-xs font-bold px-3 py-1 rounded border border-red-700">YARIDA KALDI</span>
                    ) : (
                      <div className="bg-green-600 text-white text-xl md:text-2xl font-black px-4 py-0.5 rounded shadow-lg border border-green-400 flex items-center justify-center min-w-[70px]">
                        {mac.ev_sahibi_skor} - {mac.misafir_skor}
                      </div>
                    )
                  ) : (
                    <span className="text-slate-500 text-sm font-black bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700">VS</span>
                  )}
                  <h3 className="font-bold text-lg md:text-xl text-white">{mac.misafir_takim || '-'}</h3>
                </div>

                <div className="text-[10px] text-slate-400 font-mono leading-snug mt-2">{mac.saha} <br/> <span className="text-blue-300">{guvenliTarih(mac.tarih)} - {guvenliSaat(mac.saat)}</span></div>
            </div>
            <div className="flex flex-col items-end pl-2 gap-1.5 mt-2 sm:mt-0">
                <div className={`text-[9px] md:text-[10px] font-bold uppercase px-2 py-1 rounded border text-center min-w-[120px] ${mac.skor_girildi ? 'bg-green-900/50 text-green-400 border-green-800' : (tip === 'tebellug' ? 'bg-slate-900 text-slate-500 border-slate-700' : 'bg-red-950/50 text-red-500 border-red-800 animate-pulse')}`}>
                    {mac.skor_girildi ? '✓ SKOR GÖNDERİLDİ' : (tip === 'tebellug' ? 'ATANDI' : '❌ SKOR BEKLİYOR')}
                </div>
                {detayliGoster && tip !== 'tebellug' && (
                    <div className={`text-[9px] md:text-[10px] font-bold uppercase px-2 py-1 rounded border text-center min-w-[120px] ${detayliGonderilmis ? 'bg-green-900/50 text-green-400 border-green-800' : 'bg-red-950/50 text-red-500 border-red-800 animate-pulse'}`}>
                        {detayliGonderilmis ? '✓ DETAYLI RAPOR' : '❌ DETAYLI EKSİK'}
                    </div>
                )}
                <span className="text-slate-500 text-lg leading-none mt-1">{isAcik ? '▲' : '▼'}</span>
            </div>
        </button>

        {isAcik && (
            <div className="p-4 bg-slate-900 border-t border-slate-700 animate-fade-in-down">
                {mac.skor_girildi ? (
                    <div className="space-y-4">
                        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                            <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Görev Raporu / Hızlı Not</h4>
                            <p className="text-sm text-slate-200 font-serif italic">"{mac.rapor_notu || 'Not girilmemiş.'}"</p>
                        </div>
                        
                        {mac.tff_rapor_detaylari && mac.tff_rapor_detaylari.detayli_kaydedildi && (
                            <div className="bg-slate-800/50 border border-slate-600 rounded-lg overflow-hidden">
                                <button onClick={() => toggleTff(mac.id)} className="w-full bg-blue-900/30 hover:bg-blue-900/50 border-b border-slate-700 p-3 flex items-center justify-between transition-colors focus:outline-none">
                                    <span className="text-blue-400 text-xs font-bold flex items-center gap-2"><span className="text-lg">📄</span> DETAYLI TFF RAPORU EKLENMİŞ</span>
                                    <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded shadow-inner">{isTffAcik ? 'Gizle ▲' : 'Görüntüle / İndir ▼'}</span>
                                </button>
                                {isTffAcik && (
                                    <div className="p-4 overflow-x-auto bg-slate-300">
                                        <div id={`admin-tff-form-${mac.id}`} className="min-w-[700px] max-w-4xl w-full bg-white p-6 border-2 border-black relative font-sans text-black shadow-sm mx-auto flex flex-col gap-6">
                                            
                                            {/* --- AMATÖR LİG FORMU (SADECE ORTA LOGO) --- */}
                                            {raporTuru === 'amator' && (
                                            <div className="border-[3px] border-double border-slate-600 p-4">
                                                <div className="flex flex-col items-center mb-6 border-b-[3px] border-double border-red-600 pb-4 relative">
                                                    <img src={AMATOR_MERKEZ_LOGO} crossOrigin="anonymous" alt="TFF" className="h-16 w-auto mb-2 drop-shadow-md" />
                                                    <div className="text-[10px] font-black tracking-widest text-[#E30A17] mb-1">TFF</div>
                                                    <h2 className="font-extrabold text-xl md:text-2xl uppercase tracking-widest mt-1 text-black">TÜRKİYE FUTBOL FEDERASYONU</h2>
                                                    <h3 className="font-bold text-lg md:text-xl uppercase mt-1 text-black">SAHA KOMİSERİ RAPORU</h3>
                                                </div>
                                                <div className="grid grid-cols-2 gap-0 border border-black mb-6 text-black">
                                                    <div className="border-r border-black p-2 flex flex-col justify-center border-b border-dashed"><div className="flex items-center gap-2"><span className="text-[10px] font-bold">MÜSABAKANIN YAPILDIĞI YER:</span> <span className="font-black text-xl tracking-wider">İZMİR</span></div></div>
                                                    <div className="p-2 border-b border-dashed border-black"><div className="flex justify-between items-center"><span className="text-[10px] font-bold">MÜSABAKA NO:</span> <span className="font-bold text-sm uppercase text-black">{mac?.mac_kodu || '-'}</span></div></div>
                                                    <div className="p-2 border-r border-b border-dashed border-black bg-slate-100/50 text-center font-bold text-xs">KARŞILAŞAN KULÜPLER</div>
                                                    <div className="p-2 border-b border-dashed border-black"><div className="flex justify-between items-center"><span className="text-[10px] font-bold">STAD ADI:</span> <span className="font-bold text-xs uppercase text-right truncate w-3/4 text-black">{mac?.saha || '-'}</span></div></div>
                                                    <div className="flex border-b border-dashed border-black border-r"><div className="p-2 w-3/4 flex flex-col justify-center border-r border-dashed border-black"><div className="flex gap-2"><span className="text-[10px] font-bold w-12">EV SAHİBİ:</span> <span className="font-bold text-xs uppercase truncate text-black">{mac?.ev_sahibi || '-'}</span></div></div><div className="p-2 w-1/4 flex flex-col items-center justify-center bg-slate-100/30"><span className="text-[10px] font-bold mb-1">SKOR</span><span className="font-black text-lg text-black">{mac.ev_sahibi_skor !== null ? mac.ev_sahibi_skor : '-'}</span></div></div>
                                                    <div className="p-2 border-b border-dashed border-black"><div className="flex justify-between items-center"><span className="text-[10px] font-bold">TARİH:</span> <span className="font-bold text-xs text-black">{guvenliTarih(mac?.tarih)}</span></div></div>
                                                    <div className="flex border-b border-black border-r"><div className="p-2 w-3/4 flex flex-col justify-center border-r border-dashed border-black"><div className="flex gap-2"><span className="text-[10px] font-bold w-12">MİSAFİR:</span> <span className="font-bold text-xs uppercase truncate text-black">{mac?.misafir_takim || '-'}</span></div></div><div className="p-2 w-1/4 flex flex-col items-center justify-center bg-slate-100/30"><span className="font-black text-lg text-black">{mac.misafir_skor !== null ? mac.misafir_skor : '-'}</span></div></div>
                                                    <div className="flex flex-col border-b border-black"><div className="p-2 flex justify-between items-center border-b border-dashed border-black"><span className="text-[10px] font-bold">SAAT:</span> <span className="font-bold text-xs text-black">{guvenliSaat(mac?.saat)}</span></div><div className="p-2 flex justify-between items-center"><span className="text-[10px] font-bold">KATEGORİ:</span> <span className="font-bold text-[10px] text-right truncate w-2/3 text-black">{mac?.kategori_adi || '-'}</span></div></div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-0 border border-black mb-6 text-black">
                                                    <div className="bg-slate-100/50 p-1.5 border-r border-b border-dashed border-black text-center text-[11px] font-bold">HAKEMLER VE GÖZLEMCİ</div>
                                                    <div className="bg-slate-100/50 p-1.5 border-b border-dashed border-black text-center text-[11px] font-bold">MÜSABAKADA GÖREVLİ PERSONELLER</div>
                                                    <div className="border-r border-black flex flex-col">
                                                        <div className="flex border-b border-dashed border-black p-1.5 items-center justify-between"><span className="text-[10px] font-bold w-20">HAKEM</span> <input readOnly type="text" value={safeRaporDetay?.hakem || ''} className="w-full text-xs outline-none bg-transparent font-black uppercase ml-2 pointer-events-none" /></div>
                                                        <div className="flex border-b border-dashed border-black p-1.5 items-center justify-between"><span className="text-[10px] font-bold w-20">1.YRD.HAKEM</span> <input readOnly type="text" value={safeRaporDetay?.y_hakem_1 || ''} className="w-full text-xs outline-none bg-transparent font-black uppercase ml-2 pointer-events-none" /></div>
                                                        <div className="flex border-b border-dashed border-black p-1.5 items-center justify-between"><span className="text-[10px] font-bold w-20">2.YRD.HAKEM</span> <input readOnly type="text" value={safeRaporDetay?.y_hakem_2 || ''} className="w-full text-xs outline-none bg-transparent font-black uppercase ml-2 pointer-events-none" /></div>
                                                        <div className="flex p-1.5 items-center justify-between"><span className="text-[10px] font-bold w-20">GÖZLEMCİ</span> <input readOnly type="text" value={safeRaporDetay?.gozlemci || ''} className="w-full text-xs outline-none bg-transparent font-black uppercase ml-2 pointer-events-none" /></div>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="flex border-b border-dashed border-black p-1.5 items-center justify-between h-1/2"><span className="text-[10px] font-bold w-24">SAĞLIK MEMURU</span> <input readOnly type="text" value={safeRaporDetay?.saglik || ''} className="w-full text-xs outline-none bg-transparent font-black uppercase ml-2 pointer-events-none" /></div>
                                                        <div className="flex p-1.5 items-center justify-between h-1/2"><span className="text-[10px] font-bold w-24">GÜVENLİK</span> <input readOnly type="text" value={safeRaporDetay?.guvenlik || ''} className="w-full text-xs outline-none bg-transparent font-black uppercase ml-2 pointer-events-none" /></div>
                                                    </div>
                                                </div>
                                                <h3 className="text-center font-black tracking-widest text-sm mb-2 border-b-2 border-black w-32 mx-auto pb-1 text-black">İ H R A Ç L A R</h3>
                                                <div className="border border-black mb-6 text-black">
                                                    <div className="grid grid-cols-2 text-center text-xs font-bold border-b border-black">
                                                        <div className="p-1.5 border-r border-black bg-slate-100/50">EV SAHİBİ KULÜP</div><div className="p-1.5 bg-slate-100/50">MİSAFİR KULÜP</div>
                                                    </div>
                                                    <div className="grid grid-cols-2 text-center text-[10px] font-bold border-b border-black bg-slate-50">
                                                        <div className="grid grid-cols-12 border-r border-black"><div className="col-span-2 p-1 border-r border-dashed border-black">FORMA NO</div><div className="col-span-7 p-1 border-r border-dashed border-black">ADI SOYADI</div><div className="col-span-3 p-1">LİSANS NO</div></div>
                                                        <div className="grid grid-cols-12"><div className="col-span-2 p-1 border-r border-dashed border-black">FORMA NO</div><div className="col-span-7 p-1 border-r border-dashed border-black">ADI SOYADI</div><div className="col-span-3 p-1">LİSANS NO</div></div>
                                                    </div>
                                                    {Array.from({ length: maxSatir }).map((_, idx) => (
                                                        <div key={`ihrac-${idx}`} className="grid grid-cols-2 text-center text-[11px] border-b border-dashed border-black last:border-b-0 group relative">
                                                            <div className="grid grid-cols-12 border-r border-black relative">
                                                                <div className="col-span-2 p-1 border-r border-dashed border-black"><input readOnly type="text" value={ihracEvListesi[idx]?.forma || ''} className="w-full text-center outline-none bg-transparent pointer-events-none" /></div>
                                                                <div className="col-span-7 p-1 border-r border-dashed border-black"><input readOnly type="text" value={ihracEvListesi[idx]?.isim || ''} className="w-full text-left outline-none bg-transparent px-1 uppercase pointer-events-none" /></div>
                                                                <div className="col-span-3 p-1"><input readOnly type="text" value={ihracEvListesi[idx]?.lisans || ''} className="w-full text-center outline-none bg-transparent pointer-events-none" /></div>
                                                            </div>
                                                            <div className="grid grid-cols-12 relative">
                                                                <div className="col-span-2 p-1 border-r border-dashed border-black"><input readOnly type="text" value={ihracMisListesi[idx]?.forma || ''} className="w-full text-center outline-none bg-transparent pointer-events-none" /></div>
                                                                <div className="col-span-7 p-1 border-r border-dashed border-black"><input readOnly type="text" value={ihracMisListesi[idx]?.isim || ''} className="w-full text-left outline-none bg-transparent px-1 uppercase pointer-events-none" /></div>
                                                                <div className="col-span-3 p-1"><input readOnly type="text" value={ihracMisListesi[idx]?.lisans || ''} className="w-full text-center outline-none bg-transparent pointer-events-none" /></div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="mb-8 text-black">
                                                    <h3 className="font-bold text-xs text-center border-b border-black pb-1 mb-2 uppercase tracking-wide">SEYİRCİ TAŞKINLIKLARI, YÖNETİCİ VE FUTBOLCULARIN HAREKET VE TUTUMLARI</h3>
                                                    <textarea readOnly value={safeRaporDetay?.tff_not || mac.rapor_notu || ''} className="w-full outline-none bg-transparent font-serif text-sm leading-relaxed resize-none overflow-hidden min-h-[150px] border border-dashed border-slate-300 p-2 pointer-events-none"></textarea>
                                                </div>
                                                <div className="flex justify-between items-end px-4 mt-8 pt-4 text-black">
                                                    <div className="text-xs font-bold">Rapor düzenlenme tarihi: <span className="ml-2 border-b border-dotted border-black px-2 pb-0.5">{new Date().toLocaleDateString('tr-TR')}</span></div>
                                                    <div className="text-center">
                                                        <div className="font-serif text-2xl text-blue-800 -mb-2 italic opacity-80" style={{fontFamily: "'Brush Script MT', cursive"}}>{komiserIlkIsim}</div>
                                                        <div className="font-bold text-sm border-b border-black px-4 pb-1">{komiserTamIsim}</div>
                                                        <div className="text-[10px] font-bold mt-1">SAHA KOMİSERİ</div>
                                                    </div>
                                                </div>
                                            </div>
                                            )}

                                            {/* --- GELİŞİM LİGLERİ FORMU (2 YAN LOGO, MERKEZ YOK) --- */}
                                            {raporTuru === 'gelisim' && (
                                            <div className="border-[3px] border-double border-slate-600 p-4 bg-white text-black font-sans">
                                                <div className="flex items-center justify-between mb-4 border-b-2 border-red-600 pb-3">
                                                    <div className="w-1/4 flex justify-start items-center"><img src={GELISIM_SOL_LOGO} crossOrigin="anonymous" alt="TFF Sol" className="h-16 md:h-20 w-auto drop-shadow-md" /></div>
                                                    <div className="text-center flex-col items-center justify-center w-2/4">
                                                        <h2 className="font-extrabold text-lg md:text-xl uppercase tracking-widest text-black">TÜRKİYE FUTBOL FEDERASYONU</h2>
                                                        <h3 className="font-bold text-base md:text-lg uppercase mt-1 text-black">GELİŞİM LİGLERİ</h3>
                                                        <h3 className="font-bold text-sm md:text-base uppercase mt-1 text-black">MÜSABAKA SAHA KOMİSERİ RAPORU</h3>
                                                    </div>
                                                    <div className="w-1/4 flex justify-end items-center"><img src={GELISIM_SAG_LOGO} crossOrigin="anonymous" alt="TFF Sağ" className="h-16 md:h-20 w-auto drop-shadow-md" /></div>
                                                </div>

                                                <div className="border border-black text-xs font-bold mb-4">
                                                    <div className="flex border-b border-black text-center bg-slate-100">
                                                        <div className="w-1/5 border-r border-black p-1.5 flex items-center justify-center">MAÇ TARİHİ</div><div className="w-1/5 border-r border-black p-1.5 flex items-center justify-center">MAÇ SAATİ</div><div className="w-2/5 border-r border-black p-1.5 flex items-center justify-center">STAD ADI(İL/İLÇE)</div><div className="w-1/5 p-1.5 flex items-center justify-center">LİG KATEGORİSİ</div>
                                                    </div>
                                                    <div className="flex text-center uppercase">
                                                        <div className="w-1/5 border-r border-black p-2">{guvenliTarih(mac.tarih)}</div><div className="w-1/5 border-r border-black p-2">{guvenliSaat(mac.saat)}</div><div className="w-2/5 border-r border-black p-2 truncate">{mac.saha}</div><div className="w-1/5 p-2 truncate">{mac.kategori_adi}</div>
                                                    </div>
                                                </div>

                                                <div className="border border-black text-xs font-bold mb-6">
                                                    <div className="flex border-b border-black">
                                                        <div className="w-[85%] border-r border-black p-2 flex gap-2 items-center"><span className="w-40 text-slate-600">EV SAHİBİ TAKIM ADI</span> <span className="uppercase text-sm">{mac.ev_sahibi}</span></div><div className="w-[15%] p-2 flex justify-between bg-slate-100 items-center"><span className="mr-2">SKOR</span><span className="text-lg">{mac.ev_sahibi_skor !== null ? mac.ev_sahibi_skor : '-'}</span></div>
                                                    </div>
                                                    <div className="flex">
                                                        <div className="w-[85%] border-r border-black p-2 flex gap-2 items-center"><span className="w-40 text-slate-600">MİSAFİR TAKIM ADI</span> <span className="uppercase text-sm">{mac.misafir_takim}</span></div><div className="w-[15%] p-2 flex justify-between bg-slate-100 items-center"><span className="mr-2">SKOR</span><span className="text-lg">{mac.misafir_skor !== null ? mac.misafir_skor : '-'}</span></div>
                                                    </div>
                                                </div>

                                                <h3 className="font-bold text-sm mb-1 uppercase">GÖREVLİLER</h3>
                                                <div className="border border-black text-xs font-bold mb-6">
                                                    <div className="flex border-b border-black bg-slate-100"><div className="w-1/3 border-r border-black p-1.5">GÖREVİ</div><div className="w-2/3 p-1.5">ADI SOYADI</div></div>
                                                    <div className="flex border-b border-black"><div className="w-1/3 border-r border-black p-1.5">HAKEM</div><div className="w-2/3 p-1.5"><input readOnly type="text" value={safeRaporDetay?.hakem || ''} className="w-full outline-none bg-transparent uppercase pointer-events-none" /></div></div>
                                                    <div className="flex border-b border-black"><div className="w-1/3 border-r border-black p-1.5">YARDIMCI HAKEM 1</div><div className="w-2/3 p-1.5"><input readOnly type="text" value={safeRaporDetay?.y_hakem_1 || ''} className="w-full outline-none bg-transparent uppercase pointer-events-none" /></div></div>
                                                    <div className="flex border-b border-black"><div className="w-1/3 border-r border-black p-1.5">YARDIMCI HAKEM 2</div><div className="w-2/3 p-1.5"><input readOnly type="text" value={safeRaporDetay?.y_hakem_2 || ''} className="w-full outline-none bg-transparent uppercase pointer-events-none" /></div></div>
                                                    <div className="flex border-b border-black"><div className="w-1/3 border-r border-black p-1.5">4.HAKEM</div><div className="w-2/3 p-1.5"><input readOnly type="text" value={safeRaporDetay?.hakem_4 || ''} className="w-full outline-none bg-transparent uppercase pointer-events-none" /></div></div>
                                                    <div className="flex"><div className="w-1/3 border-r border-black p-1.5">GÖZLEMCİ</div><div className="w-2/3 p-1.5"><input readOnly type="text" value={safeRaporDetay?.gozlemci || ''} className="w-full outline-none bg-transparent uppercase pointer-events-none" /></div></div>
                                                </div>

                                                <div className="border border-black text-xs font-bold mb-6 w-2/3">
                                                    <div className="flex border-b border-black">
                                                        <div className="w-1/2 border-r border-black p-1.5">GÜVENLİK</div>
                                                        <div className="w-1/2 flex items-center justify-center p-1 gap-4"><VarYokKutusu alan="guvenlik" raporDetay={safeRaporDetay} /></div>
                                                    </div>
                                                    <div className="flex border-b border-black"><div className="w-1/2 border-r border-black p-1.5">GÜVENLİK AMİRİ ADI SOYADI</div><div className="w-1/2 p-1.5"><input readOnly type="text" value={safeRaporDetay?.guvenlik_amiri || ''} className="w-full outline-none bg-transparent uppercase pointer-events-none" /></div></div>
                                                    <div className="flex border-b border-black"><div className="w-1/2 border-r border-black p-1.5">GÜVENLİK AMİRİ TELEFON</div><div className="w-1/2 p-1.5"><input readOnly type="text" value={safeRaporDetay?.guvenlik_telefon || ''} className="w-full outline-none bg-transparent uppercase pointer-events-none" /></div></div>
                                                    <div className="flex border-b border-black">
                                                        <div className="w-1/2 border-r border-black p-1.5">SAĞLIK MEMURU</div>
                                                        <div className="w-1/2 flex items-center justify-center p-1 gap-4"><VarYokKutusu alan="saglik" raporDetay={safeRaporDetay} /></div>
                                                    </div>
                                                    <div className="flex"><div className="w-1/2 border-r border-black p-1.5">ADI SOYADI</div><div className="w-1/2 p-1.5"><input readOnly type="text" value={safeRaporDetay?.saglik_adi || ''} className="w-full outline-none bg-transparent uppercase pointer-events-none" /></div></div>
                                                </div>

                                                <div className="bg-slate-100 p-2 font-black text-sm mb-2">I) ORGANİZASYON :</div>
                                                <div className="mb-4 text-xs font-medium space-y-1">
                                                    <p className="mb-2">(a) Saha Komiserinin oyun alanına gidişi ve oyun alanını kontrolü</p>
                                                    {gelisimOrganizasyon.map(soru => (<div key={soru.id} className="flex justify-between items-center border-b border-dashed border-slate-300 py-1"><span className="text-[10px] w-3/4">{soru.text}</span><div className="flex gap-4 w-1/4 justify-end pr-2"><EvetHayirKutusu alan={soru.id} raporDetay={safeRaporDetay?.gelisim_sorular || {}} /></div></div>))}
                                                    <p className="mt-4 mb-1">(b) Müsabaka sonu değerlendirmesi</p>
                                                    <textarea readOnly value={safeRaporDetay?.gelisim_sorular?.degerlendirme || ''} className="w-full border-b border-dashed border-black bg-transparent outline-none resize-none h-10 pointer-events-none"></textarea>
                                                </div>

                                                <div className="bg-slate-100 p-2 font-black text-sm mb-2">II) TEKNİK HUSUSLAR :</div>
                                                <div className="mb-4 text-xs font-medium space-y-1">
                                                    <p className="mb-2">a) Aşağıdaki tesis / malzemeler standarlara uygun mudur? (dk. - 60'da kontrol edilecektir )</p>
                                                    {gelisimTeknik.map(soru => (<div key={soru.id} className="flex justify-between items-center border-b border-dashed border-slate-300 py-1"><span className="text-[10px] w-3/4">{soru.text}</span><div className="flex gap-4 w-1/4 justify-end pr-2"><EvetHayirKutusu alan={soru.id} raporDetay={safeRaporDetay?.gelisim_sorular || {}} /></div></div>))}
                                                    <div className="mt-4 space-y-2">
                                                        <div className="flex justify-between items-center border-b border-dashed border-slate-300 py-1"><span className="text-[10px] w-3/4">b) Her iki kulüp Müsabaka isim listelerinin, kulüp lisansları ile akreditasyon listelerinin kontrolleri yapılarak hakemlere teslimi denetlendi mi?</span><div className="flex gap-4 w-1/4 justify-end pr-2"><EvetHayirKutusu alan="isim_listeleri" raporDetay={safeRaporDetay?.gelisim_sorular || {}} /></div></div>
                                                        <div className="flex justify-between items-center border-b border-dashed border-slate-300 py-1"><span className="text-[10px] w-3/4">c) Takımlar koyu ve açık renk forma setlerini getirdi mi?</span><div className="flex gap-4 w-1/4 justify-end pr-2"><EvetHayirKutusu alan="forma_setleri" raporDetay={safeRaporDetay?.gelisim_sorular || {}} /></div></div>
                                                        <div className="flex justify-between items-center border-b border-dashed border-slate-300 py-1"><span className="text-[10px] w-3/4">d) Stadyum WC'leri hijyenik mi? Temizliği yapılmış mı?</span><div className="flex gap-4 w-1/4 justify-end pr-2"><EvetHayirKutusu alan="wc_hijyen" raporDetay={safeRaporDetay?.gelisim_sorular || {}} /></div></div>
                                                    </div>
                                                </div>

                                                <div className="bg-slate-100 p-2 font-black text-sm mb-2">III) GÜVENLİK KONULARI :</div>
                                                <div className="mb-4 text-xs font-medium space-y-2">
                                                    <div className="flex flex-col border-b border-dashed border-slate-300 pb-2"><span>a) Misafir takım geliş ve gidişleri nasıl sağlandı ?</span><input readOnly type="text" value={safeRaporDetay?.gelisim_sorular?.misafir_gelis_gidis || ''} className="w-full outline-none bg-transparent border-b border-dotted border-black mt-1 pointer-events-none" /></div>
                                                    <div className="flex justify-between items-center border-b border-dashed border-slate-300 py-1"><span className="text-[10px] w-3/4">b) Her iki takım yöneticilerine soyunma odalarına ve koridorlara girebilecek kişiler konusundaki kısıtlamaları ve akreditasyon kartı mecburiyeti hatırlatıldı mı ?</span><div className="flex gap-4 w-1/4 justify-end pr-2"><EvetHayirKutusu alan="soyunma_odasi_kisitlama" raporDetay={safeRaporDetay?.gelisim_sorular || {}} /></div></div>
                                                    <div className="flex justify-between items-center border-b border-dashed border-slate-300 py-1"><span className="text-[10px] w-3/4">c) Misafir takım yöneticileri için tribünde uygun yer ayrıldı mı ?</span><div className="flex gap-4 w-1/4 justify-end pr-2"><EvetHayirKutusu alan="misafir_tribun_yer" raporDetay={safeRaporDetay?.gelisim_sorular || {}} /></div></div>
                                                    <div className="flex items-center gap-2 border-b border-dashed border-slate-300 py-2"><span>d) Müsabakada görevli Resmi Güvenlik sayısı :</span><span className="font-bold ml-2 border-b border-black px-4">{safeRaporDetay?.gelisim_sorular?.guvenlik_sayisi || '-'}</span><span>Kişi</span></div>
                                                </div>

                                                <div className="bg-slate-100 p-2 font-black text-sm mb-2">IV) İŞLETİMSEL EKSİKLİK :</div>
                                                <div className="mb-4 text-xs font-medium space-y-1">
                                                    <p>Sahadaki eksikliklerin tespit edilerek yazılması,</p>
                                                    <div className="flex items-center gap-2"><span>1-</span><input readOnly type="text" value={safeRaporDetay?.gelisim_sorular?.isletimsel_1 || ''} className="flex-1 outline-none bg-transparent border-b border-dotted border-black pointer-events-none" /></div>
                                                    <div className="flex items-center gap-2"><span>2-</span><input readOnly type="text" value={safeRaporDetay?.gelisim_sorular?.isletimsel_2 || ''} className="flex-1 outline-none bg-transparent border-b border-dotted border-black pointer-events-none" /></div>
                                                    <div className="flex items-center gap-2"><span>3-</span><input readOnly type="text" value={safeRaporDetay?.gelisim_sorular?.isletimsel_3 || ''} className="flex-1 outline-none bg-transparent border-b border-dotted border-black pointer-events-none" /></div>
                                                </div>

                                                <div className="bg-slate-100 p-2 font-black text-sm mb-2">OLUMLU BULUNMAYAN DİĞER HUSUSLAR :</div>
                                                <textarea readOnly value={safeRaporDetay?.gelisim_sorular?.olumsuz_diger || ''} className="w-full border-b border-dashed border-black bg-transparent outline-none resize-none min-h-[50px] mb-4 text-xs pointer-events-none"></textarea>

                                                <div className="mb-4">
                                                    <h3 className="font-bold text-xs uppercase mb-1">MÜSABAKA ÖNCESİ, DEVAMI VE BİTİMİNDEKİ OLAYLAR:</h3>
                                                    <p className="text-[10px] mb-1">(Yönetici,Teknik Adamlar,Futbolcular,Kulüp görevlileri vb.kişilerin eylemleri ayrı ayrı detaylı bir şekilde yazılacaktır.)</p>
                                                    <textarea readOnly value={safeRaporDetay?.tff_not || mac.rapor_notu || ''} className="w-full outline-none border border-dashed border-black min-h-[150px] p-2 text-sm bg-transparent pointer-events-none"></textarea>
                                                </div>

                                                <div className="flex justify-between items-end px-4 mt-8 pt-4">
                                                    <div className="text-center">
                                                        <div className="text-xs font-bold mb-1">Saha Komiserinin</div>
                                                        <div className="text-[10px] text-slate-500">GSM Telefon No: {seciliKomiser?.telefon || ''}</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-xs font-bold border-b border-black px-4 pb-1 mb-1">Adı Soyadı</div>
                                                        <div className="font-bold text-sm uppercase">{komiserTamIsim}</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-xs font-bold border-b border-black px-4 pb-1 mb-1">Rapor Tarihi</div>
                                                        <div className="font-bold text-sm">{new Date().toLocaleDateString('tr-TR')}</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-xs font-bold border-b border-black px-4 pb-1 mb-1">İmza / E-MAİL</div>
                                                        <div className="font-serif text-2xl text-blue-800 -mb-2 italic opacity-80" style={{fontFamily: "'Brush Script MT', cursive"}}>{komiserIlkIsim}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            )}

                                            {/* --- EK RAPORLAR (KANIT DOSYALARI - DİNAMİK LOGOLU) --- */}
                                            {(safeRaporDetay?.ek_raporlar || []).map((ekRapor: any, index: number) => (
                                                <div key={ekRapor.id} className="border-[3px] border-double border-slate-600 p-8 bg-white text-black font-sans relative mt-8 page-break-before-always">
                                                    <div className="flex items-center justify-between mb-8 border-b-2 border-red-600 pb-4">
                                                        <div className="w-1/4 flex justify-start items-center"><img src={GELISIM_SOL_LOGO} crossOrigin="anonymous" alt="TFF Sol" className="h-16 md:h-20 w-auto drop-shadow-md" /></div>
                                                        <div className="text-center flex flex-col items-center justify-center w-2/4">
                                                            <h2 className="font-extrabold text-xl md:text-2xl uppercase tracking-widest text-black">TÜRKİYE FUTBOL FEDERASYONU</h2>
                                                            <h3 className="font-bold text-lg md:text-xl uppercase mt-2 text-black">SAHA KOMİSERİ EK RAPOR (EK-{index + 1})</h3>
                                                        </div>
                                                        <div className="w-1/4 flex justify-end items-center"><img src={GELISIM_SAG_LOGO} crossOrigin="anonymous" alt="TFF Sağ" className="h-16 md:h-20 w-auto drop-shadow-md" /></div>
                                                    </div>

                                                    <div className="flex border-b border-black text-sm font-bold mb-6">
                                                        <div className="w-1/2 border-r border-black p-2 flex gap-2"><span className="text-slate-500">MÜSABAKA:</span> <span className="uppercase">{mac.ev_sahibi} - {mac.misafir_takim}</span></div>
                                                        <div className="w-1/4 border-r border-black p-2 flex gap-2"><span className="text-slate-500">TARİH:</span> <span>{guvenliTarih(mac.tarih)}</span></div>
                                                        <div className="w-1/4 p-2 flex gap-2"><span className="text-slate-500">MÜSABAKA NO:</span> <span>{mac.mac_kodu}</span></div>
                                                    </div>

                                                    <div className="mb-6">
                                                        <h3 className="font-bold text-sm uppercase mb-2 bg-slate-100 p-2 border border-slate-300 text-black">OLAY DETAYI VE EK AÇIKLAMA:</h3>
                                                        <textarea readOnly value={ekRapor.text} className="w-full outline-none border border-dashed border-black min-h-[200px] p-4 text-sm bg-transparent pointer-events-none text-black"></textarea>
                                                    </div>

                                                    <div className="mb-8 border border-dashed border-black p-4 min-h-[300px] flex flex-col items-center justify-center relative">
                                                        <h3 className="font-bold text-sm uppercase mb-4 absolute top-0 left-0 bg-white px-2 -mt-2 ml-4 text-black">FOTOĞRAFLI KANIT (VARSA)</h3>
                                                        <div className="text-slate-400 text-center tff-no-print">
                                                            <span className="text-4xl block mb-2">📸</span>
                                                            <p className="text-sm font-bold">Fotoğraflı kanıtlar Operasyon Merkezine değil, doğrudan Saha Komiserinin cihazına PNG olarak kaydedilir.</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between items-end mt-12">
                                                        <div className="text-center w-1/3">
                                                            <div className="font-serif text-2xl text-blue-800 -mb-2 italic opacity-80" style={{fontFamily: "'Brush Script MT', cursive"}}>{komiserIlkIsim}</div>
                                                            <div className="font-bold text-sm border-b border-black px-4 pb-1 text-black">{komiserTamIsim}</div>
                                                            <div className="text-[10px] font-bold mt-1 text-black">SAHA KOMİSERİ</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-4 flex justify-end">
                                            <button onClick={() => tffTutanakIndir(mac)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-md transition-all text-xs md:text-sm flex items-center justify-center gap-2">
                                                📸 FOTOĞRAF (PNG) OLARAK İNDİR
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="pt-3 border-t border-slate-800 text-center mt-4">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">MÜSABAKA SAHA KOMİSERİ</span>
                            <span className="text-sm font-black text-white bg-slate-800 px-4 py-1.5 rounded-full border border-slate-600">{komiserTamIsim}</span>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4 text-slate-500 text-sm font-bold">
                        Komiser henüz bu maçın skorunu girmedi.
                        <div className="pt-4 mt-4 border-t border-slate-800 text-center">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">ATANAN KOMİSER</span>
                            <span className="text-sm font-black text-white bg-slate-800 px-4 py-1.5 rounded-full border border-slate-600">{komiserTamIsim}</span>
                        </div>
                    </div>
                )}
            </div>
         )}
       </div>
     )
  }

  return (
    <div className="min-h-screen bg-[#0f172a] font-sans text-slate-200">
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-50 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-3xl hidden md:block">🇹🇷</span>
            <div>
              <h1 className="font-black text-lg md:text-xl text-white tracking-widest uppercase">İZMİR SAHA KOMİSERLERİ OPERASYON MERKEZİ</h1>
              <p className="text-slate-400 text-xs font-mono">TFF İZMİR SAHA KOMİSERLERİ ({globalAktifHaftaNo}. HAFTA OPERASYONU)</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={veriGetir} className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 px-3 py-1.5 rounded text-xs font-bold transition-colors">🔄 YENİLE</button>
             <button onClick={() => setGirisYapildi(false)} className="bg-red-900/50 hover:bg-red-800 text-red-400 border border-red-900 px-3 py-1.5 rounded text-xs font-bold transition-colors">ÇIKIŞ YAP</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {yukleniyor ? (
          <div className="flex flex-col items-center justify-center py-20"><div className="w-12 h-12 border-4 border-slate-700 border-t-red-600 rounded-full animate-spin mb-4"></div><p className="text-slate-400 font-bold animate-pulse tracking-widest">VERİLER MERKEZDEN ÇEKİLİYOR...</p></div>
        ) : (
          <div className="space-y-8">
            {emniyetlikMaclar.length > 0 && (
                <section className="bg-slate-900 border border-red-900/50 rounded-xl overflow-hidden shadow-2xl relative w-full">
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                    <button onClick={() => setKategoriKirmiziAcik(!kategoriKirmiziAcik)} className="w-full bg-red-950/40 p-4 border-b border-red-900/30 flex justify-between items-center hover:bg-red-900/40 transition-colors focus:outline-none">
                        <h2 className="text-red-500 font-black tracking-widest uppercase flex items-center gap-2"><span className="text-xl">🚨</span> KIRMIZI KOD (EMNİYETLİK)</h2>
                        <div className="flex items-center gap-4"><span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">{emniyetlikMaclar.length} RAPOR</span><span className="text-red-500 text-lg leading-none">{kategoriKirmiziAcik ? '▲' : '▼'}</span></div>
                    </button>
                    {kategoriKirmiziAcik && <div className="p-4 animate-fade-in-down">{emniyetlikMaclar.map(mac => <RaporDurumKarti key={mac.id} mac={mac} tip="emniyet" />)}</div>}
                </section>
            )}

            {teknikMaclar.length > 0 && (
                <section className="bg-slate-900 border border-amber-900/50 rounded-xl overflow-hidden shadow-xl relative w-full">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                    <button onClick={() => setKategoriDisiplinAcik(!kategoriDisiplinAcik)} className="w-full bg-amber-950/20 p-4 border-b border-amber-900/30 flex justify-between items-center hover:bg-amber-900/30 transition-colors focus:outline-none">
                        <h2 className="text-amber-500 font-black tracking-widest uppercase flex items-center gap-2 text-left leading-tight"><span className="text-xl">⚠️</span> DİSİPLİN VE TEKNİK OLAYLAR</h2>
                        <div className="flex items-center gap-4 shrink-0 pl-2"><span className="bg-amber-600 text-white text-xs font-bold px-2 py-1 rounded">{teknikMaclar.length} RAPOR</span><span className="text-amber-500 text-lg leading-none">{kategoriDisiplinAcik ? '▲' : '▼'}</span></div>
                    </button>
                    {kategoriDisiplinAcik && <div className="p-4 animate-fade-in-down">{teknikMaclar.map(mac => <RaporDurumKarti key={mac.id} mac={mac} tip="teknik" />)}</div>}
                </section>
            )}

            {olaysizMaclar.length > 0 && (
                <section className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-lg flex flex-col w-full">
                    <button onClick={() => setKategoriOlaysizAcik(!kategoriOlaysizAcik)} className="w-full bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center hover:bg-slate-700/80 transition-colors focus:outline-none sticky top-0 z-10">
                        <h2 className="text-green-500 font-black tracking-widest uppercase flex items-center gap-2"><span className="text-xl">✓</span> OLAYSIZ MÜSABAKALAR</h2>
                        <div className="flex items-center gap-4"><span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">{olaysizMaclar.length} MAÇ</span><span className="text-green-500 text-lg leading-none">{kategoriOlaysizAcik ? '▲' : '▼'}</span></div>
                    </button>
                    {kategoriOlaysizAcik && <div className="p-4 overflow-y-auto flex-1 custom-scrollbar animate-fade-in-down">{olaysizMaclar.map(mac => <RaporDurumKarti key={mac.id} mac={mac} tip="olaysiz" />)}</div>}
                </section>
            )}

            {tebellugBekleyenKomiserler.length > 0 && (
                <section className="bg-slate-900 border border-purple-900/50 rounded-xl overflow-hidden shadow-lg flex flex-col w-full">
                    <button onClick={() => setKategoriTebellugAcik(!kategoriTebellugAcik)} className="w-full bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center hover:bg-slate-700/80 transition-colors focus:outline-none sticky top-0 z-10">
                        <h2 className="text-purple-400 font-black tracking-widest uppercase flex items-center gap-2"><span className="text-xl">📩</span> TEBELLÜĞ BEKLEYEN PERSONEL</h2>
                        <div className="flex items-center gap-4"><span className="bg-purple-900/50 text-purple-300 border border-purple-700 text-xs font-bold px-2 py-1 rounded">{tebellugBekleyenKomiserler.length} KİŞİ</span><span className="text-purple-500 text-lg leading-none">{kategoriTebellugAcik ? '▲' : '▼'}</span></div>
                    </button>
                    {kategoriTebellugAcik && (
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 animate-fade-in-down">
                            {tebellugBekleyenKomiserler.map((komiser: any) => (
                                <div key={komiser.id} className="bg-slate-800 border border-purple-800/50 rounded-lg p-3 flex justify-between items-center shadow-sm hover:bg-slate-700 transition-colors">
                                    <div><h4 className="font-bold text-slate-200 text-sm">{komiser.isim}</h4><span className="text-purple-400 text-[10px] font-mono">ID: {komiser.id}</span></div>
                                    <div className="bg-purple-900/60 text-purple-300 px-2 py-1 rounded text-xs font-bold border border-purple-700/50 text-center">{komiser.count} Görev</div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {bekleyenMaclar.length > 0 && (
                <section className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-lg flex flex-col w-full">
                    <button onClick={() => setKategoriBekleyenAcik(!kategoriBekleyenAcik)} className="w-full bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center hover:bg-slate-700/80 transition-colors focus:outline-none sticky top-0 z-10">
                        <h2 className="text-slate-300 font-black tracking-widest uppercase flex items-center gap-2"><span className="text-xl">⏳</span> RAPOR BEKLEYENLER</h2>
                        <div className="flex items-center gap-4"><span className="bg-slate-700 text-slate-300 text-xs font-bold px-2 py-1 rounded">{bekleyenMaclar.length} MAÇ</span><span className="text-slate-400 text-lg leading-none">{kategoriBekleyenAcik ? '▲' : '▼'}</span></div>
                    </button>
                    {kategoriBekleyenAcik && <div className="p-4 overflow-y-auto flex-1 custom-scrollbar animate-fade-in-down">{bekleyenMaclar.map(mac => <RaporDurumKarti key={mac.id} mac={mac} tip="bekleyen" />)}</div>}
                </section>
            )}

            {/* YENİ: EFSANEVİ SİCİL VE MAZERET EKRANI */}
            <section className="bg-slate-900 border border-indigo-900/50 rounded-xl overflow-hidden shadow-2xl relative w-full mt-12">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>
                <button onClick={() => setKategoriSicilAcik(!kategoriSicilAcik)} className="w-full bg-indigo-950/40 p-4 border-b border-indigo-900/30 flex justify-between items-center hover:bg-indigo-900/40 transition-colors focus:outline-none">
                    <h2 className="text-indigo-400 font-black tracking-widest uppercase flex items-center gap-2"><span className="text-xl">👥</span> PERSONEL İSTİHBARAT SİCİL DAİRESİ</h2>
                    <span className="text-indigo-400 text-lg leading-none">{kategoriSicilAcik ? '▲' : '▼'}</span>
                </button>
                {kategoriSicilAcik && (
                    <div className="p-4 md:p-6 animate-fade-in-down">
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">İncelenecek Saha Komiseri</label>
                            <select value={seciliSicilKomiserId} onChange={(e) => setSeciliSicilKomiserId(e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors text-sm font-bold">
                                <option value="">-- BİR PERSONEL SEÇİNİZ --</option>
                                {[...tumKomiserler].sort((a,b) => (a.ad_soyad || '').localeCompare(b.ad_soyad || '', 'tr-TR')).map(k => (
                                    <option key={`sicil-${k.komiser_id}`} value={k.komiser_id}>{k.ad_soyad} (ID: {k.komiser_id})</option>
                                ))}
                            </select>
                        </div>
                        
                        {seciliSicilKomiserId && (
                            <div className="mt-6 animate-fade-in-up">
                                {(() => {
                                    // 1. İstatistikleri Hesapla
                                    const komiserinMaclari = sezonlukMaclar.filter(m => String(m.komiser_id) === String(seciliSicilKomiserId));
                                    let amatorCount = 0; let profCount = 0;
                                    const amatorKategoriler: Record<string, number> = {};
                                    const profKategoriler: Record<string, number> = {};
                                    const sahalar: Record<string, number> = {};

                                    komiserinMaclari.forEach(mac => {
                                        if (!mac) return;
                                        const isProf = !detayliRaporGosterilirMi(mac.kategori_adi);
                                        const katAdi = formatKategori(mac.kategori_adi);
                                        const sahaAdi = mac.saha || 'BELİRTİLMEMİŞ SAHA';
                                        if (isProf) { profCount++; profKategoriler[katAdi] = (profKategoriler[katAdi] || 0) + 1; } 
                                        else { amatorCount++; amatorKategoriler[katAdi] = (amatorKategoriler[katAdi] || 0) + 1; }
                                        sahalar[sahaAdi] = (sahalar[sahaAdi] || 0) + 1;
                                    });

                                    const siraliAmatorler = Object.entries(amatorKategoriler).sort((a,b) => b[1] - a[1]);
                                    const siraliProflar = Object.entries(profKategoriler).sort((a,b) => b[1] - a[1]);
                                    const siraliSahalar = Object.entries(sahalar).sort((a,b) => b[1] - a[1]);

                                    // 2. Mazereti Bul
                                    const hedefHafta = globalAktifHaftaNo + 1;
                                    const komiserMazeret = tumMazeretler.find(m => String(m.komiser_id) === String(seciliSicilKomiserId) && m.hafta_no === hedefHafta);

                                    return (
                                        <div className="space-y-6">
                                            
                                            {/* Üst Başlık Kartı */}
                                            <div className="bg-slate-800 rounded-xl p-4 md:p-6 border-t-4 border-indigo-500 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
                                                <div className="text-center md:text-left">
                                                    <h3 className="text-2xl font-black text-white">{komiserIsmiBul(seciliSicilKomiserId)}</h3>
                                                    <span className="text-indigo-400 text-xs font-mono font-bold tracking-widest">PERSONEL ID: {seciliSicilKomiserId}</span>
                                                </div>
                                                <div className="bg-slate-900 px-6 py-2 rounded-lg shadow-inner border border-slate-700 min-w-[150px]">
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center">Toplam Sezon Görevi</div>
                                                    <div className="text-3xl font-black text-indigo-400 text-center">{komiserinMaclari.length}</div>
                                                </div>
                                            </div>

                                            {/* Mazeret Radarı */}
                                            <div className="bg-slate-800 rounded-xl p-4 md:p-6 border border-slate-700 shadow-lg">
                                                <h4 className="text-slate-300 font-black text-sm tracking-wider uppercase mb-4 flex items-center gap-2 border-b border-slate-700 pb-2">
                                                    <span className="text-lg">📡</span> {hedefHafta}. HAFTA MAZERET VE MÜSAİTLİK RADARI
                                                </h4>
                                                {renderMazeretDetay(komiserMazeret, hedefHafta)}
                                            </div>

                                            {/* İstatistik Tabloları */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Amatör */}
                                                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 relative overflow-hidden shadow-md">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                                    <h4 className="text-blue-400 font-bold text-sm tracking-wider uppercase mb-3 flex items-center justify-between border-b border-slate-700 pb-2">
                                                        <span>🛡️ AMATÖR LİGLER</span>
                                                        <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs">{amatorCount} Maç</span>
                                                    </h4>
                                                    <ul className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                                                        {siraliAmatorler.length === 0 && <li className="text-xs text-slate-500 italic">Görev kaydı yok.</li>}
                                                        {siraliAmatorler.map(([kat, count]) => (
                                                            <li key={kat} className="flex justify-between items-center bg-slate-900 p-2 rounded text-xs border border-slate-700 shadow-sm"><span className="text-slate-300 font-bold">{kat}</span><span className="font-black text-blue-400">{count}</span></li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                {/* Prof */}
                                                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 relative overflow-hidden shadow-md">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                                                    <h4 className="text-purple-400 font-bold text-sm tracking-wider uppercase mb-3 flex items-center justify-between border-b border-slate-700 pb-2">
                                                        <span>🏆 PROFESYONEL / GELİŞİM</span>
                                                        <span className="bg-purple-600 text-white px-2 py-0.5 rounded text-xs">{profCount} Maç</span>
                                                    </h4>
                                                    <ul className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                                                        {siraliProflar.length === 0 && <li className="text-xs text-slate-500 italic">Görev kaydı yok.</li>}
                                                        {siraliProflar.map(([kat, count]) => (
                                                            <li key={kat} className="flex justify-between items-center bg-slate-900 p-2 rounded text-xs border border-slate-700 shadow-sm"><span className="text-slate-300 font-bold">{kat}</span><span className="font-black text-purple-400">{count}</span></li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>

                                            {/* Sahalar */}
                                            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 relative overflow-hidden shadow-md">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                                                <h4 className="text-emerald-400 font-bold text-sm tracking-wider uppercase mb-3 flex items-center gap-2 border-b border-slate-700 pb-2"><span className="text-lg">🏟️</span> GÖREV YAPILAN SAHALAR</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                                                    {siraliSahalar.length === 0 && <span className="text-xs text-slate-500 italic">Görev kaydı yok.</span>}
                                                    {siraliSahalar.map(([saha, count]) => (
                                                        <div key={saha} className="flex justify-between items-center bg-slate-900 p-2.5 rounded border border-slate-700 shadow-sm"><span className="text-slate-300 text-[11px] font-bold truncate pr-2" title={saha}>{saha}</span><span className="bg-emerald-900/50 text-emerald-400 border border-emerald-800 text-[10px] px-2 py-1 rounded font-black shrink-0">{count} Kez</span></div>
                                                    ))}
                                                </div>
                                            </div>

                                        </div>
                                    )
                                })()}
                            </div>
                        )}
                    </div>
                )}
            </section>
          </div>
        )}
      </main>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0f172a; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}} />
    </div>
  )
}