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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'musabakalar' }, () => {
          veriCek(true) 
        })
        .subscribe()

      const mazeretDinleyici = supabase
        .channel('mazeretler-canli')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mazeretler' }, () => {
          veriCek(true) 
        })
        .subscribe()

      return () => {
        supabase.removeChannel(musabakaDinleyici)
        supabase.removeChannel(mazeretDinleyici)
      }
    }
  }, [yetkili])

  const gorevliKomiserIdleri = Array.from(new Set(maclar.map(m => m?.komiser_id).filter(Boolean)));
  const bekleyenKomiserler: any[] = [];
  const onayliKomiserler: any[] = [];

  gorevliKomiserIdleri.forEach(id => {
    const komiserinMaclari = maclar.filter(m => m?.komiser_id === id);
    const komiserBilgisi = komiserler.find(k => k?.komiser_id === id);
    const komiserIsmi = komiserBilgisi?.ad_soyad || `Komiser (${id})`;
    const komiserTelefon = komiserBilgisi?.telefon || "Belirtilmemiş";
    
    const hepsiTebellugEdilmis = komiserinMaclari.length > 0 && komiserinMaclari.every(m => m?.tebellug_edildi === true);

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
          <h1 className="text-2xl font-black text-white mb-2 tracking-widest">KARARGAH</h1>
          <form onSubmit={girisYap} className="space-y-4">
            <input type="password" value={sifre} onChange={(e) => setSifre(e.target.value)} className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg p-3 text-center text-white" placeholder="PIN KODU" />
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg">Giriş Yap</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-30 flex flex-col items-end">
            <span className="relative flex h-3 w-3 mb-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span></span>
            <span className="text-[9px] font-mono text-blue-500 uppercase tracking-widest">WEB SOCKET AKTİF</span>
          </div>
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3"><span className="bg-red-600 text-white px-3 py-1 rounded-lg text-xl">RADAR</span>Operasyon Merkezi</h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0 z-10">
            <button onClick={cikisYap} className="bg-slate-700 text-slate-300 font-bold py-2 px-4 rounded-lg text-sm">Güvenli Çıkış</button>
            <button onClick={() => veriCek(false)} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg">{yukleniyor ? 'İndiriliyor...' : 'Manuel Kontrol'}</button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg">
              <div className="bg-red-900/50 p-4 border-b border-red-500/30 flex justify-between items-center"><h2 className="text-red-400 font-bold text-lg">Görevini Almayanlar</h2><span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">{bekleyenKomiserler.length} Kişi</span></div>
              <div className="p-4 max-h-[600px] overflow-y-auto space-y-3">
                {bekleyenKomiserler.map(komiser => (
                  <div key={komiser?.id} className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-sm">
                    <button onClick={() => toggleAkordiyon(komiser.id)} className="w-full text-left p-4 hover:bg-slate-800 transition-colors flex justify-between items-center">
                      <div><h3 className="text-white font-bold text-lg">{komiser?.isim}</h3><span className="text-red-400 font-mono text-xs">ID: {komiser?.id}</span></div>
                    </button>
                    {acikKomiserId === komiser.id && (
                      <div className="p-4 bg-slate-800 border-t border-slate-700 space-y-4">
                        {komiser.maclar.map((mac: any) => (
                          <div key={mac?.id} className={`bg-slate-900 border-l-4 p-4 ${mac?.tebellug_edildi ? 'border-green-500' : 'border-red-500'}`}>
                            <div className="flex justify-between items-start mb-3 border-b border-slate-700 pb-3"><span className="font-bold text-slate-200 text-base">{mac?.ev_sahibi} vs {mac?.misafir_takim}</span></div>
                            <div className="grid grid-cols-2 gap-3 text-sm text-slate-400 mt-2 bg-slate-800 p-3 rounded-lg"><div className="flex flex-col"><span className="text-[10px] text-slate-500 mb-1 font-semibold uppercase">Tarih & Saat</span><span className="font-bold text-slate-300">{mac?.tarih ? new Date(mac.tarih).toLocaleDateString('tr-TR') : ""} - {mac?.saat ? mac.saat.substring(0, 5) : ""}</span></div></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg">
              <div className="bg-green-900/30 p-4 border-b border-green-500/30 flex justify-between items-center"><h2 className="text-green-400 font-bold text-lg">✓ Görevini Alanlar</h2><span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold">{onayliKomiserler.length} Kişi</span></div>
              <div className="p-4 max-h-[400px] overflow-y-auto space-y-3">
                {onayliKomiserler.map(komiser => (
                  <div key={komiser?.id} className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
                    <button onClick={() => toggleAkordiyon(komiser.id)} className="w-full text-left p-3 hover:bg-slate-800 transition-colors flex justify-between items-center"><div><h3 className="text-slate-300 font-bold text-md">{komiser?.isim}</h3></div></button>
                    {acikKomiserId === komiser.id && (
                      <div className="p-3 bg-slate-800 border-t border-slate-700 space-y-3">
                        {komiser.maclar.map((mac: any) => (
                           <div key={mac?.id} className="bg-slate-900 border-l-2 border-green-500 rounded p-3"><p className="font-bold text-slate-300 text-sm mb-2">{mac?.ev_sahibi} vs {mac?.misafir_takim}</p></div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden h-full shadow-lg">
              <div className="bg-amber-900/30 p-4 border-b border-amber-500/30 flex justify-between items-center"><h2 className="text-amber-400 font-bold text-lg">Gelen Mazeret Bildirimleri</h2><span className="bg-amber-500 text-slate-900 text-sm font-bold px-3 py-1 rounded-full">{mazeretler.length} Kayıt</span></div>
              <div className="p-4 max-h-[900px] overflow-y-auto space-y-4">
                {mazeretler.map(mazeret => {
                  const komiserBilgisi = komiserler.find(k => k?.komiser_id === mazeret?.komiser_id);
                  const isim = komiserBilgisi?.ad_soyad || "Bilinmeyen Komiser";
                  const gunIsimler: any = { cuma: 'Cuma', cumartesi: 'Cumartesi', pazar: 'Pazar', pazartesi: 'Pazartesi', sali: 'Salı', carsamba: 'Çarşamba', persembe: 'Perşembe' };

                  const isKompleYok = mazeret?.komple_yok || mazeret?.detaylar?.mod === 'yok';
                  const isFull = mazeret?.detaylar?.mod === 'full';
                  const isSecmeli = mazeret?.detaylar?.mod === 'secmeli';

                  return (
                  <div key={mazeret?.id} className="bg-slate-900 rounded-xl border border-slate-700 p-5 relative overflow-hidden shadow-sm">
                    {/* BÜYÜK KIRMIZI AFİŞ: KOMPLE YOK */}
                    {isKompleYok && (
                      <div className="bg-red-900/30 border border-red-500/50 text-center p-3 mb-4 rounded-lg animate-pulse">
                        <span className="text-red-400 font-black text-lg tracking-widest uppercase">BU HAFTA GÖREVE KAPALI</span>
                        <p className="text-red-300/70 text-xs mt-1">(Hafta İçi ve Hafta Sonu Müsait Değil)</p>
                      </div>
                    )}

                    {/* BÜYÜK YEŞİL AFİŞ: 7/24 */}
                    {isFull && (
                      <div className="bg-green-900/30 border border-green-500/50 text-center p-3 mb-4 rounded-lg">
                        <span className="text-green-400 font-black text-lg tracking-widest uppercase">TÜM HAFTA (7/24) MÜSAİT</span>
                        <div className="flex justify-center gap-3 mt-2 text-[10px] uppercase font-bold text-slate-300">
                          <span className={mazeret?.detaylar?.genelMerkez ? 'text-green-400' : 'opacity-30'}>✓ Merkez</span>
                          <span className={mazeret?.detaylar?.genelDeplasman ? 'text-green-400' : 'opacity-30'}>✓ Deplasman</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3"><div><h3 className="text-white font-bold text-lg">{isim}</h3></div><span className="text-blue-400 font-mono text-xs">ID: {mazeret.komiser_id}</span></div>

                    {/* SEÇMELİ: GÜNLER VE SAATLER TABLOSU */}
                    {isSecmeli && mazeret?.detaylar?.gunler && (
                      <div className="mt-3 space-y-2 mb-4">
                        {['cuma', 'cumartesi', 'pazar', 'pazartesi', 'sali', 'carsamba', 'persembe'].map(gunKey => {
                          const gunData = mazeret.detaylar.gunler[gunKey];
                          
                          if (!gunData || !gunData.active) {
                            return (
                              <div key={gunKey} className="flex flex-col sm:flex-row sm:items-center justify-between bg-red-900/10 p-2 rounded-lg border border-red-900/30 opacity-70">
                                <span className="text-red-400 font-bold text-xs w-24">{gunIsimler[gunKey]}</span>
                                <span className="text-red-500 font-bold text-[10px] tracking-widest uppercase">MÜSAİT DEĞİL</span>
                              </div>
                            )
                          }

                          return (
                            <div key={gunKey} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-800/80 p-3 rounded-lg border border-slate-700/80">
                              <span className="text-blue-400 font-bold text-sm w-24">{gunIsimler[gunKey]}</span>
                              <div className="flex flex-wrap gap-2 text-[10px] mt-2 sm:mt-0">
                                <span className="bg-slate-700 text-slate-300 px-2 py-1 rounded uppercase tracking-wider font-semibold">
                                  {gunData.merkez && gunData.deplasman ? 'Merkez & Deplasman' : gunData.merkez ? 'Sadece Merkez' : gunData.deplasman ? 'Sadece Deplasman' : 'Konum Yok'}
                                </span>
                                <span className={`px-2 py-1 rounded font-bold uppercase tracking-wider ${gunData.tumGun ? 'bg-green-900/60 text-green-400' : 'bg-amber-900/60 text-amber-400'}`}>
                                  {gunData.tumGun ? 'TÜM GÜN (09:00 - 22:00)' : `${gunData.baslangic} - ${gunData.bitis}`}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {mazeret?.aciklama && (<div className="bg-slate-800 p-4 rounded-xl border border-slate-700 mt-3"><p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Açıklama / Not:</p><p className="text-slate-300 text-sm italic">"{mazeret.aciklama}"</p></div>)}
                  </div>
                )})}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}