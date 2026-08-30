"use client"
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toPng } from 'html-to-image'

const AMATOR_MERKEZ_LOGO = "https://upload.wikimedia.org/wikipedia/tr/0/0a/TFF_logo.png?utm_source=tr.wikipedia.org&utm_campaign=index&utm_content=original";
const GELISIM_SOL_LOGO = "https://upload.wikimedia.org/wikipedia/tr/0/0a/TFF_logo.png?utm_source=tr.wikipedia.org&utm_campaign=index&utm_content=original";
const GELISIM_SAG_LOGO = "https://upload.wikimedia.org/wikipedia/tr/0/0a/TFF_logo.png?utm_source=tr.wikipedia.org&utm_campaign=index&utm_content=original"; 
const DERNEK_LOGO = "https://upload.wikimedia.org/wikipedia/tr/0/0a/TFF_logo.png?utm_source=tr.wikipedia.org&utm_campaign=index&utm_content=original"; 

type EkranTuru = 'giris' | 'dashboard' | 'gorevKartlari' | 'skorRapor' | 'mazeretBildir' | 'bultenArama' | 'istatistiklerim';

const getAnaKategori = (kategori: any) => {
    if (!kategori) return 'amator';
    const kat = String(kategori).toLocaleUpperCase('tr-TR');

    if ((kat.includes('SÜPER LİG') && !kat.includes('AMATÖR') && !kat.includes('KADIN')) || 
        (kat.includes('1. LİG') && !kat.includes('AMATÖR') && !kat.includes('KADIN')) || 
        (kat.includes('2. LİG') && !kat.includes('AMATÖR') && !kat.includes('KADIN')) || 
        (kat.includes('3. LİG') && !kat.includes('AMATÖR') && !kat.includes('KADIN')) || 
        kat.includes('ZİRAAT') || kat.includes('TÜRKİYE KUPASI')) {
        return 'profesyonel';
    }

    if (kat.includes('KADIN') || kat.includes('KIZ')) {
        return 'kadin';
    }

    if (kat.includes('GELİŞİM') || kat.includes('AKADEMİ') || kat.includes('ELİT') || 
        kat.includes('PAF') || kat.includes('TFF U')) {
        return 'gelisim';
    }

    return 'amator';
}

const raporTurunuBelirle = (kategori: any) => {
    const anaKat = getAnaKategori(kategori);
    if (anaKat === 'profesyonel') return 'yok';
    if (anaKat === 'gelisim') return 'gelisim';
    return 'amator'; 
}

const detayliRaporGosterilirMi = (kategori: any) => {
  const tur = raporTurunuBelirle(kategori);
  return tur !== 'yok'; 
}

const getHakemGosterimModu = (kategori: any) => {
    if (!kategori) return 'dort_kutu';
    const anaKat = getAnaKategori(kategori);
    if (anaKat !== 'amator') return 'dort_kutu'; 

    const kat = String(kategori).toLocaleUpperCase('tr-TR');
    if (kat.includes('U11') || kat.includes('U 11') || kat.includes('U-11') ||
        kat.includes('U12') || kat.includes('U 12') || kat.includes('U-12') ||
        kat.includes('U13') || kat.includes('U 13') || kat.includes('U-13') ||
        kat.includes('U14') || kat.includes('U 14') || kat.includes('U-14') ||
        kat.includes('11 YAŞ') || kat.includes('12 YAŞ') || kat.includes('13 YAŞ') || kat.includes('14 YAŞ')) {
        return 'tek_hakem';
    }
    if (kat.includes('U15') || kat.includes('U 15') || kat.includes('U-15') ||
        kat.includes('U16') || kat.includes('U 16') || kat.includes('U-16') ||
        kat.includes('15 YAŞ') || kat.includes('16 YAŞ')) {
        return 'uc_hakem';
    }
    return 'dort_kutu'; 
};

const formatKategori = (rawKategori: any) => {
    if (!rawKategori) return 'BELİRTİLMEMİŞ LİG';
    let kat = String(rawKategori).toLocaleUpperCase('tr-TR').trim();
    
    if (kat.includes('GELİŞİM') || kat.includes('AKADEMİ') || kat.includes('ELİT') || kat.includes('TFF U')) {
        const yasMatch = kat.match(/(\d{2})/);
        if (yasMatch) return `TFF U${yasMatch[1]} GELİŞİM LİGİ`;
        return 'TFF GELİŞİM LİGİ';
    }
    if (kat.includes('SÜPER AMATÖR')) return 'SÜPER AMATÖR LİG';
    if (kat.includes('1.') && kat.includes('AMATÖR')) return '1. AMATÖR LİG';
    if (kat.includes('BÖLGESEL') || kat.includes('BAL')) return 'BÖLGESEL AMATÖR LİG (BAL)';
    
    const amatorYasMatch = kat.match(/U\s*(\d{2})/);
    if (amatorYasMatch && !kat.includes('PROF') && !kat.includes('KADIN') && !kat.includes('ELİT') && !kat.includes('TFF')) return `İZMİR U${amatorYasMatch[1]} LİGİ`;
    return kat;
}

const formatMacKodu = (kod: any) => {
    if (!kod) return '-';
    const s = String(kod).trim();
    if (s.length === 1 && !isNaN(Number(s))) return `0${s}`;
    return s;
}

// 🔥 BEYAZ EKRAN ÇÖKME HATASINI KÖKTEN ÇÖZEN TARİH ZEKASI 🔥
const guvenliTarih = (tarihMetni: string | null | undefined) => {
    if (!tarihMetni) return "-";
    try {
        if (tarihMetni.includes('-')) {
            const parts = tarihMetni.split('-');
            if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`; 
        }
        return tarihMetni;
    } catch (e) { return tarihMetni; }
}

const guvenliSaat = (saatMetni: any) => {
    if (!saatMetni) return "-";
    try { return String(saatMetni).substring(0, 5); } catch (e) { return "-"; }
}

const gelisimOrganizasyon = [
    { id: 'ambulans', text: '1. Müsabakada Ambulans Bulunduruldu mu?' },
    { id: 'doktor', text: '2. Müsabakada ev sahibi takım tarafından doktor görevlendirildi mi?' },
    { id: 'anons', text: '3. Anons sistemi çalışıyor mu?' },
    { id: 'sedyeci', text: '4. Müsabakada ev sahibi takım tarafından sedyeci (2 kişi) görevlendirildi mi?' }
];

const gelisimTeknik = [
    { id: 'soyunma_odasi', text: '1. Hakem ve Takım Soyunma Odası' }, { id: 'oyun_alani', text: '2. Oyun Alanı' },
    { id: 'kale_aglari', text: '3. Kale ve Ağları' }, { id: 'saha_cizgileri', text: '4. Saha Çizgileri' },
    { id: 'kose_gonderleri', text: '5. Köşe Gönderleri' }, { id: 'teknik_alan', text: '6. Teknik Alan' },
    { id: 'yedek_kulubeleri', text: '7. Yedek Kulübeleri' }, { id: 'skor_tabelasi', text: '8. Skor Tabelası' },
    { id: 'oyuncu_degistirme', text: '9. Oyuncu Değiştirme Tabelası' }
];

const renderGelisimCheckbox = (etiket: string, deger: any, onChange: (val: string) => void, id: string) => (
    <div key={id} className="flex justify-between items-center border-b border-dashed border-slate-300 py-1">
        <span className="text-[10px] w-3/4">{etiket}</span>
        <div className="flex gap-4 w-1/4 justify-end pr-2">
            <label className="flex items-center gap-1 cursor-pointer text-[10px]">
                Evet <div className={`w-4 h-4 border border-black flex items-center justify-center text-xs font-bold bg-white ${deger === 'evet' ? 'bg-slate-200' : ''}`}>{deger === 'evet' ? 'X' : ''}</div>
                <input type="radio" className="hidden" checked={deger === 'evet'} onChange={() => onChange('evet')} />
            </label>
            <label className="flex items-center gap-1 cursor-pointer text-[10px]">
                Hayır <div className={`w-4 h-4 border border-black flex items-center justify-center text-xs font-bold bg-white ${deger === 'hayir' ? 'bg-slate-200' : ''}`}>{deger === 'hayir' ? 'X' : ''}</div>
                <input type="radio" className="hidden" checked={deger === 'hayir'} onChange={() => onChange('hayir')} />
            </label>
        </div>
    </div>
);

const temizHakem = (isim: any) => {
    if (!isim) return '';
    const s = String(isim).trim().toLocaleUpperCase('tr-TR');
    if (s.includes('TIKLA VE')) return '';
    return String(isim).trim();
};

export default function Home() {
  const [aktifEkran, setAktifEkran] = useState<EkranTuru>('giris')
  const [kullaniciIdInput, setKullaniciIdInput] = useState('')
  const [girisHatasi, setGirisHatasi] = useState<string | null>(null)
  const [girisYukleniyor, setGirisYukleniyor] = useState(false)
  const [seciliKomiser, setSeciliKomiser] = useState<any | null>(null)
  const [komiserMaclari, setKomiserMaclari] = useState<any[]>([])
  const [tumAktifMaclar, setTumAktifMaclar] = useState<any[]>([])
  const [tumKomiserler, setTumKomiserler] = useState<any[]>([])
  const [tumStatuler, setTumStatuler] = useState<any[]>([]) 
  
  const [hakemListesi, setHakemListesi] = useState<string[]>([])
  const [gozlemciListesi, setGozlemciListesi] = useState<string[]>([]) 
  
  const [aramaTuruAcik, setAramaTuruAcik] = useState(true)
  const [aramaKomiser, setAramaKomiser] = useState('')
  const [aramaSaha, setAramaSaha] = useState('')
  const [aramaTakim, setAramaTakim] = useState('')
  const [acikAramaMacId, setAcikAramaMacId] = useState<number | null>(null)
  const [macYukleniyor, setMacYukleniyor] = useState(false)
  const [haftaReferanslari, setHaftaReferanslari] = useState<number[]>([])
  const [globalAktifHaftaNo, setGlobalAktifHaftaNo] = useState<number>(1)
  const [haftaTarihAraligi, setHaftaTarihAraligi] = useState<string>('')
  const [arsivAcik, setArsivAcik] = useState(false)
  const [acikHaftalar, setAcikHaftalar] = useState<number[]>([])
  const [tebellugYukleniyor, setTebellugYukleniyor] = useState(false)
  const [mazeretKaydediliyor, setMazeretKaydediliyor] = useState(false)
  const [mazeretKaydedildi, setMazeretKaydedildi] = useState(false)
  const [kompleYokum, setKompleYokum] = useState(false)
  const [mazeretTipi, setMazeretTipi] = useState<'yok' | 'full' | 'secmeli' | null>(null)
  const [genelMerkez, setGenelMerkez] = useState(true)
  const [genelDeplasman, setGenelDeplasman] = useState(false)

  const [acikSicilSaha, setAcikSicilSaha] = useState<string | null>(null)
  const [acikSicilTffMacId, setAcikSicilTffMacId] = useState<number | null>(null)

  const [acikStatu, setAcikStatu] = useState<any | null>(null) 
  const [arsivTamEkranMac, setArsivTamEkranMac] = useState<any | null>(null) 

  const defaultGunDurumu = { active: false, merkez: true, deplasman: false, tumGun: false, baslangic: '09:00', bitis: '22:00' }
  const [gunler, setGunler] = useState<Record<string, any>>({
    cuma: { ...defaultGunDurumu }, cumartesi: { ...defaultGunDurumu }, pazar: { ...defaultGunDurumu },
    pazartesi: { ...defaultGunDurumu }, sali: { ...defaultGunDurumu }, carsamba: { ...defaultGunDurumu }, persembe: { ...defaultGunDurumu }
  })

  const updateGun = (key: string, field: string, val: any) => { setGunler(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } })) }
  const [mazeretNotu, setMazeretNotu] = useState('')
  const [acikSkorMacId, setAcikSkorMacId] = useState<number | null>(null)
  const [evSkor, setEvSkor] = useState<string>('')
  const [misafirSkor, setMisafirSkor] = useState<string>('')
  const [macDurumu, setMacDurumu] = useState<'oynandi' | 'yarida_kaldi' | 'takimlar_cikmadi'>('oynandi')
  const [olayDurumu, setOlayDurumu] = useState<'olaysiz' | 'teknik_olay' | 'emniyetlik_olay' | 'hava_muhalefeti' | 'saha_sorunu'>('olaysiz')
  const [raporNotu, setRaporNotu] = useState('')

  const [ekRaporFotolar, setEkRaporFotolar] = useState<Record<string, string>>({});

  const defaultRaporDetay = {
    hakem: '', y_hakem_1: '', y_hakem_2: '', hakem_4: '', gozlemci: '', 
    saglik: '', guvenlik: '',
    guvenlik_amiri: '', guvenlik_telefon: '', saglik_adi: '', saglik_telefon: '', 
    islem_saati: 0,
    ihrac_ev: [{forma: '', isim: '', lisans: ''}, {forma: '', isim: '', lisans: ''}],
    ihrac_mis: [{forma: '', isim: '', lisans: ''}, {forma: '', isim: '', lisans: ''}],
    tff_not: '', detayli_kaydedildi: false,
    gelisim_sorular: {
        ambulans: null, doktor: null, anons: null, sedyeci: null, degerlendirme: '',
        soyunma_odasi: null, oyun_alani: null, kale_aglari: null, saha_cizgileri: null,
        kose_gonderleri: null, teknik_alan: null, yedek_kulubeleri: null, skor_tabelasi: null, oyuncu_degistirme: null,
        isim_listeleri: null, forma_setleri: null, wc_hijyen: null,
        misafir_gelis_gidis: '', soyunma_odasi_kisitlama: null, misafir_tribun_yer: null, guvenlik_sayisi: '',
        isletimsel_1: '', isletimsel_2: '', isletimsel_3: '', olumsuz_diger: ''
    },
    ek_raporlar: []
  };
  
  const [raporDetay, setRaporDetay] = useState<any>(defaultRaporDetay);
  const [skorKaydediliyor, setSkorKaydediliyor] = useState(false)

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
        return isNaN(d.getTime()) ? 0 : d.getTime();
    } catch (e) { return 0; }
  };
  const siralamaFiltresi = (a: any, b: any) => getZaman(a) - getZaman(b);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const kayitliId = localStorage.getItem('izmirKomiserId')
        if (kayitliId) { otomatikGirisYap(kayitliId) }
      } catch (e) { console.error(e) }
    }
  }, [])

  const otomatikGirisYap = async (id: string) => {
    try {
      const { data, error } = await supabase.from('komiserler').select('*').eq('komiser_id', id).single()
      if (data && !error) {
        setSeciliKomiser(data)
        await komiserDetayGetir(data)
        setAktifEkran('dashboard')
      } else { localStorage.removeItem('izmirKomiserId') }
    } catch (err) { console.error(err) }
  }

  useEffect(() => {
    let aktif = true;
    async function arkaPlaniHazirla() {
      try {
        let tumMaclarGecici: any[] = []; let sayfa = 0; const limit = 1000; let veriKaldimi = true;
        while (veriKaldimi && aktif) {
          const { data, error } = await supabase.from('musabakalar').select('*').range(sayfa * limit, (sayfa + 1) * limit - 1)
          if (error) break;
          if (data && Array.isArray(data) && data.length > 0) {
            tumMaclarGecici = [...tumMaclarGecici, ...data]
            if (data.length < limit) veriKaldimi = false; else { sayfa++; await new Promise(res => setTimeout(res, 50)) }
          } else veriKaldimi = false
        }
        
        if (tumMaclarGecici && tumMaclarGecici.length > 0 && aktif) {
          const cumalar = tumMaclarGecici.map(mac => mac?.tarih ? cumaBul(mac.tarih) : 0).filter(t => t > 0)
          const essizCumalar = Array.from(new Set(cumalar)).sort((a, b) => a - b)
          
          if(essizCumalar.length > 0) {
            setHaftaReferanslari(essizCumalar)
            const aktifHaftaNo = essizCumalar.length
            setGlobalAktifHaftaNo(aktifHaftaNo)

            const aktifCumaTarihi = essizCumalar[essizCumalar.length - 1]
            let aktifHaftaMaclari = tumMaclarGecici.filter(mac => mac?.tarih && cumaBul(mac.tarih) === aktifCumaTarihi)
            
            if(aktifHaftaMaclari.length > 0) {
                const tarihler = aktifHaftaMaclari.map(m => new Date(m.tarih).getTime()).filter(t => !isNaN(t));
                if(tarihler.length > 0) {
                    const minTarih = new Date(Math.min(...tarihler));
                    const maxTarih = new Date(Math.max(...tarihler));
                    try {
                        const baslangicFormati = minTarih.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
                        const bitisFormati = maxTarih.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
                        setHaftaTarihAraligi(`${baslangicFormati} - ${bitisFormati}`);
                    } catch(e) { setHaftaTarihAraligi(''); }
                }
            }
            setTumAktifMaclar(aktifHaftaMaclari || [])
          }
        }

        const { data: komiserlerData } = await supabase.from('komiserler').select('*')
        if (komiserlerData && aktif) setTumKomiserler(komiserlerData || [])

        const { data: statuData } = await supabase.from('lig_statuleri').select('*');
        if (statuData && aktif) setTumStatuler(statuData);

        const { data: hakemData } = await supabase.from('hakemler').select('ad_soyad').order('ad_soyad')
        if (hakemData && aktif) {
            setHakemListesi(hakemData.map((h: any) => h.ad_soyad));
        }

        const { data: gozlemciData } = await supabase.from('gozlemciler').select('ad_soyad').order('ad_soyad')
        if (gozlemciData && aktif) {
            setGozlemciListesi(gozlemciData.map((g: any) => g.ad_soyad));
        }

      } catch (err: any) { console.error(err) }
    }
    if(aktifEkran !== 'giris') { arkaPlaniHazirla(); }
    return () => { aktif = false; }
  }, [aktifEkran])

  const mazeretKapisiAcikMi = () => true; 
  const mazeretAcik = mazeretKapisiAcikMi();

  const girisYap = async (e?: React.FormEvent) => {
    if (e) e.preventDefault() 
    setGirisYukleniyor(true); setGirisHatasi(null);
    let girilenSicil = kullaniciIdInput.trim()

    if (/^\d{4,10}$/.test(girilenSicil) && !girilenSicil.startsWith('35')) {
      girilenSicil = '35' + girilenSicil
    }

    if (!girilenSicil) { setGirisHatasi("Lütfen sicil numaranızı girin."); setGirisYukleniyor(false); return; }

    try {
      const { data, error } = await supabase.from('komiserler').select('*').eq('komiser_id', girilenSicil).single()
      if (error || !data) { setGirisHatasi("Bu sicil numarasına ait saha komiseri bulunamadı."); setGirisYukleniyor(false); return; }
      setSeciliKomiser(data)
      localStorage.setItem('izmirKomiserId', data.komiser_id)
      await komiserDetayGetir(data)
      setAktifEkran('dashboard') 
    } catch (err) { setGirisHatasi("Bağlantı sorunu oluştu, tekrar deneyin.") } 
    finally { setGirisYukleniyor(false) }
  }

  const enterTusuKontrol = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') girisYap() }

  const cikisYap = () => {
    setSeciliKomiser(null); setKullaniciIdInput(''); setKomiserMaclari([]);
    setAramaKomiser(''); setAramaSaha(''); setAramaTakim('');
    setAktifEkran('giris'); setArsivAcik(false); setAcikHaftalar([]);
    setAcikSicilSaha(null); setAcikSicilTffMacId(null); setAcikStatu(null); setArsivTamEkranMac(null);
    setMazeretTipi(null); setKompleYokum(false); setGenelMerkez(true); setGenelDeplasman(false); setMazeretNotu('');
    setGunler({
      cuma: { ...defaultGunDurumu }, cumartesi: { ...defaultGunDurumu }, pazar: { ...defaultGunDurumu },
      pazartesi: { ...defaultGunDurumu }, sali: { ...defaultGunDurumu }, carsamba: { ...defaultGunDurumu }, persembe: { ...defaultGunDurumu }
    }); skorFormunuSifirla(); localStorage.removeItem('izmirKomiserId')
  }

  const komiserDetayGetir = async (komiser: any) => {
    setMacYukleniyor(true)
    try {
      const { data, error } = await supabase.from('musabakalar').select('*').eq('komiser_id', komiser.komiser_id).order('tarih', { ascending: false })
      if (data) setKomiserMaclari(data)
    } catch(e) { console.error(e) }
    setMacYukleniyor(false)
  }

  const gorevTuruBelirle = (kategori: any, macKodu: any) => {
    const anaKat = getAnaKategori(kategori);
    const kod = String(macKodu || "").toLocaleUpperCase('tr-TR');
    const katStr = String(kategori || "").toLocaleUpperCase('tr-TR');
    
    if (kod.includes('DENETÇİ') || katStr.includes('BAL') || katStr.includes('BÖLGESEL')) return "BAL Ligi Denetçisi";
    if (kod.includes('STAJ')) return "Stajyer / Saha Komiseri";
    
    if (anaKat === 'profesyonel') return "Saha Komiseri";
    if (anaKat === 'gelisim') {
        if (katStr.includes('U17') || katStr.includes('U19') || katStr.includes('PAF')) return "Gelişim Denetçi";
        return "Gelişim Denetçi / Saha Komiseri";
    }
    return "Saha Komiseri";
  }

  const renderOrtakHeader = (geriButonuGoster = false) => (
    <header className="bg-slate-800 text-white shadow-md sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 py-4 md:py-5 flex justify-between items-center">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="hidden sm:flex items-center justify-center bg-white p-1.5 rounded-lg shadow-sm border border-slate-200">
              <img src={DERNEK_LOGO} alt="Logo" className="w-10 h-10 object-contain" crossOrigin="anonymous" />
          </div>
          <div>
            <h1 className="font-black text-xl md:text-2xl leading-tight tracking-wide text-white">Saha Operasyon Merkezi</h1>
            <h1 className="font-bold text-lg md:text-xl leading-tight text-slate-300 tracking-wide">İzmir Şube Yönetimi</h1>
            <div className="mt-2 inline-block bg-slate-900/50 px-3 py-1 rounded border border-slate-700 shadow-sm">
                <p className="text-slate-100 text-[10px] md:text-xs font-bold tracking-wider">{globalAktifHaftaNo}. Program Haftası {haftaTarihAraligi ? `(${haftaTarihAraligi})` : ''}</p>
            </div>
          </div>
        </div>
        {geriButonuGoster ? (
          <button onClick={() => { setAktifEkran('dashboard'); setArsivAcik(false); setAcikHaftalar([]); skorFormunuSifirla(); setAramaKomiser(''); setAramaSaha(''); setAramaTakim(''); setAcikSicilSaha(null); setAcikSicilTffMacId(null); setAcikStatu(null); setArsivTamEkranMac(null); }} className="flex items-center gap-1.5 bg-slate-100 text-slate-800 hover:bg-white text-xs md:text-sm font-bold py-2.5 px-5 rounded-lg shadow-sm transition-colors border border-slate-300 uppercase tracking-widest">Geri Dön</button>
        ) : (
          <button onClick={cikisYap} className="bg-red-700 hover:bg-red-800 text-white text-xs md:text-sm font-bold py-2.5 px-5 rounded-lg shadow transition-colors uppercase tracking-widest border border-red-800">Çıkış</button>
        )}
      </div>
    </header>
  );

  const renderGunSatiri = (key: string, label: string) => {
    const g = gunler[key]
    return (
      <div key={key} className={`border ${g.active ? 'border-blue-400 bg-blue-50/50 shadow-sm' : 'border-slate-200 bg-white'} rounded-xl overflow-hidden mb-3 transition-colors`}>
        <label className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${g.active ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
          <input type="checkbox" checked={g.active} onChange={e => updateGun(key, 'active', e.target.checked)} className="w-6 h-6 text-blue-600 rounded focus:ring-blue-500 cursor-pointer" />
          <span className={`font-bold text-lg ${g.active ? 'text-blue-800' : 'text-slate-600'}`}>{label}</span>
        </label>
        {g.active && (
          <div className="p-4 border-t border-blue-100 bg-white animate-fade-in-down space-y-4">
            <div className="flex flex-wrap gap-6 bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-sm">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={g.merkez} onChange={e => updateGun(key, 'merkez', e.target.checked)} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" /><span className="text-sm font-bold text-slate-700">Merkez</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={g.deplasman} onChange={e => updateGun(key, 'deplasman', e.target.checked)} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" /><span className="text-sm font-bold text-slate-700">Deplasman</span></label>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm">
              <label className="flex items-center gap-3 cursor-pointer mb-3 pb-3 border-b border-slate-200"><input type="checkbox" checked={g.tumGun} onChange={e => updateGun(key, 'tumGun', e.target.checked)} className="w-6 h-6 text-green-600 rounded focus:ring-green-500" /><span className="text-base font-bold text-slate-800">Tüm Gün Müsaitim</span></label>
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

  // 🔥 ARŞİV KARTINDA SKOR VE GÖREVLİ ZEKASI (DEVREYE GİRDİ) 🔥
  const renderOrjinalGorevKarti = (mac: any, isArsiv: boolean = false) => {
    if (!mac) return null;
    
    const statuBul = (katAdi: string) => {
        if(!katAdi) return null;
        const s = katAdi.toLocaleUpperCase('tr-TR');
        return tumStatuler.find(st => s.includes(st.kategori_anahtar));
    }
    const bagliStatu = statuBul(mac.kategori_adi);
    const skorGoster = isArsiv && mac.skor_girildi;

    let parsedDetay: any = {};
    if (isArsiv && mac.tff_rapor_detaylari) {
        try { parsedDetay = typeof mac.tff_rapor_detaylari === 'string' ? JSON.parse(mac.tff_rapor_detaylari) : mac.tff_rapor_detaylari; } catch(e) {}
    }

    return (
      <div className="bg-white border-l-4 border-slate-800 shadow-sm rounded-r-xl p-4 md:p-5 mb-4 transition-shadow hover:shadow-md border border-slate-200">
        <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-3">
          {skorGoster ? (
            <div className="flex items-center justify-between w-full gap-2">
                <span className="font-black text-slate-900 text-sm md:text-lg leading-tight uppercase flex-1 text-left">
                    {mac.ev_sahibi || '-'} - {mac.misafir_takim || '-'}
                </span>
                <span className="font-black text-base md:text-xl text-white bg-slate-800 px-3 py-1 rounded shadow-inner whitespace-nowrap">
                    {mac.ev_sahibi_skor} - {mac.misafir_skor}
                </span>
            </div>
          ) : (
            <span className="font-bold text-slate-900 text-base md:text-xl leading-tight uppercase block w-full">{mac.ev_sahibi || '-'} <span className="text-slate-400 font-medium mx-1 text-sm md:text-base">-</span> {mac.misafir_takim || '-'}</span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-sm text-slate-700 mt-2 bg-slate-50 p-2 md:p-3 rounded-lg border border-slate-100">
          <div className="flex flex-col"><span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wider">Tarih & Saat</span><span className="font-bold text-slate-800 text-xs md:text-sm">{guvenliTarih(mac.tarih)} - {guvenliSaat(mac.saat)}</span></div>
          <div className="flex flex-col"><span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wider">Saha</span><span className="font-bold text-slate-800 text-xs md:text-sm leading-tight">{mac.saha || '-'}</span></div>
          <div className="flex flex-col sm:mt-2 pt-2 sm:pt-3 border-t border-slate-200">
              <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] md:text-xs text-slate-400 font-semibold uppercase tracking-wider">Kategori / Lig</span>
                  {bagliStatu && (
                      <button onClick={() => setAcikStatu(bagliStatu)} className="text-[9px] bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-bold transition-colors flex items-center gap-1 shadow-sm">
                          ℹ️ STATÜ
                      </button>
                  )}
              </div>
              <span className="font-bold text-slate-800 text-xs md:text-sm leading-tight uppercase">{mac.kategori_adi || '-'} <span className="text-[9px] md:text-xs font-normal text-slate-500 block sm:inline mt-0.5 sm:mt-0 sm:ml-1">(Kod: {formatMacKodu(mac?.mac_kodu)})</span></span>
          </div>
          <div className="flex flex-col sm:mt-2 pt-2 sm:pt-3 border-t border-slate-200"><span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wider">Atanan Görev</span><span className="font-extrabold text-blue-700 text-xs md:text-sm">{gorevTuruBelirle(mac.kategori_adi, mac.mac_kodu)}</span></div>
          
          {/* 🔥 ARŞİV KARTININ ALTINA EKLENEN HAKEM VE GÖREVLİ DÖKÜMÜ 🔥 */}
          {isArsiv && mac.skor_girildi && (
            <div className="col-span-1 sm:col-span-2 flex flex-col sm:mt-2 pt-2 sm:pt-3 border-t border-slate-200">
                <span className="text-[10px] md:text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider">Müsabaka Görevlileri</span>
                <div className="flex flex-col gap-1.5">
                    {parsedDetay.hakem && <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm"><span className="text-[11px] text-slate-500 font-bold uppercase">Hakem:</span><span className="text-xs font-black text-slate-800 uppercase">{parsedDetay.hakem}</span></div>}
                    {parsedDetay.y_hakem_1 && <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm"><span className="text-[11px] text-slate-500 font-bold uppercase">1. Yardımcı Hakem:</span><span className="text-xs font-black text-slate-800 uppercase">{parsedDetay.y_hakem_1}</span></div>}
                    {parsedDetay.y_hakem_2 && <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm"><span className="text-[11px] text-slate-500 font-bold uppercase">2. Yardımcı Hakem:</span><span className="text-xs font-black text-slate-800 uppercase">{parsedDetay.y_hakem_2}</span></div>}
                    {parsedDetay.hakem_4 && <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm"><span className="text-[11px] text-slate-500 font-bold uppercase">4. Hakem:</span><span className="text-xs font-black text-slate-800 uppercase">{parsedDetay.hakem_4}</span></div>}
                    {parsedDetay.gozlemci && <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm"><span className="text-[11px] text-slate-500 font-bold uppercase">Gözlemci:</span><span className="text-xs font-black text-slate-800 uppercase">{parsedDetay.gozlemci}</span></div>}
                    
                    <div className="grid grid-cols-2 gap-2 mt-1">
                        <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Sağlık Görevlisi:</span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${parsedDetay.saglik === 'var' || parsedDetay.saglik_adi === 'VAR' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{parsedDetay.saglik === 'var' || parsedDetay.saglik_adi === 'VAR' ? 'VAR' : 'YOK'}</span>
                        </div>
                        <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Emniyet Gücü:</span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${parsedDetay.guvenlik === 'var' || parsedDetay.guvenlik_amiri === 'VAR' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{parsedDetay.guvenlik === 'var' || parsedDetay.guvenlik_amiri === 'VAR' ? 'VAR' : 'YOK'}</span>
                        </div>
                    </div>
                </div>
            </div>
          )}
        </div>

        {/* 🔥 ARŞİV KARTININ ALTINA EKLENEN TFF RAPORU BUTONU 🔥 */}
        {isArsiv && mac.skor_girildi && parsedDetay.detayli_kaydedildi && (
            <div className="mt-3 pt-3 border-t border-slate-200">
                <button onClick={() => setArsivTamEkranMac(mac)} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 rounded-lg shadow-sm text-xs md:text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-colors">
                    📄 TFF Detaylı Raporunu Görüntüle
                </button>
            </div>
        )}
      </div>
    )
  }

  let gecerliAktifMaclar: any[] = [];
  const gecmisHaftalar: Record<number, any[]> = {};

  if (haftaReferanslari.length > 0 && seciliKomiser && Array.isArray(komiserMaclari)) {
    komiserMaclari.forEach(mac => {
      if (!mac || !mac.tarih) return; 
      const macCuma = cumaBul(mac.tarih);
      const macHaftaNo = haftaReferanslari.indexOf(macCuma) + 1;
      if (macHaftaNo === globalAktifHaftaNo) { gecerliAktifMaclar.push(mac); } 
      else if (macHaftaNo > 0 && macHaftaNo < globalAktifHaftaNo) {
        if (!gecmisHaftalar[macHaftaNo]) gecmisHaftalar[macHaftaNo] = [];
        gecmisHaftalar[macHaftaNo].push(mac);
      }
    });
  }

  gecerliAktifMaclar.sort(siralamaFiltresi);
  Object.keys(gecmisHaftalar).forEach(haftaNo => { gecmisHaftalar[Number(haftaNo)].sort(siralamaFiltresi); });

  const eksikSkorSayisi = gecerliAktifMaclar.filter(m => m && m.tebellug_edildi && !m.skor_girildi).length;
  const eksikDetayliSayisi = gecerliAktifMaclar.filter(m => m && m.tebellug_edildi && m.skor_girildi && detayliRaporGosterilirMi(m.kategori_adi) && !m.tff_rapor_detaylari?.detayli_kaydedildi).length;
  const hepsiTebellugEdilmis = gecerliAktifMaclar.length > 0 && gecerliAktifMaclar.every(mac => mac?.tebellug_edildi === true)
  const tebellugBekleyenSayisi = gecerliAktifMaclar.filter(m => m && !m.tebellug_edildi).length;
  const herSeyTamam = gecerliAktifMaclar.length > 0 && tebellugBekleyenSayisi === 0 && eksikSkorSayisi === 0 && eksikDetayliSayisi === 0;

  const tebellugKaydet = async () => {
    if (gecerliAktifMaclar.length === 0) return;
    setTebellugYukleniyor(true);
    const aktifMacIdleri = gecerliAktifMaclar.map(m => m.id);
    const { error } = await supabase.from('musabakalar').update({ tebellug_edildi: true }).in('id', aktifMacIdleri);
    if (!error) { setKomiserMaclari(prev => prev.map(m => aktifMacIdleri.includes(m.id) ? { ...m, tebellug_edildi: true } : m)); } 
    else { alert("Görevler onaylanırken bir hata oluştu."); }
    setTebellugYukleniyor(false);
  }

  const mazeretKaydet = async () => {
    if (!mazeretTipi && !kompleYokum) { alert("⚠️ Lütfen size uygun olan seçeneklerden birini işaretleyiniz!"); return; }
    if (mazeretTipi === 'full' && !genelMerkez && !genelDeplasman) { alert("⚠️ Tüm Hafta Müsaitim seçeneğini işaretlediniz ancak Merkez veya Deplasman seçmediniz."); return; }
    if (mazeretTipi === 'secmeli') {
      const aktifGunVarMi = Object.values(gunler).some(g => g.active);
      if (!aktifGunVarMi) { alert("⚠️ Seçmeli müsaitlik dediniz ancak hiçbir gün seçmediniz. Lütfen müsait olduğunuz günleri işaretleyiniz."); return; }
    }
    setMazeretKaydediliyor(true);
    const hedefHafta = globalAktifHaftaNo + 1;
    const temizGunler = JSON.parse(JSON.stringify(gunler));
    if (kompleYokum || mazeretTipi === 'yok') { Object.keys(temizGunler).forEach(g => { temizGunler[g].active = false; }); } 
    else if (mazeretTipi === 'full') { Object.keys(temizGunler).forEach(g => { temizGunler[g] = { active: true, merkez: genelMerkez, deplasman: genelDeplasman, tumGun: true, baslangic: '09:00', bitis: '22:00' }; }); }

    const payload = {
      komiser_id: seciliKomiser?.komiser_id || '', hafta_no: hedefHafta, komple_yok: kompleYokum || mazeretTipi === 'yok', aciklama: mazeretNotu,
      detaylar: { mod: mazeretTipi, genelMerkez: mazeretTipi === 'full' ? genelMerkez : null, genelDeplasman: mazeretTipi === 'full' ? genelDeplasman : null, gunler: (mazeretTipi === 'secmeli' || mazeretTipi === 'full') ? temizGunler : null }
    };
    try {
      await supabase.from('mazeretler').delete().match({ komiser_id: seciliKomiser?.komiser_id || '', hafta_no: hedefHafta });
      const { error } = await supabase.from('mazeretler').insert([payload]);
      if (!error) {
        setMazeretKaydedildi(true); 
        setTimeout(() => { setAktifEkran('dashboard'); setMazeretKaydedildi(false); }, 3000); 
      } else { alert("Mazeret sisteme iletilemedi: " + error.message); }
    } catch (err) { alert("Bağlantı hatası oluştu."); } 
    finally { setMazeretKaydediliyor(false); }
  }

  const skorFormunuSifirla = () => {
    setEvSkor(''); setMisafirSkor(''); setMacDurumu('oynandi'); setOlayDurumu('olaysiz'); setRaporNotu(''); setAcikSkorMacId(null); setRaporDetay(defaultRaporDetay);
    setEkRaporFotolar({});
  }

  const raporFormunuAc = (mac: any) => {
    if (acikSkorMacId === mac.id) { skorFormunuSifirla(); } 
    else {
      setAcikSkorMacId(mac.id);
      if (mac.skor_girildi) {
        setEvSkor(mac.ev_sahibi_skor != null ? String(mac.ev_sahibi_skor) : '');
        setMisafirSkor(mac.misafir_skor != null ? String(mac.misafir_skor) : '');
        setMacDurumu(mac.mac_durumu || 'oynandi'); setOlayDurumu(mac.olay_durumu || 'olaysiz'); setRaporNotu(mac.rapor_notu || '');
        if (mac.tff_rapor_detaylari) { 
            let parsedDetay = mac.tff_rapor_detaylari;
            if (typeof parsedDetay === 'string') {
                try { parsedDetay = JSON.parse(parsedDetay); } catch(e) { parsedDetay = {}; }
            }
            if (!parsedDetay || typeof parsedDetay !== 'object') parsedDetay = {}; 
            
            const birlesikDetay = { ...defaultRaporDetay, ...parsedDetay };
            
            if (!birlesikDetay.gelisim_sorular || typeof birlesikDetay.gelisim_sorular !== 'object') birlesikDetay.gelisim_sorular = defaultRaporDetay.gelisim_sorular;
            if (!Array.isArray(birlesikDetay.ek_raporlar)) birlesikDetay.ek_raporlar = [];
            if (!Array.isArray(birlesikDetay.ihrac_ev)) birlesikDetay.ihrac_ev = defaultRaporDetay.ihrac_ev;
            if (!Array.isArray(birlesikDetay.ihrac_mis)) birlesikDetay.ihrac_mis = defaultRaporDetay.ihrac_mis;
            
            setRaporDetay(birlesikDetay); 
        } 
        else { setRaporDetay({...defaultRaporDetay, tff_not: mac.rapor_notu || ''}); }
      } else { setEvSkor(''); setMisafirSkor(''); setMacDurumu('oynandi'); setOlayDurumu('olaysiz'); setRaporNotu(''); setRaporDetay(defaultRaporDetay); setEkRaporFotolar({}); }
    }
  }

  const handleHizliNotChange = (val: string) => {
      setRaporNotu(val);
      if (olayDurumu !== 'emniyetlik_olay') { setRaporDetay((prev:any) => ({ ...prev, tff_not: val })); }
  };

  const raporDetayGuncelle = (alan: string, deger: any) => { setRaporDetay((prev:any) => ({ ...prev, [alan]: deger })); }
  const gelisimGuncelle = (alan: string, deger: any) => { setRaporDetay((prev:any) => ({ ...prev, gelisim_sorular: { ...prev.gelisim_sorular, [alan]: deger } })); }
  
  const ihracSatirEkle = (takim: 'ev' | 'mis') => {
      const alan = takim === 'ev' ? 'ihrac_ev' : 'ihrac_mis';
      setRaporDetay((prev:any) => {
          const mevcutListe = Array.isArray(prev[alan]) ? prev[alan] : [];
          return { ...prev, [alan]: [...mevcutListe, {forma: '', isim: '', lisans: ''}] };
      });
  }

  const ihracGuncelle = (takim: 'ev' | 'mis', index: number, field: string, value: string) => {
      const alan = takim === 'ev' ? 'ihrac_ev' : 'ihrac_mis';
      setRaporDetay((prev:any) => {
          const mevcutListe = Array.isArray(prev[alan]) ? prev[alan] : [];
          const yeniListe = [...mevcutListe];
          while (yeniListe.length <= index) { yeniListe.push({forma: '', isim: '', lisans: ''}); }
          yeniListe[index] = { ...yeniListe[index], [field]: value };
          return { ...prev, [alan]: yeniListe };
      });
  }

  const ekRaporEkle = () => {
      setRaporDetay((prev:any) => ({
          ...prev, 
          ek_raporlar: [...(Array.isArray(prev.ek_raporlar) ? prev.ek_raporlar : []), { id: Date.now(), text: '' }]
      }));
  }
  
  const ekRaporSil = (id: number) => {
      setRaporDetay((prev:any) => ({
          ...prev, 
          ek_raporlar: (Array.isArray(prev.ek_raporlar) ? prev.ek_raporlar : []).filter((r:any) => r.id !== id)
      }));
      const yeniFotolar = {...ekRaporFotolar};
      delete yeniFotolar[id];
      setEkRaporFotolar(yeniFotolar);
  }
  
  const ekRaporGuncelle = (id: number, text: string) => {
      setRaporDetay((prev:any) => ({
          ...prev, 
          ek_raporlar: (Array.isArray(prev.ek_raporlar) ? prev.ek_raporlar : []).map((r:any) => r.id === id ? { ...r, text } : r)
      }));
  }
  
  const handleFotoYukle = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
              if(event.target?.result) {
                  setEkRaporFotolar(prev => ({ ...prev, [id]: event.target!.result as string }));
              }
          };
          reader.readAsDataURL(file);
      }
  }

  const kartiIndir = async () => {
    const element = document.getElementById('gorev-karti-alani');
    if (element) {
      try {
        const fullWidth = element.scrollWidth;
        const fullHeight = element.scrollHeight;
        const dataURL = await toPng(element, { backgroundColor: '#f1f5f9', pixelRatio: 2, width: fullWidth, height: fullHeight });
        const link = document.createElement('a');
        link.href = dataURL; link.download = `${seciliKomiser?.ad_soyad?.replace(/\s+/g, '_') || 'Komiser'}_Gorev_Karti.png`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
      } catch (err) { alert("Görev kartı indirilirken bir sorun oluştu."); }
    }
  }

  const tffTutanakIndir = async (mac: any, prefix: string = 'tff') => {
    const element = document.getElementById(`${prefix}-form-${mac.id}`);
    if (element) {
      try {
        const style = document.createElement('style');
        style.innerHTML = '.tff-no-print { display: none !important; }';
        document.head.appendChild(style);
        
        const fullWidth = element.scrollWidth;
        const fullHeight = element.scrollHeight;
        
        const dataURL = await toPng(element, { 
            backgroundColor: '#ffffff', pixelRatio: 2, cacheBust: true, width: fullWidth, height: fullHeight,
            style: { fontFamily: 'sans-serif', transform: 'scale(1)', transformOrigin: 'top left', margin: '0' } 
        });
        const link = document.createElement('a'); link.href = dataURL; link.download = `TFF_Raporu_${mac.ev_sahibi}_vs_${mac.misafir_takim}.png`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link); document.head.removeChild(style);
      } catch (err) { alert("Resmi Tutanak indirilirken cihazınızdan kaynaklı bir sorun oluştu."); }
    }
  }

  const yeniHakemleriKaydet = async (detaylar: any) => {
      const girilenHakemler = [
          detaylar.hakem, detaylar.y_hakem_1, detaylar.y_hakem_2, detaylar.hakem_4
      ].map(h => h ? h.trim().toLocaleUpperCase('tr-TR') : '')
       .filter(h => h.length > 2 && !h.includes("SEÇ") && !h.includes("YAZ"));

      if (girilenHakemler.length > 0) {
          try {
              const { data: mevcutHakemler } = await supabase.from('hakemler').select('ad_soyad');
              const guncelListe = (mevcutHakemler || []).map((h: any) => h.ad_soyad.toLocaleUpperCase('tr-TR'));
              const eklenecekler = girilenHakemler.filter(h => !guncelListe.includes(h));

              if (eklenecekler.length > 0) {
                  const uniqueEklenecekler = Array.from(new Set(eklenecekler));
                  const insertPayload = uniqueEklenecekler.map(ad => ({ ad_soyad: ad }));
                  
                  const { error } = await supabase.from('hakemler').insert(insertPayload);
                  if (!error) {
                      setHakemListesi(prev => {
                          const newList = [...prev];
                          uniqueEklenecekler.forEach(h => { if (!newList.map(x => x.toLocaleUpperCase('tr-TR')).includes(h)) newList.push(h); });
                          return newList.sort((a,b) => a.localeCompare(b, 'tr-TR'));
                      });
                  }
              }
          } catch (err) { console.error("Hakem kaydetme fonksiyonunda hata:", err); }
      }
  }

  const yeniGozlemciyiKaydet = async (detaylar: any) => {
      const girilenGozlemci = detaylar.gozlemci ? detaylar.gozlemci.trim().toLocaleUpperCase('tr-TR') : '';
      
      if (girilenGozlemci.length > 2 && !girilenGozlemci.includes("SEÇ") && !girilenGozlemci.includes("YAZ")) {
          try {
              const { data: mevcutGozlemciler } = await supabase.from('gozlemciler').select('ad_soyad');
              const guncelListe = (mevcutGozlemciler || []).map((g: any) => g.ad_soyad.toLocaleUpperCase('tr-TR'));
              
              if (!guncelListe.includes(girilenGozlemci)) {
                  const { error } = await supabase.from('gozlemciler').insert([{ ad_soyad: girilenGozlemci }]);
                  if (!error) {
                      setGozlemciListesi(prev => {
                          const newList = [...prev, girilenGozlemci];
                          return newList.sort((a,b) => a.localeCompare(b, 'tr-TR'));
                      });
                  } else {
                      console.error("Gözlemci eklenirken hata:", error.message);
                  }
              }
          } catch (err) { console.error("Gözlemci kaydetme hatası:", err); }
      }
  }

  const skorRaporunuGonder = async (macId: number, kayitTuru: 'hizli' | 'detayli') => {
    if (macDurumu === 'oynandi' && (evSkor === '' || misafirSkor === '')) { alert("⚠️ Lütfen maçın skorunu giriniz."); return; }
    if ((olayDurumu === 'teknik_olay' || olayDurumu === 'emniyetlik_olay') && raporNotu.trim() === '') { alert("⚠️ Olaylı bir maç bildirdiniz. Lütfen 'Görev Raporu / Hızlı Not' kısmına detayı yazınız."); return; }
    if (kayitTuru === 'detayli') {
        if (!raporDetay.hakem || raporDetay.hakem.trim() === '' || raporDetay.hakem.includes('TIKLA VE') || raporDetay.hakem.includes('YAZ')) { 
            alert("⚠️ Detaylı Raporu iletmek için lütfen en azından Orta Hakem bilgisini giriniz!"); 
            return; 
        }
    }

    setSkorKaydediliyor(true);
    let kaydedilecekDetay = { ...raporDetay };
    
    kaydedilecekDetay.hakem = temizHakem(kaydedilecekDetay.hakem);
    kaydedilecekDetay.y_hakem_1 = temizHakem(kaydedilecekDetay.y_hakem_1);
    kaydedilecekDetay.y_hakem_2 = temizHakem(kaydedilecekDetay.y_hakem_2);
    kaydedilecekDetay.hakem_4 = temizHakem(kaydedilecekDetay.hakem_4);
    kaydedilecekDetay.gozlemci = temizHakem(kaydedilecekDetay.gozlemci);
    
    kaydedilecekDetay.islem_saati = Date.now();

    if (kayitTuru === 'detayli') { 
        kaydedilecekDetay.detayli_kaydedildi = true; 
        await yeniHakemleriKaydet(kaydedilecekDetay); 
        await yeniGozlemciyiKaydet(kaydedilecekDetay); 
    } 
    else { 
        kaydedilecekDetay.detayli_kaydedildi = raporDetay.detayli_kaydedildi || false; 
    }

    const guncellenecekVeri = {
      ev_sahibi_skor: (macDurumu === 'takimlar_cikmadi' || evSkor === '') ? null : Number(evSkor),
      misafir_skor: (macDurumu === 'takimlar_cikmadi' || misafirSkor === '') ? null : Number(misafirSkor),
      mac_durumu: macDurumu, olay_durumu: olayDurumu, rapor_notu: raporNotu, skor_girildi: true, tff_rapor_detaylari: kaydedilecekDetay
    };

    try {
      const { error } = await supabase.from('musabakalar').update(guncellenecekVeri).eq('id', macId);
      if (!error) {
        setKomiserMaclari(prev => prev.map(m => m.id === macId ? { ...m, ...guncellenecekVeri } : m));
        alert(kayitTuru === 'detayli' ? "✅ TFF Detaylı Resmi Tutanağı İzmir Şube Yönetimine başarıyla iletildi!" : "✅ Hızlı Skor Bildirimi İzmir Şube Yönetimine iletildi!");
      } else { alert("Hata oluştu: " + error.message); }
    } catch (err) { alert("Bağlantı hatası!"); } 
    finally { setSkorKaydediliyor(false); }
  }

  const skorSecenekleri = Array.from({ length: 31 }, (_, i) => String(i));
  const haftaToggle = (haftaNo: number) => { setAcikHaftalar(prev => prev.includes(haftaNo) ? prev.filter(h => h !== haftaNo) : [...prev, haftaNo]) }

  const renderTffRaporu = (mac: any, prefix: string) => {
      let safeRaporDetay = prefix === 'aktif' ? raporDetay : (mac?.tff_rapor_detaylari || {});
      if (typeof safeRaporDetay === 'string') {
          try { safeRaporDetay = JSON.parse(safeRaporDetay); } catch(e) { safeRaporDetay = {}; }
      }
      if (!safeRaporDetay || typeof safeRaporDetay !== 'object') safeRaporDetay = {}; 
      
      const raporTuru = raporTurunuBelirle(mac?.kategori_adi);
      const hakemModu = getHakemGosterimModu(mac?.kategori_adi);
      const hakemBaslik = hakemModu === 'tek_hakem' ? 'HAKEM' : (hakemModu === 'uc_hakem' ? 'HAKEMLER' : 'HAKEMLER VE GÖZLEMCİ');

      const komiserTamIsim = seciliKomiser?.ad_soyad || 'KOMİSER';
      const komiserIlkIsim = typeof komiserTamIsim === 'string' ? komiserTamIsim.split(' ')[0] : 'KOMİSER';
      const komiserTelefon = seciliKomiser?.telefon || '';

      const ihracEvListesi = Array.isArray(safeRaporDetay.ihrac_ev) ? safeRaporDetay.ihrac_ev : [];
      const ihracMisListesi = Array.isArray(safeRaporDetay.ihrac_mis) ? safeRaporDetay.ihrac_mis : [];
      const ekRaporlarListesi = Array.isArray(safeRaporDetay.ek_raporlar) ? safeRaporDetay.ek_raporlar : [];
      const maxSatir = Math.max(ihracEvListesi.length, ihracMisListesi.length) || 1;

      const EvetHayirBox = ({ val }: { val: string }) => (
          <div className="flex items-center gap-4 pointer-events-none"><div className="flex items-center gap-1"><span className="w-8 text-right text-slate-700">Evet</span><div className="w-4 h-4 border border-black flex items-center justify-center text-xs font-bold bg-white text-black">{val === 'evet' ? 'X' : ''}</div></div><div className="flex items-center gap-1"><span className="w-8 text-right text-slate-700">Hayır</span><div className="w-4 h-4 border border-black flex items-center justify-center text-xs font-bold bg-white text-black">{val === 'hayir' ? 'X' : ''}</div></div></div>
      );

      return (
          <div id={`${prefix}-form-${mac?.id}`} className="min-w-[700px] w-full bg-white p-6 border-2 border-black relative font-sans text-black shadow-sm mx-auto flex flex-col gap-6 mobile-zoom">
              <style dangerouslySetInnerHTML={{__html: `
                  @media (max-width: 768px) {
                      .mobile-zoom { zoom: 0.5; }
                  }
              `}} />
              
              {raporTuru === 'amator' && (
              <div className="border-[3px] border-double border-slate-600 p-4">
                  <div className="flex flex-col items-center mb-6 border-b-[3px] border-double border-red-600 pb-4 relative">
                      <img src={AMATOR_MERKEZ_LOGO} crossOrigin="anonymous" alt="TFF Merkez" className="h-16 w-auto mb-2 drop-shadow-md" />
                      <div className="text-[10px] font-black tracking-widest text-[#E30A17] mb-1">TFF</div>
                      <h2 className="font-extrabold text-xl md:text-2xl uppercase tracking-widest mt-1 text-black">TÜRKİYE FUTBOL FEDERASYONU</h2>
                      <h3 className="font-bold text-lg md:text-xl uppercase mt-1 text-black">SAHA KOMİSERİ RAPORU</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-0 border border-black mb-6 text-black">
                      <div className="border-r border-black p-2 flex flex-col justify-center border-b border-dashed"><div className="flex items-center gap-2"><span className="text-[10px] font-bold">MÜSABAKANIN YAPILDIĞI YER:</span> <span className="font-black text-xl tracking-wider">İZMİR</span></div></div>
                      <div className="p-2 border-b border-dashed border-black"><div className="flex justify-between items-center"><span className="text-[10px] font-bold">MÜSABAKA NO:</span> <span className="font-bold text-sm uppercase text-black">{formatMacKodu(mac?.mac_kodu)}</span></div></div>
                      
                      <div className="p-2 border-r border-b border-dashed border-black bg-slate-100/50 text-center font-bold text-xs">KARŞILAŞAN KULÜPLER</div>
                      <div className="p-2 border-b border-dashed border-black"><div className="flex justify-between items-center"><span className="text-[10px] font-bold">STAD ADI:</span> <span className="font-bold text-xs uppercase text-right truncate w-3/4 text-black">{mac?.saha || '-'}</span></div></div>
                      
                      <div className="grid grid-cols-4 border-b border-dashed border-black border-r border-l-0">
                          <div className="col-span-3 p-2 flex flex-col justify-center border-r border-dashed border-black"><div className="flex gap-2"><span className="text-[10px] font-bold w-12">EV SAHİBİ:</span> <span className="font-bold text-xs uppercase truncate text-black">{mac?.ev_sahibi || '-'}</span></div></div>
                          <div className="col-span-1 p-2 flex flex-col items-center justify-center bg-slate-100/30 border-r-0"><span className="text-[10px] font-bold mb-1">SKOR</span><span className="font-black text-lg text-black">{prefix === 'aktif' ? (evSkor || '-') : (mac?.ev_sahibi_skor !== null ? mac?.ev_sahibi_skor : '-')}</span></div>
                      </div>
                      
                      <div className="p-2 border-b border-dashed border-black flex justify-between items-center"><span className="text-[10px] font-bold w-12">KATEGORİ:</span> <span className="font-bold text-[10px] text-right truncate w-2/3 text-black">{mac?.kategori_adi || '-'}</span></div>
                      
                      <div className="grid grid-cols-4 border-b border-black border-r border-l-0">
                          <div className="col-span-3 p-2 flex flex-col justify-center border-r border-dashed border-black"><div className="flex gap-2"><span className="text-[10px] font-bold w-12">MİSAFİR:</span> <span className="font-bold text-xs uppercase truncate text-black">{mac?.misafir_takim || '-'}</span></div></div>
                          <div className="col-span-1 p-2 flex flex-col items-center justify-center bg-slate-100/30 border-r-0"><span className="font-black text-lg text-black">{prefix === 'aktif' ? (misafirSkor || '-') : (mac?.misafir_skor !== null ? mac?.misafir_skor : '-')}</span></div>
                      </div>
                      
                      <div className="flex flex-col border-b border-black">
                          <div className="p-2 flex justify-between items-center border-b border-dashed border-black"><span className="text-[10px] font-bold">TARİH:</span> <span className="font-bold text-xs text-black">{guvenliTarih(mac?.tarih)}</span></div>
                          <div className="p-2 flex justify-between items-center"><span className="text-[10px] font-bold">SAAT:</span> <span className="font-bold text-xs text-black">{guvenliSaat(mac?.saat)}</span></div>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-0 border border-black mb-6 text-black">
                      <div className="bg-slate-100/50 p-1.5 border-r border-b border-dashed border-black text-center text-[11px] font-bold">{hakemBaslik}</div>
                      <div className="bg-slate-100/50 p-1.5 border-b border-dashed border-black text-center text-[11px] font-bold">MÜSABAKADA GÖREVLİ PERSONELLER</div>
                      <div className="border-r border-black flex flex-col">
                          <div className="flex border-b border-dashed border-black p-1.5 items-center justify-between"><span className="text-[10px] font-bold w-20">HAKEM</span> <input readOnly type="text" value={safeRaporDetay?.hakem || ''} className="w-full text-xs outline-none bg-transparent font-black uppercase ml-2 pointer-events-none" /></div>
                          <div className="flex border-b border-dashed border-black p-1.5 items-center justify-between"><span className="text-[10px] font-bold w-20">1.YRD.HAKEM</span> <input readOnly type="text" value={safeRaporDetay?.y_hakem_1 || ''} className="w-full text-xs outline-none bg-transparent font-black uppercase ml-2 pointer-events-none" /></div>
                          <div className="flex border-b border-dashed border-black p-1.5 items-center justify-between"><span className="text-[10px] font-bold w-20">2.YRD.HAKEM</span> <input readOnly type="text" value={safeRaporDetay?.y_hakem_2 || ''} className="w-full text-xs outline-none bg-transparent font-black uppercase ml-2 pointer-events-none" /></div>
                          <div className="flex p-1.5 items-center justify-between"><span className="text-[10px] font-bold w-20">GÖZLEMCİ</span> <input readOnly type="text" value={safeRaporDetay?.gozlemci || ''} className="w-full text-xs outline-none bg-transparent font-black uppercase ml-2 pointer-events-none" /></div>
                      </div>
                      <div className="flex flex-col">
                          <div className="flex border-b border-dashed border-black p-1.5 items-center justify-between h-1/2">
                              <span className="text-[10px] font-bold w-24">SAĞLIK MEMURU</span> 
                              <span className="w-full text-xs font-black uppercase ml-2 text-center inline-block">{safeRaporDetay?.saglik === 'var' || safeRaporDetay?.saglik_adi === 'VAR' ? 'VAR' : (safeRaporDetay?.saglik === 'yok' || safeRaporDetay?.saglik_adi === 'YOK' ? 'YOK' : '')}</span>
                          </div>
                          <div className="flex p-1.5 items-center justify-between h-1/2">
                              <span className="text-[10px] font-bold w-24">GÜVENLİK</span> 
                              <span className="w-full text-xs font-black uppercase ml-2 text-center inline-block">{safeRaporDetay?.guvenlik === 'var' || safeRaporDetay?.guvenlik_amiri === 'VAR' ? 'VAR' : (safeRaporDetay?.guvenlik === 'yok' || safeRaporDetay?.guvenlik_amiri === 'YOK' ? 'YOK' : '')}</span>
                          </div>
                      </div>
                  </div>
                  <h3 className="text-center font-black tracking-widest text-sm mb-2 border-b-2 border-black w-32 mx-auto pb-1 text-black">İ H R A Ç L A R</h3>
                  <div className="border border-black mb-6 text-black">
                      <div className="grid grid-cols-2 text-center text-xs font-bold border-b border-black">
                          <div className="p-1.5 border-r border-black bg-slate-100/50">EV SAHİBİ KULÜP</div><div className="p-1.5 bg-slate-100/50">MİSAFİR KULÜP</div>
                      </div>
                      <div className="grid grid-cols-2 text-center text-[10px] font-bold border-b border-black bg-slate-50">
                          <div className="grid grid-cols-12 border-r border-black"><div className="col-span-2 p-1 border-r border-dashed border-black">FORMA NO</div><div className="col-span-7 p-1 border-r border-dashed border-black">ADI SOYADI</div><div className="col-span-3 p-1">LİSANS NO</div></div>
                          <div className="grid grid-cols-12"><div className="col-span-2 p-1 border-r border-dashed border-black">FORMA NO</div><div className="col-span-7 p-1 border-r border-dashed border-black">ADI SOYADI</div><div className="col-span-3 p-1">LİSANS NO</div></div>
                      </div>
                      {Array.from({ length: maxSatir }).map((_, idx) => (
                          <div key={`ihrac-${idx}`} className="grid grid-cols-2 text-center text-[11px] border-b border-dashed border-black last:border-b-0 group relative">
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
                  <div className="mb-8 text-black">
                      <h3 className="font-bold text-xs text-center border-b border-black pb-1 mb-2 uppercase tracking-wide">SEYİRCİ TAŞKINLIKLARI, YÖNETİCİ VE FUTBOLCULARIN HAREKET VE TUTUMLARI</h3>
                      <textarea readOnly value={safeRaporDetay?.tff_not || mac.rapor_notu || ''} className="w-full outline-none bg-transparent font-serif text-sm leading-relaxed resize-none overflow-hidden min-h-[150px] border border-dashed border-slate-300 p-2 pointer-events-none"></textarea>
                  </div>
                  <div className="flex justify-between items-end px-4 mt-8 pt-4 text-black">
                      <div className="text-xs font-bold">Rapor düzenlenme tarihi: <span className="ml-2 border-b border-dotted border-black px-2 pb-0.5">{new Date().toLocaleDateString('tr-TR')}</span></div>
                      <div className="text-center">
                          <div className="font-serif text-2xl text-slate-800 -mb-2 italic opacity-80" style={{fontFamily: "'Brush Script MT', cursive"}}>{komiserIlkIsim}</div>
                          <div className="font-bold text-sm border-b border-black px-4 pb-1">{komiserTamIsim}</div>
                          <div className="text-[10px] text-slate-500">GSM Telefon No: ''</div>
                          <div className="text-[10px] font-bold mt-1">SAHA KOMİSERİ</div>
                      </div>
                  </div>
              </div>
              )}

              {raporTuru === 'gelisim' && (
              <div className="border-[3px] border-double border-slate-600 p-4 bg-white text-black font-sans">
                  <div className="flex items-center justify-between mb-4 border-b-2 border-slate-800 pb-3">
                      <div className="w-1/4 flex justify-start items-center"><img src={GELISIM_SOL_LOGO} crossOrigin="anonymous" alt="TFF Sol" className="h-16 md:h-20 w-auto drop-shadow-md" /></div>
                      <div className="text-center flex-col items-center justify-center w-2/4">
                          <h2 className="font-extrabold text-lg md:text-xl uppercase tracking-widest text-black">TÜRKİYE FUTBOL FEDERASYONU</h2>
                          <h3 className="font-bold text-base md:text-lg uppercase mt-1 text-black">GELİŞİM LİGLERİ</h3>
                          <h3 className="font-bold text-sm md:text-base uppercase mt-1 text-black">MÜSABAKA SAHA KOMİSERİ RAPORU</h3>
                      </div>
                      <div className="w-1/4 flex justify-end items-center"><img src={GELISIM_SAG_LOGO} crossOrigin="anonymous" alt="TFF Sağ" className="h-16 md:h-20 w-auto drop-shadow-md" /></div>
                  </div>

                  <div className="border border-black text-xs font-bold mb-4">
                      <div className="flex border-b border-black text-center bg-slate-100">
                          <div className="w-1/5 border-r border-black p-1.5 flex items-center justify-center">MAÇ TARİHİ</div><div className="w-1/5 border-r border-black p-1.5 flex items-center justify-center">MAÇ SAATİ</div><div className="w-2/5 border-r border-black p-1.5 flex items-center justify-center">STAD ADI(İL/İLÇE)</div><div className="w-1/5 p-1.5 flex items-center justify-center">LİG KATEGORİSİ</div>
                      </div>
                      <div className="flex text-center uppercase">
                          <div className="w-1/5 border-r border-black p-2">{guvenliTarih(mac.tarih)}</div><div className="w-1/5 border-r border-black p-2">{guvenliSaat(mac.saat)}</div><div className="w-2/5 border-r border-black p-2 truncate">{mac.saha}</div><div className="w-1/5 p-2 truncate">{mac.kategori_adi}</div>
                      </div>
                  </div>

                  <div className="border-2 border-black text-xs font-bold mb-6">
                      <div className="grid grid-cols-6 border-b border-black">
                          <div className="col-span-5 border-r border-black p-2 flex gap-2 items-center"><span className="w-40 text-slate-600">EV SAHİBİ TAKIM ADI</span> <span className="uppercase text-sm">{mac.ev_sahibi}</span></div>
                          <div className="col-span-1 grid grid-cols-2 bg-slate-100">
                              <div className="flex items-center justify-center border-r border-slate-300 text-[10px] text-slate-600 font-bold">SKOR</div>
                              <div className="flex items-center justify-center text-xl font-black">{mac.ev_sahibi_skor !== null ? mac.ev_sahibi_skor : '-'}</div>
                          </div>
                      </div>
                      <div className="grid grid-cols-6">
                          <div className="col-span-5 border-r border-black p-2 flex gap-2 items-center"><span className="w-40 text-slate-600">MİSAFİR TAKIM ADI</span> <span className="uppercase text-sm">{mac.misafir_takim}</span></div>
                          <div className="col-span-1 grid grid-cols-2 bg-slate-100">
                              <div className="flex items-center justify-center border-r border-slate-300 text-[10px] text-slate-600 font-bold">SKOR</div>
                              <div className="flex items-center justify-center text-xl font-black">{mac.misafir_skor !== null ? mac.misafir_skor : '-'}</div>
                          </div>
                      </div>
                  </div>

                  <h3 className="font-bold text-sm mb-1 uppercase">GÖREVLİLER</h3>
                  <div className="border border-black text-xs font-bold mb-6">
                      <div className="flex border-b border-black bg-slate-100"><div className="w-1/3 border-r border-black p-1.5">GÖREVİ</div><div className="w-2/3 p-1.5">ADI SOYADI</div></div>
                      <div className="flex border-b border-black"><div className="w-1/3 border-r border-black p-1.5">HAKEM</div><div className="w-2/3 p-1.5"><input readOnly type="text" value={safeRaporDetay?.hakem || ''} className="w-full outline-none bg-transparent uppercase pointer-events-none" /></div></div>
                      <div className="flex border-b border-black"><div className="w-1/3 border-r border-black p-1.5">YARDIMCI HAKEM 1</div><div className="w-2/3 p-1.5"><input readOnly type="text" value={safeRaporDetay?.y_hakem_1 || ''} className="w-full outline-none bg-transparent uppercase pointer-events-none" /></div></div>
                      <div className="flex border-b border-black"><div className="w-1/3 border-r border-black p-1.5">YARDIMCI HAKEM 2</div><div className="w-2/3 p-1.5"><input readOnly type="text" value={safeRaporDetay?.y_hakem_2 || ''} className="w-full outline-none bg-transparent uppercase pointer-events-none" /></div></div>
                      <div className="flex border-b border-black"><div className="w-1/3 border-r border-black p-1.5">4.HAKEM</div><div className="w-2/3 p-1.5"><input readOnly type="text" value={safeRaporDetay?.hakem_4 || ''} className="w-full outline-none bg-transparent uppercase pointer-events-none" /></div></div>
                      <div className="flex"><div className="w-1/3 border-r border-black p-1.5">GÖZLEMCİ</div><div className="w-2/3 p-1.5"><input readOnly type="text" value={safeRaporDetay?.gozlemci || ''} className="w-full outline-none bg-transparent uppercase pointer-events-none" /></div></div>
                  </div>

                  <div className="border border-black text-xs font-bold mb-6 w-2/3">
                      <div className="flex border-b border-black">
                          <div className="w-1/2 border-r border-black p-1.5 bg-slate-50">GÜVENLİK GÖREVLİSİ (VAR MI?)</div>
                          <div className="w-1/2 flex items-center justify-center p-1 gap-4">
                              <span className="w-full text-xs font-black uppercase ml-2 text-center inline-block">{safeRaporDetay?.guvenlik === 'var' ? 'VAR' : (safeRaporDetay?.guvenlik === 'yok' ? 'YOK' : '')}</span>
                          </div>
                      </div>
                      {safeRaporDetay?.guvenlik === 'var' && (
                          <>
                              <div className="flex border-b border-black bg-slate-50/50">
                                  <div className="w-1/2 border-r border-black p-1.5 text-[10px] text-slate-800">↳ GÜVENLİK AMİRİ ADI SOYADI</div>
                                  <div className="w-1/2 p-1.5">
                                      <span className="w-full text-xs font-black uppercase text-left inline-block">{temizHakem(safeRaporDetay?.guvenlik_amiri)}</span>
                                  </div>
                              </div>
                              <div className="flex border-b border-black bg-slate-50/50">
                                  <div className="w-1/2 border-r border-black p-1.5 text-[10px] text-slate-800">↳ GÜVENLİK AMİRİ TELEFON</div>
                                  <div className="w-1/2 p-1.5">
                                      <span className="w-full text-xs font-black uppercase text-left inline-block">{temizHakem(safeRaporDetay?.guvenlik_telefon)}</span>
                                  </div>
                              </div>
                          </>
                      )}

                      <div className="flex border-b border-black">
                          <div className="w-1/2 border-r border-black p-1.5 bg-slate-50">SAĞLIK MEMURU (VAR MI?)</div>
                          <div className="w-1/2 flex items-center justify-center p-1 gap-4">
                              <span className="w-full text-xs font-black uppercase ml-2 text-center inline-block">{safeRaporDetay?.saglik === 'var' ? 'VAR' : (safeRaporDetay?.saglik === 'yok' ? 'YOK' : '')}</span>
                          </div>
                      </div>
                      {safeRaporDetay?.saglik === 'var' && (
                          <>
                              <div className="flex border-b border-black bg-slate-50/50">
                                  <div className="w-1/2 border-r border-black p-1.5 text-[10px] text-slate-800">↳ SAĞLIK MEMURU ADI SOYADI</div>
                                  <div className="w-1/2 p-1.5">
                                      <span className="w-full text-xs font-black uppercase text-left inline-block">{temizHakem(safeRaporDetay?.saglik_adi)}</span>
                                  </div>
                              </div>
                              <div className="flex bg-slate-50/50">
                                  <div className="w-1/2 border-r border-black p-1.5 text-[10px] text-slate-800">↳ SAĞLIK MEMURU TELEFON</div>
                                  <div className="w-1/2 p-1.5">
                                      <span className="w-full text-xs font-black uppercase text-left inline-block">{temizHakem(safeRaporDetay?.saglik_telefon)}</span>
                                  </div>
                              </div>
                          </>
                      )}
                  </div>

                  <div className="bg-slate-100 p-2 font-black text-sm mb-2">I) ORGANİZASYON :</div>
                  <div className="mb-4 text-xs font-medium space-y-1">
                      <p className="mb-2">(a) Saha Komiserinin oyun alanına gidişi ve oyun alanını kontrolü</p>
                      {gelisimOrganizasyon.map((soru: any) => (<div key={soru.id} className="flex justify-between items-center border-b border-dashed border-slate-300 py-1"><span className="text-[10px] w-3/4">{soru.text}</span><div className="flex gap-4 w-1/4 justify-end pr-2"><EvetHayirBox val={safeRaporDetay?.gelisim_sorular?.[soru.id]} /></div></div>))}
                      <p className="mt-4 mb-1">(b) Müsabaka sonu değerlendirmesi</p>
                      <textarea readOnly value={safeRaporDetay?.gelisim_sorular?.degerlendirme || ''} className="w-full border-b border-dashed border-black bg-transparent outline-none resize-none h-10 pointer-events-none"></textarea>
                  </div>

                  <div className="bg-slate-100 p-2 font-black text-sm mb-2">II) TEKNİK HUSUSLAR :</div>
                  <div className="mb-4 text-xs font-medium space-y-1">
                      <p className="mb-2">a) Aşağıdaki tesis / malzemeler standarlara uygun mudur? (dk. - 60'da kontrol edilecektir )</p>
                      {gelisimTeknik.map((soru: any) => (<div key={soru.id} className="flex justify-between items-center border-b border-dashed border-slate-300 py-1"><span className="text-[10px] w-3/4">{soru.text}</span><div className="flex gap-4 w-1/4 justify-end pr-2"><EvetHayirBox val={safeRaporDetay?.gelisim_sorular?.[soru.id]} /></div></div>))}
                      <div className="mt-4 space-y-2">
                          <div className="flex justify-between items-center border-b border-dashed border-slate-300 py-1"><span className="text-[10px] w-3/4">b) Her iki kulüp Müsabaka isim listelerinin, kulüp lisansları ile akreditasyon listelerinin kontrolleri yapılarak hakemlere teslimi denetlendi mi?</span><div className="flex gap-4 w-1/4 justify-end pr-2"><EvetHayirBox val={safeRaporDetay?.gelisim_sorular?.isim_listeleri} /></div></div>
                          <div className="flex justify-between items-center border-b border-dashed border-slate-300 py-1"><span className="text-[10px] w-3/4">c) Takımlar koyu ve açık renk forma setlerini getirdi mi?</span><div className="flex gap-4 w-1/4 justify-end pr-2"><EvetHayirBox val={safeRaporDetay?.gelisim_sorular?.forma_setleri} /></div></div>
                          <div className="flex justify-between items-center border-b border-dashed border-slate-300 py-1"><span className="text-[10px] w-3/4">d) Stadyum WC'leri hijyenik mi? Temizliği yapılmış mı?</span><div className="flex gap-4 w-1/4 justify-end pr-2"><EvetHayirBox val={safeRaporDetay?.gelisim_sorular?.wc_hijyen} /></div></div>
                      </div>
                  </div>

                  <div className="bg-slate-100 p-2 font-black text-sm mb-2">III) GÜVENLİK KONULARI :</div>
                  <div className="mb-4 text-xs font-medium space-y-2">
                      <div className="flex flex-col border-b border-dashed border-slate-300 pb-2"><span>a) Misafir takım geliş ve gidişleri nasıl sağlandı ?</span><input readOnly type="text" value={safeRaporDetay?.gelisim_sorular?.misafir_gelis_gidis || ''} className="w-full outline-none bg-transparent border-b border-dotted border-black mt-1 pointer-events-none" /></div>
                      <div className="flex justify-between items-center border-b border-dashed border-slate-300 py-1"><span className="text-[10px] w-3/4">b) Her iki takım yöneticilerine soyunma odalarına ve koridorlara girebilecek kişiler konusundaki kısıtlamaları ve akreditasyon kartı mecburiyeti hatırlatıldı mı ?</span><div className="flex gap-4 w-1/4 justify-end pr-2"><EvetHayirBox val={safeRaporDetay?.gelisim_sorular?.soyunma_odasi_kisitlama} /></div></div>
                      <div className="flex justify-between items-center border-b border-dashed border-slate-300 py-1"><span className="text-[10px] w-3/4">c) Misafir takım yöneticileri için tribünde uygun yer ayrıldı mı ?</span><div className="flex gap-4 w-1/4 justify-end pr-2"><EvetHayirBox val={safeRaporDetay?.gelisim_sorular?.misafir_tribun_yer} /></div></div>
                      <div className="flex items-center gap-2 border-b border-dashed border-slate-300 py-2"><span>d) Müsabakada görevli Resmi Güvenlik sayısı :</span><span className="font-bold ml-2 border-b border-black px-4">{safeRaporDetay?.gelisim_sorular?.guvenlik_sayisi || '-'}</span><span>Kişi</span></div>
                  </div>

                  <div className="bg-slate-100 p-2 font-black text-sm mb-2">IV) İŞLETİMSEL EKSİKLİK :</div>
                  <div className="mb-4 text-xs font-medium space-y-1">
                      <p>Sahadaki eksikliklerin tespit edilerek yazılması,</p>
                      <div className="flex items-center gap-2"><span>1-</span><input readOnly type="text" value={safeRaporDetay?.gelisim_sorular?.isletimsel_1 || ''} className="flex-1 outline-none bg-transparent border-b border-dotted border-black pointer-events-none" /></div>
                      <div className="flex items-center gap-2"><span>2-</span><input readOnly type="text" value={safeRaporDetay?.gelisim_sorular?.isletimsel_2 || ''} className="flex-1 outline-none bg-transparent border-b border-dotted border-black pointer-events-none" /></div>
                      <div className="flex items-center gap-2"><span>3-</span><input readOnly type="text" value={safeRaporDetay?.gelisim_sorular?.isletimsel_3 || ''} className="flex-1 outline-none bg-transparent border-b border-dotted border-black pointer-events-none" /></div>
                  </div>

                  <div className="bg-slate-100 p-2 font-black text-sm mb-2">OLUMLU BULUNMAYAN DİĞER HUSUSLAR :</div>
                  <textarea readOnly value={safeRaporDetay?.gelisim_sorular?.olumsuz_diger || ''} className="w-full border-b border-dashed border-black bg-transparent outline-none resize-none min-h-[50px] mb-4 text-xs pointer-events-none"></textarea>

                  <div className="mb-4">
                      <h3 className="font-bold text-xs uppercase mb-1">MÜSABAKA ÖNCESİ, DEVAMI VE BİTİMİNDEKİ OLAYLAR:</h3>
                      <p className="text-[10px] mb-1">(Yönetici,Teknik Adamlar,Futbolcular,Kulüp görevlileri vb.kişilerin eylemleri ayrı ayrı detaylı bir şekilde yazılacaktır.)</p>
                      <textarea readOnly value={safeRaporDetay?.tff_not || mac.rapor_notu || ''} className="w-full outline-none border border-dashed border-black min-h-[150px] p-2 text-sm bg-transparent pointer-events-none"></textarea>
                  </div>

                  <div className="flex justify-between items-end px-4 mt-8 pt-4 text-black">
                      <div className="text-xs font-bold">Rapor düzenlenme tarihi: <span className="ml-2 border-b border-dotted border-black px-2 pb-0.5">{new Date().toLocaleDateString('tr-TR')}</span></div>
                      <div className="text-center">
                          <div className="font-serif text-2xl text-slate-800 -mb-2 italic opacity-80" style={{fontFamily: "'Brush Script MT', cursive"}}>{komiserIlkIsim}</div>
                          <div className="font-bold text-sm border-b border-black px-4 pb-1">{komiserTamIsim}</div>
                          <div className="text-[10px] text-slate-500">GSM Telefon No: ''</div>
                          <div className="text-[10px] font-bold mt-1">SAHA KOMİSERİ</div>
                      </div>
                  </div>
              </div>
              )}
          </div>
      );
  }

  if (aktifEkran === 'dashboard') {
    return (
      <main className="min-h-screen bg-slate-100 flex flex-col font-sans">
        {renderOrtakHeader(false)}
        <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6">
          
          <div className="bg-slate-800 rounded-2xl shadow-xl p-6 mb-6 flex flex-col md:flex-row items-center gap-6 border-t-4 border-blue-500 relative overflow-hidden">
            <div className="text-center md:text-left flex-1 relative z-10">
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase">{seciliKomiser?.ad_soyad || 'Komiser'}</h2>
              <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-2">
                <span className="bg-slate-700 text-blue-100 font-mono text-xs font-bold px-3 py-1.5 rounded-md border border-slate-600 shadow-sm">SİCİL NO: {seciliKomiser?.komiser_id || '-'}</span>
                <span className="bg-blue-900/50 text-blue-200 text-xs font-bold px-3 py-1.5 rounded-md border border-blue-800 shadow-sm">BU SEZON: {Array.isArray(komiserMaclari) ? komiserMaclari.length : 0} GÖREV</span>
              </div>
              
              <div className="mt-5 space-y-3 animate-fade-in-down">
                {tebellugBekleyenSayisi > 0 ? (
                  <div className="bg-blue-50 border border-blue-300 text-blue-900 px-4 py-3 rounded-lg flex flex-col sm:flex-row items-center justify-between shadow-sm animate-pulse gap-3">
                    <span className="font-bold text-xs md:text-sm flex items-center gap-2">🔔 Yeni Atanan {tebellugBekleyenSayisi} Göreviniz Var!</span>
                    <button onClick={() => setAktifEkran('gorevKartlari')} className="w-full sm:w-auto text-[10px] md:text-xs bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded shadow uppercase border border-blue-600">Önce Tebellüğ Et</button>
                  </div>
                ) : (
                  <>
                    {eksikSkorSayisi > 0 && (
                      <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded-lg flex items-center justify-between shadow-sm">
                        <span className="font-bold text-xs md:text-sm flex items-center gap-2">⏳ Skoru Beklenen {eksikSkorSayisi} Maçınız Var</span>
                        <button onClick={() => setAktifEkran('skorRapor')} className="text-[10px] md:text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-3 rounded shadow border border-amber-500">GİRİŞ YAP</button>
                      </div>
                    )}
                    {eksikDetayliSayisi > 0 && (
                      <div className="bg-red-50 border border-red-300 text-red-900 px-4 py-3 rounded-lg flex items-center justify-between shadow-sm">
                        <span className="font-bold text-xs md:text-sm flex items-center gap-2">📝 Detaylı Raporu Beklenen {eksikDetayliSayisi} Maçınız Var <span className="hidden md:inline">(ZORUNLU)</span></span>
                        <button onClick={() => setAktifEkran('skorRapor')} className="text-[10px] md:text-xs bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded shadow border border-red-500">RAPORLA</button>
                      </div>
                    )}
                    
                    {herSeyTamam && (
                       <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-lg flex items-start shadow-sm animate-fade-in-up">
                          <span className="text-2xl md:text-3xl mr-3 mt-1">✅</span>
                          <div>
                              <h4 className="font-black text-sm md:text-base uppercase tracking-wider text-emerald-900">{globalAktifHaftaNo}. Hafta Görevleri Tamamlandı</h4>
                              <p className="text-[10px] md:text-xs font-medium mt-0.5 text-emerald-800">Tarafınıza tevdi edilen tüm müsabakaları tebellüğ ettiniz ve raporlamalarını eksiksiz tamamladınız. İzmir Şube Yönetimi adına teşekkür ederiz.</p>
                          </div>
                       </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <button onClick={() => setAktifEkran('gorevKartlari')} className="flex flex-col items-center justify-center p-6 md:p-8 rounded-2xl shadow-md bg-gradient-to-br from-teal-500 to-emerald-600 border-2 border-teal-700 hover:scale-[1.02] transition-transform relative group">
                <h4 className="font-black text-xl md:text-2xl text-white uppercase relative z-10">Görev Kartım</h4>
                <p className="text-sm text-center mt-2 text-teal-100 font-medium relative z-10">Atanan maçlarınızı görün ve görevi tebellüğ edin.</p>
                {tebellugBekleyenSayisi > 0 && <span className="mt-3 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full animate-bounce relative z-10 shadow-lg">{tebellugBekleyenSayisi} YENİ GÖREV</span>}
            </button>
            <button onClick={() => setAktifEkran('skorRapor')} className="flex flex-col items-center justify-center p-6 md:p-8 rounded-2xl shadow-md bg-gradient-to-br from-sky-500 to-blue-700 border-2 border-blue-800 hover:scale-[1.02] transition-transform relative group">
                <h4 className="font-black text-xl md:text-2xl text-white uppercase relative z-10 text-center">Skor & Saha Raporu</h4>
                <p className="text-sm text-center mt-2 text-sky-100 font-medium relative z-10">Hızlı skoru bildirin ve detaylı müsabaka raporu oluşturun.</p>
            </button>
          </div>
          
          <button onClick={() => setAktifEkran('bultenArama')} className="w-full mb-4 flex items-center justify-between p-5 md:p-6 rounded-2xl shadow-sm bg-slate-800 border-2 border-slate-700 hover:bg-slate-900 transition-all transform hover:scale-[1.01] group overflow-hidden relative">
            <div className="text-left relative z-10">
              <h4 className="font-black text-lg md:text-xl text-white uppercase tracking-wide">🔍 Haftalık Bülten & Görev Arama</h4>
              <p className="text-xs md:text-sm mt-1 text-slate-400 font-medium">Saha, takım veya komiser ismine göre İzmir'deki tüm güncel görevleri sorgulayın.</p>
            </div>
          </button>

          <button onClick={() => setAktifEkran('istatistiklerim')} className="w-full mb-4 flex items-center justify-between p-5 md:p-6 rounded-2xl shadow-sm bg-slate-800 border-2 border-slate-700 hover:bg-slate-900 transition-all transform hover:scale-[1.01] group overflow-hidden relative">
            <div className="text-left relative z-10">
              <h4 className="font-black text-lg md:text-xl text-white uppercase tracking-wide">Sezonluk İstatistiklerim</h4>
              <p className="text-xs md:text-sm mt-1 text-slate-400 font-medium">Görev aldığınız liglerin dökümü.</p>
            </div>
          </button>

          {mazeretAcik ? (
            <button onClick={() => setAktifEkran('mazeretBildir')} className="w-full flex items-center justify-between p-5 md:p-6 rounded-2xl shadow-sm bg-slate-800 border-2 border-slate-700 hover:bg-slate-900 transition-all transform hover:scale-[1.01] group overflow-hidden relative">
              <div className="text-left relative z-10"><h4 className="font-black text-lg md:text-xl text-white uppercase tracking-wide">📅 Müsaitlik / Mazeret Bildir</h4></div>
            </button>
          ) : (
            <button disabled className="w-full p-5 rounded-2xl bg-slate-200 opacity-60 cursor-not-allowed border-2 border-slate-300"><h4 className="font-black text-sm text-slate-500 text-left uppercase">Sistem Kapalı</h4></button>
          )}
        </div>
      </main>
    )
  }

  if (aktifEkran === 'giris') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-[#dc2626] to-[#b91c1c] rounded-b-[50%] scale-150 transform -translate-y-1/4 shadow-2xl opacity-90"></div>
        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] max-w-sm w-full text-center relative z-10 border border-slate-100">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-white rounded-full p-2 shadow-lg border border-slate-100 -mt-16 flex items-center justify-center">
              <img src={DERNEK_LOGO} crossOrigin="anonymous" alt="TFF Logo" className="w-[85%] h-[85%] object-contain" />
            </div>
          </div>
          <h1 className="text-sm font-black tracking-widest text-slate-800 uppercase leading-snug mb-1">
            TÜRKİYE FUTBOL SAHA KOMİSERLERİ DERNEĞİ
          </h1>
          <h2 className="text-[11px] font-bold text-red-600 tracking-widest uppercase mb-8">
            İZMİR ŞUBESİ SAHA OPERASYON SİSTEMİ
          </h2>
          <form onSubmit={girisYap} className="space-y-6">
            <div>
              <input type="text" value={kullaniciIdInput} onChange={(e) => setKullaniciIdInput(e.target.value)} onKeyDown={enterTusuKontrol} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3.5 text-center text-slate-800 font-black tracking-[0.2em] text-lg focus:outline-none focus:border-red-500 focus:bg-white transition-all shadow-inner" required />
            </div>
            {girisHatasi && <p className="text-red-600 text-xs font-bold text-center bg-red-50 p-2 rounded-lg border border-red-100">{girisHatasi}</p>}
            <button type="submit" disabled={girisYukleniyor} className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-md transition-all disabled:opacity-50 hover:-translate-y-0.5">
              {girisYukleniyor ? 'GİRİŞ YAPILIYOR...' : 'SİSTEME GİRİŞ YAP'}
            </button>
          </form>
        </div>
        <div className="absolute bottom-6 text-[10px] text-slate-400 font-medium tracking-widest uppercase text-center w-full z-10">
          SahaKom-OS Türkiye © 2026<br/>Tüm Hakları Saklıdır
        </div>
      </div>
    )
  }

  return null;
}