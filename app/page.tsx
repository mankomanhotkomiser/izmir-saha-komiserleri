"use client"
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toPng } from 'html-to-image'

type EkranTuru = 'giris' | 'dashboard' | 'gorevKartlari' | 'skorRapor' | 'mazeretBildir';

export default function Home() {
  const [aktifEkran, setAktifEkran] = useState<EkranTuru>('giris')
  
  const [kullaniciIdInput, setKullaniciIdInput] = useState('')
  const [girisHatasi, setGirisHatasi] = useState<string | null>(null)
  const [girisYukleniyor, setGirisYukleniyor] = useState(false)

  const [seciliKomiser, setSeciliKomiser] = useState<any | null>(null)
  const [komiserMaclari, setKomiserMaclari] = useState<any[]>([])
  const [macYukleniyor, setMacYukleniyor] = useState(false)
  
  const [haftaReferanslari, setHaftaReferanslari] = useState<number[]>([])
  const [globalAktifHaftaNo, setGlobalAktifHaftaNo] = useState<number>(1)
  
  const [arsivAcik, setArsivAcik] = useState(false)
  const [acikHaftalar, setAcikHaftalar] = useState<number[]>([])

  const [tebellugYukleniyor, setTebellugYukleniyor] = useState(false)
  const [mazeretKaydediliyor, setMazeretKaydediliyor] = useState(false)
  const [mazeretKaydedildi, setMazeretKaydedildi] = useState(false)

  // MAZERET STATE'LERİ
  const [kompleYokum, setKompleYokum] = useState(false)
  const [mazeretTipi, setMazeretTipi] = useState<'yok' | 'full' | 'secmeli' | null>(null)
  
  const [genelMerkez, setGenelMerkez] = useState(true)
  const [genelDeplasman, setGenelDeplasman] = useState(false)

  // DİNÇER HOCANIN TESPİTİ: tumGun artık false. Böylece saatler default olarak açık gelecek.
  const defaultGunDurumu = { active: false, merkez: true, deplasman: false, tumGun: false, baslangic: '09:00', bitis: '22:00' }
  const [gunler, setGunler] = useState<Record<string, any>>({
    cuma: { ...defaultGunDurumu },
    cumartesi: { ...defaultGunDurumu },
    pazar: { ...defaultGunDurumu },
    pazartesi: { ...defaultGunDurumu },
    sali: { ...defaultGunDurumu },
    carsamba: { ...defaultGunDurumu },
    persembe: { ...defaultGunDurumu }
  })

  const updateGun = (key: string, field: string, val: any) => {
    setGunler(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: val }
    }))
  }

  const [mazeretNotu, setMazeretNotu] = useState('')

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

  useEffect(() => {
    let aktif = true;
    async function arkaPlaniHazirla() {
      try {
        let tumMaclar: any[] = []
        let sayfa = 0
        const limit = 1000
        let veriKaldimi = true

        while (veriKaldimi && aktif) {
          const { data, error } = await supabase
            .from('musabakalar')
            .select('id, tarih, saat, saha, ev_sahibi, misafir_takim, kategori_adi, mac_kodu, tebellug_edildi')
            .range(sayfa * limit, (sayfa + 1) * limit - 1)

          if (error) break;

          if (data && data.length > 0) {
            tumMaclar = [...tumMaclar, ...data]
            if (data.length < limit) {
              veriKaldimi = false
            } else {
              sayfa++
              await new Promise(res => setTimeout(res, 50))
            }
          } else {
            veriKaldimi = false
          }
        }
        
        if (tumMaclar && tumMaclar.length > 0 && aktif) {
          const cumalar = tumMaclar.map(mac => mac?.tarih ? cumaBul(mac.tarih) : 0).filter(t => t > 0)
          const essizCumalar = Array.from(new Set(cumalar)).sort((a, b) => a - b)
          
          setHaftaReferanslari(essizCumalar)
          setGlobalAktifHaftaNo(essizCumalar.length)
        }
      } catch (err: any) {
        console.error("Arka plan yükleme hatası:", err)
      }
    }
    arkaPlaniHazirla()
    return () => { aktif = false; }
  }, [])

  const mazeretKapisiAcikMi = () => true; 
  const mazeretAcik = mazeretKapisiAcikMi();

  const girisYap = async (e?: React.FormEvent) => {
    if (e) e.preventDefault() 
    setGirisYukleniyor(true)
    setGirisHatasi(null)
    const temizId = kullaniciIdInput.replace(/\s+/g, '')
    if (!temizId) { setGirisHatasi("Lütfen ID numaranızı girin."); setGirisYukleniyor(false); return; }

    try {
      const { data, error } = await supabase.from('komiserler').select('*').eq('komiser_id', temizId).single()
      if (error || !data) { setGirisHatasi("Bu ID numarasına ait saha komiseri bulunamadı."); setGirisYukleniyor(false); return; }
      setSeciliKomiser(data)
      await komiserDetayGetir(data)
      setAktifEkran('dashboard') 
    } catch (err) {
      setGirisHatasi("Bağlantı sorunu oluştu, tekrar deneyin.")
    } finally {
      setGirisYukleniyor(false)
    }
  }

  const enterTusuKontrol = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') girisYap() }

  const cikisYap = () => {
    setSeciliKomiser(null)
    setKullaniciIdInput('')
    setKomiserMaclari([])
    setAktifEkran('giris')
    setArsivAcik(false)
    setAcikHaftalar([])
    
    // Mazeret Sıfırlama
    setMazeretTipi(null)
    setKompleYokum(false)
    setGenelMerkez(true)
    setGenelDeplasman(false)
    setMazeretNotu('')
    setGunler({
      cuma: { ...defaultGunDurumu },
      cumartesi: { ...defaultGunDurumu },
      pazar: { ...defaultGunDurumu },
      pazartesi: { ...defaultGunDurumu },
      sali: { ...defaultGunDurumu },
      carsamba: { ...defaultGunDurumu },
      persembe: { ...defaultGunDurumu }
    })
  }

  const komiserDetayGetir = async (komiser: any) => {
    setMacYukleniyor(true)
    const { data, error } = await supabase.from('musabakalar').select('*').eq('komiser_id', komiser.komiser_id).order('tarih', { ascending: false })
    if (data) setKomiserMaclari(data)
    setMacYukleniyor(false)
  }

  const gorevTuruBelirle = (kategori: string, macKodu: string) => {
    const kat = kategori ? kategori.toUpperCase() : ""
    const kod = macKodu ? macKodu.toUpperCase() : ""
    if (kod.includes('STAJ')) return "Stajyer / Saha Komiseri"
    if (kat.includes('U17') || kat.includes('U19') || kat.includes('PAF')) return "Denetçi"
    if (kat.includes('GELİŞİM') && (kat.includes('U13') || kat.includes('U14') || kat.includes('U15') || kat.includes('U16'))) return "Saha Komiseri / Denetçi"
    return "Saha Komiseri"
  }

  const kartiIndir = async () => {
    const element = document.getElementById('gorev-karti-alani');
    if (element) {
      try {
        const dataURL = await toPng(element, { backgroundColor: '#f1f5f9', pixelRatio: 2 });
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = `${seciliKomiser?.ad_soyad?.replace(/\s+/g, '_') || 'Komiser'}_Gorev_Karti.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) { alert("Görev kartı indirilirken bir sorun oluştu."); }
    }
  }

  const aktifMaclar: any[] = []
  const gecmisHaftalar: Record<number, any[]> = {} 

  if (haftaReferanslari.length > 0 && seciliKomiser) {
    komiserMaclari.forEach(mac => {
      const macCuma = mac?.tarih ? cumaBul(mac.tarih) : 0
      const macHaftaNo = haftaReferanslari.indexOf(macCuma) + 1 
      if (macHaftaNo === globalAktifHaftaNo) { aktifMaclar.push(mac) } 
      else if (macHaftaNo > 0 && macHaftaNo < globalAktifHaftaNo) {
        if (!gecmisHaftalar[macHaftaNo]) gecmisHaftalar[macHaftaNo] = []
        gecmisHaftalar[macHaftaNo].push(mac)
      }
    })
  }

  const hepsiTebellugEdilmis = aktifMaclar.length > 0 && aktifMaclar.every(mac => mac?.tebellug_edildi === true)

  const tebellugKaydet = async () => {
    if (aktifMaclar.length === 0) return;
    setTebellugYukleniyor(true);
    const aktifMacIdleri = aktifMaclar.map(m => m.id);
    const { error } = await supabase.from('musabakalar').update({ tebellug_edildi: true }).in('id', aktifMacIdleri);
    if (!error) {
      setKomiserMaclari(prev => prev.map(m => aktifMacIdleri.includes(m.id) ? { ...m, tebellug_edildi: true } : m));
    } else {
      alert("Görevler onaylanırken bir hata oluştu.");
    }
    setTebellugYukleniyor(false);
  }

  const mazeretKaydet = async () => {
    if (!mazeretTipi && !kompleYokum) {
      alert("⚠️ Lütfen size uygun olan seçeneklerden birini işaretleyiniz!"); return;
    }

    if (mazeretTipi === 'full' && !genelMerkez && !genelDeplasman) {
      alert("⚠️ Tüm Hafta Müsaitim seçeneğini işaretlediniz ancak Merkez veya Deplasman seçmediniz. Lütfen en az bir konum seçiniz."); return;
    }

    if (mazeretTipi === 'secmeli') {
      const aktifGunVarMi = Object.values(gunler).some(g => g.active);
      if (!aktifGunVarMi) {
        alert("⚠️ Seçmeli müsaitlik dediniz ancak hiçbir gün seçmediniz. Lütfen müsait olduğunuz günleri işaretleyiniz."); return;
      }
    }

    setMazeretKaydediliyor(true);
    const hedefHafta = globalAktifHaftaNo + 1;

    // Arka Planda Temizlik ve Admin Uyumu
    const temizGunler = JSON.parse(JSON.stringify(gunler));
    
    if (kompleYokum || mazeretTipi === 'yok') {
      Object.keys(temizGunler).forEach(g => { temizGunler[g].active = false; });
    } else if (mazeretTipi === 'full') {
      Object.keys(temizGunler).forEach(g => {
        temizGunler[g] = { active: true, merkez: genelMerkez, deplasman: genelDeplasman, tumGun: true, baslangic: '09:00', bitis: '22:00' };
      });
    }

    const payload = {
      komiser_id: seciliKomiser.komiser_id,
      hafta_no: hedefHafta,
      komple_yok: kompleYokum || mazeretTipi === 'yok',
      aciklama: mazeretNotu,
      detaylar: {
        mod: mazeretTipi,
        genelMerkez: mazeretTipi === 'full' ? genelMerkez : null,
        genelDeplasman: mazeretTipi === 'full' ? genelDeplasman : null,
        gunler: (mazeretTipi === 'secmeli' || mazeretTipi === 'full') ? temizGunler : null
      }
    };

    try {
      await supabase.from('mazeretler').delete().match({ komiser_id: seciliKomiser.komiser_id, hafta_no: hedefHafta });
      const { error } = await supabase.from('mazeretler').insert([payload]);

      if (!error) {
        setMazeretKaydedildi(true);
        setTimeout(() => {
          setAktifEkran('dashboard');
          setMazeretKaydedildi(false);
        }, 2000);
      } else { alert("Mazeret sisteme iletilemedi: " + error.message); }
    } catch (err) { alert("Bağlantı hatası oluştu."); } 
    finally { setMazeretKaydediliyor(false); }
  }

  const haftaToggle = (haftaNo: number) => {
    setAcikHaftalar(prev => prev.includes(haftaNo) ? prev.filter(h => h !== haftaNo) : [...prev, haftaNo])
  }

  const renderGunSatiri = (key: string, label: string) => {
    const g = gunler[key]
    return (
      <div key={key} className={`border ${g.active ? 'border-blue-400 bg-blue-50/30 shadow-md' : 'border-slate-200 bg-white'} rounded-xl overflow-hidden mb-3 transition-all`}>
        <label className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${g.active ? 'bg-blue-100/50' : 'hover:bg-slate-50'}`}>
          <input type="checkbox" checked={g.active} onChange={e => updateGun(key, 'active', e.target.checked)} className="w-6 h-6 text-blue-600 rounded focus:ring-blue-500 cursor-pointer" />
          <span className={`font-bold text-lg ${g.active ? 'text-blue-800' : 'text-slate-600'}`}>{label}</span>
        </label>
        
        {g.active && (
          <div className="p-4 border-t border-blue-200 bg-white animate-fade-in-down space-y-4">
            <div className="flex flex-wrap gap-6 bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-sm">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={g.merkez} onChange={e => updateGun(key, 'merkez', e.target.checked)} className="w-5 h-5 text-blue-500 rounded focus:ring-blue-400" /><span className="text-sm font-bold text-slate-700">Merkez</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={g.deplasman} onChange={e => updateGun(key, 'deplasman', e.target.checked)} className="w-5 h-5 text-blue-500 rounded focus:ring-blue-400" /><span className="text-sm font-bold text-slate-700">Deplasman</span></label>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm">
              <label className="flex items-center gap-3 cursor-pointer mb-3 pb-3 border-b border-slate-200"><input type="checkbox" checked={g.tumGun} onChange={e => updateGun(key, 'tumGun', e.target.checked)} className="w-6 h-6 text-green-600 rounded focus:ring-green-500" /><span className="text-base font-bold text-green-800">Tüm Gün Müsaitim</span></label>

              {!g.tumGun && (
                <div className="mt-2 animate-fade-in-down">
                  <div className="flex items-center gap-4">
                    <div className="flex-1"><label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-1">Başlangıç Saati</label><input type="time" value={g.baslangic} onChange={e => updateGun(key, 'baslangic', e.target.value)} className="w-full p-3 border-2 border-slate-300 rounded-lg focus:border-blue-500 font-mono text-base" /></div>
                    <span className="text-slate-400 font-bold mt-5">-</span>
                    <div className="flex-1"><label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-1">Bitiş Saati</label><input type="time" value={g.bitis} onChange={e => updateGun(key, 'bitis', e.target.value)} className="w-full p-3 border-2 border-slate-300 rounded-lg focus:border-blue-500 font-mono text-base" /></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  const OrtakHeader = ({ geriButonuGoster = false }) => (
    <header className="bg-blue-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-bold text-sm md:text-base leading-tight">İzmir Futbol Saha</h1>
            <h1 className="font-bold text-sm md:text-base leading-tight text-blue-200">Komiserleri Derneği</h1>
            <p className="text-blue-300 text-[10px] mt-0.5 font-mono">{globalAktifHaftaNo}. Program Haftası</p>
          </div>
        </div>
        {geriButonuGoster ? (
          <button onClick={() => { setAktifEkran('dashboard'); setArsivAcik(false); setAcikHaftalar([]); }} className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs md:text-sm font-bold py-1.5 px-3 rounded-lg shadow transition-colors border border-blue-500">Geri</button>
        ) : (
          <button onClick={cikisYap} className="bg-red-600 hover:bg-red-700 text-white text-xs md:text-sm font-bold py-1.5 px-3 rounded shadow transition-colors">Çıkış</button>
        )}
      </div>
    </header>
  )

  if (aktifEkran === 'dashboard') {
    return (
      <main className="min-h-screen bg-slate-200 flex flex-col font-sans">
        <OrtakHeader />
        <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 flex flex-col md:flex-row items-center gap-6 border-t-4 border-blue-900">
            <div className="text-center md:text-left flex-1">
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">{seciliKomiser?.ad_soyad}</h2>
              <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-2">
                <span className="bg-blue-100 text-blue-800 font-mono text-xs font-bold px-3 py-1 rounded-full border border-blue-200">ID: {seciliKomiser?.komiser_id}</span>
                <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full border border-green-200">Bu Sezon: {komiserMaclari.length} Görev</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button onClick={() => setAktifEkran('gorevKartlari')} className="flex flex-col items-center justify-center p-6 rounded-2xl shadow-md bg-white border-2 border-blue-200 hover:border-blue-500 hover:shadow-blue-200 transition-all transform hover:scale-105"><h4 className="font-bold text-lg text-slate-800">Görev Kartım</h4><p className="text-xs text-center mt-2 text-slate-500">Atanan maçlarınızı görün ve görevi tebellüğ edin.</p></button>
            <button onClick={() => setAktifEkran('skorRapor')} className="flex flex-col items-center justify-center p-6 rounded-2xl shadow-md bg-white border-2 border-green-200 hover:border-green-500 hover:shadow-green-200 transition-all transform hover:scale-105"><h4 className="font-bold text-lg text-slate-800 text-center">Skor & Saha Raporu</h4></button>
          </div>
          {mazeretAcik ? (
            <button onClick={() => setAktifEkran('mazeretBildir')} className="w-full flex items-center justify-between p-4 md:p-6 rounded-2xl shadow-md bg-white border-2 border-red-200 hover:border-red-500"><div className="text-left"><h4 className="font-bold text-lg text-slate-800">Müsaitlik / Mazeret</h4></div></button>
          ) : (
            <button disabled className="w-full p-4 rounded-2xl bg-slate-100 opacity-60 cursor-not-allowed"><h4 className="font-bold text-sm text-slate-500 text-left">Sistem Kapalı</h4></button>
          )}
        </div>
      </main>
    )
  }

  if (aktifEkran === 'gorevKartlari') {
    return (
      <main className="min-h-screen bg-slate-200 flex flex-col font-sans">
        <OrtakHeader geriButonuGoster={true} />
        <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 overflow-y-auto">
          <div id="gorev-karti-alani" className="bg-slate-200 min-h-full">
            <div className="bg-white p-4 rounded-xl shadow-sm mb-5 border-b-2 border-blue-900 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left">
                <h4 className="text-lg font-bold text-blue-900 tracking-wide uppercase">{seciliKomiser?.ad_soyad}</h4>
                <p className="text-red-600 font-semibold mt-1">{globalAktifHaftaNo}. Hafta Görev Bülteni</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={tebellugKaydet} disabled={hepsiTebellugEdilmis || tebellugYukleniyor || aktifMaclar.length === 0} className={`text-sm font-bold py-2 px-4 rounded-lg shadow flex items-center gap-2 transition-colors ${hepsiTebellugEdilmis ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300' : aktifMaclar.length > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
                  {tebellugYukleniyor ? 'İşleniyor...' : hepsiTebellugEdilmis ? '✓ Tebellüğ Edildi' : 'Tebellüğ Et (Görevleri Aldım)'}
                </button>
                <button onClick={kartiIndir} className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 px-4 rounded-lg shadow">İndir / Paylaş</button>
              </div>
            </div>

            {macYukleniyor ? (
              <div className="text-center text-blue-800 py-8 animate-pulse font-semibold">Görevleriniz aranıyor...</div>
            ) : (
              <>
                <div className="mb-6">
                  {aktifMaclar.length === 0 ? (
                    <div className="text-center text-slate-500 py-8 bg-white rounded-xl">Aktif göreviniz bulunmuyor.</div>
                  ) : (
                    <div className="space-y-4">
                      {aktifMaclar.map((mac) => (
                        <div key={mac?.id} className="bg-white border-l-4 border-blue-800 shadow-md rounded-r-xl p-4">
                          <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3"><span className="font-bold text-blue-950 text-lg md:text-xl">{mac?.ev_sahibi} <span className="text-slate-400 font-medium mx-1 text-base">vs</span> {mac?.misafir_takim}</span></div>
                          <div className="grid grid-cols-2 gap-3 text-sm text-slate-700 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <div className="flex flex-col"><span className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">Tarih & Saat</span><span className="font-bold text-slate-800">{mac?.tarih ? new Date(mac.tarih).toLocaleDateString('tr-TR') : ""} - {mac?.saat ? mac.saat.substring(0, 5) : ""}</span></div>
                            <div className="flex flex-col"><span className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">Saha</span><span className="font-bold text-slate-800">{mac?.saha}</span></div>
                            <div className="flex flex-col mt-2 pt-3 border-t border-slate-200"><span className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">Kategori / Lig</span><span className="font-bold text-slate-800">{mac?.kategori_adi} <span className="text-xs font-normal text-slate-500 block sm:inline mt-1 sm:mt-0 sm:ml-1">(Kod: {mac?.mac_kodu})</span></span></div>
                            <div className="flex flex-col mt-2 pt-3 border-t border-slate-200"><span className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">Atanan Görev</span><span className="font-extrabold text-blue-700">{gorevTuruBelirle(mac?.kategori_adi, mac?.mac_kodu)}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {Object.keys(gecmisHaftalar).length > 0 && (
                  <div className="mt-8 border-t-2 border-slate-300 pt-6">
                    <button onClick={() => setArsivAcik(!arsivAcik)} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-4 px-5 rounded-xl shadow-md flex justify-between items-center">
                      <span>Geçmiş Maç Arşivi</span><span className="text-xl">{arsivAcik ? '▲' : '▼'}</span>
                    </button>
                    {arsivAcik && (
                      <div className="mt-4 space-y-4">
                        {Object.keys(gecmisHaftalar).map(Number).sort((a, b) => b - a).map(haftaNo => (
                          <div key={haftaNo} className="border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                            <button onClick={() => haftaToggle(haftaNo)} className="w-full bg-slate-300 text-slate-900 font-bold py-3 px-5 flex justify-between items-center">
                              <span>{haftaNo}. Hafta Görevleri <span className="bg-slate-800 text-white text-xs px-2 py-1 rounded ml-2">{gecmisHaftalar[haftaNo].length} Görev</span></span>
                              <span>{acikHaftalar.includes(haftaNo) ? '▲' : '▼'}</span>
                            </button>
                            {acikHaftalar.includes(haftaNo) && (
                              <div className="p-4 bg-slate-100 space-y-4">
                                {gecmisHaftalar[haftaNo].map((mac: any) => (
                                  <div key={mac?.id} className="bg-white border-l-4 border-slate-500 shadow-sm rounded-r-xl p-4 opacity-95 relative">
                                    <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
                                      <span className="font-bold text-slate-700 text-lg md:text-xl leading-tight">{mac?.ev_sahibi} <span className="text-slate-400 font-medium mx-1 text-base">vs</span> {mac?.misafir_takim}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-sm text-slate-600 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                      <div className="flex flex-col"><span className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">Tarih & Saat</span> <span className="font-bold text-slate-700">{mac?.tarih ? new Date(mac.tarih).toLocaleDateString('tr-TR') : ""} - {mac?.saat ? mac.saat.substring(0, 5) : ""}</span></div>
                                      <div className="flex flex-col"><span className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">Saha</span> <span className="font-bold text-slate-700">{mac?.saha}</span></div>
                                      <div className="flex flex-col mt-2 pt-3 border-t border-slate-200"><span className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">Kategori / Lig</span> <span className="font-bold text-slate-700">{mac?.kategori_adi} <span className="text-xs font-normal text-slate-500 block sm:inline mt-1 sm:mt-0 sm:ml-1">(Kod: {mac?.mac_kodu})</span></span></div>
                                      <div className="flex flex-col mt-2 pt-3 border-t border-slate-200"><span className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">Atanan Görev</span> <span className="font-extrabold text-slate-700">{gorevTuruBelirle(mac?.kategori_adi, mac?.mac_kodu)}</span></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    )
  }

  if (aktifEkran === 'mazeretBildir') {
    return (
      <main className="min-h-screen bg-slate-100 flex flex-col font-sans">
        <OrtakHeader geriButonuGoster={true} />
        <div className="flex-1 w-full max-w-2xl mx-auto p-4 md:p-6 pb-20">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-t-4 border-blue-500">
            {mazeretKaydedildi ? (
              <div className="p-10 text-center animate-fade-in-down"><h2 className="text-2xl font-bold text-slate-800">Müsaitlik Durumu İletildi!</h2><p className="text-slate-500 mt-2">Merkezimize başarıyla kaydedildi. Ana ekrana yönlendiriliyorsunuz...</p></div>
            ) : (
              <>
                <div className="bg-slate-50 p-6 border-b border-slate-200 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>
                  <h2 className="text-xl font-bold text-slate-800">Haftalık Müsaitlik Durumu</h2><p className="text-slate-500 text-sm mt-1">Önümüzdeki TFF bülteni için görev tercihlerinizi belirleyin.</p>
                </div>

                <div className="p-6 space-y-8">
                  <div className={`border rounded-xl p-4 flex items-start gap-4 transition-colors hover:bg-red-50 ${kompleYokum ? 'bg-red-50 border-red-500 ring-2 ring-red-200' : 'bg-white border-slate-200'}`}>
                    <input type="checkbox" id="kompleYokum" checked={kompleYokum} onChange={(e) => { setKompleYokum(e.target.checked); if (e.target.checked) { setMazeretTipi(null); } }} className="mt-1 w-6 h-6 text-red-600 rounded cursor-pointer" />
                    <label htmlFor="kompleYokum" className="cursor-pointer">
                      <span className={`block font-bold text-lg ${kompleYokum ? 'text-red-700' : 'text-slate-700'}`}>Bu hafta görev alamayacağım.</span><span className="block text-sm mt-1 text-slate-500">İşaretlerseniz tüm hafta boyunca (hafta içi ve hafta sonu) kapalı görünürsünüz.</span>
                    </label>
                  </div>

                  {!kompleYokum && (
                    <div className="space-y-4 mt-8 animate-fade-in-down">

                      <div className={`border-2 rounded-xl transition-all ${mazeretTipi === 'full' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
                        <label className="flex items-start gap-4 p-4 cursor-pointer">
                          <input type="radio" name="mazeret" checked={mazeretTipi === 'full'} onChange={() => setMazeretTipi('full')} className="w-6 h-6 text-blue-600 mt-0.5" />
                          <div><span className="font-bold text-lg text-slate-800 block leading-tight">Tüm Hafta Müsaitim (7/24)</span><span className="text-sm text-slate-500 block mt-1">Günün her saati, haftanın 7 günü her maça açığım.</span></div>
                        </label>
                        {mazeretTipi === 'full' && (
                          <div className="p-4 border-t border-blue-200 bg-white m-2 rounded-lg flex flex-wrap gap-6 animate-fade-in-down">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700"><input type="checkbox" checked={genelMerkez} onChange={e => setGenelMerkez(e.target.checked)} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" /> Merkez</label>
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700"><input type="checkbox" checked={genelDeplasman} onChange={e => setGenelDeplasman(e.target.checked)} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" /> Deplasman</label>
                          </div>
                        )}
                      </div>

                      <div className={`border-2 rounded-xl transition-all ${mazeretTipi === 'secmeli' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
                        <label className="flex items-start gap-4 p-4 cursor-pointer">
                          <input type="radio" name="mazeret" checked={mazeretTipi === 'secmeli'} onChange={() => setMazeretTipi('secmeli')} className="w-6 h-6 text-blue-600 mt-0.5" />
                          <div><span className="font-bold text-lg text-slate-800 block leading-tight">Seçmeli Müsaitlik</span><span className="text-sm text-slate-500 block mt-1">Sadece aşağıda seçeceğim gün ve saatlerde müsaitim.</span></div>
                        </label>
                        {mazeretTipi === 'secmeli' && (
                          <div className="p-4 border-t border-blue-200 bg-transparent m-2 rounded-lg space-y-4 animate-fade-in-down">
                            {renderGunSatiri('cuma', 'Cuma')}
                            {renderGunSatiri('cumartesi', 'Cumartesi')}
                            {renderGunSatiri('pazar', 'Pazar')}
                            {renderGunSatiri('pazartesi', 'Pazartesi')}
                            {renderGunSatiri('sali', 'Salı')}
                            {renderGunSatiri('carsamba', 'Çarşamba')}
                            {renderGunSatiri('persembe', 'Perşembe')}
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                  <div className="pt-6 border-t border-slate-200 mt-8">
                    <h3 className="font-bold text-slate-700 pb-2 mb-2">Ek Açıklama / Not</h3>
                    <textarea value={mazeretNotu} onChange={(e) => setMazeretNotu(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-4 focus:border-blue-500 min-h-[100px] shadow-sm" placeholder="Yönetime iletmek istediğiniz ek bir not... (Örn: Arabam bozuldu vb.)"></textarea>
                  </div>
                  
                  <button onClick={mazeretKaydet} disabled={mazeretKaydediliyor} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg mt-4 text-lg disabled:opacity-70">
                    {mazeretKaydediliyor ? 'Kaydediliyor...' : 'Müsaitlik Durumumu Kaydet'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    )
  }

  if (aktifEkran === 'giris') {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-blue-900 p-8 text-center flex flex-col items-center justify-center space-y-1"><h1 className="text-3xl font-black text-white">İZMİR</h1></div>
          <div className="p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Sisteme Giriş Yapın</h2>
            {girisHatasi && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200 text-center">{girisHatasi}</div>}
            <div className="space-y-6">
              <div><input type="text" inputMode="numeric" value={kullaniciIdInput} onChange={(e) => setKullaniciIdInput(e.target.value)} onKeyDown={enterTusuKontrol} className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-center font-mono tracking-widest text-lg" disabled={girisYukleniyor} /></div>
              <button type="button" onClick={girisYap} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg" disabled={girisYukleniyor}>{girisYukleniyor ? 'Giriş Yapılıyor...' : "Giriş Yap"}</button>
            </div>
          </div>
        </div>
      </main>
    )
  }
  return null;
}