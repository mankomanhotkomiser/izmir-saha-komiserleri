"use client"
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { toPng } from 'html-to-image' 

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
    
    if (kat.includes('GELİŞİM')) {
        const gelisimMatch = kat.match(/U\s*(\d{2})/);
        if (gelisimMatch) return `TFF U${gelisimMatch[1]} GELİŞİM LİGİ`;
        return 'TFF GELİŞİM LİGİ';
    }
    if (kat.includes('SÜPER AMATÖR')) return 'SÜPER AMATÖR LİG';
    if (kat.includes('1.') && kat.includes('AMATÖR')) return '1. AMATÖR LİG';
    
    if (kat.match(/U\s*(\d{2})/) && !kat.includes('PROF') && !kat.includes('KADIN') && !kat.includes('ELİT')) {
        const amatorMatch = kat.match(/U\s*(\d{2})/);
        if (amatorMatch) return `İZMİR U${amatorMatch[1]} LİGİ`;
    }
    
    return kat;
}

export default function AdminPage() {
  const [sifre, setSifre] = useState('')
  const [girisYapildi, setGirisYapildi] = useState(false)
  const [hata, setHatasi] = useState('')
  
  const [tumMaclar, setTumMaclar] = useState<any[]>([])
  const [sezonlukMaclar, setSezonlukMaclar] = useState<any[]>([]) 
  const [tumKomiserler, setTumKomiserler] = useState<any[]>([])
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

  const guvenliTarih = (tarihMetni: string | null | undefined) => {
    if (!tarihMetni) return "-";
    try { return new Date(tarihMetni).toLocaleDateString('tr-TR'); } 
    catch (e) { return tarihMetni; }
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
        const timestamp = d.getTime();
        return isNaN(timestamp) ? 0 : timestamp;
    } catch (e) { return 0; }
  };

  const siralamaFiltresi = (a: any, b: any) => getZaman(a) - getZaman(b);

  useEffect(() => {
    if (girisYapildi) { veriGetir() }
  }, [girisYapildi])

  const veriGetir = async () => {
    setYukleniyor(true)
    try {
      let maclarVerisi: any[] = []
      let sayfa = 0
      const limit = 1000
      let veriKaldimi = true

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

      if (maclarVerisi.length > 0) {
        const cumalar = maclarVerisi.map(mac => mac?.tarih ? cumaBul(mac.tarih) : 0).filter(t => t > 0)
        const essizCumalar = Array.from(new Set(cumalar)).sort((a, b) => a - b)
        if(essizCumalar.length > 0) {
            const aktifHaftaNo = essizCumalar.length
            setGlobalAktifHaftaNo(aktifHaftaNo)
            const aktifCumaTarihi = essizCumalar[essizCumalar.length - 1]
            const aktifHaftaMaclari = maclarVerisi.filter(mac => mac?.tarih && cumaBul(mac.tarih) === aktifCumaTarihi)
            
            aktifHaftaMaclari.sort(siralamaFiltresi);
            setTumMaclar(aktifHaftaMaclari)
        }
      }
    } catch (err) { console.error("Veri çekme hatası", err) }
    setYukleniyor(false)
  }

  const komiserIsmiBul = (id: any) => {
    const komiser = tumKomiserler.find(k => String(k.komiser_id) === String(id))
    return komiser ? komiser.ad_soyad : 'Atanmamış'
  }

  const toggleMac = (id: number) => {
    setAcikMacId(acikMacId === id ? null : id)
    setAcikTffMacId(null) 
  }

  const toggleTff = (id: number) => {
    setAcikTffMacId(acikTffMacId === id ? null : id)
  }

  const tffTutanakIndir = async (mac: any) => {
    const element = document.getElementById(`admin-tff-form-${mac.id}`);
    if (element) {
      try {
        const style = document.createElement('style');
        style.innerHTML = '.tff-no-print { display: none !important; }';
        document.head.appendChild(style);

        const dataURL = await toPng(element, { backgroundColor: '#ffffff', pixelRatio: 2, cacheBust: true, style: { fontFamily: 'sans-serif' } });
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

  if (!girisYapildi) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700">
          <div className="text-center mb-8">
            <span className="text-5xl block mb-4">🛡️</span>
            <h1 className="text-2xl font-black text-white tracking-widest uppercase">OPERASYON MERKEZİ GİRİŞİ</h1>
            <p className="text-slate-400 text-sm mt-2">Sadece yetkili personel erişebilir.</p>
          </div>
          <form onSubmit={girisKontrol} className="space-y-6">
            <div>
              <input type="password" value={sifre} onChange={(e) => setSifre(e.target.value)} className="w-full bg-slate-900 text-white border border-slate-600 rounded-lg px-4 py-3 text-center tracking-[0.5em] font-mono text-xl focus:outline-none focus:border-red-500 transition-colors" placeholder="••••" />
            </div>
            {hata && <p className="text-red-500 text-sm font-bold text-center">{hata}</p>}
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors tracking-widest">GİRİŞ YAP</button>
          </form>
          <div className="mt-6 text-center">
            <Link href="/" className="text-slate-500 hover:text-slate-300 text-sm underline transition-colors">Saha Komiseri Portalına Dön</Link>
          </div>
        </div>
      </div>
    )
  }

  const emniyetlikMaclar = tumMaclar.filter(m => m.skor_girildi && m.olay_durumu === 'emniyetlik_olay')
  const teknikMaclar = tumMaclar.filter(m => m.skor_girildi && (m.olay_durumu === 'teknik_olay' || m.olay_durumu === 'hava_muhalefeti' || m.olay_durumu === 'saha_sorunu'))
  const olaysizMaclar = tumMaclar.filter(m => m.skor_girildi && m.olay_durumu === 'olaysiz')
  const bekleyenMaclar = tumMaclar.filter(m => m.tebellug_edildi && !m.skor_girildi)

  // DEVRİM: KOMİSER BAZLI TEBELLÜĞ LİSTESİ OLUŞTURUCU
  const tebellugBekleyenKomiserler = Array.from(
    tumMaclar.filter(m => !m.tebellug_edildi)
    .reduce((map, mac) => {
        if (!map.has(mac.komiser_id)) {
            map.set(mac.komiser_id, { id: mac.komiser_id, isim: komiserIsmiBul(mac.komiser_id), count: 0 });
        }
        map.get(mac.komiser_id).count++;
        return map;
    }, new Map())
    .values()
  ).sort((a: any, b: any) => a.isim.localeCompare(b.isim, 'tr-TR'));

  const RaporDurumKarti = ({ mac, tip }: { mac: any, tip: 'emniyet' | 'teknik' | 'olaysiz' | 'bekleyen' }) => {
    let renkSiniflari = { bg: "bg-slate-800", border: "border-slate-700", text: "text-slate-300", badge: "bg-slate-700 text-slate-300" };
    
    if (tip === 'emniyet') { 
        renkSiniflari = { bg: "bg-red-950/20", border: "border-red-600", text: "text-red-500", badge: "bg-red-600 text-white" };
    } else if (tip === 'teknik') { 
        renkSiniflari = { bg: "bg-amber-950/20", border: "border-amber-500", text: "text-amber-500", badge: "bg-amber-600 text-white" };
    } else if (tip === 'olaysiz') {
        renkSiniflari = { bg: "bg-slate-800/80", border: "border-slate-700", text: "text-slate-300", badge: "bg-slate-900 text-white" };
    }

    const isAcik = acikMacId === mac.id;
    const isTffAcik = acikTffMacId === mac.id;

    const safeRaporDetay = mac.tff_rapor_detaylari || {};
    const ihracEvListesi = Array.isArray(safeRaporDetay.ihrac_ev) ? safeRaporDetay.ihrac_ev : [];
    const ihracMisListesi = Array.isArray(safeRaporDetay.ihrac_mis) ? safeRaporDetay.ihrac_mis : [];
    const hesaplananMaxSatir = Math.max(ihracEvListesi.length, ihracMisListesi.length);
    const maxSatir = (isNaN(hesaplananMaxSatir) || hesaplananMaxSatir < 0) ? 0 : hesaplananMaxSatir;

    const komiserTamIsim = komiserIsmiBul(mac.komiser_id);
    const komiserIlkIsim = typeof komiserTamIsim === 'string' ? komiserTamIsim.split(' ')[0] : 'KOMİSER';

    return (
      <div className={`mb-3 rounded-xl border-l-4 overflow-hidden shadow-md transition-all ${renkSiniflari.border}`}>
        <button onClick={() => toggleMac(mac.id)} className={`w-full text-left p-4 flex justify-between items-center ${renkSiniflari.bg} hover:brightness-125 transition-all focus:outline-none`}>
            
            <div className="flex-1 pr-4">
                <div className="flex items-center flex-wrap gap-2 mb-2">
                  {tip !== 'olaysiz' && tip !== 'bekleyen' && (
                      <span className={`${renkSiniflari.badge} text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider`}>
                          {tip === 'emniyet' ? 'EMNİYETLİK' : (mac.olay_durumu || '').replace('_', ' ')}
                      </span>
                  )}
                  <span className="text-blue-400 text-[10px] font-bold uppercase tracking-wider">{mac.kategori_adi}</span>
                  
                  {mac.tebellug_edildi ? (
                      <span className="text-[9px] bg-emerald-900/30 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ml-1">✓ TEBELLÜĞ EDİLDİ</span>
                  ) : (
                      <span className="text-[9px] bg-purple-900/40 text-purple-300 border border-purple-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ml-1 animate-pulse">⏳ TEBELLÜĞ BEKLİYOR</span>
                  )}

                </div>
                <h3 className="font-bold text-sm md:text-base text-white leading-tight mb-1">
                    {mac.ev_sahibi} <span className="text-slate-500 mx-1 text-xs">vs</span> {mac.misafir_takim}
                </h3>
                <div className="text-[10px] text-slate-400 font-mono leading-snug mt-2">
                    {mac.saha} <br/> 
                    <span className="text-blue-300">{guvenliTarih(mac.tarih)} - {mac.saat?.substring(0,5)}</span>
                </div>
            </div>

            <div className="flex flex-col items-end pl-2">
                {mac.skor_girildi ? (
                    mac.mac_durumu === 'oynandi' ? (
                        <div className="text-xl font-black tracking-widest text-white bg-slate-900 px-3 py-1 rounded border border-slate-700 shadow-inner mb-2">
                            {mac.ev_sahibi_skor} - {mac.misafir_skor}
                        </div>
                    ) : (
                        <div className="text-[10px] font-bold text-amber-400 uppercase text-right bg-slate-900 px-2 py-1 rounded border border-slate-700 mb-2">
                            {(mac.mac_durumu || '').replace(/_/g, ' ')}
                        </div>
                    )
                ) : (
                    <div className="text-[10px] font-bold text-slate-500 uppercase bg-slate-900 px-2 py-1 rounded border border-slate-700 mb-2">
                        RAPOR BEKLİYOR
                    </div>
                )}
                <span className="text-slate-500 text-lg leading-none">{isAcik ? '▲' : '▼'}</span>
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
                                <button 
                                    onClick={() => toggleTff(mac.id)} 
                                    className="w-full bg-blue-900/30 hover:bg-blue-900/50 border-b border-slate-700 p-3 flex items-center justify-between transition-colors focus:outline-none"
                                >
                                    <span className="text-blue-400 text-xs font-bold flex items-center gap-2"><span className="text-lg">📄</span> DETAYLI TFF RAPORU EKLENMİŞ</span>
                                    <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded shadow-inner">{isTffAcik ? 'Gizle ▲' : 'Görüntüle / İndir ▼'}</span>
                                </button>
                                
                                {isTffAcik && (
                                    <div className="p-4 overflow-x-auto bg-slate-300">
                                        
                                        <div id={`admin-tff-form-${mac.id}`} className="min-w-[700px] max-w-4xl w-full bg-white p-6 border-2 border-black relative font-sans text-black shadow-sm mx-auto">
                                          <div className="border-[3px] border-double border-slate-600 p-4">
                                              
                                              <div className="flex flex-col items-center mb-6 relative">
                                                  {/* WIKIPEDIA LOGOSU EKLENDİ VE CORS HATASI ÇÖZÜLDÜ */}
                                                  <img src="https://upload.wikimedia.org/wikipedia/tr/b/b8/T%C3%BCrkiye_Futbol_Federasyonu_logo.png" alt="TFF" crossOrigin="anonymous" className="h-16 w-auto mb-2 drop-shadow-md" />
                                                  <div className="text-[10px] font-black tracking-widest text-[#E30A17] mb-1">TFF</div>
                                                  <h2 className="font-extrabold text-xl md:text-2xl uppercase tracking-widest mt-1">TÜRKİYE FUTBOL FEDERASYONU</h2>
                                                  <h3 className="font-bold text-lg md:text-xl uppercase mt-1">SAHA KOMİSERİ RAPORU</h3>
                                              </div>

                                              <div className="grid grid-cols-2 gap-0 border border-black mb-6">
                                                  <div className="border-r border-black p-2 flex flex-col justify-center border-b border-dashed">
                                                      <div className="flex items-center gap-2"><span className="text-[10px] font-bold">MÜSABAKANIN YAPILDIĞI YER:</span> <span className="font-black text-xl tracking-wider">İZMİR</span></div>
                                                  </div>
                                                  <div className="p-2 border-b border-dashed border-black">
                                                      <div className="flex justify-between items-center"><span className="text-[10px] font-bold">MÜSABAKA NO:</span> <span className="font-bold text-sm uppercase">{mac?.mac_kodu || '-'}</span></div>
                                                  </div>
                                                  <div className="p-2 border-r border-b border-dashed border-black bg-slate-100/50 text-center font-bold text-xs">KARŞILAŞAN KULÜPLER</div>
                                                  <div className="p-2 border-b border-dashed border-black">
                                                      <div className="flex justify-between items-center"><span className="text-[10px] font-bold">STAD ADI:</span> <span className="font-bold text-xs uppercase text-right truncate w-3/4">{mac?.saha || '-'}</span></div>
                                                  </div>
                                                  
                                                  <div className="flex border-b border-dashed border-black border-r">
                                                    <div className="p-2 w-3/4 flex flex-col justify-center border-r border-dashed border-black">
                                                        <div className="flex gap-2"><span className="text-[10px] font-bold w-12">EV SAHİBİ:</span> <span className="font-bold text-xs uppercase truncate">{mac?.ev_sahibi || '-'}</span></div>
                                                    </div>
                                                    <div className="p-2 w-1/4 flex flex-col items-center justify-center bg-slate-100/30">
                                                        <span className="text-[10px] font-bold mb-1">SKOR</span>
                                                        <span className="font-black text-lg">{mac.ev_sahibi_skor !== null ? mac.ev_sahibi_skor : '-'}</span>
                                                    </div>
                                                  </div>
                                                  <div className="p-2 border-b border-dashed border-black">
                                                      <div className="flex justify-between items-center"><span className="text-[10px] font-bold">TARİH:</span> <span className="font-bold text-xs">{guvenliTarih(mac?.tarih)}</span></div>
                                                  </div>

                                                  <div className="flex border-b border-black border-r">
                                                    <div className="p-2 w-3/4 flex flex-col justify-center border-r border-dashed border-black">
                                                        <div className="flex gap-2"><span className="text-[10px] font-bold w-12">MİSAFİR:</span> <span className="font-bold text-xs uppercase truncate">{mac?.misafir_takim || '-'}</span></div>
                                                    </div>
                                                    <div className="p-2 w-1/4 flex flex-col items-center justify-center bg-slate-100/30">
                                                        <span className="font-black text-lg">{mac.misafir_skor !== null ? mac.misafir_skor : '-'}</span>
                                                    </div>
                                                  </div>
                                                  
                                                  <div className="flex flex-col border-b border-black">
                                                    <div className="p-2 flex justify-between items-center border-b border-dashed border-black">
                                                      <span className="text-[10px] font-bold">SAAT:</span> <span className="font-bold text-xs">{mac?.saat?.substring(0,5) || '-'}</span>
                                                    </div>
                                                    <div className="p-2 flex justify-between items-center">
                                                      <span className="text-[10px] font-bold">KATEGORİ:</span> <span className="font-bold text-[10px] text-right truncate w-2/3">{mac?.kategori_adi || '-'}</span>
                                                    </div>
                                                  </div>
                                              </div>

                                              <div className="grid grid-cols-2 gap-0 border border-black mb-6">
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

                                              <h3 className="text-center font-black tracking-widest text-sm mb-2 border-b-2 border-black w-32 mx-auto pb-1">İ H R A Ç L A R</h3>
                                              
                                              <div className="border border-black mb-6">
                                                  <div className="grid grid-cols-2 text-center text-xs font-bold border-b border-black">
                                                      <div className="p-1.5 border-r border-black bg-slate-100/50">EV SAHİBİ KULÜP</div>
                                                      <div className="p-1.5 bg-slate-100/50">MİSAFİR KULÜP</div>
                                                  </div>
                                                  <div className="grid grid-cols-2 text-center text-[10px] font-bold border-b border-black bg-slate-50">
                                                      <div className="grid grid-cols-12 border-r border-black">
                                                          <div className="col-span-2 p-1 border-r border-dashed border-black">FORMA NO</div>
                                                          <div className="col-span-7 p-1 border-r border-dashed border-black">ADI SOYADI</div>
                                                          <div className="col-span-3 p-1">LİSANS NO</div>
                                                      </div>
                                                      <div className="grid grid-cols-12">
                                                          <div className="col-span-2 p-1 border-r border-dashed border-black">FORMA NO</div>
                                                          <div className="col-span-7 p-1 border-r border-dashed border-black">ADI SOYADI</div>
                                                          <div className="col-span-3 p-1">LİSANS NO</div>
                                                      </div>
                                                  </div>
                                                  {Array.from({ length: maxSatir }).map((_, idx) => (
                                                      <div key={idx} className="grid grid-cols-2 text-center text-[11px] border-b border-dashed border-black last:border-b-0 group relative">
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

                                              <div className="mb-8">
                                                  <h3 className="font-bold text-xs text-center border-b border-black pb-1 mb-2 uppercase tracking-wide">SEYİRCİ TAŞKINLIKLARI, YÖNETİCİ VE FUTBOLCULARIN HAREKET VE TUTUMLARI</h3>
                                                  <textarea 
                                                      readOnly
                                                      value={safeRaporDetay?.tff_not || mac.rapor_notu || ''} 
                                                      className="w-full outline-none bg-transparent font-serif text-sm leading-relaxed resize-none overflow-hidden min-h-[150px] border border-dashed border-slate-300 p-2 pointer-events-none"
                                                  ></textarea>
                                              </div>

                                              <div className="flex justify-between items-end px-4 mt-8 pt-4">
                                                  <div className="text-xs font-bold">
                                                      Rapor düzenlenme tarihi: <span className="ml-2 border-b border-dotted border-black px-2 pb-0.5">{new Date().toLocaleDateString('tr-TR')}</span>
                                                  </div>
                                                  <div className="text-center">
                                                      <div className="font-serif text-2xl text-blue-800 -mb-2 italic opacity-80" style={{fontFamily: "'Brush Script MT', cursive"}}>{komiserIlkIsim}</div>
                                                      <div className="font-bold text-sm border-b border-black px-4 pb-1">{komiserTamIsim}</div>
                                                      <div className="text-[10px] font-bold mt-1">SAHA KOMİSERİ</div>
                                                  </div>
                                              </div>
                                          </div>
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
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-slate-700 border-t-red-600 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400 font-bold animate-pulse tracking-widest">VERİLER MERKEZDEN ÇEKİLİYOR...</p>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* SIFIRSA GİZLENECEK KISIMLAR DEVRİMİ */}
            {emniyetlikMaclar.length > 0 && (
                <section className="bg-slate-900 border border-red-900/50 rounded-xl overflow-hidden shadow-2xl relative w-full">
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                    <button 
                      onClick={() => setKategoriKirmiziAcik(!kategoriKirmiziAcik)}
                      className="w-full bg-red-950/40 p-4 border-b border-red-900/30 flex justify-between items-center hover:bg-red-900/40 transition-colors focus:outline-none"
                    >
                        <h2 className="text-red-500 font-black tracking-widest uppercase flex items-center gap-2"><span className="text-xl">🚨</span> KIRMIZI KOD (EMNİYETLİK)</h2>
                        <div className="flex items-center gap-4">
                            <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">{emniyetlikMaclar.length} RAPOR</span>
                            <span className="text-red-500 text-lg leading-none">{kategoriKirmiziAcik ? '▲' : '▼'}</span>
                        </div>
                    </button>
                    {kategoriKirmiziAcik && (
                        <div className="p-4 animate-fade-in-down">
                            {emniyetlikMaclar.map(mac => <RaporDurumKarti key={mac.id} mac={mac} tip="emniyet" />)}
                        </div>
                    )}
                </section>
            )}

            {teknikMaclar.length > 0 && (
                <section className="bg-slate-900 border border-amber-900/50 rounded-xl overflow-hidden shadow-xl relative w-full">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                    <button 
                      onClick={() => setKategoriDisiplinAcik(!kategoriDisiplinAcik)}
                      className="w-full bg-amber-950/20 p-4 border-b border-amber-900/30 flex justify-between items-center hover:bg-amber-900/30 transition-colors focus:outline-none"
                    >
                        <h2 className="text-amber-500 font-black tracking-widest uppercase flex items-center gap-2 text-left leading-tight"><span className="text-xl">⚠️</span> DİSİPLİN VE TEKNİK OLAYLAR <span className="hidden sm:inline text-xs text-amber-500/70 lowercase">(Hakeme hakaret, ihraç, vb.)</span></h2>
                        <div className="flex items-center gap-4 shrink-0 pl-2">
                            <span className="bg-amber-600 text-white text-xs font-bold px-2 py-1 rounded">{teknikMaclar.length} RAPOR</span>
                            <span className="text-amber-500 text-lg leading-none">{kategoriDisiplinAcik ? '▲' : '▼'}</span>
                        </div>
                    </button>
                    {kategoriDisiplinAcik && (
                        <div className="p-4 animate-fade-in-down">
                            {teknikMaclar.map(mac => <RaporDurumKarti key={mac.id} mac={mac} tip="teknik" />)}
                        </div>
                    )}
                </section>
            )}

            {olaysizMaclar.length > 0 && (
                <section className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-lg flex flex-col w-full">
                    <button 
                      onClick={() => setKategoriOlaysizAcik(!kategoriOlaysizAcik)}
                      className="w-full bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center hover:bg-slate-700/80 transition-colors focus:outline-none sticky top-0 z-10"
                    >
                        <h2 className="text-green-500 font-black tracking-widest uppercase flex items-center gap-2"><span className="text-xl">✓</span> OLAYSIZ MÜSABAKALAR</h2>
                        <div className="flex items-center gap-4">
                            <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">{olaysizMaclar.length} MAÇ</span>
                            <span className="text-green-500 text-lg leading-none">{kategoriOlaysizAcik ? '▲' : '▼'}</span>
                        </div>
                    </button>
                    {kategoriOlaysizAcik && (
                        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar animate-fade-in-down">
                            {olaysizMaclar.map(mac => <RaporDurumKarti key={mac.id} mac={mac} tip="olaysiz" />)}
                        </div>
                    )}
                </section>
            )}

            {/* YENİ: TEBELLÜĞ BEKLEYENLER KİŞİ BAZLI YAPILDI VE SIFIRSA GİZLENDİ */}
            {tebellugBekleyenKomiserler.length > 0 && (
                <section className="bg-slate-900 border border-purple-900/50 rounded-xl overflow-hidden shadow-lg flex flex-col w-full">
                    <button 
                      onClick={() => setKategoriTebellugAcik(!kategoriTebellugAcik)}
                      className="w-full bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center hover:bg-slate-700/80 transition-colors focus:outline-none sticky top-0 z-10"
                    >
                        <h2 className="text-purple-400 font-black tracking-widest uppercase flex items-center gap-2"><span className="text-xl">📩</span> TEBELLÜĞ (GÖREV ONAYI) BEKLEYEN PERSONEL</h2>
                        <div className="flex items-center gap-4">
                            <span className="bg-purple-900/50 text-purple-300 border border-purple-700 text-xs font-bold px-2 py-1 rounded">{tebellugBekleyenKomiserler.length} PERSONEL</span>
                            <span className="text-purple-500 text-lg leading-none">{kategoriTebellugAcik ? '▲' : '▼'}</span>
                        </div>
                    </button>
                    {kategoriTebellugAcik && (
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 animate-fade-in-down">
                            {tebellugBekleyenKomiserler.map((komiser: any) => (
                                <div key={komiser.id} className="bg-slate-800 border border-purple-800/50 rounded-lg p-3 flex justify-between items-center shadow-sm hover:bg-slate-700 transition-colors">
                                    <div>
                                        <h4 className="font-bold text-slate-200 text-sm">{komiser.isim}</h4>
                                        <span className="text-purple-400 text-[10px] font-mono">ID: {komiser.id}</span>
                                    </div>
                                    <div className="bg-purple-900/60 text-purple-300 px-2 py-1 rounded text-xs font-bold border border-purple-700/50 text-center">
                                        {komiser.count} Görev <br/> Bekliyor
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* RAPOR BEKLEYENLER SIFIRSA GİZLENDİ */}
            {bekleyenMaclar.length > 0 && (
                <section className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-lg flex flex-col w-full">
                    <button 
                      onClick={() => setKategoriBekleyenAcik(!kategoriBekleyenAcik)}
                      className="w-full bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center hover:bg-slate-700/80 transition-colors focus:outline-none sticky top-0 z-10"
                    >
                        <h2 className="text-slate-300 font-black tracking-widest uppercase flex items-center gap-2"><span className="text-xl">⏳</span> RAPOR (SKOR) BEKLEYENLER <span className="hidden md:inline text-xs text-slate-500 lowercase ml-1">(Görev alınmış ancak henüz skor işlenmemiş)</span></h2>
                        <div className="flex items-center gap-4">
                            <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2 py-1 rounded">{bekleyenMaclar.length} MAÇ</span>
                            <span className="text-slate-400 text-lg leading-none">{kategoriBekleyenAcik ? '▲' : '▼'}</span>
                        </div>
                    </button>
                    {kategoriBekleyenAcik && (
                        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar animate-fade-in-down">
                            {bekleyenMaclar.map(mac => <RaporDurumKarti key={mac.id} mac={mac} tip="bekleyen" />)}
                        </div>
                    )}
                </section>
            )}

            {/* ANA KATEGORİ: PERSONEL İSTİHBARAT VE SİCİL DAİRESİ */}
            <section className="bg-slate-900 border border-indigo-900/50 rounded-xl overflow-hidden shadow-2xl relative w-full mt-12">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>
                <button
                  onClick={() => setKategoriSicilAcik(!kategoriSicilAcik)}
                  className="w-full bg-indigo-950/40 p-4 border-b border-indigo-900/30 flex justify-between items-center hover:bg-indigo-900/40 transition-colors focus:outline-none"
                >
                    <h2 className="text-indigo-400 font-black tracking-widest uppercase flex items-center gap-2"><span className="text-xl">👥</span> PERSONEL İSTİHBARAT VE SİCİL DAİRESİ</h2>
                    <div className="flex items-center gap-4">
                        <span className="text-indigo-400 text-lg leading-none">{kategoriSicilAcik ? '▲' : '▼'}</span>
                    </div>
                </button>
                {kategoriSicilAcik && (
                    <div className="p-4 md:p-6 animate-fade-in-down">
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">İncelenecek Saha Komiseri</label>
                            <select
                                value={seciliSicilKomiserId}
                                onChange={(e) => setSeciliSicilKomiserId(e.target.value)}
                                className="w-full bg-slate-800 border-2 border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors text-sm font-bold"
                            >
                                <option value="">-- BİR KOMİSER SEÇİNİZ --</option>
                                {[...tumKomiserler].sort((a,b) => (a.ad_soyad || '').localeCompare(b.ad_soyad || '', 'tr-TR')).map(k => (
                                    <option key={`sicil-${k.komiser_id}`} value={k.komiser_id}>{k.ad_soyad} (ID: {k.komiser_id})</option>
                                ))}
                            </select>
                        </div>

                        {seciliSicilKomiserId && (
                            <div className="space-y-6">
                                {(() => {
                                    const maclar = sezonlukMaclar.filter(m => String(m.komiser_id) === String(seciliSicilKomiserId));
                                    let amatorCount = 0;
                                    let profCount = 0;
                                    const amatorKategoriler: Record<string, number> = {};
                                    const profKategoriler: Record<string, number> = {};
                                    const sahalar: Record<string, number> = {};

                                    maclar.forEach(mac => {
                                        const isProf = !detayliRaporGosterilirMi(mac.kategori_adi);
                                        const katAdi = formatKategori(mac.kategori_adi); 
                                        const sahaAdi = mac.saha || 'BELİRTİLMEMİŞ SAHA';

                                        if (isProf) {
                                            profCount++;
                                            profKategoriler[katAdi] = (profKategoriler[katAdi] || 0) + 1;
                                        } else {
                                            amatorCount++;
                                            amatorKategoriler[katAdi] = (amatorKategoriler[katAdi] || 0) + 1;
                                        }
                                        sahalar[sahaAdi] = (sahalar[sahaAdi] || 0) + 1;
                                    });

                                    const siraliAmatorler = Object.entries(amatorKategoriler).sort((a,b) => b[1] - a[1]);
                                    const siraliProflar = Object.entries(profKategoriler).sort((a,b) => b[1] - a[1]);
                                    const siraliSahalar = Object.entries(sahalar).sort((a,b) => b[1] - a[1]);

                                    return (
                                        <div className="bg-slate-800 rounded-xl p-4 md:p-6 border border-slate-700 shadow-inner">
                                            <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-700 pb-4 mb-6 gap-4">
                                                <div className="text-center md:text-left">
                                                    <h3 className="text-2xl font-black text-white">{komiserIsmiBul(seciliSicilKomiserId)}</h3>
                                                    <span className="text-indigo-400 text-xs font-mono font-bold tracking-widest">ID: {seciliSicilKomiserId}</span>
                                                </div>
                                                <div className="bg-indigo-600 px-6 py-2 rounded-lg shadow-md border border-indigo-500 min-w-[150px]">
                                                    <div className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider text-center">Toplam Sezon Görevi</div>
                                                    <div className="text-3xl font-black text-white text-center">{maclar.length}</div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                                <div className="bg-slate-900 border border-slate-600 rounded-lg p-4 relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                                    <h4 className="text-blue-400 font-bold text-sm tracking-wider uppercase mb-3 flex items-center justify-between border-b border-slate-700 pb-2">
                                                        <span>🛡️ Amatör Ligler</span>
                                                        <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs">{amatorCount} Maç</span>
                                                    </h4>
                                                    <ul className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                                                        {siraliAmatorler.length === 0 && <li className="text-xs text-slate-500 italic">Görev kaydı yok.</li>}
                                                        {siraliAmatorler.map(([kat, count]) => (
                                                            <li key={kat} className="flex justify-between items-center bg-slate-800 p-2 rounded text-xs border border-slate-700">
                                                                <span className="text-slate-300 font-semibold">{kat}</span>
                                                                <span className="font-black text-blue-400">{count}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <div className="bg-slate-900 border border-slate-600 rounded-lg p-4 relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                                                    <h4 className="text-purple-400 font-bold text-sm tracking-wider uppercase mb-3 flex items-center justify-between border-b border-slate-700 pb-2">
                                                        <span>🏆 Profesyonel / Gelişim</span>
                                                        <span className="bg-purple-600 text-white px-2 py-0.5 rounded text-xs">{profCount} Maç</span>
                                                    </h4>
                                                    <ul className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                                                        {siraliProflar.length === 0 && <li className="text-xs text-slate-500 italic">Görev kaydı yok.</li>}
                                                        {siraliProflar.map(([kat, count]) => (
                                                            <li key={kat} className="flex justify-between items-center bg-slate-800 p-2 rounded text-xs border border-slate-700">
                                                                <span className="text-slate-300 font-semibold">{kat}</span>
                                                                <span className="font-black text-purple-400">{count}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>

                                            <div className="bg-slate-900 border border-slate-600 rounded-lg p-4 relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                                                <h4 className="text-emerald-400 font-bold text-sm tracking-wider uppercase mb-3 flex items-center gap-2 border-b border-slate-700 pb-2">
                                                    <span className="text-lg">🏟️</span> GÖREV YAPILAN SAHALAR
                                                </h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                                                    {siraliSahalar.length === 0 && <span className="text-xs text-slate-500 italic">Görev kaydı yok.</span>}
                                                    {siraliSahalar.map(([saha, count]) => (
                                                        <div key={saha} className="flex justify-between items-center bg-slate-800 p-2.5 rounded border border-slate-700 hover:border-emerald-500/50 transition-colors">
                                                            <span className="text-slate-300 text-[11px] font-bold truncate pr-2" title={saha}>{saha}</span>
                                                            <span className="bg-emerald-900/50 text-emerald-400 text-[10px] px-2 py-1 rounded font-black shrink-0">{count} Kez</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                        </div>
                                    );
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