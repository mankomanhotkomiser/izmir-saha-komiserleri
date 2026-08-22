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

  // VERİTABANI İŞLEM DURUMLARI
  const [tebellugYukleniyor, setTebellugYukleniyor] = useState(false)
  const [mazeretKaydediliyor, setMazeretKaydediliyor] = useState(false)
  const [mazeretKaydedildi, setMazeretKaydedildi] = useState(false)

  // MAZERET STATE MAKİNESİ
  const [kompleYokum, setKompleYokum] = useState(false)
  const [haftaIciYokum, setHaftaIciYokum] = useState(false)
  const [haftaIciMusait, setHaftaIciMusait] = useState(false)
  const [haftaSonuYokum, setHaftaSonuYokum] = useState(false)
  const [haftaSonuMusait, setHaftaSonuMusait] = useState(false) 

  useEffect(() => {
    if (haftaIciYokum && haftaSonuYokum) {
      setKompleYokum(true);
      setHaftaIciYokum(false);
      setHaftaSonuYokum(false);
    }
  }, [haftaIciYokum, haftaSonuYokum])

  const handleKompleYokum = (val: boolean) => {
    setKompleYokum(val)
    if (val) {
      setHaftaIciYokum(false)
      setHaftaIciMusait(false)
      setHaftaSonuYokum(false)
      setHaftaSonuMusait(false)
    }
  }

  const handleHaftaIciYokum = (val: boolean) => {
    setHaftaIciYokum(val)
    if (val) setHaftaIciMusait(false)
  }
  const handleHaftaIciMusait = (val: boolean) => {
    setHaftaIciMusait(val)
    if (val) setHaftaIciYokum(false)
  }
  
  const handleHaftaSonuYokum = (val: boolean) => {
    setHaftaSonuYokum(val)
    if (val) setHaftaSonuMusait(false)
  }
  const handleHaftaSonuMusait = (val: boolean) => {
    setHaftaSonuMusait(val)
    if (val) setHaftaSonuYokum(false)
  }

  const defaultGunDurumu = { active: false, merkez: true, deplasman: false, tumGun: true, baslangic: '09:00', bitis: '22:00' }
  
  const [gunler, setGunler] = useState<Record<string, any>>({
    cuma: { ...defaultGunDurumu },
    pazartesi: { ...defaultGunDurumu },
    sali: { ...defaultGunDurumu },
    carsamba: { ...defaultGunDurumu },
    persembe: { ...defaultGunDurumu },
    cumartesi: { ...defaultGunDurumu },
    pazar: { ...defaultGunDurumu }
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
          const cumalar = tumMaclar.map(mac => cumaBul(mac.tarih)).filter(t => t > 0)
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

    if (!temizId) {
      setGirisHatasi("Lütfen ID numaranızı girin.")
      setGirisYukleniyor(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('komiserler')
        .select('*')
        .eq('komiser_id', temizId)
        .single()

      if (error || !data) {
        setGirisHatasi("Bu ID numarasına ait saha komiseri bulunamadı.")
        setGirisYukleniyor(false)
        return
      }

      setSeciliKomiser(data)
      await komiserDetayGetir(data)
      setAktifEkran('dashboard') 
    } catch (err) {
      setGirisHatasi("Bağlantı sorunu oluştu, tekrar deneyin.")
    } finally {
      setGirisYukleniyor(false)
    }
  }

  const enterTusuKontrol = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') girisYap()
  }

  const cikisYap = () => {
    setSeciliKomiser(null)
    setKullaniciIdInput('')
    setKomiserMaclari([])
    setAktifEkran('giris')
    setArsivAcik(false)
    setAcikHaftalar([])
  }

  const komiserDetayGetir = async (komiser: any) => {
    setMacYukleniyor(true)
    const { data, error } = await supabase
      .from('musabakalar')
      .select('*')
      .eq('komiser_id', komiser.komiser_id)
      .order('tarih', { ascending: false })

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
        link.download = `${seciliKomiser?.ad_soyad.replace(/\s+/g, '_')}_Gorev_Karti.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        alert("Görev kartı indirilirken bir sorun oluştu.");
      }
    }
  }

  const aktifMaclar: any[] = []
  const gecmisHaftalar: Record<number, any[]> = {} 

  if (haftaReferanslari.length > 0 && seciliKomiser) {
    komiserMaclari.forEach(mac => {
      const macCuma = cumaBul(mac.tarih)
      const macHaftaNo = haftaReferanslari.indexOf(macCuma) + 1 

      if (macHaftaNo === globalAktifHaftaNo) {
        aktifMaclar.push(mac)
      } else if (macHaftaNo > 0 && macHaftaNo < globalAktifHaftaNo) {
        if (!gecmisHaftalar[macHaftaNo]) gecmisHaftalar[macHaftaNo] = []
        gecmisHaftalar[macHaftaNo].push(mac)
      }
    })
  }

  // Aktif maçların tamamı tebellüğ edilmiş mi kontrolü
  const hepsiTebellugEdilmis = aktifMaclar.length > 0 && aktifMaclar.every(mac => mac.tebellug_edildi === true)

  // ==========================================
  // TEBELLÜĞ KAYDET MOTORU (SUPABASE)
  // ==========================================
  const tebellugKaydet = async () => {
    if (aktifMaclar.length === 0) return;
    setTebellugYukleniyor(true);
    
    const aktifMacIdleri = aktifMaclar.map(m => m.id);
    
    const { error } = await supabase
      .from('musabakalar')
      .update({ tebellug_edildi: true })
      .in('id', aktifMacIdleri);

    if (!error) {
      // Ekranda hemen güncellenmiş göstermek için yerel veriyi de eziyoruz
      setKomiserMaclari(prev => prev.map(m => aktifMacIdleri.includes(m.id) ? { ...m, tebellug_edildi: true } : m));
    } else {
      alert("Görevler onaylanırken bir hata oluştu. Lütfen tekrar deneyin.");
    }
    setTebellugYukleniyor(false);
  }

  // ==========================================
  // MAZERET KAYDET MOTORU (SUPABASE)
  // ==========================================
  const mazeretKaydet = async () => {
    setMazeretKaydediliyor(true);
    const hedefHafta = globalAktifHaftaNo + 1; // Gelecek hafta için mazeret

    const payload = {
      komiser_id: seciliKomiser.komiser_id,
      hafta_no: hedefHafta,
      komple_yok: kompleYokum,
      not: mazeretNotu,
      detaylar: {
        haftaIciYokum,
        haftaIciMusait,
        haftaSonuYokum,
        haftaSonuMusait,
        gunler
      }
    };

    try {
      // Aynı hafta için önceden verilmiş mazereti sil (mükerrer olmasın diye)
      await supabase.from('mazeretler').delete().match({ komiser_id: seciliKomiser.komiser_id, hafta_no: hedefHafta });
      
      // Yeni mazereti yaz
      const { error } = await supabase.from('mazeretler').insert([payload]);

      if (!error) {
        setMazeretKaydedildi(true);
        // 2 saniye sonra başarılı mesajıyla birlikte Ana Karargah'a dön
        setTimeout(() => {
          setAktifEkran('dashboard');
          setMazeretKaydedildi(false);
        }, 2000);
      } else {
        alert("Mazeret sisteme iletilemedi: " + error.message);
      }
    } catch (err) {
      alert("Bağlantı hatası oluştu.");
    } finally {
      setMazeretKaydediliyor(false);
    }
  }

  const haftaToggle = (haftaNo: number) => {
    setAcikHaftalar(prev => prev.includes(haftaNo) ? prev.filter(h => h !== haftaNo) : [...prev, haftaNo])
  }

  const renderGunSatiri = (key: string, label: string, extraNote: string = "") => {
    const g = gunler[key]
    return (
      <div key={key} className={`border ${g.active ? 'border-blue-400 bg-blue-50/30' : 'border-slate-200 bg-white'} rounded-lg overflow-hidden mb-3 shadow-sm transition-all`}>
        <label className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors">
          <input 
            type="checkbox" 
            checked={g.active} 
            onChange={e => updateGun(key, 'active', e.target.checked)} 
            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer" 
          />
          <span className={`font-bold ${g.active ? 'text-blue-800' : 'text-slate-600'}`}>
            {label} {extraNote && <span className="text-xs font-normal text-slate-500 ml-1">({extraNote})</span>}
          </span>
        </label>
        
        {g.active && (
          <div className="p-4 border-t border-blue-100 bg-white animate-fade-in-down space-y-4">
            <div className="flex flex-wrap gap-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={g.merkez} onChange={e => updateGun(key, 'merkez', e.target.checked)} className="w-5 h-5 text-blue-500 rounded focus:ring-blue-400" />
                <span className="text-sm font-bold text-slate-700">Merkez</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={g.deplasman} onChange={e => updateGun(key, 'deplasman', e.target.checked)} className="w-5 h-5 text-blue-500 rounded focus:ring-blue-400" />
                <span className="text-sm font-bold text-slate-700">Deplasman</span>
              </label>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input type="checkbox" checked={g.tumGun} onChange={e => updateGun(key, 'tumGun', e.target.checked)} className="w-5 h-5 text-green-600 rounded focus:ring-green-500" />
                <span className="text-sm font-bold text-green-800">Tüm Gün Müsaitim</span>
              </label>

              {!g.tumGun && (
                <div className="pt-3 border-t border-slate-200 mt-2">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1">Başlangıç Saati</label>
                      <input type="time" value={g.baslangic} onChange={e => updateGun(key, 'baslangic', e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 font-mono text-sm" />
                    </div>
                    <span className="text-slate-400 font-bold mt-4">-</span>
                    <div className="flex-1">
                      <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1">Bitiş Saati</label>
                      <input type="time" value={g.bitis} onChange={e => updateGun(key, 'bitis', e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 font-mono text-sm" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-start gap-1 text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <p className="text-[11px] font-semibold">Not: Başlangıç saati, gün içinde ilk çıkabileceğiniz/görev alabileceğiniz maç saatini ifade eder.</p>
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
          <button onClick={() => {
            setAktifEkran('dashboard');
            setArsivAcik(false);
            setAcikHaftalar([]);
          }} className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs md:text-sm font-bold py-1.5 px-3 rounded-lg shadow transition-colors border border-blue-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Geri
          </button>
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
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center border-4 border-blue-100 shadow-inner overflow-hidden relative">
              <img 
                src="/profil.jpg" 
                alt="Profil" 
                className="w-full h-full object-cover z-10" 
                onError={(e) => { e.currentTarget.style.display = 'none'; }} 
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-800 absolute z-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="text-center md:text-left flex-1">
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">{seciliKomiser.ad_soyad}</h2>
              <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-2">
                <span className="bg-blue-100 text-blue-800 font-mono text-xs font-bold px-3 py-1 rounded-full border border-blue-200">ID: {seciliKomiser.komiser_id}</span>
                <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full border border-green-200">Bu Sezon: {komiserMaclari.length} Görev</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button onClick={() => setAktifEkran('gorevKartlari')} className="flex flex-col items-center justify-center p-6 rounded-2xl shadow-md bg-white border-2 border-blue-200 hover:border-blue-500 hover:shadow-blue-200 transition-all transform hover:scale-105">
              <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <h4 className="font-bold text-lg text-slate-800">Görev Kartım</h4>
              <p className="text-xs text-center mt-2 text-slate-500">Atanan maçlarınızı görün ve görevi tebellüğ edin.</p>
            </button>

            <button onClick={() => setAktifEkran('skorRapor')} className="flex flex-col items-center justify-center p-6 rounded-2xl shadow-md bg-white border-2 border-green-200 hover:border-green-500 hover:shadow-green-200 transition-all transform hover:scale-105">
              <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h4 className="font-bold text-lg text-slate-800 text-center">Skor & Saha Raporu</h4>
              <p className="text-xs text-center mt-2 text-slate-500">Maç günü saha ve skor raporlarını merkeze iletin.</p>
            </button>
          </div>

          {mazeretAcik ? (
            <div className="mt-2">
              <button onClick={() => setAktifEkran('mazeretBildir')} className="w-full flex items-center justify-between p-4 md:p-6 rounded-2xl shadow-md transition-all transform hover:scale-[1.01] bg-white border-2 border-red-200 hover:border-red-500 hover:shadow-red-200">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold text-lg text-slate-800">Müsaitlik / Mazeret</h4>
                    <p className="text-xs mt-1 text-slate-500">Gelecek hafta için görev müsaitliğinizi bildirin.</p>
                  </div>
                </div>
                <div className="hidden sm:block text-red-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              </button>
            </div>
          ) : (
            <div className="mt-2">
              <button disabled className="w-full flex flex-col items-center justify-center p-4 rounded-2xl border-2 bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-500 text-left">Müsaitlik / Mazeret Sistemi Kapalı</h4>
                    <p className="text-[10px] text-slate-400 text-left">Pazar 22:00 ile Salı 08:00 arasında açılır.</p>
                  </div>
                </div>
              </button>
            </div>
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
                <h4 className="text-lg font-bold text-blue-900 tracking-wide uppercase">{seciliKomiser.ad_soyad}</h4>
                <p className="text-red-600 font-semibold mt-1">{globalAktifHaftaNo}. Hafta Görev Bülteni</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {/* TEBELLÜĞ ET BUTONU (SUPABASE BAĞLANTILI) */}
                <button 
                  onClick={tebellugKaydet} 
                  disabled={hepsiTebellugEdilmis || tebellugYukleniyor || aktifMaclar.length === 0} 
                  className={`text-sm font-bold py-2 px-4 rounded-lg shadow flex items-center gap-2 transition-colors 
                    ${hepsiTebellugEdilmis ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300' 
                    : aktifMaclar.length > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
                >
                  {tebellugYukleniyor ? 'İşleniyor...' : hepsiTebellugEdilmis ? '✓ Tebellüğ Edildi' : 'Tebellüğ Et (Görevleri Aldım)'}
                </button>
                <button onClick={kartiIndir} className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 px-4 rounded-lg shadow flex items-center gap-2 transition-colors">
                  İndir / Paylaş
                </button>
              </div>
            </div>

            {macYukleniyor ? (
              <div className="text-center text-blue-800 py-8 animate-pulse font-semibold">Görevleriniz aranıyor...</div>
            ) : (
              <>
                <div className="mb-6">
                  {aktifMaclar.length === 0 ? (
                    <div className="text-center text-slate-500 py-8 bg-white rounded-xl shadow-sm border border-slate-200">Bu hafta için aktif bir göreviniz bulunmuyor.</div>
                  ) : (
                    <div className="space-y-4">
                      {aktifMaclar.map((mac) => (
                        <div key={mac.id} className="bg-white border-l-4 border-blue-800 shadow-md rounded-r-xl p-4 relative overflow-hidden">
                          <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
                            <span className="font-bold text-blue-950 text-lg md:text-xl leading-tight">{mac.ev_sahibi} <span className="text-slate-400 font-medium mx-1 text-base">vs</span> {mac.misafir_takim}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm text-slate-700 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <div className="flex flex-col">
                              <span className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">Tarih & Saat</span> 
                              <span className="font-bold text-slate-800">{new Date(mac.tarih).toLocaleDateString('tr-TR')} - {mac.saat.substring(0, 5)}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">Saha</span> 
                              <span className="font-bold text-slate-800">{mac.saha}</span>
                            </div>
                            <div className="flex flex-col mt-2 pt-3 border-t border-slate-200">
                              <span className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">Kategori / Lig</span> 
                              <span className="font-bold text-slate-800">{mac.kategori_adi} <span className="text-xs font-normal text-slate-500 block sm:inline mt-1 sm:mt-0 sm:ml-1">(Kod: {mac.mac_kodu})</span></span>
                            </div>
                            <div className="flex flex-col mt-2 pt-3 border-t border-slate-200">
                              <span className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">Atanan Görev</span> 
                              <span className="font-extrabold text-blue-700">{gorevTuruBelirle(mac.kategori_adi, mac.mac_kodu)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {Object.keys(gecmisHaftalar).length > 0 && (
                  <div className="mt-8 border-t-2 border-slate-300 pt-6">
                    <button onClick={() => setArsivAcik(!arsivAcik)} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-4 px-5 rounded-xl shadow-md transition-colors flex justify-between items-center">
                      <span>Geçmiş Maç Arşivi</span><span className="text-xl">{arsivAcik ? '▲' : '▼'}</span>
                    </button>
                    {arsivAcik && (
                      <div className="mt-4 space-y-4 animate-fade-in-down">
                        {Object.keys(gecmisHaftalar).map(Number).sort((a, b) => b - a).map(haftaNo => (
                          <div key={haftaNo} className="border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                            <button onClick={() => haftaToggle(haftaNo)} className="w-full bg-slate-300 hover:bg-slate-400 text-slate-900 font-bold py-3 px-5 transition-colors flex justify-between items-center">
                              <span>{haftaNo}. Hafta Görevleri <span className="bg-slate-800 text-white text-xs px-2 py-1 rounded ml-2">{gecmisHaftalar[haftaNo].length} Maç</span></span>
                              <span>{acikHaftalar.includes(haftaNo) ? '▲' : '▼'}</span>
                            </button>
                            {acikHaftalar.includes(haftaNo) && (
                              <div className="p-4 bg-slate-100 space-y-4">
                                {gecmisHaftalar[haftaNo].map(mac => (
                                  <div key={mac.id} className="bg-white border-l-4 border-slate-500 shadow-sm rounded-r-xl p-4 opacity-95 relative">
                                    <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
                                      <span className="font-bold text-slate-700 text-lg md:text-xl leading-tight">{mac.ev_sahibi} <span className="text-slate-400 font-medium mx-1 text-base">vs</span> {mac.misafir_takim}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-sm text-slate-600 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                      <div className="flex flex-col">
                                        <span className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">Tarih & Saat</span> 
                                        <span className="font-bold text-slate-700">{new Date(mac.tarih).toLocaleDateString('tr-TR')} - {mac.saat.substring(0, 5)}</span>
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">Saha</span> 
                                        <span className="font-bold text-slate-700">{mac.saha}</span>
                                      </div>
                                      <div className="flex flex-col mt-2 pt-3 border-t border-slate-200">
                                        <span className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">Kategori / Lig</span> 
                                        <span className="font-bold text-slate-700">{mac.kategori_adi} <span className="text-xs font-normal text-slate-500 block sm:inline mt-1 sm:mt-0 sm:ml-1">(Kod: {mac.mac_kodu})</span></span>
                                      </div>
                                      <div className="flex flex-col mt-2 pt-3 border-t border-slate-200">
                                        <span className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">Atanan Görev</span> 
                                        <span className="font-extrabold text-slate-700">{gorevTuruBelirle(mac.kategori_adi, mac.mac_kodu)}</span>
                                      </div>
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
              <div className="p-10 text-center animate-fade-in-down">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Mazeret İletildi!</h2>
                <p className="text-slate-500 mt-2">Müsaitlik durumunuz merkeze başarıyla kaydedildi. Ana ekrana yönlendiriliyorsunuz...</p>
              </div>
            ) : (
              <>
                <div className="bg-slate-50 p-6 border-b border-slate-200 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">Haftalık Müsaitlik Durumu</h2>
                  <p className="text-slate-500 text-sm mt-1">Önümüzdeki TFF bülteni (Cuma - Perşembe arası) için görev tercihlerinizi belirleyin.</p>
                </div>

                <div className="p-6 space-y-8">
                  
                  <div className={`border rounded-xl p-4 flex items-start gap-4 transition-colors hover:bg-red-50 ${kompleYokum ? 'bg-red-50 border-red-500 ring-2 ring-red-200' : 'bg-white border-slate-200'}`}>
                    <input 
                      type="checkbox" 
                      id="kompleYokum"
                      checked={kompleYokum}
                      onChange={(e) => handleKompleYokum(e.target.checked)}
                      className="mt-1 w-6 h-6 text-red-600 rounded focus:ring-red-500 cursor-pointer"
                    />
                    <label htmlFor="kompleYokum" className="cursor-pointer">
                      <span className={`block font-bold text-lg ${kompleYokum ? 'text-red-700' : 'text-slate-700'}`}>Bu hafta görev alamayacağım.</span>
                      <span className={`block text-sm mt-1 ${kompleYokum ? 'text-red-500' : 'text-slate-500'}`}>İşaretlerseniz detaylı gün ve saat seçimleri tamamen gizlenir.</span>
                    </label>
                  </div>

                  {!kompleYokum && (
                    <div className="space-y-6 animate-fade-in-down">
                      
                      <div>
                        <h3 className="font-bold text-slate-700 border-b pb-2 mb-4 uppercase tracking-wider">Hafta İçi (Cum-Per)</h3>
                        <div className="flex flex-col gap-3 mb-3">
                          
                          <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${haftaIciYokum ? 'bg-red-50 border-red-400 shadow-sm' : 'bg-slate-50 border-slate-300 hover:bg-slate-100'}`}>
                            <input 
                              type="checkbox" 
                              checked={haftaIciYokum}
                              onChange={(e) => handleHaftaIciYokum(e.target.checked)}
                              className="w-5 h-5 text-red-600 rounded focus:ring-red-500 cursor-pointer"
                            />
                            <span className={`font-bold text-lg ${haftaIciYokum ? 'text-red-700' : 'text-slate-700'}`}>Hafta İçi Müsait Değilim</span>
                          </label>
                          
                          {!haftaIciYokum && (
                            <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${haftaIciMusait ? 'bg-blue-50 border-blue-400 shadow-sm' : 'bg-slate-50 border-slate-300 hover:bg-slate-100'}`}>
                              <input 
                                type="checkbox" 
                                checked={haftaIciMusait}
                                onChange={(e) => handleHaftaIciMusait(e.target.checked)}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                              />
                              <span className={`font-bold text-lg ${haftaIciMusait ? 'text-blue-800' : 'text-slate-700'}`}>Hafta İçi Müsaitim</span>
                            </label>
                          )}
                        </div>

                        {haftaIciMusait && (
                          <div className="pl-4 ml-2 border-l-2 border-blue-300 space-y-4 animate-fade-in-down mt-4">
                            {renderGunSatiri('cuma', 'Cuma', 'Haftanın Başlangıcı')}
                            {renderGunSatiri('pazartesi', 'Pazartesi')}
                            {renderGunSatiri('sali', 'Salı')}
                            {renderGunSatiri('carsamba', 'Çarşamba')}
                            {renderGunSatiri('persembe', 'Perşembe')}
                          </div>
                        )}
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-700 border-b pb-2 mb-4 uppercase tracking-wider">Hafta Sonu</h3>
                        <div className="flex flex-col gap-3 mb-3">
                          
                          <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${haftaSonuYokum ? 'bg-red-50 border-red-400 shadow-sm' : 'bg-slate-50 border-slate-300 hover:bg-slate-100'}`}>
                            <input 
                              type="checkbox" 
                              checked={haftaSonuYokum}
                              onChange={(e) => handleHaftaSonuYokum(e.target.checked)}
                              className="w-5 h-5 text-red-600 rounded focus:ring-red-500 cursor-pointer"
                            />
                            <span className={`font-bold text-lg ${haftaSonuYokum ? 'text-red-700' : 'text-slate-700'}`}>Hafta Sonu Müsait Değilim</span>
                          </label>
                          
                          {!haftaSonuYokum && (
                            <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${haftaSonuMusait ? 'bg-blue-50 border-blue-400 shadow-sm' : 'bg-slate-50 border-slate-300 hover:bg-slate-100'}`}>
                              <input 
                                type="checkbox" 
                                checked={haftaSonuMusait}
                                onChange={(e) => handleHaftaSonuMusait(e.target.checked)}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                              />
                              <span className={`font-bold text-lg ${haftaSonuMusait ? 'text-blue-800' : 'text-slate-700'}`}>Hafta Sonu Müsaitim</span>
                            </label>
                          )}
                        </div>

                        {haftaSonuMusait && (
                          <div className="pl-4 ml-2 border-l-2 border-blue-300 space-y-4 animate-fade-in-down mt-4">
                            {renderGunSatiri('cumartesi', 'Cumartesi')}
                            {renderGunSatiri('pazar', 'Pazar')}
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-200 mt-6">
                    <h3 className="font-bold text-slate-700 pb-2 mb-2">Ek Açıklama (İsteğe Bağlı)</h3>
                    <textarea 
                      value={mazeretNotu}
                      onChange={(e) => setMazeretNotu(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-4 text-slate-700 focus:outline-none focus:border-blue-500 min-h-[100px] shadow-sm"
                      placeholder={kompleYokum 
                        ? "Yönetime iletmek istediğiniz mazeret detayları (Örn: İl dışındayım, hastayım vb.)" 
                        : "Yönetime iletmek istediğiniz ek bir notunuz varsa yazabilirsiniz..."}
                    ></textarea>
                  </div>

                  {/* MAZERET KAYDET BUTONU (SUPABASE BAĞLANTILI) */}
                  <button 
                    onClick={mazeretKaydet}
                    disabled={mazeretKaydediliyor}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform transform hover:scale-[1.01] active:scale-95 text-lg flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {mazeretKaydediliyor ? (
                      <span className="animate-pulse">Kaydediliyor...</span>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Müsaitlik Durumumu Kaydet
                      </>
                    )}
                  </button>

                </div>
              </>
            )}
          </div>
        </div>
      </main>
    )
  }

  if (aktifEkran === 'skorRapor') {
    return (
      <main className="min-h-screen bg-slate-200 flex flex-col font-sans">
        <OrtakHeader geriButonuGoster={true} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl p-8 text-center border-t-4 border-green-500">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Canlı Operasyon Ekranı</h2>
            <p className="text-slate-600 mb-6 text-sm">
              Bu modül, maç saatleriniz yaklaştığında (Örn: 16:59) otomatik olarak aktifleşecektir.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-4">
              <p className="font-semibold text-slate-500">Yaklaşan maçınız için süre hesaplanıyor...</p>
              <div className="w-full bg-slate-200 rounded-full h-2 mt-4 overflow-hidden">
                <div className="bg-green-500 h-2 w-1/3 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return null;
}