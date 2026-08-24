"use client"
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'

export default function AdminPage() {
  const [sifre, setSifre] = useState('')
  const [girisYapildi, setGirisYapildi] = useState(false)
  const [hata, setHatasi] = useState('')
  
  const [tumMaclar, setTumMaclar] = useState<any[]>([])
  const [tumKomiserler, setTumKomiserler] = useState<any[]>([])
  const [globalAktifHaftaNo, setGlobalAktifHaftaNo] = useState<number>(1)
  const [yukleniyor, setYukleniyor] = useState(true)

  const girisKontrol = (e: React.FormEvent) => {
    e.preventDefault()
    if (sifre === '1923') { setGirisYapildi(true); setHatasi(''); } 
    else { setHatasi('Hatalı şifre. Karargaha giriş reddedildi.') }
  }

  const cumaBul = (tarihMetni: string) => {
    if (!tarihMetni) return 0
    try {
      const parcalar = tarihMetni.split('-')
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

  const siralamaFiltresi = (a: any, b: any) => {
    const datetimeA = new Date(`${a.tarih || '1970-01-01'}T${a.saat || '00:00:00'}`).getTime();
    const datetimeB = new Date(`${b.tarih || '1970-01-01'}T${b.saat || '00:00:00'}`).getTime();
    return datetimeA - datetimeB;
  }

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
            
            // TARİHE GÖRE SIRALA
            aktifHaftaMaclari.sort(siralamaFiltresi);
            setTumMaclar(aktifHaftaMaclari)
        }
      }
    } catch (err) { console.error("Veri çekme hatası", err) }
    setYukleniyor(false)
  }

  const komiserIsmiBul = (id: string) => {
    const komiser = tumKomiserler.find(k => k.komiser_id === id)
    return komiser ? komiser.ad_soyad : 'Atanmamış'
  }

  if (!girisYapildi) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700">
          <div className="text-center mb-8">
            <span className="text-5xl block mb-4">🛡️</span>
            <h1 className="text-2xl font-black text-white tracking-widest uppercase">KARARGAH GİRİŞİ</h1>
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
  const bekleyenMaclar = tumMaclar.filter(m => !m.skor_girildi)

  const RaporDurumKarti = ({ mac, tip }: { mac: any, tip: 'emniyet' | 'teknik' | 'olaysiz' | 'bekleyen' }) => {
    let borderRenk = "border-slate-700";
    let bgRenk = "bg-slate-800";
    
    if (tip === 'emniyet') { borderRenk = "border-red-600/50"; bgRenk = "bg-red-950/20"; }
    else if (tip === 'teknik') { borderRenk = "border-amber-500/50"; bgRenk = "bg-amber-950/20"; }

    return (
      <div className={`${bgRenk} border-l-4 ${borderRenk} shadow-md rounded-r-xl p-3 md:p-4 mb-3 transition-all hover:bg-slate-800/80 group`}>
        <div className="flex justify-between items-start mb-2">
            <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  {tip === 'emniyet' && <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">EMNİYETLİK</span>}
                  {tip === 'teknik' && <span className="bg-amber-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">{mac.olay_durumu.replace('_', ' ')}</span>}
                  <span className="text-slate-400 text-[9px] font-mono">{mac.saha}</span>
                </div>
                <h3 className="font-bold text-sm md:text-base text-white leading-tight">
                    {mac.ev_sahibi} <span className="text-slate-500 mx-1 text-xs">vs</span> {mac.misafir_takim}
                </h3>
            </div>
            
            <div className="flex flex-col items-end">
                {mac.skor_girildi ? (
                    mac.mac_durumu === 'oynandi' ? (
                        <span className="font-black text-xl text-white tracking-widest bg-slate-900 px-3 py-1 rounded border border-slate-700 shadow-inner">
                            {mac.ev_sahibi_skor} - {mac.misafir_skor}
                        </span>
                    ) : (
                        <span className="text-[10px] font-bold text-amber-400 uppercase text-right bg-slate-900 px-2 py-1 rounded border border-slate-700">
                            {mac.mac_durumu.replace(/_/g, ' ')}
                        </span>
                    )
                ) : (
                    <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-900 px-2 py-1 rounded border border-slate-700">BEKLİYOR</span>
                )}
            </div>
        </div>

        {/* DİNÇER HOCAM BURAYI GÜNCELLEDİM (Saat ve Komiser Ortada) */}
        <div className="flex flex-col">
            <span className="text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">{mac.kategori_adi}</span>
            <div className="text-[10px] text-slate-500 mb-2">{guvenliTarih(mac.tarih)} - {mac.saat?.substring(0,5)}</div>
            <div className="mt-2 pt-2 border-t border-slate-700/50 text-center">
                <span className="text-xs font-bold text-slate-300">KOMİSER: <span className="text-white uppercase">{komiserIsmiBul(mac.komiser_id)}</span></span>
            </div>
        </div>

        {mac.rapor_notu && (
            <div className="mt-3 p-3 bg-slate-900 rounded border border-slate-700/50">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Görev Raporu / Tutanak Notu</span>
                <p className="text-xs text-slate-300 font-serif leading-relaxed italic">"{mac.rapor_notu}"</p>
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
              <h1 className="font-black text-lg md:text-xl text-white tracking-widest uppercase">KARARGAH MERKEZİ</h1>
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
            
            {/* EMNİYETLİK OLAYLAR */}
            <section className="bg-slate-900 border border-red-900/50 rounded-xl overflow-hidden shadow-2xl relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                <div className="bg-red-950/40 p-4 border-b border-red-900/30 flex justify-between items-center">
                    <h2 className="text-red-500 font-black tracking-widest uppercase flex items-center gap-2"><span className="text-xl">🚨</span> KIRMIZI KOD (EMNİYETLİK)</h2>
                    <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">{emniyetlikMaclar.length} RAPOR</span>
                </div>
                <div className="p-4">
                    {emniyetlikMaclar.length === 0 ? ( <div className="text-center py-6 text-slate-500 text-sm font-bold">Kayıtlı emniyetlik olay bulunmuyor.</div> ) : (
                        emniyetlikMaclar.map(mac => <RaporDurumKarti key={mac.id} mac={mac} tip="emniyet" />)
                    )}
                </div>
            </section>

            {/* TEKNİK OLAYLAR */}
            <section className="bg-slate-900 border border-amber-900/50 rounded-xl overflow-hidden shadow-xl relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                <div className="bg-amber-950/20 p-4 border-b border-amber-900/30 flex justify-between items-center">
                    <h2 className="text-amber-500 font-black tracking-widest uppercase flex items-center gap-2"><span className="text-xl">⚠️</span> DİĞER OLAYLAR (TEKNİK / SAHA)</h2>
                    <span className="bg-amber-600 text-white text-xs font-bold px-2 py-1 rounded">{teknikMaclar.length} RAPOR</span>
                </div>
                <div className="p-4">
                    {teknikMaclar.length === 0 ? ( <div className="text-center py-6 text-slate-500 text-sm font-bold">Kayıtlı teknik/saha olayı bulunmuyor.</div> ) : (
                        teknikMaclar.map(mac => <RaporDurumKarti key={mac.id} mac={mac} tip="teknik" />)
                    )}
                </div>
            </section>

            {/* İKİLİ IZGARA (OLAYSIZ VE BEKLEYENLER) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* OLAYSIZ MÜSABAKALAR */}
                <section className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-lg flex flex-col max-h-[600px]">
                    <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center sticky top-0 z-10">
                        <h2 className="text-green-500 font-black tracking-widest uppercase flex items-center gap-2"><span className="text-xl">✓</span> OLAYSIZ MÜSABAKALAR</h2>
                        <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">{olaysizMaclar.length} MAÇ</span>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                        {olaysizMaclar.length === 0 ? ( <div className="text-center py-6 text-slate-500 text-sm font-bold">Henüz olaysız biten maç raporu yok.</div> ) : (
                            olaysizMaclar.map(mac => <RaporDurumKarti key={mac.id} mac={mac} tip="olaysiz" />)
                        )}
                    </div>
                </section>

                {/* RAPOR BEKLENENLER */}
                <section className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-lg flex flex-col max-h-[600px]">
                    <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center sticky top-0 z-10">
                        <h2 className="text-slate-300 font-black tracking-widest uppercase flex items-center gap-2"><span className="text-xl">⏳</span> RAPOR BEKLENENLER</h2>
                        <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2 py-1 rounded">{bekleyenMaclar.length} MAÇ</span>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                        {bekleyenMaclar.length === 0 ? ( <div className="text-center py-6 text-slate-500 text-sm font-bold">Tüm görevlerin raporları girilmiş.</div> ) : (
                            bekleyenMaclar.map(mac => <RaporDurumKarti key={mac.id} mac={mac} tip="bekleyen" />)
                        )}
                    </div>
                </section>
            </div>

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