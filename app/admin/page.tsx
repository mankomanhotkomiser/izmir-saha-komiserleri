"use client"
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminPanel() {
  const [sifre, setSifre] = useState('')
  const [yetkili, setYetkili] = useState(false)
  const [hata, setHata] = useState(false)

  const [maclar, setMaclar] = useState<any[]>([])
  const [mazeretler, setMazeretler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(false)

  // Admin Şifresi
  const ADMIN_SIFRE = "1923"

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
    
    // 1. Maçları Çek
    const { data: macData } = await supabase
      .from('musabakalar')
      .select('*')
      .order('tarih', { ascending: false })
      .limit(200) // Son 200 maçı getir

    if (macData) setMaclar(macData)

    // 2. Mazeretleri Çek
    const { data: mazeretData } = await supabase
      .from('mazeretler')
      .select('*')
      .order('created_at', { ascending: false })

    if (mazeretData) setMazeretler(mazeretData)
      
    setYukleniyor(false)
  }

  // Tebellüğ edilmeyenler (Bekleyenler)
  const bekleyenMaclar = maclar.filter(m => m.tebellug_edildi !== true)
  // Tebellüğ edilenler (Onaylananlar)
  const onayliMaclar = maclar.filter(m => m.tebellug_edildi === true)

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
      <div className="max-w-6xl mx-auto">
        
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <span className="bg-red-600 text-white px-3 py-1 rounded-lg text-xl">RADAR</span>
              Operasyon Merkezi
            </h1>
            <p className="text-slate-400 mt-1">İzmir Saha Komiserleri Canlı Takip Ekranı</p>
          </div>
          <button onClick={veriCek} className="mt-4 md:mt-0 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2">
            {yukleniyor ? 'Güncelleniyor...' : 'Verileri Yenile'}
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* TEBELLÜĞ RADARI */}
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
              <div className="bg-red-900/50 p-4 border-b border-red-500/30">
                <h2 className="text-red-400 font-bold text-lg flex items-center gap-2">
                  <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>
                  Tebellüğ Bekleyenler ({bekleyenMaclar.length})
                </h2>
              </div>
              <div className="p-4 max-h-[400px] overflow-y-auto space-y-3">
                {bekleyenMaclar.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">Bekleyen görev kalmadı.</p>
                ) : (
                  bekleyenMaclar.map(mac => (
                    <div key={mac.id} className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                      <div className="flex justify-between items-start">
                        <p className="text-white font-bold text-sm">{mac.ev_sahibi} vs {mac.misafir_takim}</p>
                        <span className="bg-slate-700 text-slate-300 text-[10px] px-2 py-1 rounded">{mac.tarih}</span>
                      </div>
                      <p className="text-red-400 text-xs mt-2 font-mono">Komiser ID: {mac.komiser_id}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
              <div className="bg-green-900/30 p-4 border-b border-green-500/30">
                <h2 className="text-green-400 font-bold text-lg">✓ Tebellüğ Edilenler ({onayliMaclar.length})</h2>
              </div>
              <div className="p-4 max-h-[300px] overflow-y-auto space-y-3">
                {onayliMaclar.map(mac => (
                  <div key={mac.id} className="bg-slate-900 p-3 rounded-lg border border-slate-700 opacity-70">
                    <p className="text-slate-300 font-bold text-sm">{mac.ev_sahibi} vs {mac.misafir_takim}</p>
                    <p className="text-green-500 text-xs mt-1 font-mono">Onaylandı - ID: {mac.komiser_id}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* MAZERET BİLDİRİMLERİ RADARI */}
          <div>
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden h-full">
              <div className="bg-amber-900/30 p-4 border-b border-amber-500/30 flex justify-between items-center">
                <h2 className="text-amber-400 font-bold text-lg">Gelen Mazeret Bildirimleri</h2>
                <span className="bg-amber-500 text-slate-900 text-xs font-bold px-2 py-1 rounded-full">{mazeretler.length} Kayıt</span>
              </div>
              <div className="p-4 max-h-[800px] overflow-y-auto space-y-4">
                {mazeretler.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">Henüz mazeret bildiren personel yok.</p>
                ) : (
                  mazeretler.map(mazeret => (
                    <div key={mazeret.id} className="bg-slate-900 rounded-xl border border-slate-700 p-4 relative overflow-hidden">
                      {mazeret.komple_yok && (
                        <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                          KOMPLE YOK
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center mb-3 border-b border-slate-800 pb-2">
                        <h3 className="text-white font-bold">ID: <span className="text-blue-400">{mazeret.komiser_id}</span></h3>
                        <span className="text-slate-500 text-xs">Hafta: {mazeret.hafta_no}</span>
                      </div>

                      {!mazeret.komple_yok && mazeret.detaylar && (
                        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                          <div className={`p-2 rounded ${mazeret.detaylar.haftaIciYokum ? 'bg-red-900/50 text-red-300' : mazeret.detaylar.haftaIciMusait ? 'bg-blue-900/50 text-blue-300' : 'bg-slate-800 text-slate-400'}`}>
                            Hafta İçi: {mazeret.detaylar.haftaIciYokum ? 'YOK' : mazeret.detaylar.haftaIciMusait ? 'MÜSAİT' : 'Belirtilmedi'}
                          </div>
                          <div className={`p-2 rounded ${mazeret.detaylar.haftaSonuYokum ? 'bg-red-900/50 text-red-300' : mazeret.detaylar.haftaSonuMusait ? 'bg-blue-900/50 text-blue-300' : 'bg-slate-800 text-slate-400'}`}>
                            Hafta Sonu: {mazeret.detaylar.haftaSonuYokum ? 'YOK' : mazeret.detaylar.haftaSonuMusait ? 'MÜSAİT' : 'Belirtilmedi'}
                          </div>
                        </div>
                      )}

                      {mazeret.not && (
                        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 mt-2">
                          <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">Açıklama / Not:</p>
                          <p className="text-slate-200 text-sm italic">"{mazeret.not}"</p>
                        </div>
                      )}
                      
                      <p className="text-slate-600 text-[10px] text-right mt-2">
                        Kayıt: {new Date(mazeret.created_at).toLocaleString('tr-TR')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}