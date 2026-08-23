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
  
  // İÇ AKORDİYON STATE'LERİ (Kişiler)
  const [acikBekleyenId, setAcikBekleyenId] = useState<string | null>(null)
  const [acikOnayliId, setAcikOnayliId] = useState<string | null>(null)
  const [acikMazeretId, setAcikMazeretId] = useState<string | null>(null)

  // ANA AKORDİYON STATE'LERİ (Kategoriler)
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

  // GÖREV KATEGORİLERİ
  const gorevliKomiserIdleri = Array.from(new Set(maclar.map(m => m?.komiser_id).filter(Boolean)));
  const bekleyenKomiserler: any[] = [];
  const onayliKomiserler: any[] = [];

  gorevliKomiserIdleri.forEach(id => {
    const komiserinMaclari = maclar.filter(m => m?.komiser_id === id);
    const komiserBilgisi = komiserler.find(k => k?.komiser_id === id);
    const komiserIsmi = komiserBilgisi?.ad_soyad || `Komiser (${id})`;
    const komiserTelefon = komiserBilgisi?.telefon || "Belirtilmemiş";
    
    const hepsiTebellugEdilmis = komiserinMaclari.length > 0 && komiserinMaclari.every(m => m?.tebellug_edildi === true);

    const komiserObjesi = { id, isim: komiserIsmi, telefon: komiserTelefon, maclar: komiserinMaclari };

    if (hepsiTebellugEdilmis) onayliKomiserler.push(komiserObjesi);
    else bekleyenKomiserler.push(komiserObjesi);
  });

  const gorevTuruBelirle = (kategori: string, macKodu: string) => {
    const kat = kategori ? kategori.toUpperCase() : ""
    const kod = macKodu ? macKodu.toUpperCase() : ""
    if (kod.includes('STAJ')) return "Stajyer / Saha Komiseri"
    if (kat.includes('U17') || kat.includes('U19') || kat.includes('PAF')) return "Denetçi"
    if (kat.includes('GELİŞİM') && (kat.includes('U13') || kat.includes('U14') || kat.includes('U15') || kat.includes('U16'))) return "Saha Komiseri / Denetçi"
    return "Saha Komiseri"
  }

  // MAZERET KATEGORİLERİ
  const goreveKapaliList = mazeretler.filter(m => m?.komple_yok || m?.detaylar?.mod === 'yok');
  const tamMusaitList = mazeretler.filter(m => !m?.komple_yok && m?.detaylar?.mod === 'full');
  const secmeliList = mazeretler.filter(m => !m?.komple_yok && m?.detaylar?.mod === 'secmeli');
  
  const bildirenIdler = mazeretler.map(m => m.komiser_id);
  const bildirmeyenList = komiserler.filter(k => !bildirenIdler.includes(k.komiser_id));

  const gunIsimler: any = { cuma: 'Cuma', cumartesi: 'Cumartesi', pazar: 'Pazar', pazartesi: 'Pazartesi', sali: 'Salı', carsamba: 'Çarşamba', persembe: 'Perşembe' };

  if (!yetkili) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-700 text-center">
          <h1 className="text-2xl font-black text-white mb-2 tracking-widest">KARARGAH</h1>
          <form onSubmit={girisYap} className="space-y-4">
            <input type="password" value={sifre} onChange={(e) => setSifre(e.target.value)} className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg p-3 text-center text-white text-xl tracking-widest font-mono" placeholder="PIN KODU" />
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg uppercase tracking-wider">Giriş Yap</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-30 flex flex-col items-end">
            <span className="relative flex h-3 w-3 mb-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span></span>
            <span className="text-[9px] font-mono text-blue-500 uppercase tracking-widest">WEB SOCKET AKTİF</span>
          </div>
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3"><span className="bg-red-600 text-white px-3 py-1 rounded-lg text-xl shadow-red-500/50 shadow-lg">RADAR</span>Operasyon Merkezi</h1>
            <p className="text-slate-400 mt-1 flex items-center gap-2">İzmir Saha Komiserleri Canlı Takip Ekranı <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded font-bold border border-slate-600">Aktif Hafta: {globalAktifHaftaNo}</span></p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0 z-10">
            <button onClick={cikisYap} className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 shadow transition-colors text-sm border border-slate-600">Güvenli Çıkış</button>
            <button onClick={() => veriCek(false)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 transition-all transform hover:scale-105">{yukleniyor ? 'İndiriliyor...' : 'Manuel Kontrol'}</button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* SOL SÜTUN: GÖREV DURUMLARI */}
          <div className="space-y-4">
            
            {/* ANA AKORDİYON 1: GÖREVİNİ ALMAYANLAR */}
            <div className={`bg-slate-800 rounded-2xl border transition-colors shadow-lg overflow-hidden ${acikSolGrup === 'bekleyen' ? 'border-red-500/50' : 'border-slate-700'}`}>
              <button onClick={() => setAcikSolGrup(acikSolGrup === 'bekleyen' ? null : 'bekleyen')} className="w-full bg-red-900/30 hover:bg-red-900/50 p-5 flex justify-between items-center transition-colors">
                <div className="flex items-center gap-3">
                  <h2 className="text-red-400 font-black text-xl tracking-wider">GÖREVİNİ ALMAYANLAR</h2>
                  <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">{bekleyenKomiserler.length} KİŞİ</span>
                </div>
                <span className="text-red-400 text-2xl">{acikSolGrup === 'bekleyen' ? '▲' : '▼'}</span>
              </button>
              
              {acikSolGrup === 'bekleyen' && (
                <div className="p-4 max-h-[600px] overflow-y-auto space-y-3 bg-slate-900/50">
                  {bekleyenKomiserler.map(komiser => {
                    const acikMi = acikBekleyenId === komiser.id;
                    return (
                    <div key={komiser?.id} className={`rounded-xl border transition-all ${acikMi ? 'bg-slate-800 border-red-500/50 shadow-md shadow-red-900/20' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}>
                      <button onClick={() => setAcikBekleyenId(acikMi ? null : komiser.id)} className="w-full text-left p-4 flex justify-between items-center">
                        <div><h3 className={`font-bold text-lg ${acikMi ? 'text-red-400' : 'text-white'}`}>{komiser?.isim}</h3><span className="text-slate-500 font-mono text-xs">ID: {komiser?.id}</span></div>
                        <div className="flex items-center gap-3">
                          <span className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded font-bold">{komiser.maclar.length} Maç</span>
                          <span className="text-slate-500">{acikMi ? '▲' : '▼'}</span>
                        </div>
                      </button>
                      {acikMi && (
                        <div className="p-4 bg-slate-900/50 border-t border-slate-700/50 space-y-4">
                          {komiser.maclar.map((mac: any) => (
                            <div key={mac?.id} className="bg-slate-800 border-l-4 border-red-500 rounded-r-lg p-3 shadow-sm">
                              <div className="flex justify-between items-start mb-2 border-b border-slate-700 pb-2"><span className="font-bold text-slate-200">{mac?.ev_sahibi} vs {mac?.misafir_takim}</span></div>
                              <div className="grid grid-cols-2 gap-2 text-xs text-slate-400"><div className="flex flex-col"><span className="text-slate-500 font-semibold">Tarih/Saat</span><span className="font-bold text-slate-300">{mac?.tarih ? new Date(mac.tarih).toLocaleDateString('tr-TR') : ""} - {mac?.saat ? mac.saat.substring(0, 5) : ""}</span></div></div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )})}
                  {bekleyenKomiserler.length === 0 && <div className="text-center p-6 text-slate-500 italic">Bekleyen görev bulunmuyor.</div>}
                </div>
              )}
            </div>

            {/* ANA AKORDİYON 2: GÖREVİNİ ALANLAR */}
            <div className={`bg-slate-800 rounded-2xl border transition-colors shadow-lg overflow-hidden ${acikSolGrup === 'onayli' ? 'border-green-500/50' : 'border-slate-700'}`}>
              <button onClick={() => setAcikSolGrup(acikSolGrup === 'onayli' ? null : 'onayli')} className="w-full bg-green-900/30 hover:bg-green-900/50 p-5 flex justify-between items-center transition-colors">
                <div className="flex items-center gap-3">
                  <h2 className="text-green-400 font-black text-xl tracking-wider">✓ GÖREVİNİ ALANLAR</h2>
                  <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">{onayliKomiserler.length} KİŞİ</span>
                </div>
                <span className="text-green-400 text-2xl">{acikSolGrup === 'onayli' ? '▲' : '▼'}</span>
              </button>
              
              {acikSolGrup === 'onayli' && (
                <div className="p-4 max-h-[400px] overflow-y-auto space-y-3 bg-slate-900/50">
                  {onayliKomiserler.map(komiser => {
                    const acikMi = acikOnayliId === komiser.id;
                    return (
                    <div key={komiser?.id} className={`rounded-xl border transition-all ${acikMi ? 'bg-slate-800 border-green-500/50 shadow-md shadow-green-900/20' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}>
                      <button onClick={() => setAcikOnayliId(acikMi ? null : komiser.id)} className="w-full text-left p-3 flex justify-between items-center">
                        <div><h3 className={`font-bold text-md ${acikMi ? 'text-green-400' : 'text-slate-300'}`}>{komiser?.isim}</h3></div>
                        <div className="flex items-center gap-3">
                          <span className="bg-green-900/40 text-green-400 text-xs px-2 py-1 rounded border border-green-800/50">ONAYLI</span>
                          <span className="text-slate-500">{acikMi ? '▲' : '▼'}</span>
                        </div>
                      </button>
                      {acikMi && (
                        <div className="p-3 bg-slate-900/50 border-t border-slate-700/50 space-y-2">
                          {komiser.maclar.map((mac: any) => (
                            <div key={mac?.id} className="bg-slate-800 border-l-2 border-green-500 rounded p-2"><p className="font-bold text-slate-300 text-xs">{mac?.ev_sahibi} vs {mac?.misafir_takim}</p></div>
                          ))}
                        </div>
                      )}
                    </div>
                  )})}
                  {onayliKomiserler.length === 0 && <div className="text-center p-6 text-slate-500 italic">Henüz tebellüğ eden yok.</div>}
                </div>
              )}
            </div>

          </div>

          {/* SAĞ SÜTUN: MAZERET BİLDİRİMLERİ ANA KATEGORİLER (4 KUTU) */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden h-full shadow-lg flex flex-col">
            <div className="bg-amber-900/30 p-5 border-b border-amber-500/30 flex justify-between items-center">
              <h2 className="text-amber-400 font-black text-xl tracking-wider">MAZERET BİLDİRİMLERİ</h2>
              <span className="bg-amber-500 text-slate-900 text-sm font-bold px-3 py-1 rounded-full shadow-lg">{mazeretler.length} / {komiserler.length}</span>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto flex-1">

              {/* KUTU 1: 7/24 MÜSAİT */}
              <div className={`border rounded-xl transition-all overflow-hidden ${acikSagGrup === '724' ? 'border-green-500' : 'border-slate-600'}`}>
                <button onClick={() => setAcikSagGrup(acikSagGrup === '724' ? null : '724')} className="w-full bg-green-950/40 hover:bg-green-900/60 p-4 flex justify-between items-center transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-green-400 font-bold text-lg">🟩 TÜM HAFTA (7/24) MÜSAİT</span>
                    <span className="bg-green-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">{tamMusaitList.length}</span>
                  </div>
                  <span className="text-green-500">{acikSagGrup === '724' ? '▲' : '▼'}</span>
                </button>
                {acikSagGrup === '724' && (
                  <div className="p-3 bg-slate-900/50 space-y-2">
                    {tamMusaitList.length === 0 && <p className="text-slate-500 text-center italic py-2">Bu kategoride kimse yok.</p>}
                    {tamMusaitList.map(m => {
                      const isim = komiserler.find(k => k.komiser_id === m.komiser_id)?.ad_soyad || "Bilinmeyen";
                      const acikMi = acikMazeretId === m.id;
                      return (
                        <div key={m.id} className="border border-green-900/50 bg-slate-800 rounded-lg overflow-hidden">
                          <button onClick={() => setAcikMazeretId(acikMi ? null : m.id)} className="w-full text-left p-3 flex justify-between items-center hover:bg-slate-700/50">
                            <span className="font-bold text-green-300">{isim}</span><span className="text-slate-500">{acikMi ? '▲' : '▼'}</span>
                          </button>
                          {acikMi && (
                            <div className="p-3 bg-slate-900 border-t border-slate-700">
                              <div className="flex justify-start gap-4 text-xs uppercase font-bold text-slate-300 bg-green-950/30 p-2 rounded-md">
                                <span className={m.detaylar?.genelMerkez ? 'text-green-400' : 'opacity-30'}>✓ Merkez</span>
                                <span className={m.detaylar?.genelDeplasman ? 'text-green-400' : 'opacity-30'}>✓ Deplasman</span>
                              </div>
                              {m.aciklama && <p className="mt-2 text-slate-400 text-xs italic">Not: {m.aciklama}</p>}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* KUTU 2: SEÇMELİ */}
              <div className={`border rounded-xl transition-all overflow-hidden ${acikSagGrup === 'secmeli' ? 'border-blue-500' : 'border-slate-600'}`}>
                <button onClick={() => setAcikSagGrup(acikSagGrup === 'secmeli' ? null : 'secmeli')} className="w-full bg-blue-950/40 hover:bg-blue-900/60 p-4 flex justify-between items-center transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-blue-400 font-bold text-lg">🟦 SEÇMELİ MÜSAİTLİK</span>
                    <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">{secmeliList.length}</span>
                  </div>
                  <span className="text-blue-500">{acikSagGrup === 'secmeli' ? '▲' : '▼'}</span>
                </button>
                {acikSagGrup === 'secmeli' && (
                  <div className="p-3 bg-slate-900/50 space-y-2">
                    {secmeliList.length === 0 && <p className="text-slate-500 text-center italic py-2">Bu kategoride kimse yok.</p>}
                    {secmeliList.map(m => {
                      const isim = komiserler.find(k => k.komiser_id === m.komiser_id)?.ad_soyad || "Bilinmeyen";
                      const acikMi = acikMazeretId === m.id;
                      return (
                        <div key={m.id} className="border border-blue-900/50 bg-slate-800 rounded-lg overflow-hidden">
                          <button onClick={() => setAcikMazeretId(acikMi ? null : m.id)} className="w-full text-left p-3 flex justify-between items-center hover:bg-slate-700/50">
                            <span className="font-bold text-blue-300">{isim}</span><span className="text-slate-500">{acikMi ? '▲' : '▼'}</span>
                          </button>
                          {acikMi && (
                            <div className="p-3 bg-slate-900 border-t border-slate-700 space-y-1">
                              {['cuma', 'cumartesi', 'pazar', 'pazartesi', 'sali', 'carsamba', 'persembe'].map(gunKey => {
                                const gunData = m?.detaylar?.gunler?.[gunKey];
                                if (!gunData || !gunData.active) {
                                  return (
                                    <div key={gunKey} className="flex justify-between bg-red-950/10 p-2 rounded border border-red-900/20">
                                      <span className="text-red-400/80 font-bold text-xs">{gunIsimler[gunKey]}</span><span className="text-red-500/80 font-bold text-[10px] tracking-widest">KAPALI</span>
                                    </div>
                                  )
                                }
                                return (
                                  <div key={gunKey} className="flex flex-col sm:flex-row justify-between bg-slate-800 p-2 rounded border border-slate-600">
                                    <span className="text-blue-400 font-bold text-xs">{gunIsimler[gunKey]}</span>
                                    <div className="flex gap-2 text-[9px] mt-1 sm:mt-0">
                                      <span className="bg-slate-900 text-slate-300 px-2 py-1 rounded">{gunData.merkez && gunData.deplasman ? 'Merkez & Deplasman' : gunData.merkez ? 'Merkez' : gunData.deplasman ? 'Deplasman' : 'Yok'}</span>
                                      <span className={`px-2 py-1 rounded font-bold ${gunData.tumGun ? 'bg-green-900/80 text-green-300' : 'bg-amber-900/80 text-amber-300'}`}>{gunData.tumGun ? 'TÜM GÜN' : `${gunData.baslangic} - ${gunData.bitis}`}</span>
                                    </div>
                                  </div>
                                )
                              })}
                              {m.aciklama && <p className="mt-3 text-slate-400 text-xs italic border-t border-slate-700 pt-2">Not: {m.aciklama}</p>}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* KUTU 3: GÖREVE KAPALI */}
              <div className={`border rounded-xl transition-all overflow-hidden ${acikSagGrup === 'kapali' ? 'border-red-500' : 'border-slate-600'}`}>
                <button onClick={() => setAcikSagGrup(acikSagGrup === 'kapali' ? null : 'kapali')} className="w-full bg-red-950/40 hover:bg-red-900/60 p-4 flex justify-between items-center transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-red-400 font-bold text-lg">🟥 GÖREVE KAPALI OLANLAR</span>
                    <span className="bg-red-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">{goreveKapaliList.length}</span>
                  </div>
                  <span className="text-red-500">{acikSagGrup === 'kapali' ? '▲' : '▼'}</span>
                </button>
                {acikSagGrup === 'kapali' && (
                  <div className="p-3 bg-slate-900/50 space-y-2">
                    {goreveKapaliList.length === 0 && <p className="text-slate-500 text-center italic py-2">Bu kategoride kimse yok.</p>}
                    {goreveKapaliList.map(m => {
                      const isim = komiserler.find(k => k.komiser_id === m.komiser_id)?.ad_soyad || "Bilinmeyen";
                      const acikMi = acikMazeretId === m.id;
                      return (
                        <div key={m.id} className="border border-red-900/50 bg-slate-800 rounded-lg overflow-hidden">
                          <button onClick={() => setAcikMazeretId(acikMi ? null : m.id)} className="w-full text-left p-3 flex justify-between items-center hover:bg-slate-700/50">
                            <span className="font-bold text-red-300">{isim}</span><span className="text-slate-500">{acikMi ? '▲' : '▼'}</span>
                          </button>
                          {acikMi && (
                            <div className="p-3 bg-slate-900 border-t border-slate-700 text-center">
                              <span className="text-red-500 font-black text-sm tracking-widest uppercase">BU HAFTA GÖREV ALMAYACAK</span>
                              {m.aciklama && <p className="mt-2 text-slate-400 text-xs italic border-t border-slate-800 pt-2 text-left">Not: {m.aciklama}</p>}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* KUTU 4: MAZERET BİLDİRMEYENLER (SİSTEME GİRMEYENLER) */}
              <div className={`border rounded-xl transition-all overflow-hidden ${acikSagGrup === 'bildirmeyen' ? 'border-slate-500' : 'border-slate-600'}`}>
                <button onClick={() => setAcikSagGrup(acikSagGrup === 'bildirmeyen' ? null : 'bildirmeyen')} className="w-full bg-slate-800 hover:bg-slate-700 p-4 flex justify-between items-center transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-300 font-bold text-lg">⬜ MAZERET BİLDİRMEYENLER</span>
                    <span className="bg-slate-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">{bildirmeyenList.length}</span>
                  </div>
                  <span className="text-slate-400">{acikSagGrup === 'bildirmeyen' ? '▲' : '▼'}</span>
                </button>
                {acikSagGrup === 'bildirmeyen' && (
                  <div className="p-3 bg-slate-900/50 space-y-2">
                    {bildirmeyenList.length === 0 ? (
                      <p className="text-green-500 text-center font-bold py-2">Herkes bildirim yaptı! Süper!</p>
                    ) : (
                      bildirmeyenList.map(k => (
                        <div key={k.komiser_id} className="p-3 bg-slate-800 rounded-lg flex justify-between border border-slate-700/50">
                          <span className="font-bold text-slate-400">{k.ad_soyad}</span>
                          <span className="text-slate-500 font-mono text-[10px]">ID: {k.komiser_id}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  )
}