"use client"
import React, { useState, useEffect, Fragment } from 'react'
import { supabase } from '../../lib/supabase'

// =========================================================================
// ⚙️ ADMİN SABİTLERİ VE YARDIMCI FONKSİYONLAR
// =========================================================================
const ADMIN_SIFRE = "3535"; // İzmir Şube Admin Şifresi (İstersen değiştirebilirsin)
const DERNEK_LOGO = "https://upload.wikimedia.org/wikipedia/tr/0/0a/TFF_logo.png?utm_source=tr.wikipedia.org&utm_campaign=index&utm_content=original";

const turkceBuyukHarf = (metin: any) => {
    if (!metin) return '';
    return String(metin)
        .replace(/i/g, 'İ')
        .replace(/ı/g, 'I')
        .replace(/ğ/g, 'Ğ')
        .replace(/ü/g, 'Ü')
        .replace(/ş/g, 'Ş')
        .replace(/ö/g, 'Ö')
        .replace(/ç/g, 'Ç')
        .toUpperCase();
}

const parseDetay = (raw: any) => {
    if (!raw) return {};
    let obj = raw;
    if (typeof obj === 'string') { try { obj = JSON.parse(obj); } catch(e) { return {}; } }
    if (typeof obj !== 'object' || obj === null) return {};
    return obj;
};

const guvenliTarih = (tarihMetni: any) => {
    if (!tarihMetni) return "-";
    try {
        const str = String(tarihMetni);
        if (str.includes('-')) {
            const parts = str.split('-');
            if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`; 
        }
        return str;
    } catch (e) { return "-"; }
}

const formatMacKodu = (kod: any) => {
    if (!kod) return '-';
    const s = String(kod).trim();
    if (s.length === 1 && !isNaN(Number(s))) return `0${s}`;
    return s;
}

const getAnaKategori = (kategori: any) => {
    if (!kategori) return 'amator';
    const kat = turkceBuyukHarf(kategori);
    if ((kat.includes('SÜPER LİG') && !kat.includes('AMATÖR') && !kat.includes('KADIN')) || 
        (kat.includes('1. LİG') && !kat.includes('AMATÖR') && !kat.includes('KADIN')) || 
        (kat.includes('2. LİG') && !kat.includes('AMATÖR') && !kat.includes('KADIN')) || 
        (kat.includes('3. LİG') && !kat.includes('AMATÖR') && !kat.includes('KADIN')) || 
        kat.includes('ZİRAAT') || kat.includes('TÜRKİYE KUPASI')) return 'profesyonel';
    if (kat.includes('KADIN') || kat.includes('KIZ')) return 'kadin';
    if (kat.includes('GELİŞİM') || kat.includes('AKADEMİ') || kat.includes('ELİT') || kat.includes('PAF') || kat.includes('TFF U')) return 'gelisim';
    return 'amator';
}

export default function AdminPage() {
  // ==========================================
  // STATE'LER (BELLEK)
  // ==========================================
  const [girisYapildi, setGirisYapildi] = useState(false);
  const [girisSifre, setGirisSifre] = useState('');
  const [girisHatasi, setGirisHatasi] = useState('');
  
  const [aktifSekme, setAktifSekme] = useState<'dashboard' | 'maclar' | 'komiserler' | 'mazeretler' | 'raporlar' | 'finans'>('dashboard');
  
  const [maclar, setMaclar] = useState<any[]>([]);
  const [komiserler, setKomiserler] = useState<any[]>([]);
  const [mazeretler, setMazeretler] = useState<any[]>([]);
  const [finansListesi, setFinansListesi] = useState<any[]>([]);
  
  const [yukleniyor, setYukleniyor] = useState(true);
  const [islemYapiliyor, setIslemYapiliyor] = useState(false);

  // Filtreler
  const [seciliHafta, setSeciliHafta] = useState<number | 'hepsi'>('hepsi');
  const [aramaMetni, setAramaMetni] = useState('');

  // Mac Ekleme/Duzenleme Modal State
  const [macModalAcik, setMacModalAcik] = useState(false);
  const [duzenlenenMac, setDuzenlenenMac] = useState<any | null>(null);
  const [macForm, setMacForm] = useState({
      tarih: '', saat: '', saha: '', kategori_adi: '', mac_kodu: '', ev_sahibi: '', misafir_takim: '', komiser_id: ''
  });

  // Komiser Ekleme Modal State
  const [komiserModalAcik, setKomiserModalAcik] = useState(false);
  const [duzenlenenKomiser, setDuzenlenenKomiser] = useState<any | null>(null);
  const [komiserForm, setKomiserForm] = useState({ komiser_id: '', ad_soyad: '', telefon: '', sifre: '1923' });

  // Rapor İnceleme Modal State
  const [raporModalAcik, setRaporModalAcik] = useState(false);
  const [incelenenRapor, setIncenenenRapor] = useState<any | null>(null);

  // ==========================================
  // VERİTABANI BAĞLANTILARI
  // ==========================================
  useEffect(() => {
      const auth = localStorage.getItem('izmirAdminAuth');
      if (auth === 'true') {
          setGirisYapildi(true);
          tumVerileriCek();
      } else {
          setYukleniyor(false);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGiris = (e: React.FormEvent) => {
      e.preventDefault();
      if (girisSifre === ADMIN_SIFRE) {
          localStorage.setItem('izmirAdminAuth', 'true');
          setGirisYapildi(true);
          tumVerileriCek();
      } else {
          setGirisHatasi('Hatalı yönetici şifresi!');
      }
  };

  const cikisYap = () => {
      localStorage.removeItem('izmirAdminAuth');
      setGirisYapildi(false);
      setGirisSifre('');
  };

  const tumVerileriCek = async () => {
      setYukleniyor(true);
      try {
          // Komiserleri Çek
          const { data: kData } = await supabase.from('komiserler').select('*').order('ad_soyad');
          if (kData) setKomiserler(kData);

          // Maçları Çek
          const { data: mData } = await supabase.from('musabakalar').select('*').order('tarih', { ascending: false }).order('saat', { ascending: true });
          if (mData) setMaclar(mData);

          // Mazeretleri Çek
          const { data: mzData } = await supabase.from('mazeretler').select('*').order('hafta_no', { ascending: false });
          if (mzData) setMazeretler(mzData);

          // Finans Bilgilerini Çek
          const { data: fData } = await supabase.from('komiser_finans').select('*');
          if (fData) setFinansListesi(fData);

      } catch (error) {
          console.error("Veri çekme hatası:", error);
      } finally {
          setYukleniyor(false);
      }
  };

  // Hafta Numarası Hesaplayıcı (Dashboard ve Filtreler için)
  const macHaftalari = Array.from(new Set(maclar.map(m => {
      if (!m.tarih) return null;
      const d = new Date(m.tarih);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  }).filter(Boolean)));
  // ==========================================
  // VERİTABANI İŞLEMLERİ (CRUD) VE KAYIT MOTORLARI
  // ==========================================
  const macFormSifirla = () => {
      setMacForm({ tarih: '', saat: '', saha: '', kategori_adi: '', mac_kodu: '', ev_sahibi: '', misafir_takim: '', komiser_id: '' });
      setDuzenlenenMac(null);
  };

  const macKaydet = async (e: React.FormEvent) => {
      e.preventDefault();
      setIslemYapiliyor(true);
      try {
          if (duzenlenenMac) {
              const { error } = await supabase.from('musabakalar').update(macForm).eq('id', duzenlenenMac.id);
              if (error) throw error;
              alert("✅ Müsabaka başarıyla güncellendi!");
          } else {
              const { error } = await supabase.from('musabakalar').insert([macForm]);
              if (error) throw error;
              alert("✅ Yeni müsabaka başarıyla eklendi!");
          }
          setMacModalAcik(false);
          macFormSifirla();
          tumVerileriCek();
      } catch (err: any) { alert("🚨 Hata oluştu: " + err.message); }
      finally { setIslemYapiliyor(false); }
  };

  const macSil = async (id: number) => {
      if (!window.confirm("⚠️ DİKKAT: Bu müsabakayı silmek istediğinize emin misiniz? (Bu işlem geri alınamaz ve komiserin raporları da silinir!)")) return;
      setIslemYapiliyor(true);
      try {
          const { error } = await supabase.from('musabakalar').delete().eq('id', id);
          if (error) throw error;
          alert("🗑️ Müsabaka başarıyla silindi!");
          tumVerileriCek();
      } catch (err: any) { alert("🚨 Hata oluştu: " + err.message); }
      finally { setIslemYapiliyor(false); }
  };

  const macDuzenle = (mac: any) => {
      setDuzenlenenMac(mac);
      setMacForm({
          tarih: mac.tarih || '', saat: mac.saat || '', saha: mac.saha || '', 
          kategori_adi: mac.kategori_adi || '', mac_kodu: mac.mac_kodu || '', 
          ev_sahibi: mac.ev_sahibi || '', misafir_takim: mac.misafir_takim || '', 
          komiser_id: mac.komiser_id || ''
      });
      setMacModalAcik(true);
  };

  const komiserFormSifirla = () => {
      setKomiserForm({ komiser_id: '', ad_soyad: '', telefon: '', sifre: '1923' });
      setDuzenlenenKomiser(null);
  };

  const komiserKaydet = async (e: React.FormEvent) => {
      e.preventDefault();
      setIslemYapiliyor(true);
      try {
          if (duzenlenenKomiser) {
              const { error } = await supabase.from('komiserler').update(komiserForm).eq('komiser_id', duzenlenenKomiser.komiser_id);
              if (error) throw error;
              alert("✅ Saha Komiseri bilgileri güncellendi!");
          } else {
              const { error } = await supabase.from('komiserler').insert([komiserForm]);
              if (error) throw error;
              alert("✅ Yeni Saha Komiseri sisteme kaydedildi!");
          }
          setKomiserModalAcik(false);
          komiserFormSifirla();
          tumVerileriCek();
      } catch (err: any) { alert("🚨 Hata oluştu: " + err.message); }
      finally { setIslemYapiliyor(false); }
  };

  const komiserSil = async (id: string) => {
      if (!window.confirm("⚠️ DİKKAT: Bu Saha Komiserini silmek istediğinize emin misiniz?")) return;
      setIslemYapiliyor(true);
      try {
          const { error } = await supabase.from('komiserler').delete().eq('komiser_id', id);
          if (error) throw error;
          alert("🗑️ Komiser sistemden silindi!");
          tumVerileriCek();
      } catch (err: any) { alert("🚨 Hata oluştu: " + err.message); }
      finally { setIslemYapiliyor(false); }
  };

  const komiserDuzenle = (komiser: any) => {
      setDuzenlenenKomiser(komiser);
      setKomiserForm({
          komiser_id: komiser.komiser_id || '', ad_soyad: komiser.ad_soyad || '', 
          telefon: komiser.telefon || '', sifre: komiser.sifre || '1923'
      });
      setKomiserModalAcik(true);
  };

  const raporInceleAc = (mac: any) => {
      setIncenenenRapor(mac);
      setRaporModalAcik(true);
  };

  // ==========================================
  // FİLTRELER VE İSTATİSTİK ZEKASI
  // ==========================================
  const filtrelenmisMaclar = maclar.filter(mac => {
      if (aramaMetni) {
          const search = turkceBuyukHarf(aramaMetni);
          const saha = turkceBuyukHarf(mac.saha);
          const ev = turkceBuyukHarf(mac.ev_sahibi);
          const mis = turkceBuyukHarf(mac.misafir_takim);
          const kom = turkceBuyukHarf(komiserler.find(k => k.komiser_id === mac.komiser_id)?.ad_soyad || '');
          if (!saha.includes(search) && !ev.includes(search) && !mis.includes(search) && !kom.includes(search)) return false;
      }
      return true;
  });

  const tebellugBekleyenSayisi = maclar.filter(m => !m.tebellug_edildi).length;
  const skorBekleyenSayisi = maclar.filter(m => m.tebellug_edildi && !m.skor_girildi).length;
  const oynananMacSayisi = maclar.filter(m => m.skor_girildi).length;

  const mazeretGosterimi = (mod: string | null) => {
      if (mod === 'yok') return <span className="bg-red-100 text-red-700 font-bold px-2 py-1 rounded text-xs">GÖREV İSTEMİYOR</span>;
      if (mod === 'full') return <span className="bg-green-100 text-green-700 font-bold px-2 py-1 rounded text-xs">TÜM HAFTA MÜSAİT</span>;
      if (mod === 'secmeli') return <span className="bg-amber-100 text-amber-700 font-bold px-2 py-1 rounded text-xs">SEÇMELİ (KISMI) MÜSAİT</span>;
      return <span className="text-slate-400">Belirtilmedi</span>;
  }

  // ==========================================
  // GİRİŞ EKRANI (LOGIN) RENDER
  // ==========================================
  if (!girisYapildi) {
      return (
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-blue-900 to-slate-900 rounded-b-[50%] scale-150 transform -translate-y-1/4 shadow-2xl opacity-50"></div>
              <div className="bg-white p-8 md:p-10 rounded-2xl shadow-2xl max-w-sm w-full text-center relative z-10 border border-slate-200">
                  <div className="flex justify-center mb-6">
                      <div className="w-24 h-24 bg-white rounded-full p-2 shadow-lg border border-slate-200 -mt-16 flex items-center justify-center">
                          <img src={DERNEK_LOGO} crossOrigin="anonymous" alt="Logo" className="w-[85%] h-[85%] object-contain" />
                      </div>
                  </div>
                  <h1 className="text-base font-black tracking-widest text-slate-800 leading-snug mb-1 uppercase">İzmir Saha Komiserleri</h1>
                  <h2 className="text-xs font-bold text-blue-700 tracking-widest mb-8 uppercase">Üst Yönetim Paneli</h2>
                  <form onSubmit={handleGiris} className="space-y-4">
                      <div>
                          <input type="password" placeholder="Yönetici Şifresi" value={girisSifre} onChange={(e: any) => setGirisSifre(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3.5 text-center text-slate-800 font-black tracking-[0.5em] text-lg focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner" required />
                      </div>
                      {girisHatasi && <p className="text-red-500 text-xs font-bold text-center bg-red-50 p-2 rounded-lg border border-red-100">{girisHatasi}</p>}
                      <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black py-4 rounded-xl tracking-widest shadow-lg transition-all hover:-translate-y-0.5 mt-2">KARARGAHA GİRİŞ YAP</button>
                  </form>
              </div>
          </div>
      );
  }
  // ==========================================
  // ANA DASHBOARD VE YÖNETİM ARAYÜZÜ (RENDER)
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-100 font-sans flex flex-col">
        {/* ÜST MENÜ BARI */}
        <header className="bg-slate-900 text-white shadow-xl sticky top-0 z-50 border-b border-slate-700">
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <img src={DERNEK_LOGO} alt="Logo" className="w-10 h-10 object-contain bg-white rounded-full p-1" crossOrigin="anonymous" />
                    <div>
                        <h1 className="font-black text-lg tracking-widest leading-tight uppercase">YÖNETİM KARARGAHI</h1>
                        <p className="text-[10px] text-blue-400 font-bold tracking-widest uppercase">İzmir Şubesi Saha Operasyon Merkezi</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <button onClick={() => setAktifSekme('dashboard')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${aktifSekme === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>ÖZET (DASHBOARD)</button>
                    <button onClick={() => setAktifSekme('maclar')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${aktifSekme === 'maclar' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>MÜSABAKALAR</button>
                    <button onClick={() => setAktifSekme('komiserler')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${aktifSekme === 'komiserler' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>KOMİSERLER</button>
                    <button onClick={() => setAktifSekme('mazeretler')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${aktifSekme === 'mazeretler' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>MAZERETLER</button>
                    <button onClick={() => setAktifSekme('raporlar')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${aktifSekme === 'raporlar' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>RAPOR ARŞİVİ</button>
                    <button onClick={() => setAktifSekme('finans')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${aktifSekme === 'finans' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>FİNANS (BORDRO)</button>
                    <button onClick={cikisYap} className="px-4 py-2 text-xs font-bold rounded-lg bg-red-700 hover:bg-red-800 transition-colors shadow-sm ml-2">ÇIKIŞ YAP</button>
                </div>
            </div>
        </header>

        {/* ANA İÇERİK ALANI */}
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 pb-20">
            {yukleniyor ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="font-bold tracking-widest">VERİLER ÇEKİLİYOR...</p>
                </div>
            ) : (
                <Fragment>
                    {/* SEKME: DASHBOARD (ÖZET) */}
                    {aktifSekme === 'dashboard' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 uppercase">SİSTEM ÖZETİ</h2>
                                    <p className="text-sm font-bold text-slate-500">İzmir sahalarındaki anlık genel durum.</p>
                                </div>
                                <button onClick={tumVerileriCek} disabled={yukleniyor} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 border border-slate-300 transition-colors shadow-sm">
                                    🔄 VERİLERİ YENİLE
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center border-b-4 border-b-blue-500">
                                    <span className="text-4xl mb-2">🏟️</span>
                                    <span className="text-3xl font-black text-slate-800">{maclar.length}</span>
                                    <span className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Toplam Atanan Maç</span>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center border-b-4 border-b-emerald-500">
                                    <span className="text-4xl mb-2">👮</span>
                                    <span className="text-3xl font-black text-slate-800">{komiserler.length}</span>
                                    <span className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Kayıtlı Komiser</span>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center border-b-4 border-b-amber-500">
                                    <span className="text-4xl mb-2">⏳</span>
                                    <span className="text-3xl font-black text-slate-800">{tebellugBekleyenSayisi}</span>
                                    <span className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Tebellüğ Bekleyen</span>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center border-b-4 border-b-red-500">
                                    <span className="text-4xl mb-2">🚨</span>
                                    <span className="text-3xl font-black text-slate-800">{skorBekleyenSayisi}</span>
                                    <span className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Skor/Rapor Bekleyen</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SEKME: MÜSABAKALAR (MAÇ YÖNETİMİ) */}
                    {aktifSekme === 'maclar' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                                <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><span className="text-2xl">🏟️</span> MÜSABAKA YÖNETİMİ</h2>
                                <button onClick={() => { macFormSifirla(); setMacModalAcik(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-lg shadow-sm text-sm flex items-center gap-2 transition-colors">
                                    + YENİ MÜSABAKA EKLE
                                </button>
                            </div>
                            
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
                                <div className="flex-1">
                                    <input type="text" placeholder="Saha, Takım veya Komiser Ara..." value={aramaMetni} onChange={(e) => setAramaMetni(e.target.value)} className="w-full bg-slate-50 border border-slate-300 text-slate-800 px-4 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 text-sm font-semibold" />
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-800 text-white font-bold text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="p-4">TARİH & SAAT</th>
                                            <th className="p-4">KATEGORİ & KOD</th>
                                            <th className="p-4">SAHA</th>
                                            <th className="p-4">MÜSABAKA</th>
                                            <th className="p-4">SAHA KOMİSERİ</th>
                                            <th className="p-4">DURUM</th>
                                            <th className="p-4 text-right">İŞLEMLER</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
                                        {filtrelenmisMaclar.length === 0 ? (
                                            <tr><td colSpan={7} className="p-8 text-center text-slate-400 font-bold">Kayıt bulunamadı.</td></tr>
                                        ) : (
                                            filtrelenmisMaclar.map(mac => {
                                                const komiser = komiserler.find(k => k.komiser_id === mac.komiser_id);
                                                return (
                                                    <tr key={mac.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="p-4"><span className="block font-bold">{guvenliTarih(mac.tarih)}</span><span className="text-xs text-slate-400">{guvenliSaat(mac.saat)}</span></td>
                                                        <td className="p-4"><span className="bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-[10px] font-black mr-2">{formatMacKodu(mac.mac_kodu)}</span><span className="uppercase text-[11px] font-bold">{turkceBuyukHarf(mac.kategori_adi)}</span></td>
                                                        <td className="p-4 uppercase text-xs">{turkceBuyukHarf(mac.saha)}</td>
                                                        <td className="p-4"><span className="font-bold">{turkceBuyukHarf(mac.ev_sahibi)}</span> <span className="text-slate-400 text-[10px] mx-1">VS</span> <span className="font-bold">{turkceBuyukHarf(mac.misafir_takim)}</span></td>
                                                        <td className="p-4 font-bold text-blue-700">{komiser ? turkceBuyukHarf(komiser.ad_soyad) : <span className="text-red-500">ATANMADI</span>}</td>
                                                        <td className="p-4">
                                                            {!mac.tebellug_edildi ? <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold border border-slate-200">TEBELLÜĞ BEKLİYOR</span> :
                                                            !mac.skor_girildi ? <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold border border-red-200">RAPOR BEKLİYOR</span> :
                                                            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold border border-emerald-200">TAMAMLANDI</span>}
                                                        </td>
                                                        <td className="p-4 text-right space-x-2">
                                                            <button onClick={() => macDuzenle(mac)} className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1.5 rounded text-xs font-bold transition-colors">DÜZENLE</button>
                                                            <button onClick={() => macSil(mac.id)} className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded text-xs font-bold transition-colors">SİL</button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {/* SEKME: KOMİSERLER */}
                    {aktifSekme === 'komiserler' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                                <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><span className="text-2xl">👮</span> SAHA KOMİSERLERİ</h2>
                                <button onClick={() => { komiserFormSifirla(); setKomiserModalAcik(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-lg shadow-sm text-sm flex items-center gap-2 transition-colors">
                                    + YENİ KOMİSER EKLE
                                </button>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-800 text-white font-bold text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="p-4">SİCİL NO</th>
                                            <th className="p-4">AD SOYAD</th>
                                            <th className="p-4">TELEFON</th>
                                            <th className="p-4">ŞİFRE</th>
                                            <th className="p-4 text-right">İŞLEMLER</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
                                        {komiserler.length === 0 ? (
                                            <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-bold">Kayıtlı komiser bulunamadı.</td></tr>
                                        ) : (
                                            komiserler.map(kom => (
                                                <tr key={kom.komiser_id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-4 font-black text-slate-800">{kom.komiser_id}</td>
                                                    <td className="p-4 font-bold">{turkceBuyukHarf(kom.ad_soyad)}</td>
                                                    <td className="p-4">{kom.telefon || '-'}</td>
                                                    <td className="p-4 font-mono text-slate-400">{kom.sifre}</td>
                                                    <td className="p-4 text-right space-x-2">
                                                        <button onClick={() => komiserDuzenle(kom)} className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1.5 rounded text-xs font-bold transition-colors">DÜZENLE</button>
                                                        <button onClick={() => komiserSil(kom.komiser_id)} className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded text-xs font-bold transition-colors">SİL</button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* SEKME: MAZERETLER */}
                    {aktifSekme === 'mazeretler' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                                <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><span className="text-2xl">📅</span> MÜSAİTLİK VE MAZERET BİLDİRİMLERİ</h2>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-800 text-white font-bold text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="p-4">HAFTA NO</th>
                                            <th className="p-4">KOMİSER</th>
                                            <th className="p-4">DURUMU</th>
                                            <th className="p-4">ÖZEL NOT</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
                                        {mazeretler.length === 0 ? (
                                            <tr><td colSpan={4} className="p-8 text-center text-slate-400 font-bold">Bildirim bulunamadı.</td></tr>
                                        ) : (
                                            mazeretler.map(mz => {
                                                const komiser = komiserler.find(k => k.komiser_id === mz.komiser_id);
                                                const detay = parseDetay(mz.detaylar);
                                                return (
                                                    <tr key={mz.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="p-4 font-black">{mz.hafta_no}. HAFTA</td>
                                                        <td className="p-4 font-bold">{komiser ? turkceBuyukHarf(komiser.ad_soyad) : mz.komiser_id}</td>
                                                        <td className="p-4">{mazeretGosterimi(detay.mod)}</td>
                                                        <td className="p-4 text-xs whitespace-normal max-w-xs">{mz.aciklama || '-'}</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* SEKME: RAPORLAR (GELEN RAPOR ARŞİVİ) */}
                    {aktifSekme === 'raporlar' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                                <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><span className="text-2xl">📄</span> TFF RAPOR ARŞİVİ</h2>
                                <p className="text-xs font-bold text-slate-500 mt-2">Komiserler tarafından skoru girilmiş ve raporu iletilmiş müsabakalar.</p>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-800 text-white font-bold text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="p-4">TARİH</th>
                                            <th className="p-4">MÜSABAKA</th>
                                            <th className="p-4">SKOR</th>
                                            <th className="p-4">KOMİSER</th>
                                            <th className="p-4 text-right">TFF RAPORU</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
                                        {maclar.filter(m => m.skor_girildi).length === 0 ? (
                                            <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-bold">Henüz raporlanmış müsabaka yok.</td></tr>
                                        ) : (
                                            maclar.filter(m => m.skor_girildi).map(mac => {
                                                const komiser = komiserler.find(k => k.komiser_id === mac.komiser_id);
                                                const pDetay = parseDetay(mac.tff_rapor_detaylari);
                                                const detayliVar = pDetay.detayli_kaydedildi;
                                                return (
                                                    <tr key={`rapor-${mac.id}`} className="hover:bg-slate-50 transition-colors">
                                                        <td className="p-4 font-bold">{guvenliTarih(mac.tarih)}</td>
                                                        <td className="p-4"><span className="font-bold">{turkceBuyukHarf(mac.ev_sahibi)}</span> vs <span className="font-bold">{turkceBuyukHarf(mac.misafir_takim)}</span></td>
                                                        <td className="p-4 font-black text-lg text-slate-900">{mac.ev_sahibi_skor} - {mac.misafir_skor}</td>
                                                        <td className="p-4 text-xs font-bold">{komiser ? turkceBuyukHarf(komiser.ad_soyad) : '-'}</td>
                                                        <td className="p-4 text-right">
                                                            <button onClick={() => raporInceleAc(mac)} className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded text-xs font-bold transition-colors shadow-sm">
                                                                {detayliVar ? '🔍 DETAYLI İNCELE' : '🔍 HIZLI SKOR İNCELE'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* SEKME: FİNANS VE BORDRO VERİLERİ */}
                    {aktifSekme === 'finans' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                                <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><span className="text-2xl">💰</span> KOMİSER FİNANS & BANKA BİLGİLERİ</h2>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-800 text-white font-bold text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="p-4">KOMİSER ADI</th>
                                            <th className="p-4">TC KİMLİK</th>
                                            <th className="p-4">BANKA / ŞUBE</th>
                                            <th className="p-4">HESAP NO</th>
                                            <th className="p-4">IBAN</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
                                        {finansListesi.length === 0 ? (
                                            <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-bold">Sistemde finans bilgisi bulunamadı.</td></tr>
                                        ) : (
                                            finansListesi.map(f => {
                                                const komiser = komiserler.find(k => k.komiser_id === f.komiser_id);
                                                return (
                                                    <tr key={f.komiser_id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="p-4 font-black text-slate-800">{komiser ? turkceBuyukHarf(komiser.ad_soyad) : f.komiser_id}</td>
                                                        <td className="p-4 font-mono">{f.tc_kimlik || '-'}</td>
                                                        <td className="p-4">{turkceBuyukHarf(f.banka_adi)} / {turkceBuyukHarf(f.sube_kodu)}</td>
                                                        <td className="p-4 font-mono">{f.hesap_no || '-'}</td>
                                                        <td className="p-4 font-mono text-xs">{f.iban || '-'}</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </Fragment>
            )}
        </div>

        {/* ========================================== */}
        {/* MODALLAR (AÇILIR PENCERELER) */}
        {/* ========================================== */}
        
        {/* MAÇ EKLE/DÜZENLE MODALI */}
        {macModalAcik && (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
                <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl animate-fade-in-up border border-slate-300 flex flex-col my-8">
                    <div className="p-5 border-b border-slate-200 bg-slate-50 rounded-t-xl flex justify-between items-center">
                        <h3 className="font-black text-lg text-slate-800 tracking-widest">{duzenlenenMac ? 'MÜSABAKA DÜZENLE' : 'YENİ MÜSABAKA EKLE'}</h3>
                        <button onClick={() => setMacModalAcik(false)} className="text-slate-400 hover:text-red-500 font-black text-xl leading-none">✕</button>
                    </div>
                    <form onSubmit={macKaydet} className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-xs font-bold text-slate-600 mb-1">TARİH (YYYY-AA-GG)</label><input type="date" value={macForm.tarih} onChange={(e) => setMacForm({...macForm, tarih: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded font-mono" required /></div>
                            <div><label className="block text-xs font-bold text-slate-600 mb-1">SAAT (SS:DD)</label><input type="time" value={macForm.saat} onChange={(e) => setMacForm({...macForm, saat: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded font-mono" required /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-xs font-bold text-slate-600 mb-1">KATEGORİ (Örn: U17, BAL)</label><input type="text" value={macForm.kategori_adi} onChange={(e) => setMacForm({...macForm, kategori_adi: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded font-bold uppercase" required /></div>
                            <div><label className="block text-xs font-bold text-slate-600 mb-1">MAÇ KODU</label><input type="text" value={macForm.mac_kodu} onChange={(e) => setMacForm({...macForm, mac_kodu: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded font-bold" required /></div>
                        </div>
                        <div><label className="block text-xs font-bold text-slate-600 mb-1">SAHA ADI</label><input type="text" value={macForm.saha} onChange={(e) => setMacForm({...macForm, saha: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded font-bold uppercase" required /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-xs font-bold text-slate-600 mb-1">EV SAHİBİ TAKIM</label><input type="text" value={macForm.ev_sahibi} onChange={(e) => setMacForm({...macForm, ev_sahibi: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded font-bold uppercase" required /></div>
                            <div><label className="block text-xs font-bold text-slate-600 mb-1">MİSAFİR TAKIM</label><input type="text" value={macForm.misafir_takim} onChange={(e) => setMacForm({...macForm, misafir_takim: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded font-bold uppercase" required /></div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">SAHA KOMİSERİ ATAMASI</label>
                            <select value={macForm.komiser_id} onChange={(e) => setMacForm({...macForm, komiser_id: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded font-bold bg-slate-50 cursor-pointer">
                                <option value="">-- KOMİSER ATANMADI --</option>
                                {komiserler.map(k => <option key={k.komiser_id} value={k.komiser_id}>{k.komiser_id} - {turkceBuyukHarf(k.ad_soyad)}</option>)}
                            </select>
                        </div>
                        <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                            <button type="button" onClick={() => setMacModalAcik(false)} className="bg-slate-200 text-slate-700 px-5 py-2.5 rounded-lg font-bold">İPTAL</button>
                            <button type="submit" disabled={islemYapiliyor} className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-black tracking-widest shadow-sm disabled:opacity-50">{islemYapiliyor ? 'KAYDEDİLİYOR...' : 'KAYDET'}</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* KOMİSER EKLE/DÜZENLE MODALI */}
        {komiserModalAcik && (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl w-full max-w-md shadow-2xl animate-fade-in-up border border-slate-300 flex flex-col">
                    <div className="p-5 border-b border-slate-200 bg-slate-50 rounded-t-xl flex justify-between items-center">
                        <h3 className="font-black text-lg text-slate-800 tracking-widest">{duzenlenenKomiser ? 'KOMİSER DÜZENLE' : 'YENİ KOMİSER EKLE'}</h3>
                        <button onClick={() => setKomiserModalAcik(false)} className="text-slate-400 hover:text-red-500 font-black text-xl leading-none">✕</button>
                    </div>
                    <form onSubmit={komiserKaydet} className="p-6 space-y-4">
                        <div><label className="block text-xs font-bold text-slate-600 mb-1">SİCİL NO (ID)</label><input type="text" value={komiserForm.komiser_id} onChange={(e) => setKomiserForm({...komiserForm, komiser_id: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded font-black font-mono bg-slate-50" readOnly={!!duzenlenenKomiser} required placeholder="Örn: 351234" /></div>
                        <div><label className="block text-xs font-bold text-slate-600 mb-1">AD SOYAD</label><input type="text" value={komiserForm.ad_soyad} onChange={(e) => setKomiserForm({...komiserForm, ad_soyad: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded font-bold uppercase" required /></div>
                        <div><label className="block text-xs font-bold text-slate-600 mb-1">TELEFON NO</label><input type="text" value={komiserForm.telefon} onChange={(e) => setKomiserForm({...komiserForm, telefon: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded font-mono" placeholder="05XX..." /></div>
                        <div><label className="block text-xs font-bold text-slate-600 mb-1">GİRİŞ ŞİFRESİ</label><input type="text" value={komiserForm.sifre} onChange={(e) => setKomiserForm({...komiserForm, sifre: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded font-mono font-black" required maxLength={4} /></div>
                        
                        <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                            <button type="button" onClick={() => setKomiserModalAcik(false)} className="bg-slate-200 text-slate-700 px-5 py-2.5 rounded-lg font-bold">İPTAL</button>
                            <button type="submit" disabled={islemYapiliyor} className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-black tracking-widest shadow-sm disabled:opacity-50">{islemYapiliyor ? 'KAYDEDİLİYOR...' : 'KAYDET'}</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* RAPOR İNCELE MODALI */}
        {raporModalAcik && incelenenRapor && (
            <div className="fixed inset-0 bg-black/90 z-[120] flex items-center justify-center p-4 backdrop-blur-md">
                <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] shadow-2xl animate-fade-in-up border border-slate-300 flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-slate-200 bg-slate-800 text-white flex justify-between items-center shrink-0">
                        <h3 className="font-black text-lg tracking-widest uppercase">RAPOR DETAYI</h3>
                        <button onClick={() => setRaporModalAcik(false)} className="text-slate-400 hover:text-white font-black text-xl leading-none">✕</button>
                    </div>
                    <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
                        <div className="grid grid-cols-2 gap-4 mb-6 border-b border-slate-200 pb-4">
                            <div><span className="text-[10px] font-bold text-slate-500 block">EV SAHİBİ</span><span className="font-black text-lg">{turkceBuyukHarf(incelenenRapor.ev_sahibi)}</span></div>
                            <div className="text-right"><span className="text-[10px] font-bold text-slate-500 block">SKOR</span><span className="font-black text-2xl text-slate-800">{incelenenRapor.ev_sahibi_skor} - {incelenenRapor.misafir_skor}</span></div>
                            <div><span className="text-[10px] font-bold text-slate-500 block">MİSAFİR TAKIM</span><span className="font-black text-lg">{turkceBuyukHarf(incelenenRapor.misafir_takim)}</span></div>
                            <div className="text-right"><span className="text-[10px] font-bold text-slate-500 block">DURUM</span><span className="font-bold text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">{incelenenRapor.mac_durumu}</span></div>
                        </div>

                        <div className="mb-6">
                            <h4 className="font-black text-xs text-slate-500 tracking-widest mb-2 border-b border-slate-200 pb-1">SİSTEM NOTU / OLAY BİLDİRİMİ</h4>
                            <div className="bg-white border border-slate-300 p-4 rounded-lg font-serif text-sm min-h-[100px] shadow-inner whitespace-pre-wrap">
                                {incelenenRapor.rapor_notu || <span className="text-slate-400 italic">Not girilmemiş.</span>}
                            </div>
                        </div>

                        {(() => {
                            const pDetay = parseDetay(incelenenRapor.tff_rapor_detaylari);
                            if (pDetay.detayli_kaydedildi) {
                                return (
                                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg text-emerald-800 text-center">
                                        <span className="text-3xl block mb-2">📄</span>
                                        <p className="font-bold text-sm">Bu müsabaka için detaylı TFF raporu ve evrakları sisteme yüklenmiştir.</p>
                                        <p className="text-xs mt-1">Resmi formları komiserin kendi ekranından veya veritabanından görüntüleyebilirsiniz.</p>
                                    </div>
                                );
                            } else if (detayliRaporGosterilirMi(incelenenRapor.kategori_adi)) {
                                return (
                                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-red-800 text-center animate-pulse">
                                        <span className="text-3xl block mb-2">🚨</span>
                                        <p className="font-bold text-sm">Komiser Hızlı Skoru girmiş ancak henüz DETAYLI RAPORU tamamlamamış!</p>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
