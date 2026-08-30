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

    if (kat.includes('GELİŞİM') || kat.includes('AKADEMİ') || kat.includes('ELİT') || 
        kat.includes('PAF') || kat.includes('KIZ') || kat.includes('KADIN') || 
        kat.includes('TFF U')) {
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

  const guvenliTarih = (tarihMetni: string | null | undefined) => {
    if (!tarihMetni) return "-";
    try { return new Date(tarihMetni).toLocaleDateString('tr-TR'); } catch (e) { return tarihMetni; }
  }

  const guvenliSaat = (saatMetni: any) => {
    if (!saatMetni) return "-";
    try { return String(saatMetni).substring(0, 5); } catch (e) { return "-"; }
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
    setAcikSicilSaha(null); setAcikSicilTffMacId(null); setAcikStatu(null);
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
    const kod = String(macKodu || "").toUpperCase();
    
    if (kod.includes('DENETÇİ') || kategori?.toLocaleUpperCase('tr-TR').includes('BAL') || kategori?.toLocaleUpperCase('tr-TR').includes('BÖLGESEL')) return "BAL Ligi Denetçisi";
    if (kod.includes('STAJ')) return "Stajyer / Saha Komiseri";
    
    if (anaKat === 'profesyonel') return "Saha Komiseri";
    if (anaKat === 'gelisim') {
        if (kategori?.toLocaleUpperCase('tr-TR').includes('U17') || kategori?.toLocaleUpperCase('tr-TR').includes('U19') || kategori?.toLocaleUpperCase('tr-TR').includes('PAF')) return "Gelişim Denetçi";
        return "Gelişim Denetçi / Saha Komiseri";
    }
    return "Saha Komiseri";
  }

  const renderOrjinalGorevKarti = (mac: any) => {
    if (!mac) return null;
    
    const statuBul = (katAdi: string) => {
        if(!katAdi) return null;
        const s = katAdi.toLocaleUpperCase('tr-TR');
        return tumStatuler.find(st => s.includes(st.kategori_anahtar));
    }
    const bagliStatu = statuBul(mac.kategori_adi);

    return (
      <div className="bg-white border-l-4 border-red-700 shadow-md rounded-r-xl p-3 md:p-4 mb-3 transition-all hover:shadow-lg">
        <div className="flex justify-between items-start mb-2 border-b border-slate-100 pb-2">
          <span className="font-bold text-slate-900 text-base md:text-xl leading-tight">{mac.ev_sahibi || '-'} <span className="text-slate-400 font-medium mx-1 text-sm md:text-base">vs</span> {mac.misafir_takim || '-'}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-sm text-slate-700 mt-2 bg-slate-50 p-2 md:p-3 rounded-lg border border-slate-100">
          <div className="flex flex-col"><span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wider">Tarih & Saat</span><span className="font-bold text-slate-800 text-xs md:text-sm">{guvenliTarih(mac.tarih)} - {guvenliSaat(mac.saat)}</span></div>
          <div className="flex flex-col"><span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wider">Saha</span><span className="font-bold text-slate-800 text-xs md:text-sm leading-tight">{mac.saha || '-'}</span></div>
          <div className="flex flex-col sm:mt-2 pt-2 sm:pt-3 border-t border-slate-200">
              <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] md:text-xs text-slate-400 font-semibold uppercase tracking-wider">Kategori / Lig</span>
                  {bagliStatu && (
                      <button onClick={() => setAcikStatu(bagliStatu)} className="text-[9px] bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded font-bold transition-colors flex items-center gap-1 shadow-sm">
                          ℹ️ STATÜ
                      </button>
                  )}
              </div>
              <span className="font-bold text-slate-800 text-xs md:text-sm leading-tight">{mac.kategori_adi || '-'} <span className="text-[9px] md:text-xs font-normal text-slate-500 block sm:inline mt-0.5 sm:mt-0 sm:ml-1">(Kod: {mac.mac_kodu || '-'})</span></span>
          </div>
          <div className="flex flex-col sm:mt-2 pt-2 sm:pt-3 border-t border-slate-200"><span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wider">Atanan Görev</span><span className="font-extrabold text-red-700 text-xs md:text-sm">{gorevTuruBelirle(mac.kategori_adi, mac.mac_kodu)}</span></div>
        </div>
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
        setTimeout(() => { setAktifEkran('dashboard'); setMazeretKaydedildi(false); }, 2000);
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
        alert(kayitTuru === 'detayli' ? "✅ TFF Detaylı Resmi Tutanağı Merkeze başarıyla iletildi!" : "✅ Hızlı Skor Bildirimi Merkeze iletildi!");
      } else { alert("Hata oluştu: " + error.message); }
    } catch (err) { alert("Bağlantı hatası!"); } 
    finally { setSkorKaydediliyor(false); }
  }

  const skorSecenekleri = Array.from({ length: 31 }, (_, i) => String(i));
  const haftaToggle = (haftaNo: number) => { setAcikHaftalar(prev => prev.includes(haftaNo) ? prev.filter(h => h !== haftaNo) : [...prev, haftaNo]) }

  // 🔥 KIRMIZI BEYAZ ÜST TAVAN (HEADER) 🔥
  const renderOrtakHeader = (geriButonuGoster = false) => (
    <header className="bg-gradient-to-r from-[#dc2626] to-[#b91c1c] text-white shadow-xl sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 py-5 md:py-6 flex justify-between items-center">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="hidden sm:flex items-center justify-center bg-white p-1.5 rounded-lg shadow-sm">
              <img src={DERNEK_LOGO} alt="Logo" className="w-10 h-10 object-contain" crossOrigin="anonymous" />
          </div>
          <div>
            <h1 className="font-black text-xl md:text-2xl leading-tight drop-shadow-md tracking-wide">İzmir Futbol Saha</h1>
            <h1 className="font-black text-xl md:text-2xl leading-tight text-red-100 drop-shadow-md tracking-wide">Komiserleri Derneği</h1>
            <div className="mt-2.5 inline-block bg-black/20 backdrop-blur-sm px-3 py-1 rounded-md border border-white/20 shadow-sm">
                <p className="text-white text-sm md:text-base font-bold tracking-wider">{globalAktifHaftaNo}. Program Haftası {haftaTarihAraligi ? `(${haftaTarihAraligi})` : ''}</p>
            </div>
          </div>
        </div>
        {geriButonuGoster ? (
          <button onClick={() => { setAktifEkran('dashboard'); setArsivAcik(false); setAcikHaftalar([]); skorFormunuSifirla(); setAramaKomiser(''); setAramaSaha(''); setAramaTakim(''); setAcikSicilSaha(null); setAcikSicilTffMacId(null); setAcikStatu(null); }} className="flex items-center gap-1.5 bg-white text-red-700 hover:bg-slate-100 text-xs md:text-sm font-black py-2.5 px-5 rounded-xl shadow-md transition-transform hover:scale-105 border border-red-200 uppercase tracking-widest">Geri Dön</button>
        ) : (
          <button onClick={cikisYap} className="bg-slate-900 hover:bg-black text-white text-xs md:text-sm font-bold py-2.5 px-5 rounded-xl shadow transition-transform hover:scale-105 uppercase tracking-widest">Çıkış</button>
        )}
      </div>
    </header>
  );

  const renderGunSatiri = (key: string, label: string) => {
    const g = gunler[key]
    return (
      <div key={key} className={`border ${g.active ? 'border-red-400 bg-red-50/50 shadow-md' : 'border-slate-200 bg-white'} rounded-xl overflow-hidden mb-3 transition-all`}>
        <label className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${g.active ? 'bg-red-100/50' : 'hover:bg-slate-50'}`}>
          <input type="checkbox" checked={g.active} onChange={e => updateGun(key, 'active', e.target.checked)} className="w-6 h-6 text-red-600 rounded focus:ring-red-500 cursor-pointer" />
          <span className={`font-bold text-lg ${g.active ? 'text-red-800' : 'text-slate-600'}`}>{label}</span>
        </label>
        {g.active && (
          <div className="p-4 border-t border-red-200 bg-white animate-fade-in-down space-y-4">
            <div className="flex flex-wrap gap-6 bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-sm">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={g.merkez} onChange={e => updateGun(key, 'merkez', e.target.checked)} className="w-5 h-5 text-red-600 rounded focus:ring-red-500" /><span className="text-sm font-bold text-slate-700">Merkez</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={g.deplasman} onChange={e => updateGun(key, 'deplasman', e.target.checked)} className="w-5 h-5 text-red-600 rounded focus:ring-red-500" /><span className="text-sm font-bold text-slate-700">Deplasman</span></label>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm">
              <label className="flex items-center gap-3 cursor-pointer mb-3 pb-3 border-b border-slate-200"><input type="checkbox" checked={g.tumGun} onChange={e => updateGun(key, 'tumGun', e.target.checked)} className="w-6 h-6 text-red-600 rounded focus:ring-red-500" /><span className="text-base font-bold text-slate-800">Tüm Gün Müsaitim</span></label>
              {!g.tumGun && (
                <div className="mt-2 animate-fade-in-down">
                  <div className="flex items-center gap-4">
                    <div className="flex-1"><label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-1">Başlangıç Saati</label><input type="time" value={g.baslangic} onChange={e => updateGun(key, 'baslangic', e.target.value)} className="w-full p-3 border-2 border-slate-300 rounded-lg focus:border-red-500 font-mono text-base" /></div>
                    <span className="text-slate-400 font-bold mt-5">-</span>
                    <div className="flex-1"><label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-1">Bitiş Saati</label><input type="time" value={g.bitis} onChange={e => updateGun(key, 'bitis', e.target.value)} className="w-full p-3 border-2 border-slate-300 rounded-lg focus:border-red-500 font-mono text-base" /></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

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
          <div id={`${prefix}-form-${mac?.id}`} className="min-w-[700px] w-full bg-white p-6 border-2 border-black relative font-sans text-black shadow-sm mx-auto flex flex-col gap-6">
              
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
                          <div className={`flex p-1.5 items-center justify-between flex-1 ${hakemModu !== 'tek_hakem' ? 'border-b border-dashed border-black' : ''}`}>
                              <span className="text-[10px] font-bold w-20">HAKEM</span> 
                              <input list="hakem-listesi" type="text" value={prefix === 'aktif' ? (safeRaporDetay?.hakem || '') : temizHakem(safeRaporDetay?.hakem)} onChange={e => raporDetayGuncelle('hakem', e.target.value.toLocaleUpperCase('tr-TR'))} readOnly={prefix !== 'aktif'} className="w-full text-[11px] outline-none bg-blue-50/40 border border-blue-100 pl-3 py-1 font-black text-blue-900 uppercase ml-2 rounded shadow-sm" placeholder="Seç veya Yeni İsim Yaz..." />
                          </div>
                          
                          {hakemModu !== 'tek_hakem' && (
                              <>
                                  <div className="flex border-b border-dashed border-black p-1.5 items-center justify-between flex-1">
                                      <span className="text-[10px] font-bold w-20">1.YRD.HAKEM</span> 
                                      <input list="hakem-listesi" type="text" value={prefix === 'aktif' ? (safeRaporDetay?.y_hakem_1 || '') : temizHakem(safeRaporDetay?.y_hakem_1)} onChange={e => raporDetayGuncelle('y_hakem_1', e.target.value.toLocaleUpperCase('tr-TR'))} readOnly={prefix !== 'aktif'} className="w-full text-[11px] outline-none bg-blue-50/40 border border-blue-100 pl-3 py-1 font-black text-blue-900 uppercase ml-2 rounded shadow-sm" placeholder="Seç veya Yeni İsim Yaz..." />
                                  </div>
                                  <div className={`flex p-1.5 items-center justify-between flex-1 ${hakemModu === 'dort_kutu' ? 'border-b border-dashed border-black' : ''}`}>
                                      <span className="text-[10px] font-bold w-20">2.YRD.HAKEM</span> 
                                      <input list="hakem-listesi" type="text" value={prefix === 'aktif' ? (safeRaporDetay?.y_hakem_2 || '') : temizHakem(safeRaporDetay?.y_hakem_2)} onChange={e => raporDetayGuncelle('y_hakem_2', e.target.value.toLocaleUpperCase('tr-TR'))} readOnly={prefix !== 'aktif'} className="w-full text-[11px] outline-none bg-blue-50/40 border border-blue-100 pl-3 py-1 font-black text-blue-900 uppercase ml-2 rounded shadow-sm" placeholder="Seç veya Yeni İsim Yaz..." />
                                  </div>
                              </>
                          )}

                          {hakemModu === 'dort_kutu' && (
                              <div className="flex p-1.5 items-center justify-between flex-1">
                                  <span className="text-[10px] font-bold w-20">GÖZLEMCİ</span> 
                                  <input list="gozlemci-listesi" type="text" value={prefix === 'aktif' ? (safeRaporDetay?.gozlemci || '') : temizHakem(safeRaporDetay?.gozlemci)} onChange={e => raporDetayGuncelle('gozlemci', e.target.value.toLocaleUpperCase('tr-TR'))} readOnly={prefix !== 'aktif'} className="w-full text-[11px] outline-none bg-blue-50/40 border border-blue-100 pl-3 py-1 font-black text-blue-900 uppercase ml-2 rounded shadow-sm" placeholder="Seç veya Yeni İsim Yaz..." />
                              </div>
                          )}
                      </div>

                      <div className="flex flex-col">
                          <div className="flex border-b border-dashed border-black p-1.5 items-center justify-between flex-1">
                              <span className="text-[10px] font-bold w-24">SAĞLIK MEMURU</span> 
                              {prefix === 'aktif' ? (
                                  <select value={safeRaporDetay?.saglik_adi || ''} onChange={e => raporDetayGuncelle('saglik_adi', e.target.value)} className="w-full text-xs outline-none bg-blue-50/40 border border-blue-100 py-1 font-black text-blue-900 uppercase ml-2 rounded shadow-sm cursor-pointer text-center">
                                      <option value="">-- SEÇ --</option>
                                      <option value="VAR">VAR</option>
                                      <option value="YOK">YOK</option>
                                  </select>
                              ) : (
                                  <span className="w-full text-xs font-black uppercase ml-2 text-center inline-block">{temizHakem(safeRaporDetay?.saglik_adi)}</span>
                              )}
                          </div>
                          
                          <div className="flex p-1.5 items-center justify-between flex-1">
                              <span className="text-[10px] font-bold w-24">GÜVENLİK</span> 
                              {prefix === 'aktif' ? (
                                  <select value={safeRaporDetay?.guvenlik_amiri || ''} onChange={e => raporDetayGuncelle('guvenlik_amiri', e.target.value)} className="w-full text-xs outline-none bg-blue-50/40 border border-blue-100 py-1 font-black text-blue-900 uppercase ml-2 rounded shadow-sm cursor-pointer text-center">
                                      <option value="">-- SEÇ --</option>
                                      <option value="VAR">VAR</option>
                                      <option value="YOK">YOK</option>
                                  </select>
                              ) : (
                                  <span className="w-full text-xs font-black uppercase ml-2 text-center inline-block">{temizHakem(safeRaporDetay?.guvenlik_amiri)}</span>
                              )}
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
                                  <div className="col-span-2 p-1 border-r border-dashed border-black"><input type="text" value={ihracEvListesi[idx]?.forma || ''} onChange={e => ihracGuncelle('ev', idx, 'forma', e.target.value.toLocaleUpperCase('tr-TR'))} readOnly={prefix !== 'aktif'} className="w-full text-center outline-none bg-slate-50/50 border border-slate-200 py-1 font-bold text-blue-900 rounded-sm" placeholder="-" /></div>
                                  <div className="col-span-7 p-1 border-r border-dashed border-black"><input type="text" value={ihracEvListesi[idx]?.isim || ''} onChange={e => ihracGuncelle('ev', idx, 'isim', e.target.value.toLocaleUpperCase('tr-TR'))} readOnly={prefix !== 'aktif'} className="w-full text-left outline-none bg-slate-50/50 border border-slate-200 pl-1 py-1 font-black text-blue-900 uppercase rounded-sm" placeholder="" /></div>
                                  <div className="col-span-3 p-1"><input type="text" value={ihracEvListesi[idx]?.lisans || ''} onChange={e => ihracGuncelle('ev', idx, 'lisans', e.target.value.toLocaleUpperCase('tr-TR'))} readOnly={prefix !== 'aktif'} className="w-full text-center outline-none bg-slate-50/50 border border-slate-200 py-1 font-bold text-blue-900 rounded-sm" placeholder="" /></div>
                              </div>
                              <div className="grid grid-cols-12 relative">
                                  <div className="col-span-2 p-1 border-r border-dashed border-black"><input type="text" value={ihracMisListesi[idx]?.forma || ''} onChange={e => ihracGuncelle('mis', idx, 'forma', e.target.value.toLocaleUpperCase('tr-TR'))} readOnly={prefix !== 'aktif'} className="w-full text-center outline-none bg-slate-50/50 border border-slate-200 py-1 font-bold text-blue-900 rounded-sm" placeholder="-" /></div>
                                  <div className="col-span-7 p-1 border-r border-dashed border-black"><input type="text" value={ihracMisListesi[idx]?.isim || ''} onChange={e => ihracGuncelle('mis', idx, 'isim', e.target.value.toLocaleUpperCase('tr-TR'))} readOnly={prefix !== 'aktif'} className="w-full text-left outline-none bg-slate-50/50 border border-slate-200 pl-1 py-1 font-black text-blue-900 uppercase rounded-sm" placeholder="" /></div>
                                  <div className="col-span-3 p-1"><input type="text" value={ihracMisListesi[idx]?.lisans || ''} onChange={e => ihracGuncelle('mis', idx, 'lisans', e.target.value.toLocaleUpperCase('tr-TR'))} readOnly={prefix !== 'aktif'} className="w-full text-center outline-none bg-slate-50/50 border border-slate-200 py-1 font-bold text-blue-900 rounded-sm" placeholder="" /></div>
                              </div>
                          </div>
                      ))}
                      {prefix === 'aktif' && (
                      <div className="grid grid-cols-2 text-center border-t border-black bg-slate-50 tff-no-print" data-html2canvas-ignore>
                          <button onClick={() => ihracSatirEkle('ev')} className="p-1.5 border-r border-black text-red-600 font-bold text-xs hover:bg-red-100">+ Ev Sahibi İhraç Ekle</button>
                          <button onClick={() => ihracSatirEkle('mis')} className="p-1.5 text-red-600 font-bold text-xs hover:bg-red-100">+ Misafir İhraç Ekle</button>
                      </div>
                      )}
                  </div>
                  <div className="mb-8 text-black">
                      <h3 className="font-bold text-xs text-center border-b border-black pb-1 mb-2 uppercase tracking-wide">SEYİRCİ TAŞKINLIKLARI, YÖNETİCİ VE FUTBOLCULARIN HAREKET VE TUTUMLARI</h3>
                      <textarea value={safeRaporDetay?.tff_not || ''} onChange={e => raporDetayGuncelle('tff_not', e.target.value)} readOnly={prefix !== 'aktif'} className="w-full outline-none bg-slate-50/50 font-serif text-sm leading-relaxed resize-none overflow-hidden min-h-[150px] border border-slate-300 p-3 shadow-inner rounded-md" placeholder="Olayların detaylarını, varsa zamanı ve numaralarıyla birlikte yazınız..."></textarea>
                  </div>
                  <div className="flex justify-between items-end px-4 mt-8 pt-4 text-black">
                      <div className="text-xs font-bold">Rapor düzenlenme tarihi: <span className="ml-2 border-b border-dotted border-black px-2 pb-0.5">{new Date().toLocaleDateString('tr-TR')}</span></div>
                      <div className="text-center">
                          <div className="font-serif text-2xl text-red-800 -mb-2 italic opacity-80" style={{fontFamily: "'Brush Script MT', cursive"}}>{komiserIlkIsim}</div>
                          <div className="font-bold text-sm border-b border-black px-4 pb-1">{komiserTamIsim}</div>
                          <div className="text-[10px] text-slate-500">GSM Telefon No: {komiserTelefon}</div>
                          <div className="text-[10px] font-bold mt-1">SAHA KOMİSERİ</div>
                      </div>
                  </div>
              </div>
              )}

              {raporTuru === 'gelisim' && (
              <div className="border-[3px] border-double border-slate-600 p-4 bg-white text-black font-sans">
                  <div className="flex items-center justify-between mb-4 border-b-2 border-red-600 pb-3">
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
                          <div className="w-1/5 border-r border-black p-2">{guvenliTarih(mac?.tarih)}</div><div className="w-1/5 border-r border-black p-2">{guvenliSaat(mac?.saat)}</div><div className="w-2/5 border-r border-black p-2 truncate">{mac?.saha}</div><div className="w-1/5 p-2 truncate">{mac?.kategori_adi}</div>
                      </div>
                  </div>

                  <div className="border-2 border-black text-xs font-bold mb-6">
                      <div className="grid grid-cols-6 border-b border-black">
                          <div className="col-span-5 border-r border-black p-2 flex gap-2 items-center"><span className="w-40 text-slate-600">EV SAHİBİ TAKIM ADI</span> <span className="uppercase text-sm">{mac?.ev_sahibi}</span></div>
                          <div className="col-span-1 grid grid-cols-2 bg-slate-100">
                              <div className="flex items-center justify-center border-r border-slate-300 text-[10px] text-slate-600 font-bold">SKOR</div>
                              <div className="flex items-center justify-center text-xl font-black">{prefix === 'aktif' ? (evSkor || '-') : (mac?.ev_sahibi_skor !== null ? mac?.ev_sahibi_skor : '-')}</div>
                          </div>
                      </div>
                      <div className="grid grid-cols-6">
                          <div className="col-span-5 border-r border-black p-2 flex gap-2 items-center"><span className="w-40 text-slate-600">MİSAFİR TAKIM ADI</span> <span className="uppercase text-sm">{mac?.misafir_takim}</span></div>
                          <div className="col-span-1 grid grid-cols-2 bg-slate-100">
                              <div className="flex items-center justify-center border-r border-slate-300 text-[10px] text-slate-600 font-bold">SKOR</div>
                              <div className="flex items-center justify-center text-xl font-black">{prefix === 'aktif' ? (misafirSkor || '-') : (mac?.misafir_skor !== null ? mac?.misafir_skor : '-')}</div>
                          </div>
                      </div>
                  </div>

                  <h3 className="font-bold text-sm mb-1 uppercase">GÖREVLİLER</h3>
                  <div className="border border-black text-xs font-bold mb-6">
                      <div className="flex border-b border-black bg-slate-100"><div className="w-1/3 border-r border-black p-1.5">GÖREVİ</div><div className="w-2/3 p-1.5">ADI SOYADI</div></div>
                      <div className="flex border-b border-black"><div className="w-1/3 border-r border-black p-1.5">HAKEM</div><div className="w-2/3 p-1.5"><input list="hakem-listesi" type="text" value={prefix === 'aktif' ? (safeRaporDetay?.hakem || '') : temizHakem(safeRaporDetay?.hakem)} onChange={e => raporDetayGuncelle('hakem', e.target.value.toLocaleUpperCase('tr-TR'))} readOnly={prefix !== 'aktif'} className="w-full outline-none bg-transparent uppercase text-red-900 font-black" placeholder="Seç veya Yeni İsim Yaz..." /></div></div>
                      <div className="flex border-b border-black"><div className="w-1/3 border-r border-black p-1.5">YARDIMCI HAKEM 1</div><div className="w-2/3 p-1.5"><input list="hakem-listesi" type="text" value={prefix === 'aktif' ? (safeRaporDetay?.y_hakem_1 || '') : temizHakem(safeRaporDetay?.y_hakem_1)} onChange={e => raporDetayGuncelle('y_hakem_1', e.target.value.toLocaleUpperCase('tr-TR'))} readOnly={prefix !== 'aktif'} className="w-full outline-none bg-transparent uppercase text-red-900 font-black" placeholder="Seç veya Yeni İsim Yaz..." /></div></div>
                      <div className="flex border-b border-black"><div className="w-1/3 border-r border-black p-1.5">YARDIMCI HAKEM 2</div><div className="w-2/3 p-1.5"><input list="hakem-listesi" type="text" value={prefix === 'aktif' ? (safeRaporDetay?.y_hakem_2 || '') : temizHakem(safeRaporDetay?.y_hakem_2)} onChange={e => raporDetayGuncelle('y_hakem_2', e.target.value.toLocaleUpperCase('tr-TR'))} readOnly={prefix !== 'aktif'} className="w-full outline-none bg-transparent uppercase text-red-900 font-black" placeholder="Seç veya Yeni İsim Yaz..." /></div></div>
                      <div className="flex border-b border-black"><div className="w-1/3 border-r border-black p-1.5">4.HAKEM</div><div className="w-2/3 p-1.5"><input list="hakem-listesi" type="text" value={prefix === 'aktif' ? (safeRaporDetay?.hakem_4 || '') : temizHakem(safeRaporDetay?.hakem_4)} onChange={e => raporDetayGuncelle('hakem_4', e.target.value.toLocaleUpperCase('tr-TR'))} readOnly={prefix !== 'aktif'} className="w-full outline-none bg-transparent uppercase text-red-900 font-black" placeholder="Seç veya Yeni İsim Yaz..." /></div></div>
                      
                      <div className="flex"><div className="w-1/3 border-r border-black p-1.5">GÖZLEMCİ</div><div className="w-2/3 p-1.5"><input list="gozlemci-listesi" type="text" value={prefix === 'aktif' ? (safeRaporDetay?.gozlemci || '') : temizHakem(safeRaporDetay?.gozlemci)} onChange={e => raporDetayGuncelle('gozlemci', e.target.value.toLocaleUpperCase('tr-TR'))} readOnly={prefix !== 'aktif'} className="w-full outline-none bg-transparent uppercase text-red-900 font-black" placeholder="Seç veya Yeni İsim Yaz..." /></div></div>
                  </div>

                  <div className="border border-black text-xs font-bold mb-6 w-2/3">
                      <div className="flex border-b border-black">
                          <div className="w-1/2 border-r border-black p-1.5 bg-slate-50">GÜVENLİK GÖREVLİSİ (VAR MI?)</div>
                          <div className="w-1/2 flex items-center justify-center p-1 gap-4">
                              {prefix === 'aktif' ? (
                                  <select value={safeRaporDetay?.guvenlik || ''} onChange={e => raporDetayGuncelle('guvenlik', e.target.value)} className="w-full text-xs outline-none bg-red-50 py-1 font-black text-red-900 uppercase ml-2 cursor-pointer text-center rounded border border-red-200">
                                      <option value="">-- SEÇ --</option>
                                      <option value="var">VAR</option>
                                      <option value="yok">YOK</option>
                                  </select>
                              ) : (
                                  <span className="w-full text-xs font-black uppercase ml-2 text-center inline-block">{safeRaporDetay?.guvenlik === 'var' ? 'VAR' : (safeRaporDetay?.guvenlik === 'yok' ? 'YOK' : '')}</span>
                              )}
                          </div>
                      </div>
                      {safeRaporDetay?.guvenlik === 'var' && (
                          <>
                              <div className="flex border-b border-black bg-red-50/30">
                                  <div className="w-1/2 border-r border-black p-1.5 text-[10px] text-red-900">↳ GÜVENLİK AMİRİ ADI SOYADI</div>
                                  <div className="w-1/2 p-1.5">
                                      <input type="text" value={safeRaporDetay?.guvenlik_amiri || ''} onChange={e => raporDetayGuncelle('guvenlik_amiri', e.target.value.toLocaleUpperCase('tr-TR'))} readOnly={prefix !== 'aktif'} className="w-full outline-none bg-transparent uppercase font-black placeholder:text-red-300 placeholder:font-normal" placeholder="Ad Soyad yazınız..." />
                                  </div>
                              </div>
                              <div className="flex border-b border-black bg-red-50/30">
                                  <div className="w-1/2 border-r border-black p-1.5 text-[10px] text-red-900">↳ GÜVENLİK AMİRİ TELEFON</div>
                                  <div className="w-1/2 p-1.5">
                                      <input type="text" value={safeRaporDetay?.guvenlik_telefon || ''} onChange={e => raporDetayGuncelle('guvenlik_telefon', e.target.value)} readOnly={prefix !== 'aktif'} className="w-full outline-none bg-transparent uppercase font-black placeholder:text-red-300 placeholder:font-normal" placeholder="Telefon numarası..." />
                                  </div>
                              </div>
                          </>
                      )}

                      <div className="flex border-b border-black">
                          <div className="w-1/2 border-r border-black p-1.5 bg-slate-50">SAĞLIK MEMURU (VAR MI?)</div>
                          <div className="w-1/2 flex items-center justify-center p-1 gap-4">
                              {prefix === 'aktif' ? (
                                  <select value={safeRaporDetay?.saglik || ''} onChange={e => raporDetayGuncelle('saglik', e.target.value)} className="w-full text-xs outline-none bg-red-50 py-1 font-black text-red-900 uppercase ml-2 cursor-pointer text-center rounded border border-red-200">
                                      <option value="">-- SEÇ --</option>
                                      <option value="var">VAR</option>
                                      <option value="yok">YOK</option>
                                  </select>
                              ) : (
                                  <span className="w-full text-xs font-black uppercase ml-2 text-center inline-block">{safeRaporDetay?.saglik === 'var' ? 'VAR' : (safeRaporDetay?.saglik === 'yok' ? 'YOK' : '')}</span>
                              )}
                          </div>
                      </div>
                      {safeRaporDetay?.saglik === 'var' && (
                          <>
                              <div className="flex border-b border-black bg-red-50/30">
                                  <div className="w-1/2 border-r border-black p-1.5 text-[10px] text-red-900">↳ SAĞLIK MEMURU ADI SOYADI</div>
                                  <div className="w-1/2 p-1.5">
                                      <input type="text" value={safeRaporDetay?.saglik_adi || ''} onChange={e => raporDetayGuncelle('saglik_adi', e.target.value.toLocaleUpperCase('tr-TR'))} readOnly={prefix !== 'aktif'} className="w-full outline-none bg-transparent uppercase font-black placeholder:text-red-300 placeholder:font-normal" placeholder="Ad Soyad yazınız..." />
                                  </div>
                              </div>
                              <div className="flex bg-red-50/30">
                                  <div className="w-1/2 border-r border-black p-1.5 text-[10px] text-red-900">↳ SAĞLIK MEMURU TELEFON</div>
                                  <div className="w-1/2 p-1.5">
                                      <input type="text" value={safeRaporDetay?.saglik_telefon || ''} onChange={e => raporDetayGuncelle('saglik_telefon', e.target.value)} readOnly={prefix !== 'aktif'} className="w-full outline-none bg-transparent uppercase font-black placeholder:text-red-300 placeholder:font-normal" placeholder="Telefon numarası..." />
                                  </div>
                              </div>
                          </>
                      )}
                  </div>

                  <div className="bg-slate-100 p-2 font-black text-sm mb-2">I) ORGANİZASYON :</div>
                  <div className="mb-4 text-xs font-medium space-y-1">
                      <p className="mb-2">(a) Saha Komiserinin oyun alanına gidişi ve oyun alanını kontrolü</p>
                      {gelisimOrganizasyon.map(soru => prefix === 'aktif' ? renderGelisimCheckbox(soru.text, safeRaporDetay?.gelisim_sorular?.[soru.id], (val:any) => gelisimGuncelle(soru.id, val), soru.id) : <div key={soru.id} className="flex justify-between items-center border-b border-dashed border-slate-300 py-1"><span className="text-[10px] w-3/4">{soru.text}</span><div className="flex gap-4 w-1/4 justify-end pr-2"><EvetHayirBox val={safeRaporDetay?.gelisim_sorular?.[soru.id]} /></div></div>)}
                      <p className="mt-4 mb-1">(b) Müsabaka sonu değerlendirmesi</p>
                      <textarea value={safeRaporDetay?.gelisim_sorular?.degerlendirme || ''} onChange={e => gelisimGuncelle('degerlendirme', e.target.value)} readOnly={prefix !== 'aktif'} className="w-full border-b border-dashed border-black bg-transparent outline-none resize-none h-10"></textarea>
                  </div>

                  <div className="bg-slate-100 p-2 font-black text-sm mb-2">II) TEKNİK HUSUSLAR :</div>
                  <div className="mb-4 text-xs font-medium space-y-1">
                      <p className="mb-2">a) Aşağıdaki tesis / malzemeler standarlara uygun mudur? (dk. - 60'da kontrol edilecektir )</p>
                      {gelisimTeknik.map(soru => prefix === 'aktif' ? renderGelisimCheckbox(soru.text, safeRaporDetay?.gelisim_sorular?.[soru.id], (val:any) => gelisimGuncelle(soru.id, val), soru.id) : <div key={soru.id} className="flex justify-between items-center border-b border-dashed border-slate-300 py-1"><span className="text-[10px] w-3/4">{soru.text}</span><div className="flex gap-4 w-1/4 justify-end pr-2"><EvetHayirBox val={safeRaporDetay?.gelisim_sorular?.[soru.id]} /></div></div>)}
                      <div className="mt-4 space-y-2">
                          {prefix === 'aktif' ? renderGelisimCheckbox("b) Her iki kulüp Müsabaka isim listelerinin, kulüp lisansları ile akreditasyon listelerinin kontrolleri yapılarak hakemlere teslimi denetlendi mi?", safeRaporDetay?.gelisim_sorular?.isim_listeleri, (val:any) => gelisimGuncelle('isim_listeleri', val), 'isim_listeleri') : <div className="flex justify-between items-center border-b border-dashed border-slate-300 py-1"><span className="text-[10px] w-3/4">b) Her iki kulüp Müsabaka isim listelerinin, kulüp lisansları ile akreditasyon listelerinin kontrolleri yapılarak hakemlere teslimi denetlendi mi?</span><div className="flex gap-4 w-1/4 justify-end pr-2"><EvetHayirBox val={safeRaporDetay?.gelisim_sorular?.isim_listeleri} /></div></div>}
                          {prefix === 'aktif' ? renderGelisimCheckbox("c) Takımlar koyu ve açık renk forma setlerini getirdi mi?", safeRaporDetay?.gelisim_sorular?.forma_setleri, (val:any) => gelisimGuncelle('forma_setleri', val), 'forma_setleri') : <div className="flex justify-between items-center border-b border-dashed border-slate-300 py-1"><span className="text-[10px] w-3/4">c) Takımlar koyu ve açık renk forma setlerini getirdi mi?</span><div className="flex gap-4 w-1/4 justify-end pr-2"><EvetHayirBox val={safeRaporDetay?.gelisim_sorular?.forma_setleri} /></div></div>}
                          {prefix === 'aktif' ? renderGelisimCheckbox("d) Stadyum WC'leri hijyenik mi? Temizliği yapılmış mı?", safeRaporDetay?.gelisim_sorular?.wc_hijyen, (val:any) => gelisimGuncelle('wc_hijyen', val), 'wc_hijyen') : <div className="flex justify-between items-center border-b border-dashed border-slate-300 py-1"><span className="text-[10px] w-3/4">d) Stadyum WC'leri hijyenik mi? Temizliği yapılmış mı?</span><div className="flex gap-4 w-1/4 justify-end pr-2"><EvetHayirBox val={safeRaporDetay?.gelisim_sorular?.wc_hijyen} /></div></div>}
                      </div>
                  </div>

                  <div className="bg-slate-100 p-2 font-black text-sm mb-2">III) GÜVENLİK KONULARI :</div>
                  <div className="mb-4 text-xs font-medium space-y-2">
                      <div className="flex flex-col border-b border-dashed border-slate-300 pb-2"><span>a) Misafir takım geliş ve gidişleri nasıl sağlandı ?</span><input type="text" value={safeRaporDetay?.gelisim_sorular?.misafir_gelis_gidis || ''} onChange={e => gelisimGuncelle('misafir_gelis_gidis', e.target.value)} readOnly={prefix !== 'aktif'} className="w-full outline-none bg-transparent border-b border-dotted border-black mt-1" /></div>
                      {prefix === 'aktif' ? renderGelisimCheckbox("b) Her iki takım yöneticilerine soyunma odalarına ve koridorlara girebilecek kişiler konusundaki kısıtlamaları ve akreditasyon kartı mecburiyeti hatırlatıldı mı ?", safeRaporDetay?.gelisim_sorular?.soyunma_odasi_kisitlama, (val:any) => gelisimGuncelle('soyunma_odasi_kisitlama', val), 'soyunma_odasi_kisitlama') : <div className="flex justify-between items-center border-b border-dashed border-slate-300 py-1"><span className="text-[10px] w-3/4">b) Her iki takım yöneticilerine soyunma odalarına ve koridorlara girebilecek kişiler konusundaki kısıtlamaları ve akreditasyon kartı mecburiyeti hatırlatıldı mı ?</span><div className="flex gap-4 w-1/4 justify-end pr-2"><EvetHayirBox val={safeRaporDetay?.gelisim_sorular?.soyunma_odasi_kisitlama} /></div></div>}
                      {prefix === 'aktif' ? renderGelisimCheckbox("c) Misafir takım yöneticileri için tribünde uygun yer ayrıldı mı ?", safeRaporDetay?.gelisim_sorular?.misafir_tribun_yer, (val:any) => gelisimGuncelle('misafir_tribun_yer', val), 'misafir_tribun_yer') : <div className="flex justify-between items-center border-b border-dashed border-slate-300 py-1"><span className="text-[10px] w-3/4">c) Misafir takım yöneticileri için tribünde uygun yer ayrıldı mı ?</span><div className="flex gap-4 w-1/4 justify-end pr-2"><EvetHayirBox val={safeRaporDetay?.gelisim_sorular?.misafir_tribun_yer} /></div></div>}
                      <div className="flex items-center gap-2 border-b border-dashed border-slate-300 py-2"><span>d) Müsabakada görevli Resmi Güvenlik sayısı :</span><input type="number" value={safeRaporDetay?.gelisim_sorular?.guvenlik_sayisi || ''} onChange={e => gelisimGuncelle('guvenlik_sayisi', e.target.value)} readOnly={prefix !== 'aktif'} className="w-16 border-b border-black text-center outline-none bg-transparent" /><span>Kişi</span></div>
                  </div>

                  <div className="bg-slate-100 p-2 font-black text-sm mb-2">IV) İŞLETİMSEL EKSİKLİK :</div>
                  <div className="mb-4 text-xs font-medium space-y-1">
                      <p>Sahadaki eksikliklerin tespit edilerek yazılması,</p>
                      <div className="flex items-center gap-2"><span>1-</span><input type="text" value={safeRaporDetay?.gelisim_sorular?.isletimsel_1 || ''} onChange={e => gelisimGuncelle('isletimsel_1', e.target.value)} readOnly={prefix !== 'aktif'} className="flex-1 outline-none bg-transparent border-b border-dotted border-black" /></div>
                      <div className="flex items-center gap-2"><span>2-</span><input type="text" value={safeRaporDetay?.gelisim_sorular?.isletimsel_2 || ''} onChange={e => gelisimGuncelle('isletimsel_2', e.target.value)} readOnly={prefix !== 'aktif'} className="flex-1 outline-none bg-transparent border-b border-dotted border-black" /></div>
                      <div className="flex items-center gap-2"><span>3-</span><input type="text" value={safeRaporDetay?.gelisim_sorular?.isletimsel_3 || ''} onChange={e => gelisimGuncelle('isletimsel_3', e.target.value)} readOnly={prefix !== 'aktif'} className="flex-1 outline-none bg-transparent border-b border-dotted border-black" /></div>
                  </div>

                  <div className="bg-slate-100 p-2 font-black text-sm mb-2">OLUMLU BULUNMAYAN DİĞER HUSUSLAR :</div>
                  <textarea value={safeRaporDetay?.gelisim_sorular?.olumsuz_diger || ''} onChange={e => gelisimGuncelle('olumsuz_diger', e.target.value)} readOnly={prefix !== 'aktif'} className="w-full border-b border-dashed border-black bg-transparent outline-none resize-none min-h-[50px] mb-4 text-xs"></textarea>

                  <div className="mb-4">
                      <h3 className="font-bold text-xs uppercase mb-1">MÜSABAKA ÖNCESİ, DEVAMI VE BİTİMİNDEKİ OLAYLAR:</h3>
                      <p className="text-[10px] mb-1">(Yönetici,Teknik Adamlar,Futbolcular,Kulüp görevlileri vb.kişilerin eylemleri ayrı ayrı detaylı bir şekilde yazılacaktır.)</p>
                      <textarea value={safeRaporDetay?.tff_not || mac.rapor_notu || ''} onChange={e => raporDetayGuncelle('tff_not', e.target.value)} readOnly={prefix !== 'aktif'} className="w-full outline-none border border-dashed border-black min-h-[150px] p-2 text-sm bg-transparent"></textarea>
                  </div>

                  <div className="flex justify-between items-end px-4 mt-8 pt-4 text-black">
                      <div className="text-xs font-bold">Rapor düzenlenme tarihi: <span className="ml-2 border-b border-dotted border-black px-2 pb-0.5">{new Date().toLocaleDateString('tr-TR')}</span></div>
                      <div className="text-center">
                          <div className="font-serif text-2xl text-red-800 -mb-2 italic opacity-80" style={{fontFamily: "'Brush Script MT', cursive"}}>{komiserIlkIsim}</div>
                          <div className="font-bold text-sm border-b border-black px-4 pb-1">{komiserTamIsim}</div>
                          <div className="text-[10px] text-slate-500">GSM Telefon No: {komiserTelefon}</div>
                          <div className="text-[10px] font-bold mt-1">SAHA KOMİSERİ</div>
                      </div>
                  </div>
              </div>
              )}

              {/* --- EK RAPORLAR (KANIT DOSYALARI) --- */}
              {ekRaporlarListesi.map((ekRapor: any, index: number) => (
                  <div key={ekRapor.id} className="border-[3px] border-double border-slate-600 p-8 bg-white text-black font-sans relative mt-8 page-break-before-always">
                      {prefix === 'aktif' && <button onClick={() => ekRaporSil(ekRapor.id)} className="tff-no-print absolute top-2 right-2 bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1 rounded text-xs font-bold border border-red-200 transition-colors">🗑️ Bu Ek Raporu Sil</button>}
                      
                      {raporTuru === 'amator' ? (
                          <div className="flex flex-col items-center mb-8 border-b-[3px] border-double border-red-600 pb-4 text-center">
                              <img src={AMATOR_MERKEZ_LOGO} crossOrigin="anonymous" alt="TFF Merkez" className="h-16 w-auto mb-2 drop-shadow-md" />
                              <h2 className="font-extrabold text-xl md:text-2xl uppercase tracking-widest text-black">TÜRKİYE FUTBOL FEDERASYONU</h2>
                              <h3 className="font-bold text-lg md:text-xl uppercase mt-2 text-black">SAHA KOMİSERİ EK RAPOR (EK-{index + 1})</h3>
                          </div>
                      ) : (
                          <div className="flex items-center justify-between mb-8 border-b-2 border-red-600 pb-4">
                              <div className="w-1/4 flex justify-start items-center"><img src={GELISIM_SOL_LOGO} crossOrigin="anonymous" alt="TFF Sol" className="h-16 md:h-20 w-auto drop-shadow-md" /></div>
                              <div className="text-center flex flex-col items-center justify-center w-2/4">
                                  <h2 className="font-extrabold text-xl md:text-2xl uppercase tracking-widest text-black">TÜRKİYE FUTBOL FEDERASYONU</h2>
                                  <h3 className="font-bold text-lg md:text-xl uppercase mt-2 text-black">SAHA KOMİSERİ EK RAPOR (EK-{index + 1})</h3>
                              </div>
                              <div className="w-1/4 flex justify-end items-center"><img src={GELISIM_SAG_LOGO} crossOrigin="anonymous" alt="TFF Sağ" className="h-16 md:h-20 w-auto drop-shadow-md" /></div>
                          </div>
                      )}

                      <div className="flex border-b border-black text-sm font-bold mb-6">
                          <div className="w-1/2 border-r border-black p-2 flex gap-2"><span className="text-slate-500">MÜSABAKA:</span> <span className="uppercase">{mac?.ev_sahibi} - {mac?.misafir_takim}</span></div>
                          <div className="w-1/4 border-r border-black p-2 flex gap-2"><span className="text-slate-500">TARİH:</span> <span>{guvenliTarih(mac?.tarih)}</span></div>
                          <div className="w-1/4 p-2 flex gap-2"><span className="text-slate-500">MÜSABAKA NO:</span> <span>{formatMacKodu(mac?.mac_kodu)}</span></div>
                      </div>

                      <div className="mb-6">
                          <h3 className="font-bold text-sm uppercase mb-2 bg-slate-100 p-2 border border-slate-300 text-black">OLAY DETAYI VE EK AÇIKLAMA:</h3>
                          <textarea value={ekRapor.text} onChange={(e) => ekRaporGuncelle(ekRapor.id, e.target.value)} readOnly={prefix !== 'aktif'} className="w-full outline-none border border-dashed border-black min-h-[200px] p-4 text-sm bg-transparent text-black" placeholder="Buraya olayla ilgili detaylı ek raporunuzu yazabilirsiniz..."></textarea>
                      </div>

                      <div className="mb-8 border border-dashed border-black p-4 min-h-[300px] flex flex-col items-center justify-center relative">
                          <h3 className="font-bold text-sm uppercase mb-4 absolute top-0 left-0 bg-white px-2 -mt-2 ml-4 text-black">FOTOĞRAFLI KANIT (VARSA)</h3>
                          
                          {ekRaporFotolar[ekRapor.id] ? (
                              <img src={ekRaporFotolar[ekRapor.id]} alt={`Ek Kanıt ${index + 1}`} className="max-w-full max-h-[400px] object-contain shadow-sm border border-slate-200" />
                          ) : (
                              <div className="text-slate-400 text-center tff-no-print">
                                  <span className="text-4xl block mb-2">📸</span>
                                  <p className="text-sm font-bold">Kanıt Fotoğrafı Yükle</p>
                              </div>
                          )}
                          
                          {prefix === 'aktif' && (
                          <label className="tff-no-print absolute bottom-4 right-4 cursor-pointer bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-xs font-bold shadow-md transition-colors">
                              {ekRaporFotolar[ekRapor.id] ? 'Fotoğrafı Değiştir' : 'Görsel Seç'}
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFotoYukle(ekRapor.id, e)} />
                          </label>
                          )}
                      </div>

                      <div className="flex justify-between items-end mt-12">
                          <div className="text-center w-1/3">
                              <div className="font-serif text-2xl text-red-800 -mb-2 italic opacity-80" style={{fontFamily: "'Brush Script MT', cursive"}}>{komiserIlkIsim}</div>
                              <div className="font-bold text-sm border-b border-black px-4 pb-1 text-black">{komiserTamIsim}</div>
                              <div className="text-[10px] font-bold mt-1 text-black">SAHA KOMİSERİ</div>
                          </div>
                      </div>
                  </div>
              ))}

              {prefix === 'aktif' && (
              <div className="tff-no-print flex justify-center mt-4">
                  <button onClick={ekRaporEkle} className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all text-sm flex items-center justify-center gap-2 border border-slate-600">
                      <span className="text-lg">📸</span> + EK RAPOR (FOTOĞRAFLI KANIT) DOSYASI EKLE
                  </button>
              </div>
              )}

          </div>
      );
  }

  if (aktifEkran === 'dashboard') {
    return (
      <main className="min-h-screen bg-slate-200 flex flex-col font-sans">
        {renderOrtakHeader(false)}
        <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6">
          
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 flex flex-col md:flex-row items-center gap-6 border-t-8 border-red-600 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-full -mr-10 -mt-10 opacity-50 pointer-events-none"></div>
            <div className="text-center md:text-left flex-1 relative z-10">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">{seciliKomiser?.ad_soyad || 'Komiser'}</h2>
              <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-2">
                <span className="bg-slate-100 text-slate-800 font-mono text-xs font-bold px-3 py-1.5 rounded-md border border-slate-200 shadow-sm">SİCİL NO: {seciliKomiser?.komiser_id || '-'}</span>
                <span className="bg-red-50 text-red-700 text-xs font-bold px-3 py-1.5 rounded-md border border-red-200 shadow-sm">BU SEZON: {Array.isArray(komiserMaclari) ? komiserMaclari.length : 0} GÖREV</span>
              </div>
              
              <div className="mt-4 space-y-2 animate-fade-in-down">
                {tebellugBekleyenSayisi > 0 ? (
                  <div className="bg-red-100 border border-red-500 text-red-900 px-4 py-3 rounded-lg flex flex-col sm:flex-row items-center justify-between shadow-sm animate-pulse gap-3">
                    <span className="font-bold text-xs md:text-sm flex items-center gap-2"><span className="text-lg">🚨</span> Yeni Atanan {tebellugBekleyenSayisi} Göreviniz Var!</span>
                    <button onClick={() => setAktifEkran('gorevKartlari')} className="w-full sm:w-auto text-[10px] md:text-xs bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded shadow uppercase">Önce Tebellüğ Et</button>
                  </div>
                ) : (
                  <>
                    {eksikSkorSayisi > 0 && (
                      <div className="bg-amber-100 border border-amber-400 text-amber-800 px-4 py-3 rounded-lg flex items-center justify-between shadow-sm">
                        <span className="font-bold text-xs md:text-sm flex items-center gap-2"><span className="text-lg">⚠️</span> Skoru Beklenen {eksikSkorSayisi} Maçınız Var</span>
                        <button onClick={() => setAktifEkran('skorRapor')} className="text-[10px] md:text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-3 rounded shadow">GİRİŞ YAP</button>
                      </div>
                    )}
                    {eksikDetayliSayisi > 0 && (
                      <div className="bg-red-100 border border-red-500 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between shadow-sm animate-pulse">
                        <span className="font-bold text-xs md:text-sm flex items-center gap-2"><span className="text-lg">🚨</span> Detaylı Raporu Beklenen {eksikDetayliSayisi} Maçınız Var <span className="hidden md:inline">(ZORUNLU)</span></span>
                        <button onClick={() => setAktifEkran('skorRapor')} className="text-[10px] md:text-xs bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded shadow">RAPORLA</button>
                      </div>
                    )}
                    
                    {herSeyTamam && (
                       <div className="bg-emerald-50 border border-emerald-500 text-emerald-900 px-4 py-3 rounded-lg flex items-start shadow-sm animate-fade-in-up">
                          <span className="text-2xl md:text-3xl mr-3 mt-1">✅</span>
                          <div>
                              <h4 className="font-black text-sm md:text-base uppercase tracking-wider">{globalAktifHaftaNo}. Hafta Görevleri Tamamlandı</h4>
                              <p className="text-[10px] md:text-xs font-medium mt-0.5 text-emerald-800">Tarafınıza tevdi edilen tüm müsabakaları tebellüğ ettiniz ve raporlamalarını eksiksiz tamamladınız. Merkezimiz adına teşekkür ederiz.</p>
                          </div>
                       </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <button onClick={() => setAktifEkran('gorevKartlari')} className="flex flex-col items-center justify-center p-6 md:p-8 rounded-2xl shadow-lg bg-white border-2 border-slate-200 hover:border-red-500 hover:shadow-red-200/50 transition-all transform hover:scale-[1.03] relative group">
                <div className="absolute top-2 right-2 text-slate-200 group-hover:text-red-100 transition-colors"><span className="text-4xl">🎫</span></div>
                <h4 className="font-black text-xl md:text-2xl text-slate-800 uppercase relative z-10">Görev Kartım</h4>
                <p className="text-sm text-center mt-2 text-slate-500 font-medium relative z-10">Atanan maçlarınızı görün ve görevi tebellüğ edin.</p>
                {tebellugBekleyenSayisi > 0 && <span className="mt-3 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-bounce relative z-10">{tebellugBekleyenSayisi} YENİ GÖREV</span>}
            </button>
            <button onClick={() => setAktifEkran('skorRapor')} className="flex flex-col items-center justify-center p-6 md:p-8 rounded-2xl shadow-lg bg-white border-2 border-slate-200 hover:border-red-500 hover:shadow-red-200/50 transition-all transform hover:scale-[1.03] relative group">
                <div className="absolute top-2 right-2 text-slate-200 group-hover:text-red-100 transition-colors"><span className="text-4xl">📝</span></div>
                <h4 className="font-black text-xl md:text-2xl text-slate-800 uppercase relative z-10 text-center">Skor & Saha Raporu</h4>
                <p className="text-sm text-center mt-2 text-slate-500 font-medium relative z-10">Hızlı skoru bildirin ve detaylı müsabaka raporu oluşturun.</p>
            </button>
          </div>
          
          <button onClick={() => setAktifEkran('bultenArama')} className="w-full mb-4 flex items-center justify-between p-5 md:p-6 rounded-2xl shadow-lg bg-red-700 border-2 border-red-800 hover:border-red-600 hover:bg-red-600 transition-all transform hover:scale-[1.02] group overflow-hidden relative">
            <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-white/10 to-transparent transform skew-x-12 group-hover:translate-x-4 transition-transform"></div>
            <div className="text-left relative z-10">
              <h4 className="font-black text-lg md:text-xl text-white uppercase tracking-wide">🔍 Haftalık Bülten & Görev Arama</h4>
              <p className="text-xs md:text-sm mt-1 text-red-100 font-medium">Saha, takım veya komiser ismine göre İzmir'deki tüm güncel görevleri sorgulayın.</p>
            </div>
          </button>

          <button onClick={() => setAktifEkran('istatistiklerim')} className="w-full mb-4 flex items-center justify-between p-5 md:p-6 rounded-2xl shadow-lg bg-red-800 border-2 border-red-900 hover:border-red-700 hover:bg-red-700 transition-all transform hover:scale-[1.02] group overflow-hidden relative">
            <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-white/10 to-transparent transform skew-x-12 group-hover:translate-x-4 transition-transform"></div>
            <div className="text-left relative z-10">
              <h4 className="font-black text-lg md:text-xl text-white uppercase tracking-wide">📊 Sezonluk İstatistiklerim</h4>
              <p className="text-xs md:text-sm mt-1 text-red-100 font-medium">Görev aldığınız liglerin ve sahaların detaylı istihbarat dökümü.</p>
            </div>
          </button>

          {mazeretAcik ? (
            <button onClick={() => setAktifEkran('mazeretBildir')} className="w-full flex items-center justify-between p-5 md:p-6 rounded-2xl shadow-lg bg-red-600 border-2 border-red-700 hover:border-red-500 hover:bg-red-500 transition-all transform hover:scale-[1.02] group overflow-hidden relative">
              <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-white/10 to-transparent transform skew-x-12 group-hover:translate-x-4 transition-transform"></div>
              <div className="text-left relative z-10"><h4 className="font-black text-lg md:text-xl text-white uppercase tracking-wide">📅 Müsaitlik / Mazeret Bildir</h4></div>
            </button>
          ) : (
            <button disabled className="w-full p-5 rounded-2xl bg-slate-300 opacity-60 cursor-not-allowed border-2 border-slate-400"><h4 className="font-black text-sm text-slate-500 text-left uppercase">Sistem Kapalı</h4></button>
          )}
        </div>
      </main>
    )
  }

  if (aktifEkran === 'gorevKartlari') {
    return (
      <main className="min-h-screen bg-slate-200 flex flex-col font-sans relative">
        {renderOrtakHeader(true)}
        <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 overflow-y-auto">
          <div id="gorev-karti-alani" className="bg-slate-200 min-h-full">
            <div className="bg-white p-4 rounded-xl shadow-sm mb-5 border-b-4 border-red-700 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left">
                <h4 className="text-lg font-black text-slate-800 tracking-wide uppercase">{seciliKomiser?.ad_soyad || '-'}</h4>
                <p className="text-red-600 font-bold mt-1">{globalAktifHaftaNo}. Hafta Görev Bülteni</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={tebellugKaydet} disabled={hepsiTebellugEdilmis || tebellugYukleniyor || gecerliAktifMaclar.length === 0} className={`text-sm font-bold py-2 px-4 rounded-lg shadow flex items-center gap-2 transition-colors ${hepsiTebellugEdilmis ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' : gecerliAktifMaclar.length > 0 ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
                  {tebellugYukleniyor ? 'İşleniyor...' : hepsiTebellugEdilmis ? '✓ Tebellüğ Edildi' : 'Tebellüğ Et (Görevleri Aldım)'}
                </button>
                <button onClick={kartiIndir} className="bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold py-2 px-4 rounded-lg shadow">İndir / Paylaş</button>
              </div>
            </div>

            {macYukleniyor ? (
              <div className="text-center text-red-700 py-8 animate-pulse font-black tracking-widest">GÖREVLERİNİZ ARANIYOR...</div>
            ) : (
              <>
                <div className="mb-6">
                  {gecerliAktifMaclar.length === 0 ? (
                    <div className="text-center text-slate-500 py-8 bg-white rounded-xl text-sm font-bold">Aktif göreviniz bulunmuyor.</div>
                  ) : (
                    <div className="space-y-4">
                      {gecerliAktifMaclar.map((mac, idx) => (
                        <div key={mac.id || `gkart-${idx}`}>
                          {renderOrjinalGorevKarti(mac)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {Object.keys(gecmisHaftalar).length > 0 && (
                  <div className="mt-8 border-t-2 border-slate-300 pt-6">
                    <button onClick={() => setArsivAcik(!arsivAcik)} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-4 px-5 rounded-xl shadow-md flex justify-between items-center">
                      <span className="text-sm md:text-base uppercase tracking-widest font-black">Geçmiş Maç Arşivi</span><span className="text-xl">{arsivAcik ? '▲' : '▼'}</span>
                    </button>
                    {arsivAcik && (
                      <div className="mt-4 space-y-4">
                        {Object.keys(gecmisHaftalar).map(Number).sort((a, b) => b - a).map(haftaNo => (
                          <div key={`hafta-${haftaNo}`} className="border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                            <button onClick={() => haftaToggle(haftaNo)} className="w-full bg-white text-slate-900 font-bold py-3 px-5 flex justify-between items-center text-xs md:text-sm border-b border-slate-200 hover:bg-slate-50">
                              <span>{haftaNo}. Hafta Görevleri <span className="bg-red-700 text-white text-[10px] md:text-xs px-2 py-1 rounded ml-2">{(gecmisHaftalar[haftaNo] || []).length} Görev</span></span>
                              <span className="text-red-500">{acikHaftalar.includes(haftaNo) ? '▲' : '▼'}</span>
                            </button>
                            {acikHaftalar.includes(haftaNo) && (
                              <div className="p-2 md:p-4 bg-slate-100 space-y-4">
                                {(gecmisHaftalar[haftaNo] || []).map((mac: any, idx: number) => (
                                  <div key={mac.id || `gecmis-${idx}`} className="opacity-95 hover:opacity-100 transition-opacity">
                                    {renderOrjinalGorevKarti(mac)}
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

        {acikStatu && (
            <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up border-2 border-red-700">
                    <div className="bg-red-700 p-4 flex justify-between items-center">
                        <h2 className="text-white font-black tracking-widest uppercase text-sm flex items-center gap-2"><span className="text-xl">ℹ️</span> {acikStatu.baslik}</h2>
                        <button onClick={() => setAcikStatu(null)} className="text-white hover:text-slate-200 font-bold text-xl leading-none transition-colors">✕</button>
                    </div>
                    <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        <div className="border-b border-slate-200 pb-3">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">🏃 Yaş Sınırı</h4>
                            <p className="text-sm font-bold text-slate-800 leading-snug">{acikStatu.yas_siniri}</p>
                        </div>
                        <div className="flex gap-4 border-b border-slate-200 pb-3">
                            <div className="flex-1">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">⏱️ Müsabaka Süresi</h4>
                                <p className="text-sm font-black text-red-700">{acikStatu.sure}</p>
                            </div>
                            <div className="flex-1 border-l border-slate-200 pl-4">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">⚽ Top Numarası</h4>
                                <p className="text-sm font-black text-amber-600">{acikStatu.top}</p>
                            </div>
                        </div>
                        <div className="flex gap-4 border-b border-slate-200 pb-3">
                            <div className="flex-1">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">⚖️ Hakem Sayısı</h4>
                                <p className="text-sm font-black text-slate-800">{acikStatu.hakem}</p>
                            </div>
                        </div>
                        <div className="border-b border-slate-200 pb-3">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">🔄 Oyuncu Değişikliği</h4>
                            <p className="text-sm font-semibold text-slate-700 leading-snug">{acikStatu.degisiklik}</p>
                        </div>
                        <div className="pb-2">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">⚖️ Beraberlik Durumu</h4>
                            <p className="text-sm font-semibold text-slate-700 leading-snug">{acikStatu.beraberlik}</p>
                        </div>
                    </div>
                    <div className="bg-slate-100 p-3 text-center border-t border-slate-200">
                        <button onClick={() => setAcikStatu(null)} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-8 rounded-lg text-xs uppercase tracking-widest transition-colors w-full shadow-md">ANLADIM, KAPAT</button>
                    </div>
                </div>
            </div>
        )}
      </main>
    )
  }

  if (aktifEkran === 'istatistiklerim') {
    let amatorCount = 0; let profCount = 0; let gelisimCount = 0;
    const amatorKategoriler: Record<string, number> = {};
    const profKategoriler: Record<string, number> = {};
    const gelisimKategoriler: Record<string, number> = {};
    const sahaGruplari: Record<string, { gidisler: Set<string>, maclar: any[] }> = {};

    const maclar = Array.isArray(komiserMaclari) ? komiserMaclari : [];
    maclar.forEach(mac => {
        if (!mac) return;
        const anaKat = getAnaKategori(mac?.kategori_adi);
        const katAdi = formatKategori(mac?.kategori_adi);
        
        if (anaKat === 'profesyonel') { 
            profCount++; profKategoriler[katAdi] = (profKategoriler[katAdi] || 0) + 1; 
        } else if (anaKat === 'gelisim') { 
            gelisimCount++; gelisimKategoriler[katAdi] = (gelisimKategoriler[katAdi] || 0) + 1; 
        } else { 
            amatorCount++; amatorKategoriler[katAdi] = (amatorKategoriler[katAdi] || 0) + 1; 
        }
        
        const sahaAdi = mac?.saha || 'BELİRTİLMEMİŞ SAHA';
        if (!sahaGruplari[sahaAdi]) { sahaGruplari[sahaAdi] = { gidisler: new Set(), maclar: [] }; }
        if (mac.tarih) sahaGruplari[sahaAdi].gidisler.add(mac.tarih);
        sahaGruplari[sahaAdi].maclar.push(mac);
    });

    const siraliAmatorler = Object.entries(amatorKategoriler).sort((a,b) => b[1] - a[1]);
    const siraliProflar = Object.entries(profKategoriler).sort((a,b) => b[1] - a[1]);
    const siraliGelisimler = Object.entries(gelisimKategoriler).sort((a,b) => b[1] - a[1]);
    const siraliSahalarDetayli = Object.entries(sahaGruplari).sort((a, b) => b[1].maclar.length - a[1].maclar.length);

    return (
      <main className="min-h-screen bg-slate-200 flex flex-col font-sans">
        {renderOrtakHeader(true)}
        <div className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 overflow-y-auto">
            <div className="bg-white rounded-xl p-4 md:p-6 border-t-8 border-red-700 shadow-xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-200 pb-4 mb-6 gap-4 relative z-10">
                    <div className="text-center md:text-left">
                        <h3 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tight">{seciliKomiser?.ad_soyad || 'Komiser'}</h3>
                        <span className="text-red-600 text-xs font-mono font-bold tracking-widest bg-red-50 px-2 py-0.5 rounded mt-1 inline-block border border-red-200">SİCİL DOSYASI</span>
                    </div>
                    <div className="bg-slate-900 px-6 py-3 rounded-xl shadow-md border border-slate-700 min-w-[150px]">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center">Toplam Sezon Görevi</div>
                        <div className="text-4xl font-black text-white text-center mt-1">{maclar.length}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {/* Kolon 1: Amatör */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 relative overflow-hidden shadow-sm">
                        <div className="absolute top-0 left-0 w-1 h-full bg-slate-500"></div>
                        <h4 className="text-slate-800 font-bold text-sm tracking-wider uppercase mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
                            <span>🛡️ Amatör LİGLER</span>
                            <span className="bg-slate-600 text-white px-2 py-0.5 rounded text-xs shadow-sm">{amatorCount}</span>
                        </h4>
                        <ul className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                            {siraliAmatorler.length === 0 && <li className="text-xs text-slate-400 italic">Kayıt yok.</li>}
                            {siraliAmatorler.map(([kat, count]) => (
                                <li key={kat} className="flex justify-between items-center bg-white p-2 rounded text-[10px] sm:text-xs border border-slate-100 shadow-sm"><span className="text-slate-700 font-bold truncate pr-2">{kat}</span><span className="font-black text-slate-800">{count}</span></li>
                            ))}
                        </ul>
                    </div>

                    {/* Kolon 2: Gelişim ve Kadın */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 relative overflow-hidden shadow-sm">
                        <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                        <h4 className="text-red-800 font-bold text-sm tracking-wider uppercase mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
                            <span>🌱 Gelişim ve Kadın</span>
                            <span className="bg-red-600 text-white px-2 py-0.5 rounded text-xs shadow-sm">{gelisimCount}</span>
                        </h4>
                        <ul className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                            {siraliGelisimler.length === 0 && <li className="text-xs text-slate-400 italic">Kayıt yok.</li>}
                            {siraliGelisimler.map(([kat, count]) => (
                                <li key={kat} className="flex justify-between items-center bg-white p-2 rounded text-[10px] sm:text-xs border border-slate-100 shadow-sm"><span className="text-slate-700 font-bold truncate pr-2">{kat}</span><span className="font-black text-red-600">{count}</span></li>
                            ))}
                        </ul>
                    </div>
                    
                    {/* Kolon 3: Profesyonel */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 relative overflow-hidden shadow-sm">
                        <div className="absolute top-0 left-0 w-1 h-full bg-black"></div>
                        <h4 className="text-slate-900 font-bold text-sm tracking-wider uppercase mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
                            <span>🏆 Profesyonel</span>
                            <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-xs shadow-sm">{profCount}</span>
                        </h4>
                        <ul className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                            {siraliProflar.length === 0 && <li className="text-xs text-slate-400 italic">Kayıt yok.</li>}
                            {siraliProflar.map(([kat, count]) => (
                                <li key={kat} className="flex justify-between items-center bg-white p-2 rounded text-[10px] sm:text-xs border border-slate-100 shadow-sm"><span className="text-slate-700 font-bold truncate pr-2">{kat}</span><span className="font-black text-slate-900">{count}</span></li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 relative overflow-hidden shadow-sm mt-6">
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-700"></div>
                    <h4 className="text-red-800 font-black text-sm md:text-base tracking-widest uppercase mb-3 flex items-center gap-2 border-b border-slate-200 pb-2"><span className="text-lg">🏟️</span> GÖREV YAPILAN SAHALAR VE DETAYLI ARŞİV</h4>
                    <div className="space-y-3 max-h-[700px] overflow-y-auto custom-scrollbar pr-2">
                        {siraliSahalarDetayli.length === 0 && <span className="text-xs text-slate-500 italic">Görev kaydı yok.</span>}
                        {siraliSahalarDetayli.map(([saha, data]) => {
                            const isSahaAcik = acikSicilSaha === saha;
                            const gidisSayisi = data.gidisler.size === 0 ? 1 : data.gidisler.size; 
                            const gorevSayisi = data.maclar.length;

                            return (
                                <div key={saha} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm transition-all hover:border-red-300">
                                    <button onClick={() => setAcikSicilSaha(isSahaAcik ? null : saha)} className="w-full text-left p-4 flex justify-between items-center hover:bg-red-50/50 transition-colors focus:outline-none">
                                        <div>
                                            <span className="text-slate-800 font-black block text-sm md:text-base">{saha}</span>
                                            <span className="text-[10px] text-red-700 font-bold mt-1 bg-red-50 px-2 py-0.5 rounded border border-red-100 inline-block uppercase tracking-wider">{gidisSayisi} Farklı Gün Gidildi (Toplam {gorevSayisi} Görev)</span>
                                        </div>
                                        <span className={`text-slate-400 text-xl leading-none transition-transform ${isSahaAcik ? 'rotate-180 text-red-500' : ''}`}>▼</span>
                                    </button>
                                    
                                    {isSahaAcik && (
                                        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3 animate-fade-in-down">
                                            {data.maclar.sort((a,b) => getZaman(b) - getZaman(a)).map((mac, idx) => {
                                                
                                                const isSicilTffAcik = acikSicilTffMacId === mac.id;
                                                let detay = mac.tff_rapor_detaylari || {};
                                                if (typeof detay === 'string') {
                                                    try { detay = JSON.parse(detay); } catch(e) { detay = {}; }
                                                }

                                                const skorMetni = mac.skor_girildi && mac.ev_sahibi_skor !== null ? `${mac.ev_sahibi_skor} - ${mac.misafir_skor}` : 'Skor Bekleniyor';
                                                const detayliGonderilmis = detay.detayli_kaydedildi === true;
                                                
                                                return (
                                                    <div key={mac.id || idx} className="bg-white border border-slate-300 rounded p-4 text-xs text-slate-700 shadow-sm">
                                                        <div className="flex justify-between items-start pb-2 mb-2 gap-2">
                                                            <div className="flex-1">
                                                                <div className="text-red-600 font-black text-[9px] mb-1 tracking-widest">{mac?.kategori_adi}</div>
                                                                <div className="font-black text-sm text-slate-900 mb-1 uppercase">{mac?.ev_sahibi} <span className="text-slate-400 mx-1 text-[10px] font-medium">vs</span> {mac?.misafir_takim}</div>
                                                                <div className="text-[10px] text-slate-500 font-bold">{guvenliTarih(mac?.tarih)} - {guvenliSaat(mac?.saat)}</div>
                                                            </div>
                                                            <div className="flex flex-col gap-2 items-end">
                                                                <div className="bg-slate-800 text-white font-black px-3 py-1.5 rounded shadow-sm border border-slate-700 text-center min-w-[70px]">
                                                                    {skorMetni}
                                                                </div>
                                                                {detayliGonderilmis && (
                                                                    <button onClick={() => setAcikSicilTffMacId(isSicilTffAcik ? null : mac.id)} className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2 py-1 rounded text-[9px] font-black uppercase transition-colors flex items-center gap-1 shadow-sm">
                                                                        📄 TFF RAPORU {isSicilTffAcik ? 'GİZLE ▲' : 'GÖSTER ▼'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        {isSicilTffAcik && detayliGonderilmis && (
                                                            <div className="mt-4 border-t border-slate-200 pt-4 animate-fade-in-down">
                                                                <div className="p-4 overflow-x-auto bg-slate-200 rounded-lg">
                                                                    {renderTffRaporu(mac, 'arsiv')}
                                                                </div>
                                                                <div className="mt-4 flex justify-end">
                                                                    <button onClick={() => tffTutanakIndir(mac, 'arsiv')} className="bg-red-600 hover:bg-red-700 text-white font-black py-2.5 px-6 rounded-lg shadow-md transition-all text-xs md:text-sm flex items-center justify-center gap-2 uppercase tracking-widest">
                                                                        📸 FOTOĞRAF OLARAK İNDİR
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

            </div>
        </div>
      </main>
    )
  }

  if (aktifEkran === 'bultenArama') {
    const guvenliTumMaclar = Array.isArray(tumAktifMaclar) ? tumAktifMaclar : [];
    let filtrelenmisMaclar = guvenliTumMaclar;
    
    if (aramaKomiser.trim() !== '') {
      const q = aramaKomiser.toLocaleLowerCase('tr-TR');
      filtrelenmisMaclar = filtrelenmisMaclar.filter(mac => {
        const isim = (Array.isArray(tumKomiserler) ? tumKomiserler : []).find(k => String(k.komiser_id) === String(mac?.komiser_id))?.ad_soyad || "";
        return String(isim).toLocaleLowerCase('tr-TR').includes(q);
      });
    }
    if (aramaSaha.trim() !== '') {
      const q = aramaSaha.toLocaleLowerCase('tr-TR');
      filtrelenmisMaclar = filtrelenmisMaclar.filter(mac => String(mac?.saha || '').toLocaleLowerCase('tr-TR').includes(q));
    }
    if (aramaTakim.trim() !== '') {
      const q = aramaTakim.toLocaleLowerCase('tr-TR');
      filtrelenmisMaclar = filtrelenmisMaclar.filter(mac => 
        String(mac?.ev_sahibi || '').toLocaleLowerCase('tr-TR').includes(q) || 
        String(mac?.misafir_takim || '').toLocaleLowerCase('tr-TR').includes(q) ||
        String(mac?.kategori_adi || '').toLocaleLowerCase('tr-TR').includes(q)
      );
    }
    
    const safeKomiserler = Array.isArray(tumKomiserler) ? tumKomiserler : [];
    const siraliKomiserler = [...safeKomiserler].sort((a, b) => (a.ad_soyad || '').localeCompare(b.ad_soyad || '', 'tr-TR'));
    const siraliSahalar = Array.from(new Set(guvenliTumMaclar.map(m => m?.saha).filter(Boolean))).sort((a, b) => (a as string).localeCompare(b as string, 'tr-TR'));
    const siraliTakimlar = Array.from(new Set([...guvenliTumMaclar.map(m => m?.ev_sahibi), ...guvenliTumMaclar.map(m => m?.misafir_takim)].filter(Boolean))).sort((a, b) => (a as string).localeCompare(b as string, 'tr-TR'));

    return (
      <main className="min-h-screen bg-slate-200 flex flex-col font-sans">
        {renderOrtakHeader(true)}
        <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 overflow-y-auto">
          <div className="bg-red-800 rounded-xl shadow-lg mb-6 border-b-4 border-red-500 overflow-hidden">
            <button onClick={() => setAramaTuruAcik(!aramaTuruAcik)} className="w-full p-5 flex justify-between items-center hover:bg-red-900 transition-colors">
              <h4 className="text-lg md:text-xl font-black text-white tracking-wide uppercase flex items-center gap-2">🔍 Saha ve Görev İstihbaratı</h4><span className="text-red-200 text-xl">{aramaTuruAcik ? '▲' : '▼'}</span>
            </button>
            {aramaTuruAcik && (
              <div className="p-4 md:p-6 bg-slate-900 border-t border-slate-700 space-y-4 animate-fade-in-down">
                <div><label className="block text-xs font-bold text-red-400 uppercase tracking-wider mb-2">Saha Komiseri Adı</label><input list="komiser-listesi" type="text" placeholder="Komiser arayın..." value={aramaKomiser} onChange={(e) => setAramaKomiser(e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-red-500 transition-colors text-sm font-bold" /><datalist id="komiser-listesi">{siraliKomiserler.map((k, i) => <option key={`kom-${i}`} value={k.ad_soyad || ''} />)}</datalist></div>
                <div><label className="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Saha Adı</label><input list="saha-listesi" type="text" placeholder="Saha arayın..." value={aramaSaha} onChange={(e) => setAramaSaha(e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-amber-500 transition-colors text-sm font-bold" /><datalist id="saha-listesi">{siraliSahalar.map((saha, i) => <option key={`sah-${i}`} value={saha as string} />)}</datalist></div>
                <div><label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Takım veya Lig Adı</label><input list="takim-listesi" type="text" placeholder="Takım veya lig arayın..." value={aramaTakim} onChange={(e) => setAramaTakim(e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-sm font-bold" /><datalist id="takim-listesi">{siraliTakimlar.map((takim, i) => <option key={`tak-${i}`} value={takim as string} />)}</datalist></div>
                {(aramaKomiser || aramaSaha || aramaTakim) && (
                  <div className="pt-2 text-right"><button onClick={() => { setAramaKomiser(''); setAramaSaha(''); setAramaTakim(''); setAcikAramaMacId(null); }} className="text-slate-400 hover:text-red-400 text-xs uppercase tracking-widest font-black transition-colors bg-slate-800 px-3 py-1.5 rounded border border-slate-700">Filtreleri Temizle</button></div>
                )}
              </div>
            )}
          </div>
          <div className="space-y-3">
            {filtrelenmisMaclar.length === 0 ? (
              <div className="text-center bg-white p-8 rounded-xl shadow-sm text-slate-500 font-bold text-sm border border-slate-200">Aramanızla eşleşen müsabaka bulunamadı.</div>
            ) : (
              filtrelenmisMaclar.map((mac, idx) => {
                const safeKomiserler = Array.isArray(tumKomiserler) ? tumKomiserler : [];
                const komiserIsim = safeKomiserler.find(k => String(k.komiser_id) === String(mac?.komiser_id))?.ad_soyad || "Komiser Atanmadı";
                const isAcik = acikAramaMacId === mac.id;
                return (
                  <div key={mac.id || `arama-${idx}`} className="bg-white border-l-4 border-red-700 shadow-md rounded-r-xl overflow-hidden transition-all hover:shadow-lg">
                    <button onClick={() => setAcikAramaMacId(isAcik ? null : mac.id)} className="w-full text-left p-3 md:p-4 flex justify-between items-center hover:bg-slate-50 focus:outline-none">
                        <div className="flex-1 pr-2">
                            <div className="flex items-center gap-2 mb-1"><span className="bg-slate-800 text-white text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider">{formatMacKodu(mac?.mac_kodu)}</span><span className="text-red-700 text-[10px] font-black uppercase tracking-widest">{mac?.kategori_adi || '-'}</span></div>
                            <span className="font-black text-slate-900 text-sm md:text-base leading-tight block uppercase">{mac?.ev_sahibi || '-'} <span className="text-slate-400 font-medium mx-1">vs</span> {mac?.misafir_takim || '-'}</span>
                        </div>
                        <span className={`text-slate-400 text-xl leading-none transition-transform ${isAcik ? 'rotate-180 text-red-500' : ''}`}>▼</span>
                    </button>
                    {isAcik && (
                        <div className="p-3 md:p-4 border-t border-slate-100 bg-slate-50 animate-fade-in-down">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-sm text-slate-700">
                              <div className="flex flex-col"><span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wider">Tarih & Saat</span><span className="font-bold text-slate-800 text-xs md:text-sm">{guvenliTarih(mac?.tarih)} - {guvenliSaat(mac?.saat)}</span></div>
                              <div className="flex flex-col"><span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wider">Saha</span><span className="font-bold text-slate-800 text-xs md:text-sm leading-tight">{mac?.saha || '-'}</span></div>
                              <div className="flex flex-col sm:mt-2 pt-2 sm:pt-3 border-t border-slate-200"><span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wider">Kategori / Lig</span><span className="font-bold text-slate-800 text-xs md:text-sm leading-tight">{mac?.kategori_adi || '-'} <span className="text-[9px] md:text-xs font-normal text-slate-500 block sm:inline mt-0.5 sm:mt-0 sm:ml-1">(Kod: {formatMacKodu(mac?.mac_kodu)})</span></span></div>
                              <div className="flex flex-col sm:mt-2 pt-2 sm:pt-3 border-t border-slate-200"><span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wider">Atanan Görev</span><span className="font-extrabold text-red-700 text-xs md:text-sm">{gorevTuruBelirle(mac?.kategori_adi || '', mac?.mac_kodu || '')}</span></div>
                              <div className="flex flex-col sm:mt-2 pt-2 sm:pt-3 border-t border-slate-300 col-span-1 sm:col-span-2 bg-white p-3 rounded-lg border shadow-sm"><span className="text-[9px] md:text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-wider">Müsabaka Saha Komiseri</span><span className="font-black text-slate-900 text-sm md:text-base">{komiserIsim}</span></div>
                            </div>
                        </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </main>
    )
  }

  if (aktifEkran === 'skorRapor') {
    const tebellugEdilenMaclar = Array.isArray(gecerliAktifMaclar) ? gecerliAktifMaclar.filter(m => m?.tebellug_edildi === true) : [];

    return (
      <main className="min-h-screen bg-slate-200 flex flex-col font-sans">
        
        <datalist id="hakem-listesi">
            {hakemListesi?.map((hakem, i) => <option key={`hakem-${i}`} value={hakem || ''} />)}
        </datalist>
        <datalist id="gozlemci-listesi">
            {gozlemciListesi?.map((gozlemci, i) => <option key={`gozlemci-${i}`} value={gozlemci || ''} />)}
        </datalist>

        {renderOrtakHeader(true)}
        <div className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 overflow-y-auto">
          <div className="bg-white p-5 rounded-2xl shadow-md mb-6 border-b-4 border-red-700 text-center">
            <h4 className="text-xl md:text-2xl font-black text-slate-800 tracking-widest uppercase">SKOR VE SAHA RAPORU</h4>
            <p className="text-slate-500 text-xs md:text-sm mt-1 font-medium">Hızlı skoru bildirebilir ve detaylı rapor oluşturabilirsiniz.</p>
          </div>

          {tebellugEdilenMaclar.length === 0 ? (
            <div className="text-center bg-white p-10 rounded-2xl shadow-sm text-slate-500 border border-slate-200">
              <span className="text-5xl block mb-4 opacity-50">📋</span><p className="text-sm font-bold uppercase tracking-widest">Raporlanacak aktif (tebellüğ edilmiş) göreviniz bulunmuyor.</p>
            </div>
          ) : (
            <div className="space-y-4 md:space-y-6">
              {tebellugEdilenMaclar.map((mac, idx) => {
                if(!mac) return null;
                const acikMi = acikSkorMacId === mac.id;
                const raporGonderilmis = mac.skor_girildi === true;
                const detayliGoster = detayliRaporGosterilirMi(mac.kategori_adi);
                
                let pDetay = mac?.tff_rapor_detaylari || {};
                if (typeof pDetay === 'string') {
                    try { pDetay = JSON.parse(pDetay); } catch(e) { pDetay = {}; }
                }
                const detayliGonderilmis = pDetay?.detayli_kaydedildi === true;

                let borderClass = 'border-slate-300';
                if (!raporGonderilmis) { borderClass = 'border-slate-300 hover:border-slate-400'; } 
                else if (detayliGoster && !detayliGonderilmis) { borderClass = 'border-red-400'; } 
                else { borderClass = 'border-green-500'; }
                if (acikMi) borderClass = 'border-red-600 shadow-xl';

                return (
                  <div key={mac.id || `skor-${idx}`} className={`bg-white rounded-2xl shadow-md border-2 transition-all ${borderClass}`}>
                    <button onClick={() => raporFormunuAc(mac)} className={`w-full text-left p-4 md:p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50 transition-colors ${raporGonderilmis && !acikMi ? 'bg-slate-50' : ''}`}>
                      <div className="w-full sm:w-auto pr-0 sm:pr-4">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="bg-slate-800 text-white text-[9px] md:text-[10px] px-2 py-0.5 rounded font-black tracking-wider uppercase">{formatMacKodu(mac?.mac_kodu)}</span>
                          <span className={`${detayliGoster ? 'text-red-700 bg-red-50 border-red-200' : 'text-slate-700 bg-slate-100 border-slate-300'} border text-[10px] md:text-[11px] px-2 py-0.5 rounded font-black uppercase tracking-wider`}>{mac?.kategori_adi || 'LİG BELİRTİLMEMİŞ'}</span>
                          <span className="text-slate-500 text-[10px] md:text-xs font-bold uppercase">{gorevTuruBelirle(mac?.kategori_adi, mac?.mac_kodu)}</span>
                        </div>
                        <h3 className="font-black text-base md:text-xl text-slate-900 leading-snug mb-1 uppercase">{mac?.ev_sahibi || '-'} <span className="text-slate-400 mx-1 text-sm font-medium">vs</span> {mac?.misafir_takim || '-'}</h3>
                        <p className="text-slate-500 text-[10px] md:text-xs mt-1.5 font-medium">{mac?.saha || '-'} | <span className="font-bold text-slate-700">{guvenliTarih(mac?.tarih)} - {guvenliSaat(mac?.saat)}</span></p>
                      </div>
                      <div className="w-full sm:w-auto flex justify-end mt-2 sm:mt-0">
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col gap-2 items-end w-full sm:w-auto">
                                <span className={`px-3 py-2 rounded-md text-[10px] md:text-[11px] font-black shadow-sm flex items-center justify-center min-w-[160px] md:min-w-[180px] uppercase tracking-widest border ${raporGonderilmis ? 'bg-green-600 text-white border-green-700' : 'bg-slate-800 text-white border-slate-900'}`}>{raporGonderilmis ? '✓ SKOR GÖNDERİLDİ' : '❌ SKOR BEKLENİYOR'}</span>
                                {detayliGoster && (<span className={`px-3 py-2 rounded-md text-[10px] md:text-[11px] font-black shadow-sm flex items-center justify-center min-w-[160px] md:min-w-[180px] uppercase tracking-widest border ${detayliGonderilmis ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-red-600 text-white border-red-700 animate-pulse'}`}>{detayliGonderilmis ? '✓ DETAYLI TAMAM' : '🚨 DETAYLI RAPOR YOK'}</span>)}
                            </div>
                            <div className={`hidden sm:flex items-center justify-center w-10 h-10 shrink-0 rounded-full border shadow-sm transition-colors ${acikMi ? 'bg-red-600 border-red-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-500'}`}><span className="text-lg font-black leading-none">{acikMi ? '▲' : '▼'}</span></div>
                        </div>
                      </div>
                    </button>

                    {acikMi && (
                      <div className="p-4 md:p-6 border-t-2 border-slate-100 bg-slate-50 rounded-b-2xl animate-fade-in-down">
                        <div className="bg-white border border-slate-300 shadow-md rounded-xl p-5 md:p-6 mb-6 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-800"></div>
                          <h4 className="font-black text-slate-800 border-b border-slate-200 pb-3 mb-5 text-sm md:text-base flex items-center gap-2 uppercase tracking-widest"><span className="text-xl">⚡</span> {detayliGoster ? '1. AŞAMA: HIZLI SKOR BİLDİRİMİ' : 'MÜSABAKA SKOR VE OLAY BİLDİRİMİ'}</h4>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-8">
                            <div>
                              <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 text-center">Maç Durumu</label>
                              <select value={macDurumu} onChange={(e:any) => setMacDurumu(e.target.value)} className="w-full p-3 md:p-4 border-2 border-slate-300 rounded-xl font-black text-sm md:text-base text-slate-800 bg-white text-center appearance-none cursor-pointer focus:border-red-500 focus:outline-none transition-colors shadow-sm">
                                <option value="oynandi">Müsabaka Tamamlandı</option><option value="yarida_kaldi">Maç Yarıda Kaldı</option><option value="takimlar_cikmadi">Takım(lar) Sahaya Çıkmadı</option>
                              </select>
                              
                              {macDurumu === 'oynandi' && (
                                <div className="mt-5 bg-white p-4 border-2 border-slate-200 rounded-xl flex items-center justify-between gap-3 w-full shadow-sm">
                                  <div className="flex-1 flex flex-col items-center justify-center min-w-0"><label className="block text-[10px] font-black text-slate-500 mb-2 w-full text-center truncate px-1 uppercase">{mac?.ev_sahibi || '-'}</label><select value={evSkor} onChange={e => setEvSkor(e.target.value)} className="w-20 h-14 text-center text-2xl font-black border-2 border-slate-300 rounded-xl focus:border-red-500 cursor-pointer appearance-none bg-slate-50 shadow-inner"><option value="" disabled>-</option>{skorSecenekleri.map(s => <option key={`ev-${s}`} value={s}>{s}</option>)}</select></div>
                                  <span className="text-2xl font-black text-slate-300">-</span>
                                  <div className="flex-1 flex flex-col items-center justify-center min-w-0"><label className="block text-[10px] font-black text-slate-500 mb-2 w-full text-center truncate px-1 uppercase">{mac?.misafir_takim || '-'}</label><select value={misafirSkor} onChange={e => setMisafirSkor(e.target.value)} className="w-20 h-14 text-center text-2xl font-black border-2 border-slate-300 rounded-xl focus:border-red-500 cursor-pointer appearance-none bg-slate-50 shadow-inner"><option value="" disabled>-</option>{skorSecenekleri.map(s => <option key={`misafir-${s}`} value={s}>{s}</option>)}</select></div>
                                </div>
                              )}
                              
                              {macDurumu === 'yarida_kaldi' && (
                                <div className="mt-5 bg-red-50 p-5 border-2 border-red-200 rounded-xl text-center shadow-sm">
                                    <span className="text-4xl block mb-2">🛑</span>
                                    <p className="text-xs font-bold text-red-800 leading-relaxed">Maç yarıda kaldığı için skor kilitlenmiştir. <br/>Lütfen yarıda kalma sebebini ve (eğer varsa) o anki skoru aşağıdaki 'Hızlı Not' kısmına detaylıca yazınız.</p>
                                </div>
                              )}
                              
                              {macDurumu === 'takimlar_cikmadi' && (
                                <div className="mt-5 bg-amber-50 p-5 border-2 border-amber-200 rounded-xl text-center shadow-sm">
                                    <span className="text-4xl block mb-2">🏟️</span>
                                    <p className="text-xs font-bold text-amber-800 leading-relaxed">Takımlar sahaya çıkmadığı için skor kilitlenmiştir. <br/>Lütfen Hızlı Not kısmına hangi takımın gelmediğini belirtiniz.</p>
                                </div>
                              )}
                            </div>
                            <div>
                              <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 text-center">Saha Olayları</label>
                              <div className="grid grid-cols-3 gap-2 mb-2">
                                <button onClick={() => setOlayDurumu('olaysiz')} className={`p-2 md:p-3 rounded-xl font-bold border-2 transition-all flex flex-col items-center justify-center min-h-[60px] ${olayDurumu === 'olaysiz' ? 'bg-green-100 border-green-500 text-green-900 shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}><span className="text-[10px] md:text-sm text-center leading-none font-black uppercase">OLAYSIZ</span></button>
                                <button onClick={() => setOlayDurumu('teknik_olay')} className={`p-2 md:p-3 rounded-xl font-bold border-2 transition-all flex flex-col items-center justify-center min-h-[60px] ${olayDurumu === 'teknik_olay' ? 'bg-amber-100 border-amber-500 text-amber-900 shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}><span className="text-[10px] md:text-sm mb-1 leading-none text-center font-black uppercase">TEKNİK</span><span className="text-[8px] md:text-[9px] font-bold text-center opacity-80 leading-none">(İhraç, vb.)</span></button>
                                <button onClick={() => setOlayDurumu('emniyetlik_olay')} className={`p-2 md:p-3 rounded-xl font-bold border-2 transition-all flex flex-col items-center justify-center min-h-[60px] ${olayDurumu === 'emniyetlik_olay' ? 'bg-red-100 border-red-600 text-red-900 shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}><span className="text-[10px] md:text-sm mb-1 leading-none text-center font-black uppercase">EMNİYET</span><span className="text-[8px] md:text-[9px] font-bold text-center opacity-80 leading-none">(Kavga vb.)</span></button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => { setOlayDurumu('hava_muhalefeti'); setMacDurumu('yarida_kaldi'); }} className={`p-3 rounded-xl font-bold border-2 transition-all text-[10px] md:text-xs flex items-center justify-center gap-1.5 min-h-[44px] uppercase tracking-wider ${olayDurumu === 'hava_muhalefeti' ? 'bg-slate-800 border-slate-900 text-white shadow-md' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'}`}>☁️ Hava Muhalefeti</button>
                                <button onClick={() => { setOlayDurumu('saha_sorunu'); setMacDurumu('yarida_kaldi'); }} className={`p-3 rounded-xl font-bold border-2 transition-all text-[10px] md:text-xs flex items-center justify-center gap-1.5 min-h-[44px] uppercase tracking-wider ${olayDurumu === 'saha_sorunu' ? 'bg-slate-800 border-slate-900 text-white shadow-md' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'}`}>🏟️ Tesis Sorunu</button>
                              </div>
                            </div>
                          </div>
                          <div className="mt-5 md:mt-6 border-t border-slate-200 pt-5">
                            <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Görev Raporu / Hızlı Not</label>
                            <textarea value={raporNotu} onChange={e => handleHizliNotChange(e.target.value)} className={`w-full p-4 border-2 rounded-xl font-serif text-[11px] md:text-sm min-h-[80px] md:min-h-[100px] shadow-inner transition-colors ${olayDurumu !== 'olaysiz' && raporNotu === '' ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-slate-50 focus:bg-white focus:border-red-500 focus:outline-none'}`} placeholder={olayDurumu === 'olaysiz' && macDurumu === 'oynandi' ? "Merkeze iletmek istediğiniz not varsa buraya yazabilirsiniz..." : "Lütfen yaşanan olayın veya yarıda kalma sebebinin detayını (dakika ve skorla birlikte) yazınız..."}></textarea>
                          </div>
                          <button onClick={() => skorRaporunuGonder(mac.id, 'hizli')} disabled={skorKaydediliyor} className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-xl shadow-lg transition-transform hover:scale-[1.01] text-xs md:text-sm uppercase tracking-widest mt-5 disabled:opacity-70 flex items-center justify-center gap-2">
                              {skorKaydediliyor ? '⚙️ GÖNDERİLİYOR...' : (raporGonderilmis ? (detayliGoster ? '💾 HIZLI SKORU GÜNCELLE' : '💾 SKORU GÜNCELLE') : (detayliGoster ? '🚀 HIZLI SKORU MERKEZE İLET' : '🚀 MERKEZE İLET'))}
                          </button>
                        </div>

                        {detayliGoster && (
                          <div className="bg-white border border-slate-300 shadow-md rounded-xl p-4 md:p-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600"></div>
                            <h4 className="font-black text-red-700 border-b border-slate-200 pb-3 mb-5 text-center text-sm md:text-base uppercase tracking-widest">DETAYLI MÜSABAKA RAPORU</h4>
                            <div className="mb-6 overflow-x-auto pb-4 custom-scrollbar">
                              {renderTffRaporu(mac, 'aktif')}
                            </div>

                            <div className="tff-no-print bg-slate-100 border border-slate-300 p-4 rounded-xl text-[10px] md:text-xs text-slate-600 mb-5 text-center font-medium shadow-inner">
                                💡 <b className="text-slate-800">İstihbarat Notu:</b> Yüklediğiniz fotoğraflar güvenlik sebebiyle veritabanına kaydedilmez. Resmi "PNG OLARAK İNDİR" butonuna basarak fotoğraflı kanıt dosyanızı anında cihazınıza indirebilir ve saklayabilirsiniz.
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mt-2">
                              <button onClick={() => tffTutanakIndir(mac, 'aktif')} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-black py-4 rounded-xl shadow-md transition-colors text-xs md:text-sm flex items-center justify-center gap-2 uppercase tracking-widest">📸 FOTOĞRAF (PNG) İNDİR</button>
                              <button onClick={() => skorRaporunuGonder(mac.id, 'detayli')} disabled={skorKaydediliyor} className={`flex-1 text-white font-black py-4 rounded-xl shadow-md transition-colors text-xs md:text-sm flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-70 ${detayliGonderilmis ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-700 hover:bg-red-800 animate-pulse'}`}>
                                {skorKaydediliyor ? '⚙️ KAYDEDİLİYOR...' : (detayliGonderilmis ? '💾 DETAYLI RAPORU GÜNCELLE' : '🚨 DETAYLI RAPORU İLET (ZORUNLU)')}
                              </button>
                            </div>
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    )
  }

  if (aktifEkran === 'mazeretBildir') {
    return (
      <main className="min-h-screen bg-slate-200 flex flex-col font-sans">
        {renderOrtakHeader(true)}
        <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 overflow-y-auto">
           <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border-t-8 border-red-600">
              <div className="text-center md:text-left border-b border-slate-200 pb-4 mb-6">
                  <h2 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tight">Müsaitlik / Mazeret Bildirimi</h2>
                  <p className="text-sm md:text-base font-bold text-red-600 mt-2">Önümüzdeki {globalAktifHaftaNo + 1}. Hafta için görev alma durumunuzu belirtiniz.</p>
              </div>

              <div className="space-y-4 mb-8">
                 <button onClick={() => { setMazeretTipi('yok'); setKompleYokum(true); }} className={`w-full p-5 md:p-6 rounded-xl border-2 font-black text-left uppercase tracking-wide transition-all ${mazeretTipi === 'yok' ? 'border-red-600 bg-red-50 text-red-800 shadow-md' : 'border-slate-200 text-slate-600 hover:border-red-300 hover:bg-slate-50'}`}><span className="text-xl mr-2">⛔</span> Tüm Hafta Mazeretliyim (Görev İstemiyorum)</button>
                 <button onClick={() => { setMazeretTipi('full'); setKompleYokum(false); }} className={`w-full p-5 md:p-6 rounded-xl border-2 font-black text-left uppercase tracking-wide transition-all ${mazeretTipi === 'full' ? 'border-green-600 bg-green-50 text-green-800 shadow-md' : 'border-slate-200 text-slate-600 hover:border-green-300 hover:bg-slate-50'}`}><span className="text-xl mr-2">✅</span> Tüm Hafta Müsaitim (Merkez/Deplasman Uyar)</button>
                 <button onClick={() => { setMazeretTipi('secmeli'); setKompleYokum(false); }} className={`w-full p-5 md:p-6 rounded-xl border-2 font-black text-left uppercase tracking-wide transition-all ${mazeretTipi === 'secmeli' ? 'border-red-600 bg-red-50 text-red-800 shadow-md' : 'border-slate-200 text-slate-600 hover:border-red-300 hover:bg-slate-50'}`}><span className="text-xl mr-2">📅</span> Sadece Seçtiğim Günler ve Saatler Müsaitim</button>
              </div>

              {mazeretTipi === 'full' && (
                  <div className="bg-green-50 p-6 rounded-xl mb-8 border border-green-200 animate-fade-in-down shadow-sm">
                      <h4 className="font-black text-green-900 mb-4 text-sm uppercase tracking-widest">Hangi bölgelerde görev alabilirsiniz?</h4>
                      <div className="flex gap-6">
                          <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={genelMerkez} onChange={(e) => setGenelMerkez(e.target.checked)} className="w-6 h-6 text-green-600 rounded focus:ring-green-500 cursor-pointer" /><span className="font-bold text-slate-800 text-base">Merkez</span></label>
                          <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={genelDeplasman} onChange={(e) => setGenelDeplasman(e.target.checked)} className="w-6 h-6 text-green-600 rounded focus:ring-green-500 cursor-pointer" /><span className="font-bold text-slate-800 text-base">Deplasman</span></label>
                      </div>
                  </div>
              )}

              {mazeretTipi === 'secmeli' && (
                  <div className="mb-8 animate-fade-in-down space-y-3">
                      <h4 className="font-black text-red-800 mb-4 text-sm uppercase tracking-widest px-2">Müsait Olduğunuz Günleri Seçiniz</h4>
                      {renderGunSatiri('cuma', 'Cuma')}
                      {renderGunSatiri('cumartesi', 'Cumartesi')}
                      {renderGunSatiri('pazar', 'Pazar')}
                      {renderGunSatiri('pazartesi', 'Pazartesi')}
                      {renderGunSatiri('sali', 'Salı')}
                      {renderGunSatiri('carsamba', 'Çarşamba')}
                      {renderGunSatiri('persembe', 'Perşembe')}
                  </div>
              )}

              <div className="mb-8">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Mazeret Notu (Opsiyonel)</label>
                  <textarea value={mazeretNotu} onChange={(e) => setMazeretNotu(e.target.value)} className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-red-500 focus:outline-none min-h-[120px] font-medium text-sm text-slate-700 bg-slate-50 transition-colors" placeholder="Varsa merkeze iletmek istediğiniz özel bir not..."></textarea>
              </div>

              <button onClick={mazeretKaydet} disabled={mazeretKaydediliyor || (!mazeretTipi && !kompleYokum)} className="w-full bg-red-700 hover:bg-red-800 disabled:opacity-50 disabled:hover:bg-red-700 text-white font-black py-5 rounded-xl shadow-lg uppercase tracking-widest transition-transform hover:scale-[1.01] flex items-center justify-center gap-2">
                  {mazeretKaydediliyor ? '⚙️ İŞLENİYOR...' : '🚀 MAZERET / MÜSAİTLİK BİLDİRİMİNİ GÖNDER'}
              </button>
           </div>
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
            {girisHatasi && <p className="text-red-500 text-xs font-bold text-center bg-red-50 p-2 rounded-lg">{girisHatasi}</p>}
            <button type="submit" disabled={girisYukleniyor} className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-[0_8px_20px_rgba(220,38,38,0.3)] transition-all disabled:opacity-50 hover:-translate-y-0.5">
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