"use client"
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminPanel() {
  const [sifre, setSifre] = useState('')
  const [yetkili, setYetkili] = useState(false)
  const [hata, setHata] = useState(false)

  const [adminModu, setAdminModu] = useState<'radar' | 'skorlar' | 'sicil'>('radar')

  const [maclar, setMaclar] = useState<any[]>([])       
  const [tumMaclar, setTumMaclar] = useState<any[]>([]) 
  const [komiserler, setKomiserler] = useState<any[]>([])
  const [mazeretler, setMazeretler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(false)
  
  const [globalAktifHaftaNo, setGlobalAktifHaftaNo] = useState<number>(1)
  
  const [radarArama, setRadarArama] = useState('')

  const [acikBekleyenId, setAcikBekleyenId] = useState<string | null>(null)
  const [acikOnayliId, setAcikOnayliId] = useState<string | null>(null)
  const [acikMazeretId, setAcikMazeretId] = useState<string | null>(null)
  const [acikSicilId, setAcikSicilId] = useState<string | null>(null)
  const [acikRaporId, setAcikRaporId] = useState<number | null>(null) 

  const [acikSolGrup, setAcikSolGrup] = useState<'bekleyen' | 'onayli' | null>('bekleyen')
  const [acikSagGrup, setAcikSagGrup] = useState<'724' | 'secmeli' | 'kapali' | 'bildirmeyen' | null>(null)

  const ADMIN_SIFRE = "1923"

  useEffect(() => {
    const kayitliYetki = localStorage.getItem('izmirAdminYetki')
    if (kayitliYetki === 'true') {
      setYetkili(true)
      veriCek(false) 
    }
  }, [])

  const cumaBul = (tarihMetni: string) => {
    if (!tarihMetni) return 0
    const parcalar = tarihMetni.split('-')
    if (parcalar.length !== 3) return 0
    const d = new Date(Number(parcalar[0]), Number(parcalar[1]) - 1, Number(parcalar[2]))
    const gun = d.getDay()
    const fark = gun >= 5 ? gun - 5 : gun + 2
    d.setDate(d.getDate() - fark)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }

  const girisYap = (e: React.FormEvent) => {
    e.preventDefault()
    if (sifre === ADMIN_SIFRE) {
      setYetkili(true)
      localStorage.setItem('izmirAdminYetki', 'true')
      veriCek(false)
    } else {
      setHata(true)
      setTimeout(() => setHata(false), 2000)
    }
  }

  const cikisYap = () => {
    setYetkili(false)
    localStorage.removeItem('izmirAdminYetki')
  }

  const veriCek = async (sessiz = false) => {
    if (!sessiz) setYukleniyor(true)
    
    const { data: macData } = await supabase
      .from('musabakalar')
      .select('*')
      .order('tarih', { ascending: false })
      .limit(1000)

    if (macData && macData.length > 0) {
      setTumMaclar(macData)
      
      const cumalar = macData.map(mac => mac?.tarih ? cumaBul(mac.tarih) : 0).filter(t => t > 0)
      const essizCumalar = Array.from(new Set(cumalar)).sort((a, b) => a - b)
      
      const aktifHaftaIndex = essizCumalar.length
      const aktifCumaTarihi = essizCumalar[essizCumalar.length - 1]
      
      setGlobalAktifHaftaNo(aktifHaftaIndex)

      const sadeceBuHaftaninMaclari = macData.filter(mac => mac?.tarih && cumaBul(mac.tarih) === aktifCumaTarihi)
      setMaclar(sadeceBuHaftaninMaclari)
    }

    const { data: komiserData } = await supabase
      .from('komiserler')
      .select('*')

    if (komiserData) setKomiserler(komiserData)

    const { data: mazeretData } = await supabase
      .from('mazeretler')
      .select('*')
      .order('created_at', { ascending: false })

    if (mazeretData) setMazeretler(mazeretData)
      
    if (!sessiz) setYukleniyor(false)
  }

  useEffect(() => {
    if (yetkili) {
      const musabakaDinleyici = supabase
        .channel('musabakalar-canli')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'musabakalar' }, () => { veriCek(true) })
        .subscribe()

      const mazeretDinleyici = supabase
        .channel('mazeretler-canli')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mazeretler' }, () => { veriCek(true) })
        .subscribe()

      return () => {
        supabase.removeChannel(musabakaDinleyici)
        supabase.removeChannel(mazeretDinleyici)
      }
    }
  }, [yetkili])

  const gorevliKomiserIdleri = Array.from(new Set(maclar.map(m => m?.komiser_id).filter(Boolean)));
  let bekleyenKomiserler: any[] = [];
  let onayliKomiserler: any[] = [];

  gorevliKomiserIdleri.forEach(id => {
    const komiserinMaclari = maclar.filter(m => m?.komiser_id === id);
    const komiserBilgisi = komiserler.find(k => k?.komiser_id === id);
    const komiserIsmi = komiserBilgisi?.ad_soyad || `Komiser (${id})`;
    
    const hepsiTebellugEdilmis = komiserinMaclari.length > 0 && komiserinMaclari.every(m => m?.tebellug_edildi === true);
    const komiserObjesi = { id, isim: komiserIsmi, maclar: komiserinMaclari };

    if (hepsiTebellugEdilmis) onayliKomiserler.push(komiserObjesi);
    else bekleyenKomiserler.push(komiserObjesi);
  });

  // ÇÖKME KORUMALI ARAMA FİLTRESİ
  if (radarArama.trim() !== '') {
    const aramaMetni = radarArama.toLocaleLowerCase('tr-TR');
    
    const sirketFiltre = (komiserListesi: any[]) => {
      return komiserListesi.filter(k => {
        if ((k.isim || '').toLocaleLowerCase('tr-TR').includes(aramaMetni) || String(k.id).includes(aramaMetni)) return true;
        const macEslesti = k.maclar.some((m: any) => 
          (m.ev_sahibi || '').toLocaleLowerCase('tr-TR').includes(aramaMetni) || 
          (m.misafir_takim || '').toLocaleLowerCase('tr-TR').includes(aramaMetni) ||
          (m.kategori_adi || '').toLocaleLowerCase('tr-TR').includes(aramaMetni) ||
          (m.saha || '').toLocaleLowerCase('tr-TR').includes(aramaMetni)
        );
        return macEslesti;
      });
    };

    bekleyenKomiserler = sirketFiltre(bekleyenKomiserler);
    onayliKomiserler = sirketFiltre(onayliKomiserler);
  }

  const hedefHafta = globalAktifHaftaNo + 1;
  const aktifMazeretler = mazeretler.filter(m => m.hafta_no === hedefHafta);

  const goreveKapaliList = aktifMazeretler.filter(m => m?.komple_yok || m?.detaylar?.mod === 'yok');
  const tamMusaitList = aktifMazeretler.filter(m => !m?.komple_yok && m?.detaylar?.mod === 'full');
  const secmeliList = aktifMazeretler.filter(m => !m?.komple_yok && m?.detaylar?.mod === 'secmeli');
  
  const bildirenIdler = aktifMazeretler.map(m => m.komiser_id);
  const bildirmeyenList = komiserler.filter(k => !bildirenIdler.includes(k.komiser_id));

  // GÜNCELLENEN RAPOR HESAPLAMALARI
  const emniyetlikMaclar = maclar.filter(m => m.skor_girildi && m.olay_durumu === 'emniyetlik_olay');
  const teknikOlayMaclar = maclar.filter(m => m.skor_girildi && m.olay_durumu !== 'emniyetlik_olay' && (m.olay_durumu === 'teknik_olay' || m.olay_durumu === 'hava_muhalefeti' || m.olay_durumu === 'saha_sorunu' || m.mac_durumu === 'takimlar_cikmadi'));
  const olaysizMaclar = maclar.filter(m => m.skor_girildi && m.olay_durumu === 'olaysiz' && m.mac_durumu !== 'takimlar_cikmadi');
  const bekleyenRaporlar = maclar.filter(m => !m.skor_girildi);
  
  const toplamOlaySayisi = emniyetlikMaclar.length + teknikOlayMaclar.length;

  const macDurumEtiketi = (durum: string) => {
    switch (durum) {
      case 'takimlar_cikmadi': return 'Takım(lar) Sahaya Çıkmadı';
      case 'yarida_kaldi': return 'Maç Yarıda Kaldı';
      default: return 'Müsabaka Tamamlandı';
    }
  }

  const olayDurumEtiketi = (durum: string) => {
    switch (durum) {
      case 'emniyetlik_olay': return 'EMNİYETLİK OLAY';
      case 'teknik_olay': return 'TEKNİK OLAY';
      case 'hava_muhalefeti': return 'HAVA MUHALEFETİ';
      case 'saha_sorunu': return 'TESİS / SAHA MÜSAİT DEĞİL';
      default: return 'OLAYSIZ BİTTİ';
    }
  }

  const gorevTuruBelirle = (kategori: string, macKodu: string) => {
    const kat = kategori ? kategori.toUpperCase() : ""
    const kod = macKodu ? macKodu.toUpperCase() : ""
    if (kod.includes('STAJ')) return "Stajyer / Saha Komiseri"
    if (kat.includes('U17') || kat.includes('U19') || kat.includes('PAF')) return "Denetçi"
    if (kat.includes('GELİŞİM') && (kat.includes('U13') || kat.includes('U14') || kat.includes('U15') || kat.includes('U16'))) return "Saha Komiseri / Denetçi"
    return "Saha Komiseri"
  }

  // ADMIN RAPOR KARTI
  const renderAdminRaporKarti = (mac: any) => {
    const komiserIsim = komiserler.find(k => k.komiser_id === mac.komiser_id)?.ad_soyad || "Bilinmiyor";
    
    let borderRenk = 'border-slate-400';
    let olayRenk = 'bg-slate-100 text-slate-800 border-slate-400';
    const olayBaslik = olayDurumEtiketi(mac.olay_durumu);
    
    if (mac.olay_durumu === 'emniyetlik_olay') {
      borderRenk = 'border-red-600';
      olayRenk = 'bg-red-100 text-red-800 border-red-500';
    } else if (mac.olay_durumu === 'teknik_olay') {
      borderRenk = 'border-amber-500';
      olayRenk = 'bg-amber-100 text-amber-800 border-amber-500';
    } else if (mac.olay_durumu === 'hava_muhalefeti' || mac.olay_durumu === 'saha_sorunu' || mac.mac_durumu === 'takimlar_cikmadi') {
      borderRenk = 'border-slate-500';
      olayRenk = 'bg-slate-700 text-white border-slate-800';
    } else {
      borderRenk = 'border-green-500';
      olayRenk = 'bg-green-100 text-green-800 border-green-500';
    }

    return (
      <div className="bg-slate-200 p-4 rounded-b-xl border-t border-slate-700 animate-fade-in-down">
        <div className={`bg-white border-2 ${borderRenk} shadow-md rounded-xl p-4`}>
          
          <div className="flex justify-between items-start mb-3 border-b border-slate-200 pb-3">
            <span className="font-bold text-slate-800 text-lg md:text-xl">
              {mac?.ev_sahibi} <span className="text-slate-400 font-medium mx-1 text-base">vs</span> {mac?.misafir_takim}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm text-slate-700 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">Tarih & Saat</span>
              <span className="font-bold text-slate-800">{mac?.tarih ? new Date(mac.tarih).toLocaleDateString('tr-TR') : ""} - {mac?.saat ? mac.saat.substring(0, 5) : ""}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">Saha</span>
              <span className="font-bold text-slate-800">{mac?.saha}</span>
            </div>
            <div className="flex flex-col mt-2 pt-3 border-t border-slate-200">
              <span className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">Kategori / Lig</span>
              <span className="font-bold text-slate-800">{mac?.kategori_adi} <span className="text-xs font-normal text-slate-500 block sm:inline mt-1 sm:mt-0 sm:ml-1">(Kod: {mac?.mac_kodu})</span></span>
            </div>
            <div className="flex flex-col mt-2 pt-3 border-t border-slate-200">
              <span className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">Atanan Görev</span>
              <span className="font-extrabold text-blue-700">{gorevTuruBelirle(mac?.kategori_adi, mac?.mac_kodu)}</span>
            </div>
            <div className="flex flex-col mt-2 pt-3 border-t border-slate-300 col-span-2 bg-white p-2 rounded border">
              <span className="text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-wider">Görevli Saha Komiseri</span>
              <span className="font-black text-slate-800 text-base">{komiserIsim}</span>
            </div>
          </div>

          <div className="bg-white border-2 border-slate-200 rounded-lg p-4">
            <div className="flex flex-col items-center mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Maç Durumu</span>
              <span className="border-2 border-slate-300 rounded-lg font-bold text-slate-700 py-2 px-6 bg-slate-50">
                {macDurumEtiketi(mac?.mac_durumu)}
              </span>
            </div>

            {mac?.mac_durumu === 'oynandi' && (
              <div className="flex items-center justify-between gap-4 max-w-sm mx-auto mb-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex-1 text-center">
                  <span className="block text-[10px] font-bold text-slate-500 mb-1 truncate">{mac?.ev_sahibi}</span>
                  <span className="text-3xl font-black text-slate-800">{mac?.ev_sahibi_skor}</span>
                </div>
                <span className="text-3xl font-black text-slate-300">-</span>
                <div className="flex-1 text-center">
                  <span className="block text-[10px] font-bold text-slate-500 mb-1 truncate">{mac?.misafir_takim}</span>
                  <span className="text-3xl font-black text-slate-800">{mac?.misafir_skor}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col items-center mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Saha Olayları</span>
              <span className={`px-6 py-2 rounded-lg font-bold border-2 ${olayRenk}`}>
                {olayBaslik}
              </span>
            </div>

            {mac?.olay_durumu !== 'olaysiz' && (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <span className="text-xs font-bold text-red-500 uppercase tracking-wider block mb-2">Görevli Komiser Tutanağı:</span>
                <p className="bg-red-50 text-red-800 p-3 rounded-lg border border-red-200 font-serif italic text-sm">
                  "{mac?.rapor_notu || 'Açıklama girilmedi.'}"
                </p>
              </div>
            )}
            
            {mac?.olay_durumu === 'olaysiz' && mac?.rapor_notu && (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Ek Not:</span>
                <p className="bg-slate-50 text-slate-700 p-3 rounded-lg border border-slate-200 font-serif italic text-sm">
                  "{mac?.rapor_notu}"
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    )
  }

  // ORJİNAL GÖREV KARTI (RADAR)
  const renderOrjinalGorevKarti = (mac: any) => (
    <div className="bg-white border-l-4 border-blue-800 shadow-md rounded-r-xl p-4 mb-3">
      <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
        <span className="font-bold text-blue-950 text-lg md:text-xl">
          {mac?.ev_sahibi} <span className="text-slate-400 font-medium mx-1 text-base">vs</span> {mac?.misafir_takim}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm text-slate-700 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
        <div className="flex flex-col">
          <span className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">Tarih & Saat</span>
          <span className="font-bold text-slate-800">{mac?.tarih ? new Date(mac.tarih).toLocaleDateString('tr-TR') : ""} - {mac?.saat ? mac.saat.substring(0, 5) : ""}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">Saha</span>
          <span className="font-bold text-slate-800">{mac?.saha}</span>
        </div>
        <div className="flex flex-col mt-2 pt-3 border-t border-slate-200">
          <span className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">Kategori / Lig</span>
          <span className="font-bold text-slate-800">{mac?.kategori_adi} <span className="text-xs font-normal text-slate-500 block sm:inline mt-1 sm:mt-0 sm:ml-1">(Kod: {mac?.mac_kodu})</span></span>
        </div>
        <div className="flex flex-col mt-2 pt-3 border-t border-slate-200">
          <span className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">Atanan Görev</span>
          <span className="font-extrabold text-blue-700">{gorevTuruBelirle(mac?.kategori_adi, mac?.mac_kodu)}</span>
        </div>
      </div>
    </div>
  )

  if (!yetkili) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-lg shadow-2xl w-full max-w-sm border border-slate-700 text-center">
          <h1 className="text-2xl font-black text-white mb-2 tracking-widest">KARARGAH</h1>
          <form onSubmit={girisYap} className="space-y-4">
            <input type="password" value={sifre} onChange={(e) => setSifre(e.target.value)} className="w-full bg-slate-900 border-2 border-slate-700 rounded p-3 text-center text-white text-xl tracking-widest font-mono" placeholder="PIN KODU" />
            <button type="submit" className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded uppercase tracking-wider">Giriş Yap</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-6 bg-slate-800 p-6 rounded-t-md border border-slate-700 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-30 flex flex-col items-end">
            <span className="relative flex h-3 w-3 mb-1"><span className="animate-ping absolute inline-flex h-full w-full rounded bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded h-3 w-3 bg-blue-500"></span></span>
            <span className="text-[9px] font-mono text-blue-500 uppercase tracking-widest">WEB SOCKET CANLI</span>
          </div>
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3"><span className="bg-red-700 text-white px-3 py-1 rounded text-xl shadow-lg">RADAR</span>Operasyon Merkezi</h1>
            <p className="text-slate-400 mt-1 flex items-center gap-2">İzmir Saha Komiserleri Canlı Takip Ekranı</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0 z-10">
            <button onClick={cikisYap} className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-2 px-4 rounded flex items-center justify-center gap-2 shadow transition-colors text-sm border border-slate-600">Güvenli Çıkış</button>
            <button onClick={() => veriCek(false)} className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-6 rounded flex items-center justify-center gap-2 shadow-lg transition-all">{yukleniyor ? 'İndiriliyor...' : 'Manuel Kontrol'}</button>
          </div>
        </header>

        {/* 3 ANA SEÇENEKLİ ASKERİ NİZAM BUTONLARI */}
        <div className="flex bg-slate-800 border-x border-b border-slate-700 rounded-b-md mb-8 overflow-hidden shadow-lg">
          <button onClick={() => setAdminModu('radar')} className={`flex-1 py-4 font-black tracking-widest uppercase transition-colors text-xs md:text-sm ${adminModu === 'radar' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
            📡 CANLI RADAR ({globalAktifHaftaNo}. HAFTA)
          </button>
          <button onClick={() => setAdminModu('skorlar')} className={`flex-1 py-4 font-black tracking-widest uppercase transition-colors text-xs md:text-sm flex items-center justify-center gap-2 ${adminModu === 'skorlar' ? 'bg-red-700 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
            🚨 SAHA & SKOR RAPORLARI {toplamOlaySayisi > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded font-black animate-pulse">{toplamOlaySayisi} OLAY</span>}
          </button>
          <button onClick={() => setAdminModu('sicil')} className={`flex-1 py-4 font-black tracking-widest uppercase transition-colors text-xs md:text-sm ${adminModu === 'sicil' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
            📊 PERSONEL SİCİLİ
          </button>
        </div>

        {/* ========================================================================= */}
        {/* MOD 1: CANLI RADAR EKRANI */}
        {/* ========================================================================= */}
        {adminModu === 'radar' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-down">
            
            <div className="space-y-4">
              <div className="bg-slate-800 text-slate-300 px-4 py-2 rounded border border-slate-700 text-sm font-bold uppercase tracking-wider text-center flex flex-col gap-3">
                <span>Müsabaka Durumu (Hafta {globalAktifHaftaNo})</span>
                
                <input 
                  type="text" 
                  placeholder="Komiser Adı, ID, Takım veya Lig (Örn: U16) ile Ara..." 
                  value={radarArama}
                  onChange={(e) => setRadarArama(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 text-white px-3 py-2 rounded focus:outline-none focus:border-blue-500 transition-colors text-sm"
                />
              </div>

              {/* GÖREVİNİ ALMAYANLAR */}
              <div className={`bg-slate-800 rounded-md border shadow-lg overflow-hidden ${acikSolGrup === 'bekleyen' ? 'border-red-700' : 'border-slate-700'}`}>
                <button onClick={() => setAcikSolGrup(acikSolGrup === 'bekleyen' ? null : 'bekleyen')} className="w-full bg-red-700 hover:bg-red-800 p-4 flex justify-between items-center transition-colors">
                  <div className="flex items-center gap-3">
                    <h2 className="text-white font-bold text-lg tracking-wide uppercase">GÖREVİNİ ALMAYANLAR</h2>
                    <span className="bg-red-900 border border-red-500 text-white px-3 py-1 rounded shadow-inner text-sm font-bold">{bekleyenKomiserler.length} KİŞİ</span>
                  </div>
                  <span className="text-white text-xl">{acikSolGrup === 'bekleyen' ? '▲' : '▼'}</span>
                </button>
                
                {acikSolGrup === 'bekleyen' && (
                  <div className="p-3 max-h-[600px] overflow-y-auto space-y-2 bg-slate-900">
                    {bekleyenKomiserler.map(komiser => {
                      const acikMi = acikBekleyenId === komiser.id;
                      return (
                      <div key={komiser?.id} className={`rounded border transition-all ${acikMi ? 'bg-slate-800 border-red-500 shadow-md' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}>
                        <button onClick={() => setAcikBekleyenId(acikMi ? null : komiser.id)} className="w-full text-left p-3 flex justify-between items-center">
                          <div><h3 className={`font-bold text-base ${acikMi ? 'text-red-400' : 'text-slate-200'}`}>{komiser?.isim}</h3><span className="text-slate-500 font-mono text-xs">ID: {komiser?.id}</span></div>
                          <div className="flex items-center gap-3">
                            <span className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded font-bold border border-slate-600">{komiser.maclar.length} Maç</span>
                            <span className="text-slate-500">{acikMi ? '▲' : '▼'}</span>
                          </div>
                        </button>
                        {acikMi && (
                          <div className="p-4 bg-slate-800 border-t border-slate-700">
                            {komiser.maclar.map((mac: any) => (
                              <div key={mac?.id}>{renderOrjinalGorevKarti(mac)}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )})}
                    {bekleyenKomiserler.length === 0 && <div className="text-center p-6 text-slate-500 italic">{radarArama ? 'Aramanızla eşleşen görevli bulunamadı.' : 'Bekleyen görev bulunmuyor.'}</div>}
                  </div>
                )}
              </div>

              {/* GÖREVİNİ ALANLAR */}
              <div className={`bg-slate-800 rounded-md border shadow-lg overflow-hidden ${acikSolGrup === 'onayli' ? 'border-green-700' : 'border-slate-700'}`}>
                <button onClick={() => setAcikSolGrup(acikSolGrup === 'onayli' ? null : 'onayli')} className="w-full bg-green-700 hover:bg-green-800 p-4 flex justify-between items-center transition-colors">
                  <div className="flex items-center gap-3">
                    <h2 className="text-white font-bold text-lg tracking-wide uppercase">GÖREVİNİ ALANLAR</h2>
                    <span className="bg-green-900 border border-green-500 text-white px-3 py-1 rounded shadow-inner text-sm font-bold">{onayliKomiserler.length} KİŞİ</span>
                  </div>
                  <span className="text-white text-xl">{acikSolGrup === 'onayli' ? '▲' : '▼'}</span>
                </button>
                
                {acikSolGrup === 'onayli' && (
                  <div className="p-3 max-h-[400px] overflow-y-auto space-y-2 bg-slate-900">
                    {onayliKomiserler.map(komiser => {
                      const acikMi = acikOnayliId === komiser.id;
                      return (
                      <div key={komiser?.id} className={`rounded border transition-all ${acikMi ? 'bg-slate-800 border-green-500 shadow-md' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}>
                        <button onClick={() => setAcikOnayliId(acikMi ? null : komiser.id)} className="w-full text-left p-3 flex justify-between items-center">
                          <div><h3 className={`font-bold text-base ${acikMi ? 'text-green-400' : 'text-slate-200'}`}>{komiser?.isim}</h3></div>
                          <div className="flex items-center gap-3">
                            <span className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded font-bold border border-slate-600">{komiser.maclar.length} Maç</span>
                            <span className="text-slate-500">{acikMi ? '▲' : '▼'}</span>
                          </div>
                        </button>
                        {acikMi && (
                          <div className="p-4 bg-slate-800 border-t border-slate-700">
                            {komiser.maclar.map((mac: any) => (
                              <div key={mac?.id}>{renderOrjinalGorevKarti(mac)}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )})}
                    {onayliKomiserler.length === 0 && <div className="text-center p-6 text-slate-500 italic">{radarArama ? 'Aramanızla eşleşen görevli bulunamadı.' : 'Henüz tebellüğ eden yok.'}</div>}
                  </div>
                )}
              </div>
            </div>

            {/* SAĞ SÜTUN: MAZERET BİLDİRİMLERİ */}
            <div className="bg-slate-800 rounded-md border border-slate-700 overflow-hidden h-full shadow-lg flex flex-col">
              <div className="bg-black p-4 border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h2 className="text-white font-bold text-lg tracking-wide uppercase">MAZERET BİLDİRİMLERİ</h2>
                  <span className="bg-slate-800 text-amber-500 text-xs px-2 py-1 font-bold rounded border border-slate-600">Hedef Hafta: {hedefHafta}</span>
                </div>
                <span className="bg-slate-800 border border-slate-600 text-white px-3 py-1 rounded shadow-inner text-sm font-bold">{aktifMazeretler.length} / {komiserler.length}</span>
              </div>
              
              <div className="p-4 space-y-4 overflow-y-auto flex-1 bg-slate-900">
                {/* 1: GÖREVE KAPALI */}
                <div className={`border rounded-md transition-all overflow-hidden ${acikSagGrup === 'kapali' ? 'border-red-500' : 'border-slate-700'}`}>
                  <button onClick={() => setAcikSagGrup(acikSagGrup === 'kapali' ? null : 'kapali')} className="w-full bg-slate-800 hover:bg-slate-700 p-3 flex justify-between items-center transition-colors">
                    <div className="flex items-center gap-3"><span className="text-red-400 font-bold text-base uppercase">Göreve Kapalı Olanlar</span><span className="bg-slate-900 border border-slate-600 text-slate-300 px-2 py-0.5 rounded text-xs font-bold">{goreveKapaliList.length}</span></div>
                    <span className="text-slate-400">{acikSagGrup === 'kapali' ? '▲' : '▼'}</span>
                  </button>
                  {acikSagGrup === 'kapali' && (
                    <div className="p-2 bg-slate-900 space-y-2">
                      {goreveKapaliList.map(m => (
                        <div key={m.id} className="p-3 bg-slate-800 rounded border border-slate-700 flex justify-between items-center">
                          <span className="font-bold text-slate-200">{komiserler.find(k => k.komiser_id === m.komiser_id)?.ad_soyad}</span>
                          <span className="text-red-500 text-xs font-bold uppercase">KAPALI</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2: 7/24 */}
                <div className={`border rounded-md transition-all overflow-hidden ${acikSagGrup === '724' ? 'border-green-500' : 'border-slate-700'}`}>
                  <button onClick={() => setAcikSagGrup(acikSagGrup === '724' ? null : '724')} className="w-full bg-slate-800 hover:bg-slate-700 p-3 flex justify-between items-center transition-colors">
                    <div className="flex items-center gap-3"><span className="text-green-400 font-bold text-base uppercase">Tüm Hafta Müsait (7/24)</span><span className="bg-slate-900 border border-slate-600 text-slate-300 px-2 py-0.5 rounded text-xs font-bold">{tamMusaitList.length}</span></div>
                    <span className="text-slate-400">{acikSagGrup === '724' ? '▲' : '▼'}</span>
                  </button>
                  {acikSagGrup === '724' && (
                    <div className="p-2 bg-slate-900 space-y-2">
                      {tamMusaitList.map(m => (
                        <div key={m.id} className="p-3 bg-slate-800 rounded border border-slate-700 flex justify-between items-center">
                          <span className="font-bold text-slate-200">{komiserler.find(k => k.komiser_id === m.komiser_id)?.ad_soyad}</span>
                          <span className="text-green-400 text-xs font-bold">7/24</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3: SEÇMELİ */}
                <div className={`border rounded-md transition-all overflow-hidden ${acikSagGrup === 'secmeli' ? 'border-blue-500' : 'border-slate-700'}`}>
                  <button onClick={() => setAcikSagGrup(acikSagGrup === 'secmeli' ? null : 'secmeli')} className="w-full bg-slate-800 hover:bg-slate-700 p-3 flex justify-between items-center transition-colors">
                    <div className="flex items-center gap-3"><span className="text-blue-400 font-bold text-base uppercase">Seçmeli Müsaitlik Bildirenler</span><span className="bg-slate-900 border border-slate-600 text-slate-300 px-2 py-0.5 rounded text-xs font-bold">{secmeliList.length}</span></div>
                    <span className="text-slate-400">{acikSagGrup === 'secmeli' ? '▲' : '▼'}</span>
                  </button>
                  {acikSagGrup === 'secmeli' && (
                    <div className="p-2 bg-slate-900 space-y-2">
                      {secmeliList.map(m => (
                        <div key={m.id} className="p-3 bg-slate-800 rounded border border-slate-700 flex justify-between items-center">
                          <span className="font-bold text-slate-200">{komiserler.find(k => k.komiser_id === m.komiser_id)?.ad_soyad}</span>
                          <span className="text-blue-400 text-xs font-bold">SEÇMELİ</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4: BİLDİRMEYENLER */}
                <div className={`border rounded-md transition-all overflow-hidden ${acikSagGrup === 'bildirmeyen' ? 'border-slate-500' : 'border-slate-700'}`}>
                  <button onClick={() => setAcikSagGrup(acikSagGrup === 'bildirmeyen' ? null : 'bildirmeyen')} className="w-full bg-slate-800 hover:bg-slate-700 p-3 flex justify-between items-center transition-colors">
                    <div className="flex items-center gap-3"><span className="text-slate-300 font-bold text-base uppercase">Mazeret Bildirmeyenler</span><span className="bg-slate-900 border border-slate-600 text-slate-300 px-2 py-0.5 rounded text-xs font-bold">{bildirmeyenList.length}</span></div>
                    <span className="text-slate-400">{acikSagGrup === 'bildirmeyen' ? '▲' : '▼'}</span>
                  </button>
                  {acikSagGrup === 'bildirmeyen' && (
                    <div className="p-2 bg-slate-900 space-y-2">
                      {bildirmeyenList.map(k => (
                        <div key={k.komiser_id} className="p-3 bg-slate-800 rounded flex justify-between border border-slate-700"><span className="font-bold text-slate-300">{k.ad_soyad}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MOD 2: SAHA & SKOR RAPORLARI */}
        {/* ========================================================================= */}
        {adminModu === 'skorlar' && (
          <div className="space-y-8 animate-fade-in-down">
            
            {/* 1. BÖLÜM: KIRMIZI BÖLGE (EMNİYETLİK OLAYLAR) */}
            {emniyetlikMaclar.length > 0 && (
              <div className="bg-red-950/40 border-2 border-red-600 rounded-xl p-4 md:p-6 shadow-2xl shadow-red-900/30">
                <div className="flex items-center justify-between border-b-2 border-red-800/80 pb-3 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl md:text-4xl animate-pulse">🚨</span>
                    <div>
                      <h2 className="text-xl md:text-2xl font-black text-red-500 tracking-wider uppercase">EMNİYETLİK OLAYLAR</h2>
                      <p className="text-red-400 text-xs mt-1">Kavga, sahaya girme, müsabaka görevlilerine mukavemet</p>
                    </div>
                  </div>
                  <span className="bg-red-600 text-white font-black px-4 py-1.5 rounded-full text-sm md:text-base shadow-lg animate-pulse">{emniyetlikMaclar.length} VUKUAT</span>
                </div>

                <div className="space-y-4">
                  {emniyetlikMaclar.map(mac => {
                    const acikMi = acikRaporId === mac.id;
                    const komiserIsim = komiserler.find(k => k.komiser_id === mac.komiser_id)?.ad_soyad || "Komiser Atanmadı";
                    return (
                      <div key={mac.id} className={`rounded-xl overflow-hidden transition-all ${acikMi ? 'ring-2 ring-red-500 shadow-lg shadow-red-900/50' : 'border border-red-900/50 hover:border-red-500/80'}`}>
                        <button onClick={() => setAcikRaporId(acikMi ? null : mac.id)} className="w-full bg-slate-900 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                          <div className="text-left">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="bg-red-900/50 text-red-400 border border-red-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase">EMNİYETLİK</span>
                              <span className="text-slate-500 text-[10px] font-bold uppercase">{mac.saha}</span>
                            </div>
                            <span className="font-bold text-slate-200 text-base md:text-lg block mb-1">{mac.ev_sahibi} vs {mac.misafir_takim}</span>
                            <div className="flex flex-col gap-1">
                              <span className="text-red-400 font-semibold text-[10px] uppercase tracking-wider">{mac.kategori_adi}</span>
                              <span className="text-slate-400 text-[10px] uppercase">Komiser: <strong className="text-slate-200">{komiserIsim}</strong></span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end mt-2 md:mt-0">
                            <span className="font-black text-red-500 text-lg md:text-xl px-3">{mac.mac_durumu === 'oynandi' ? `${mac.ev_sahibi_skor} - ${mac.misafir_skor}` : macDurumEtiketi(mac.mac_durumu)}</span>
                            <span className="text-slate-500">{acikMi ? '▲' : '▼'}</span>
                          </div>
                        </button>
                        {acikMi && renderAdminRaporKarti(mac)}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 2. BÖLÜM: TURUNCU BÖLGE (TEKNİK OLAYLAR VE SAHA SORUNLARI) */}
            {teknikOlayMaclar.length > 0 && (
              <div className="bg-amber-950/30 border-2 border-amber-600/60 rounded-xl p-4 md:p-6 shadow-xl shadow-amber-900/10">
                <div className="flex items-center justify-between border-b-2 border-amber-800/50 pb-3 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl md:text-4xl">⚠️</span>
                    <div>
                      <h2 className="text-xl md:text-2xl font-black text-amber-500 tracking-wider uppercase">DİĞER OLAYLAR (TEKNİK / SAHA)</h2>
                      <p className="text-amber-400/80 text-xs mt-1">İhraç, itiraz, hava muhalefeti, takım çıkmadı vb.</p>
                    </div>
                  </div>
                  <span className="bg-amber-600 text-slate-900 font-black px-4 py-1.5 rounded-full text-sm md:text-base shadow-lg">{teknikOlayMaclar.length} RAPOR</span>
                </div>

                <div className="space-y-4">
                  {teknikOlayMaclar.map(mac => {
                    const acikMi = acikRaporId === mac.id;
                    const komiserIsim = komiserler.find(k => k.komiser_id === mac.komiser_id)?.ad_soyad || "Komiser Atanmadı";
                    
                    let etiket = 'TEKNİK OLAY';
                    if (mac.olay_durumu === 'hava_muhalefeti') etiket = 'HAVA MUHALEFETİ';
                    if (mac.olay_durumu === 'saha_sorunu') etiket = 'SAHA SORUNU';
                    if (mac.mac_durumu === 'takimlar_cikmadi') etiket = 'TAKIM ÇIKMADI';

                    return (
                      <div key={mac.id} className={`rounded-xl overflow-hidden transition-all ${acikMi ? 'ring-2 ring-amber-500 shadow-lg shadow-amber-900/30' : 'border border-amber-900/30 hover:border-amber-600/60'}`}>
                        <button onClick={() => setAcikRaporId(acikMi ? null : mac.id)} className="w-full bg-slate-900 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                          <div className="text-left">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="bg-amber-900/40 text-amber-500 border border-amber-800/50 text-[10px] px-2 py-0.5 rounded font-bold uppercase">{etiket}</span>
                              <span className="text-slate-500 text-[10px] font-bold uppercase">{mac.saha}</span>
                            </div>
                            <span className="font-bold text-slate-200 text-base md:text-lg block mb-1">{mac.ev_sahibi} vs {mac.misafir_takim}</span>
                            <div className="flex flex-col gap-1">
                              <span className="text-amber-400/80 font-semibold text-[10px] uppercase tracking-wider">{mac.kategori_adi}</span>
                              <span className="text-slate-400 text-[10px] uppercase">Komiser: <strong className="text-slate-200">{komiserIsim}</strong></span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end mt-2 md:mt-0">
                            <span className="font-black text-amber-500 text-lg md:text-xl px-3">{mac.mac_durumu === 'oynandi' ? `${mac.ev_sahibi_skor} - ${mac.misafir_skor}` : macDurumEtiketi(mac.mac_durumu)}</span>
                            <span className="text-slate-500">{acikMi ? '▲' : '▼'}</span>
                          </div>
                        </button>
                        {acikMi && renderAdminRaporKarti(mac)}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* OLAY YOKSA TEMİZ BİLGİSİ */}
            {toplamOlaySayisi === 0 && (
              <div className="text-center py-10 border-2 border-green-800/50 text-green-500 font-bold bg-green-950/20 rounded-xl shadow-lg">
                <span className="text-5xl block mb-4">🛡️</span>
                <p className="text-xl">Bu hafta hiçbir maçta olay veya vukuat bildirilmedi.</p>
                <p className="text-sm mt-2 opacity-80">İzmir Karargahı tam kontrol altında!</p>
              </div>
            )}

            {/* 3. BÖLÜM: OLAYSIZLAR VE BEKLEYENLER */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
              
              {/* OLAYSIZ BİTEN MAÇLAR */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
                <div className="bg-green-950/40 p-4 border-b border-green-800/50 flex justify-between items-center">
                  <h3 className="text-green-400 font-bold text-base uppercase flex items-center gap-2"><span className="text-xl">✓</span> OLAYSIZ MÜSABAKALAR</h3>
                  <span className="bg-green-600 text-white font-bold px-3 py-1 rounded text-xs">{olaysizMaclar.length} Maç</span>
                </div>
                
                <div className="p-4 max-h-[500px] overflow-y-auto space-y-3 bg-slate-900">
                  {olaysizMaclar.length === 0 && <p className="text-slate-500 text-center italic py-4">Henüz olaysız biten maç raporu gelmedi.</p>}
                  {olaysizMaclar.map(mac => {
                    const acikMi = acikRaporId === mac.id;
                    const komiserIsim = komiserler.find(k => k.komiser_id === mac.komiser_id)?.ad_soyad || "Komiser Atanmadı";
                    return (
                      <div key={mac.id} className={`rounded-lg overflow-hidden transition-all ${acikMi ? 'ring-1 ring-green-500 shadow-md shadow-green-900/20' : 'border border-slate-700 hover:border-slate-500'}`}>
                        <button onClick={() => setAcikRaporId(acikMi ? null : mac.id)} className="w-full bg-slate-800 border-l-4 border-green-500 p-3 flex justify-between items-center text-left">
                          <div className="flex-1 pr-2">
                            <span className="font-bold text-slate-200 text-sm block mb-1">{mac.ev_sahibi} vs {mac.misafir_takim}</span>
                            <div className="flex flex-col gap-0.5">
                               <span className="text-green-400/80 text-[9px] uppercase font-bold tracking-wider">{mac.kategori_adi}</span>
                               <span className="text-slate-500 text-[9px] uppercase font-bold">{mac.saha}</span>
                               <span className="text-slate-400 text-[10px] uppercase mt-1">Komiser: <strong className="text-slate-300">{komiserIsim}</strong></span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="bg-slate-900 text-green-400 px-3 py-1 rounded font-black text-sm border border-slate-700">{mac.mac_durumu === 'oynandi' ? `${mac.ev_sahibi_skor} - ${mac.misafir_skor}` : macDurumEtiketi(mac.mac_durumu)}</span>
                            <span className="text-slate-500 text-xs">{acikMi ? '▲' : '▼'}</span>
                          </div>
                        </button>
                        {acikMi && renderAdminRaporKarti(mac)}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* RAPORU BEKLENEN MAÇLAR */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
                <div className="bg-slate-700 p-4 border-b border-slate-600 flex justify-between items-center">
                  <h3 className="text-slate-300 font-bold text-base uppercase flex items-center gap-2"><span className="text-xl">⏳</span> RAPOR BEKLENENLER</h3>
                  <span className="bg-slate-800 text-slate-300 font-bold px-3 py-1 rounded text-xs">{bekleyenRaporlar.length} Maç</span>
                </div>
                
                <div className="p-4 max-h-[500px] overflow-y-auto space-y-3 bg-slate-900">
                  {bekleyenRaporlar.length === 0 && <p className="text-green-500 text-center font-bold py-4">Tüm maçların skor raporları ulaştı!</p>}
                  {bekleyenRaporlar.map(mac => {
                    const komiserIsim = komiserler.find(k => k.komiser_id === mac.komiser_id)?.ad_soyad || "Komiser Atanmadı";
                    return (
                      <div key={mac.id} className="bg-slate-800 border-l-2 border-slate-600 p-3 rounded flex justify-between items-center opacity-80">
                        <div>
                          <p className="font-bold text-slate-300 text-sm mb-1">{mac.ev_sahibi} vs {mac.misafir_takim}</p>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-blue-400/80 text-[9px] uppercase font-bold tracking-wider">{mac.kategori_adi}</span>
                            <span className="text-slate-500 text-[10px] uppercase font-bold">{mac.saha}</span>
                            <span className="text-slate-400 text-[10px] uppercase mt-1">Görevli: <strong className="text-slate-300">{komiserIsim}</strong></span>
                          </div>
                        </div>
                        <span className="bg-slate-900 border border-slate-700 text-slate-400 text-[10px] px-2 py-1 rounded uppercase font-bold ml-2">BEKLİYOR</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* MOD 3: PERSONEL SİCİL VE İSTATİSTİKLERİ */}
        {/* ========================================================================= */}
        {adminModu === 'sicil' && (
          <div className="bg-slate-800 border border-slate-700 rounded-md shadow-lg p-6 animate-fade-in-down">
            <h2 className="text-2xl font-black text-amber-400 mb-6 uppercase tracking-wider border-b border-slate-700 pb-4">
              PERSONEL İSTİHBARAT VE SİCİL ARŞİVİ
            </h2>
            
            <div className="space-y-4 max-h-[800px] overflow-y-auto">
              {komiserler.map(komiser => {
                const komiserinTumMaclari = tumMaclar.filter(m => m.komiser_id === komiser.komiser_id);
                const komiserinTumMazeretleri = mazeretler.filter(m => m.komiser_id === komiser.komiser_id).sort((a, b) => b.hafta_no - a.hafta_no);
                
                const toplamGorev = komiserinTumMaclari.length;
                const toplamKapali = komiserinTumMazeretleri.filter(m => m.komple_yok || m.detaylar?.mod === 'yok').length;
                const toplam724 = komiserinTumMazeretleri.filter(m => !m.komple_yok && m.detaylar?.mod === 'full').length;
                
                const acikMi = acikSicilId === komiser.komiser_id;

                return (
                  <div key={komiser.komiser_id} className="bg-slate-900 border border-slate-700 rounded-md overflow-hidden">
                    <button onClick={() => setAcikSicilId(acikMi ? null : komiser.komiser_id)} className="w-full text-left p-4 hover:bg-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-white text-lg">{komiser.ad_soyad}</h3>
                        <span className="text-slate-500 font-mono text-xs">ID: {komiser.komiser_id}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="bg-blue-900/50 border border-blue-500/50 text-blue-300 text-xs font-bold px-3 py-1 rounded">Toplam Görev: {toplamGorev}</span>
                        <span className="bg-red-900/50 border border-red-500/50 text-red-300 text-xs font-bold px-3 py-1 rounded">Kapalı: {toplamKapali}</span>
                        <span className="bg-green-900/50 border border-green-500/50 text-green-300 text-xs font-bold px-3 py-1 rounded">7/24: {toplam724}</span>
                        <span className="text-slate-400 ml-2">{acikMi ? '▲' : '▼'}</span>
                      </div>
                    </button>

                    {acikMi && (
                      <div className="p-4 bg-slate-800 border-t border-slate-700">
                        <h4 className="font-bold text-slate-400 text-xs uppercase mb-3 tracking-widest">Geçmiş Mazeret Arşivi</h4>
                        {komiserinTumMazeretleri.length === 0 ? (
                          <p className="text-slate-500 italic text-sm">Geçmiş mazeret bildirimi bulunmuyor.</p>
                        ) : (
                          <div className="space-y-2">
                            {komiserinTumMazeretleri.map(m => (
                              <div key={m.id} className="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-700">
                                <span className="text-amber-400 font-bold text-sm">{m.hafta_no}. Hafta</span>
                                <span className="text-slate-400 text-xs">{m.komple_yok ? 'GÖREVE KAPALI' : m.detaylar?.mod === 'full' ? '7/24 MÜSAİT' : 'SEÇMELİ'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}