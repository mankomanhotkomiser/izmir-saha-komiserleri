"use client"
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminPanel() {
  const [sifre, setSifre] = useState('')
  const [yetkili, setYetkili] = useState(false)
  const [hata, setHata] = useState(false)

  const [maclar, setMaclar] = useState<any[]>([])
  const [komiserler, setKomiserler] = useState<any[]>([])
  const [mazeretler, setMazeretler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(false)
  
  const [globalAktifHaftaNo, setGlobalAktifHaftaNo] = useState<number>(1)
  const [acikKomiserId, setAcikKomiserId] = useState<string | null>(null)

  const ADMIN_SIFRE = "1923"

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
      veriCek()
    } else {
      setHata(true)
      setTimeout(() => setHata(false), 2000)
    }
  }

  const veriCek = async () => {
    setYukleniyor(true)
    
    // 1. Tüm Maçları Çek
    const { data: macData } = await supabase
      .from('musabakalar')
      .select('*')
      .order('tarih', { ascending: false })
      .limit(1000)

    if (macData && macData.length > 0) {
      // Hangi haftada olduğumuzu bul (Ana ekrandaki mantık)
      const cumalar = macData.map(mac => cumaBul(mac.tarih)).filter(t => t > 0)
      const essizCumalar = Array.from(new Set(cumalar)).sort((a, b) => a - b)
      
      const aktifHaftaIndex = essizCumalar.length
      const aktifCumaTarihi = essizCumalar[essizCumalar.length - 1]
      
      setGlobalAktifHaftaNo(aktifHaftaIndex)

      // SADECE AKTİF HAFTANIN MAÇLARINI FİLTRELE! (Geçmiş haftaları çöpe at)
      const sadeceBuHaftaninMaclari = macData.filter(mac => cumaBul(mac.tarih) === aktifCumaTarihi)
      setMaclar(sadeceBuHaftaninMaclari)
    }

    // 2. Komiserleri Çek
    const { data: komiserData } = await supabase
      .from('komiserler')
      .select('*')

    if (komiserData) setKomiserler(komiserData)

    // 3. Mazeretleri Çek
    const { data: mazeretData } = await supabase
      .from('mazeretler')
      .select('*')
      .order('created_at', { ascending: false })

    if (mazeretData) setMazeretler(mazeretData)
      
    setYukleniyor(false)
  }

  // =======================================================
  // RADAR MANTIĞI: MAÇLARI KİŞİLERE GÖRE GRUPLA
  // =======================================================
  
  // Sadece bu hafta maçı olan komiserlerin ID'leri
  const gorevliKomiserIdleri = Array.from(new Set(maclar.map(m => m.komiser_id).filter(Boolean)));
  
  const bekleyenKomiserler: any[] = [];
  const onayliKomiserler: any[] = [];

  gorevliKomiserIdleri.forEach(id => {
    const komiserinMaclari = maclar.filter(m => m.komiser_id === id);
    const komiserBilgisi = komiserler.find(k => k.komiser_id === id);
    const komiserIsmi = komiserBilgisi ? komiserBilgisi.ad_soyad : `Komiser (${id})`;
    const komiserTelefon = komiserBilgisi?.telefon || "Belirtilmemiş";
    
    // Eğer bir tane bile false (veya null) varsa "bekliyor" demektir.
    const hepsiTebellugEdilmis = komiserinMaclari.length > 0 && komiserinMaclari.every(m => m.tebellug_edildi === true);

    const komiserObjesi = {
      id: id,
      isim: komiserIsmi,
      telefon: komiserTelefon,
      maclar: komiserinMaclari
    };

    if (hepsiTebellugEdilmis) {
      onayliKomiserler.push(komiserObjesi);
    } else {
      bekleyenKomiserler.push(komiserObjesi);
    }
  });

  const gorevTuruBelirle = (kategori: string, macKodu: string) => {
    const kat = kategori ? kategori.toUpperCase() : ""
    const kod = macKodu ? macKodu.toUpperCase() : ""

    if (kod.includes('STAJ')) return "Stajyer / Saha Komiseri"
    if (kat.includes('U17') || kat.includes('U19') || kat.includes('PAF')) return "Denetçi"
    if (kat.includes('GELİŞİM') && (kat.includes('U13') || kat.includes('U14') || kat.includes('U15') || kat.includes('U16'))) return "Saha Komiseri / Denetçi"
    
    return "Saha Komiseri"
  }

  const toggleAkordiyon = (id: string) => {
    setAcikKomiserId(prev => prev === id ? null : id);
  }

  if (!yetkili) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-700 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          <h1 className="text-2xl font-black text-white mb-2 tracking-widest">KARARGAH</h1>
          <p className="text-slate-400 text-sm mb-6 uppercase tracking-widest">Sadece Yetkili Personel</p>
          
          <form onSubmit={girisYap} className="space-y-4">
            <input 
              type="password" 
              value={sifre}
              onChange={(e) => setSifre(e.target.value)}
              className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg p-3 text-center text-white text-xl tracking-widest focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="PIN KODU"
            />
            {hata && <p className="text-red-500 text-sm font-bold animate-pulse">Erişim Reddedildi!</p>}
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg uppercase tracking-wider transition-colors">
              Giriş Yap
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <span className="bg-red-600 text-white px-3 py-1 rounded-lg text-xl shadow-red-500/50 shadow-lg">RADAR</span>
              Operasyon Merkezi
            </h1>
            <p className="text-slate-400 mt-1 flex items-center gap-2">
              İzmir Saha Komiserleri Canlı Takip Ekranı 
              <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded font-bold border border-slate-600">Aktif Hafta: {globalAktifHaftaNo}</span>
            </p>
          </div>
          <button onClick={veriCek} className="mt-4 md:mt-0 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all transform hover:scale-105">
            {yukleniyor ? (
              <><span className="animate-spin text-xl">↻</span> Güncelleniyor...</>
            ) : (
              <><span className="text-xl">↻</span> Verileri Yenile</>
            )}
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* TEBELLÜĞ RADARI (KİŞİ BAZLI) */}
          <div className="space-y-6">
            
            {/* BEKLEYEN KOMİSERLER */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg">
              <div className="bg-red-900/50 p-4 border-b border-red-500/30 flex justify-between items-center">
                <h2 className="text-red-400 font-bold text-lg flex items-center gap-2">
                  <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>
                  Görevini Almayanlar
                </h2>
                <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">{bekleyenKomiserler.length} Kişi</span>
              </div>
              <div className="p-4 max-h-[600px] overflow-y-auto space-y-3">
                {bekleyenKomiserler.length === 0 ? (
                  <p className="text-slate-500 text-center py-4 italic">Tüm görevler tebellüğ edildi veya bu hafta atanan maç yok.</p>
                ) : (
                  bekleyenKomiserler.map(komiser => (
                    <div key={komiser.id} className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-sm">
                      <button onClick={() => toggleAkordiyon(komiser.id)} className="w-full text-left p-4 hover:bg-slate-800 transition-colors flex justify-between items-center">
                        <div>
                          <h3 className="text-white font-bold text-lg">{komiser.isim}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-red-400 font-mono text-xs bg-red-900/30 px-2 py-0.5 rounded">ID: {komiser.id}</span>
                            <span className="text-slate-500 text-xs flex items-center gap-1">📞 {komiser.telefon}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="bg-slate-700 text-slate-300 text-xs font-bold px-3 py-1 rounded-full">{komiser.maclar.length} Maç</span>
                          <span className="text-slate-400 text-xl">{acikKomiserId === komiser.id ? '▲' : '▼'}</span>
                        </div>
                      </button>
                      
                      {/* AKORDİYON İÇİ MAÇ KARTLARI (EKMEL KANUNLARI FORMATI) */}
                      {acikKomiserId === komiser.id && (
                        <div className="p-4 bg-slate-800 border-t border-slate-700 space-y-4">
                          {komiser.maclar.map((mac: any) => (
                            <div key={mac.id} className={`bg-slate-900 border-l-4 shadow-sm rounded-r-xl p-4 opacity-95 relative ${mac.tebellug_edildi ? 'border-green-500' : 'border-red-500'}`}>
                              <div className="flex justify-between items-start mb-3 border-b border-slate-700 pb-3">
                                <span className="font-bold text-slate-200 text-base md:text-lg leading-tight">{mac.ev_sahibi} <span className="text-slate-500 font-medium mx-1 text-sm">vs</span> {mac.misafir_takim}</span>
                                {mac.tebellug_edildi && <span className="text-[10px] bg-green-900/50 text-green-400 px-2 py-1 rounded font-bold">ONAYLI</span>}
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-sm text-slate-400 mt-2 bg-slate-800 p-3 rounded-lg border border-slate-700">
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Tarih & Saat</span> 
                                  <span className="font-bold text-slate-300">{new Date(mac.tarih).toLocaleDateString('tr-TR')} - {mac.saat.substring(0, 5)}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Saha</span> 
                                  <span className="font-bold text-slate-300">{mac.saha}</span>
                                </div>
                                <div className="flex flex-col mt-2 pt-3 border-t border-slate-700">
                                  <span className="text-[10px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Kategori / Lig</span> 
                                  <span className="font-bold text-slate-300">{mac.kategori_adi} <span className="text-xs font-normal text-slate-500 block sm:inline mt-1 sm:mt-0 sm:ml-1">(Kod: {mac.mac_kodu})</span></span>
                                </div>
                                <div className="flex flex-col mt-2 pt-3 border-t border-slate-700">
                                  <span className="text-[10px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Atanan Görev</span> 
                                  <span className="font-extrabold text-blue-400">{gorevTuruBelirle(mac.kategori_adi, mac.mac_kodu)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ONAYLANAN KOMİSERLER */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
              <div className="bg-green-900/30 p-4 border-b border-green-500/30 flex justify-between items-center">
                <h2 className="text-green-400 font-bold text-lg">✓ Görevini Alanlar</h2>
                <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold">{onayliKomiserler.length} Kişi</span>
              </div>
              <div className="p-4 max-h-[400px] overflow-y-auto space-y-3">
                {onayliKomiserler.length === 0 ? (
                  <p className="text-slate-500 text-center py-4 italic">Henüz tebellüğ eden komiser yok.</p>
                ) : (
                  onayliKomiserler.map(komiser => (
                    <div key={komiser.id} className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
                      <button onClick={() => toggleAkordiyon(komiser.id)} className="w-full text-left p-3 hover:bg-slate-800 transition-colors flex justify-between items-center">
                        <div>
                          <h3 className="text-slate-300 font-bold text-md">{komiser.isim}</h3>
                          <span className="text-green-500 font-mono text-[10px] mt-1 block">ID: {komiser.id} | Maç: {komiser.maclar.length}</span>
                        </div>
                        <span className="text-slate-500 text-lg">{acikKomiserId === komiser.id ? '▲' : '▼'}</span>
                      </button>
                      
                      {/* ONAYLANANLARIN KARTLARI */}
                      {acikKomiserId === komiser.id && (
                        <div className="p-3 bg-slate-800 border-t border-slate-700 space-y-3">
                          {komiser.maclar.map((mac: any) => (
                             <div key={mac.id} className="bg-slate-900 border-l-2 border-green-500 rounded p-3 relative">
                                <p className="font-bold text-slate-300 text-sm mb-2">{mac.ev_sahibi} vs {mac.misafir_takim}</p>
                                <p className="text-xs text-slate-400">{mac.saha} | {new Date(mac.tarih).toLocaleDateString('tr-TR')} - {mac.saat.substring(0, 5)}</p>
                             </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* MAZERET BİLDİRİMLERİ RADARI */}
          <div>
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden h-full shadow-lg">
              <div className="bg-amber-900/30 p-4 border-b border-amber-500/30 flex justify-between items-center">
                <h2 className="text-amber-400 font-bold text-lg flex items-center gap-2">Gelen Mazeret Bildirimleri</h2>
                <span className="bg-amber-500 text-slate-900 text-sm font-bold px-3 py-1 rounded-full">{mazeretler.length} Kayıt</span>
              </div>
              <div className="p-4 max-h-[900px] overflow-y-auto space-y-4">
                {mazeretler.length === 0 ? (
                  <p className="text-slate-500 text-center py-8 italic">Henüz mazeret bildiren personel yok.</p>
                ) : (
                  mazeretler.map(mazeret => {
                    const komiserBilgisi = komiserler.find(k => k.komiser_id === mazeret.komiser_id);
                    const isim = komiserBilgisi ? komiserBilgisi.ad_soyad : "Bilinmeyen Komiser";

                    return (
                    <div key={mazeret.id} className="bg-slate-900 rounded-xl border border-slate-700 p-5 relative overflow-hidden shadow-sm">
                      {mazeret.komple_yok && (
                        <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl shadow-lg">
                          KOMPLE YOK
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
                        <div>
                          <h3 className="text-white font-bold text-lg">{isim}</h3>
                          <p className="text-blue-400 font-mono text-xs mt-1">ID: {mazeret.komiser_id}</p>
                        </div>
                        <span className="bg-slate-800 text-slate-400 font-bold text-xs px-3 py-1 rounded border border-slate-700">Hafta: {mazeret.hafta_no}</span>
                      </div>

                      {!mazeret.komple_yok && mazeret.detaylar && (
                        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                          <div className={`p-3 rounded-lg border ${mazeret.detaylar.haftaIciYokum ? 'bg-red-900/20 border-red-900/50 text-red-400' : mazeret.detaylar.haftaIciMusait ? 'bg-blue-900/20 border-blue-900/50 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                            <span className="block text-[10px] font-bold uppercase mb-1 text-slate-500">Hafta İçi</span>
                            {mazeret.detaylar.haftaIciYokum ? 'MÜSAİT DEĞİL' : mazeret.detaylar.haftaIciMusait ? 'MÜSAİT' : 'Belirtilmedi'}
                          </div>
                          <div className={`p-3 rounded-lg border ${mazeret.detaylar.haftaSonuYokum ? 'bg-red-900/20 border-red-900/50 text-red-400' : mazeret.detaylar.haftaSonuMusait ? 'bg-blue-900/20 border-blue-900/50 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                            <span className="block text-[10px] font-bold uppercase mb-1 text-slate-500">Hafta Sonu</span>
                            {mazeret.detaylar.haftaSonuYokum ? 'MÜSAİT DEĞİL' : mazeret.detaylar.haftaSonuMusait ? 'MÜSAİT' : 'Belirtilmedi'}
                          </div>
                        </div>
                      )}

                      {mazeret.not && (
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 mt-3">
                          <p className="text-slate-500 text-[10px] uppercase font-bold mb-2">Açıklama / Not:</p>
                          <p className="text-slate-300 text-sm italic">"{mazeret.not}"</p>
                        </div>
                      )}
                      
                      <p className="text-slate-600 text-[10px] text-right mt-3 font-mono">
                        Kayıt: {new Date(mazeret.created_at).toLocaleString('tr-TR')}
                      </p>
                    </div>
                  )})
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}