"use client"
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toPng } from 'html-to-image'

const AMATOR_MERKEZ_LOGO = "https://upload.wikimedia.org/wikipedia/tr/0/0a/TFF_logo.png?utm_source=tr.wikipedia.org&utm_campaign=index&utm_content=original";
const GELISIM_SOL_LOGO = "https://upload.wikimedia.org/wikipedia/tr/0/0a/TFF_logo.png?utm_source=tr.wikipedia.org&utm_campaign=index&utm_content=original";
const GELISIM_SAG_LOGO = "https://upload.wikimedia.org/wikipedia/tr/0/0a/TFF_logo.png?utm_source=tr.wikipedia.org&utm_campaign=index&utm_content=original"; 
const DERNEK_LOGO = "https://upload.wikimedia.org/wikipedia/tr/0/0a/TFF_logo.png?utm_source=tr.wikipedia.org&utm_campaign=index&utm_content=original"; 

type EkranTuru = 'giris' | 'dashboard' | 'gorevKartlari' | 'skorRapor' | 'mazeretBildir' | 'bultenArama' | 'istatistiklerim';

const parseDetay = (raw: any) => {
    if (!raw) return {};
    let obj = raw;
    if (typeof obj === 'string') {
        try { obj = JSON.parse(obj); } catch(e) { return {}; }
    }
    if (typeof obj !== 'object' || obj === null) return {};
    return obj;
};

const getAnaKategori = (kategori: any) => {
    if (!kategori) return 'amator';
    const kat = String(kategori || "").toLocaleUpperCase('tr-TR');

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

    const kat = String(kategori || "").toLocaleUpperCase('tr-TR');
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

const guvenliTarih = (tarihMetni: any) => {
    if (!tarihMetni) return "-";
    try {
        const str = String(tarihMetni);
        if (str.includes('-')) {
            const parts = str.split('-');
            if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`; 
        }
        return str;
    } catch (e) { return "-"; }
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

const renderGelisimCheckbox = (etiket: string, deger: any, onChange: (val: string) => void, id: string, isAktif: boolean) => (
    <div key={id} className="flex justify-between items-center border-b border-dashed border-slate-300 py-1">
        <span className="text-[10px] w-3/4">{etiket}</span>
        <div className="flex gap-4 w-1/4 justify-end pr-2">
            <label className={`flex items-center gap-1 text-[10px] ${isAktif ? 'cursor-pointer' : 'pointer-events-none'}`}>
                Evet <div className={`w-4 h-4 border border-black flex items-center justify-center text-xs font-bold bg-white ${deger === 'evet' ? 'bg-slate-200' : ''}`}>{deger === 'evet' ? 'X' : ''}</div>
                <input type="radio" className="hidden" checked={deger === 'evet'} onChange={() => onChange('evet')} disabled={!isAktif} />
            </label>
            <label className={`flex items-center gap-1 text-[10px] ${isAktif ? 'cursor-pointer' : 'pointer-events-none'}`}>
                Hayır <div className={`w-4 h-4 border border-black flex items-center justify-center text-xs font-bold bg-white ${deger === 'hayir' ? 'bg-slate-200' : ''}`}>{deger === 'hayir' ? 'X' : ''}</div>
                <input type="radio" className="hidden" checked={deger === 'hayir'} onChange={() => onChange('hayir')} disabled={!isAktif} />
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
  const [sifreInput, setSifreInput] = useState('') // 🔥 YENİ ŞİFRE İNPUTU 🔥
  
  const [girisHatasi, setGirisHatasi] = useState<string | null>(null)
  const [girisYukleniyor, setGirisYukleniyor] = useState(false)
  const [seciliKomiser, setSeciliKomiser] = useState<any | null>(null)
  
  // 🔥 ŞİFRE DEĞİŞTİRME VE UNUTMA MODALLARI 🔥
  const [sifreDegistirAcik, setSifreDegistirAcik] = useState(false)
  const [eskiSifre, setEskiSifre] = useState('')
  const [yeniSifre, setYeniSifre] = useState('')
  const [sifremiUnuttumAcik, setSifremiUnuttumAcik] = useState(false)

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

  const cumaBul = (tarihMetni: any) => {
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
        const str = String(mac.tarih);
        const parcaTarih = str.split('-');
        let saat = 0, dakika = 0;
        if (mac.saat) {
            const strSaat = String(mac.saat);
            const parcaSaat = strSaat.split(':');
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
        const kayitliSifre = localStorage.getItem('izmirKomiserSifre')
        // Şifre sistemi geldiği için otomatik girişte şifreyi de kontrol ettiriyoruz
        if (kayitliId && kayitliSifre) { otomatikGirisYap(kayitliId, kayitliSifre) }
      } catch (e) { console.error(e) }
    }
  }, [])

  const otomatikGirisYap = async (id: string, sifre: string) => {
    try {
      const { data, error } = await supabase.from('komiserler').select('*').eq('komiser_id', id).single()
      if (data && !error) {
        const dbSifre = data.sifre || '1923'; // Veritabanında şifre yoksa 1923 kabul et
        if (dbSifre === sifre) {
            setSeciliKomiser(data)
            await komiserDetayGetir(data)
            setAktifEkran('dashboard')
        } else {
            localStorage.removeItem('izmirKomiserId');
            localStorage.removeItem('izmirKomiserSifre');
        }
      } else { 
          localStorage.removeItem('izmirKomiserId');
          localStorage.removeItem('izmirKomiserSifre');
      }
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
                const tarihler = aktifHaftaMaclari.map(m => new Date(String(m.tarih)).getTime()).filter(t => !isNaN(t));
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

  // 🔥 ŞİFRE ZEKASI GİRİŞ KONTROLÜNE EKLENDİ 🔥
  const girisYap = async (e?: React.FormEvent) => {
    if (e) e.preventDefault() 
    setGirisYukleniyor(true); setGirisHatasi(null);
    let girilenSicil = kullaniciIdInput.trim()

    if (/^\d{4,10}$/.test(girilenSicil) && !girilenSicil.startsWith('35')) {
      girilenSicil = '35' + girilenSicil
    }

    if (!girilenSicil) { setGirisHatasi("Lütfen sicil numaranızı girin."); setGirisYukleniyor(false); return; }
    if (!sifreInput) { setGirisHatasi("Lütfen şifrenizi girin."); setGirisYukleniyor(false); return; }

    try {
      const { data, error } = await supabase.from('komiserler').select('*').eq('komiser_id', girilenSicil).single()
      if (error || !data) { setGirisHatasi("Bu sicil numarasına ait saha komiseri bulunamadı."); setGirisYukleniyor(false); return; }
      
      const dbSifre = data.sifre || '1923'; // Veritabanında şifre sütunu boşsa 1923 say
      if (dbSifre !== sifreInput) {
          setGirisHatasi("Hatalı şifre girdiniz!"); 
          setGirisYukleniyor(false); 
          return;
      }

      setSeciliKomiser(data)
      localStorage.setItem('izmirKomiserId', data.komiser_id)
      localStorage.setItem('izmirKomiserSifre', sifreInput)
      await komiserDetayGetir(data)
      setAktifEkran('dashboard') 
    } catch (err) { setGirisHatasi("Bağlantı sorunu oluştu, tekrar deneyin.") } 
    finally { setGirisYukleniyor(false) }
  }

  const enterTusuKontrol = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') girisYap() }

  // 🔥 ŞİFRE DEĞİŞTİRME FONKSİYONU 🔥
  const sifreDegistirSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const guncelSifre = seciliKomiser?.sifre || '1923';
      if (eskiSifre !== guncelSifre) { alert("Mevcut şifrenizi yanlış girdiniz!"); return; }
      if (yeniSifre.length !== 4 || !/^\d+$/.test(yeniSifre)) { alert("Yeni şifreniz 4 haneli RAKAM olmalıdır!"); return; }
      
      try {
          const { error } = await supabase.from('komiserler').update({ sifre: yeniSifre }).eq('id', seciliKomiser.id);
          if (!error) {
              alert("Şifreniz başarıyla güncellendi!");
              setSeciliKomiser({...seciliKomiser, sifre: yeniSifre});
              localStorage.setItem('izmirKomiserSifre', yeniSifre);
              setSifreDegistirAcik(false);
              setEskiSifre(''); setYeniSifre('');
          } else {
              alert("Şifre güncellenirken bir hata oluştu.");
          }
      } catch(err) { alert("Bağlantı hatası!"); }
  }

  const cikisYap = () => {
    setSeciliKomiser(null); setKullaniciIdInput(''); setSifreInput(''); setKomiserMaclari([]);
    setAramaKomiser(''); setAramaSaha(''); setAramaTakim('');
    setAktifEkran('giris'); setArsivAcik(false); setAcikHaftalar([]);
    setAcikSicilSaha(null); setAcikSicilTffMacId(null); setAcikStatu(null); setArsivTamEkranMac(null);
    setMazeretTipi(null); setKompleYokum(false); setGenelMerkez(true); setGenelDeplasman(false); setMazeretNotu('');
    setGunler({
      cuma: { ...defaultGunDurumu }, cumartesi: { ...defaultGunDurumu }, pazar: { ...defaultGunDurumu },
      pazartesi: { ...defaultGunDurumu }, sali: { ...defaultGunDurumu }, carsamba: { ...defaultGunDurumu }, persembe: { ...defaultGunDurumu }
    }); skorFormunuSifirla(); localStorage.removeItem('izmirKomiserId'); localStorage.removeItem('izmirKomiserSifre');
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

  const renderOrjinalGorevKarti = (mac: any, isArsiv: boolean = false) => {
    if (!mac) return null;
    
    const statuBul = (katAdi: string) => {
        if(!katAdi) return null;
        const s = String(katAdi).toLocaleUpperCase('tr-TR');
        return tumStatuler.find(st => st.kategori_anahtar && s.includes(String(st.kategori_anahtar).toLocaleUpperCase('tr-TR')));
    }
    const bagliStatu = statuBul(mac.kategori_adi);
    const skorGoster = isArsiv && mac.skor_girildi;

    const parsedDetay = parseDetay(mac.tff_rapor_detaylari);

    return (
      <div className="bg-white border-l-4 border-slate-800 shadow-sm rounded-r-xl p-4 md:p-5 mb-4 transition-shadow hover:shadow-md border border-slate-200">
        
        <div className="mb-3 border-b border-slate-100 pb-3">
          {skorGoster ? (
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4">
                    <span className="font-black text-slate-900 text-sm md:text-lg leading-tight uppercase truncate">{mac.ev_sahibi || '-'}</span>
                    <span className="font-black text-base md:text-xl text-white bg-slate-800 px-3 py-1 rounded shadow-inner whitespace-nowrap min-w-[40px] text-center">{mac.ev_sahibi_skor}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="font-black text-slate-900 text-sm md:text-lg leading-tight uppercase truncate">{mac.misafir_takim || '-'}</span>
                    <span className="font-black text-base md:text-xl text-white bg-slate-800 px-3 py-1 rounded shadow-inner whitespace-nowrap min-w-[40px] text-center">{mac.misafir_skor}</span>
                </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
                <span className="font-black text-slate-900 text-sm md:text-lg leading-tight uppercase truncate">{mac.ev_sahibi || '-'}</span>
                <span className="font-black text-slate-900 text-sm md:text-lg leading-tight uppercase truncate">{mac.misafir_takim || '-'}</span>
            </div>
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
  
  const eksikDetayliSayisi = gecerliAktifMaclar.filter(m => {
      if (!m || !m.tebellug_edildi || !m.skor_girildi || !detayliRaporGosterilirMi(m.kategori_adi)) return false;
      const parsed = parseDetay(m.tff_rapor_detaylari);
      return !parsed.detayli_kaydedildi;
  }).length;

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
      } else { alert("Sisteme iletilemedi: " + error.message); }
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
        
        const parsedDetay = parseDetay(mac.tff_rapor_detaylari);
        const birlesikDetay = { ...defaultRaporDetay, ...parsedDetay };
        
        if (!birlesikDetay.gelisim_sorular || typeof birlesikDetay.gelisim_sorular !== 'object') birlesikDetay.gelisim_sorular = defaultRaporDetay.gelisim_sorular;
        if (!Array.isArray(birlesikDetay.ek_raporlar)) birlesikDetay.ek_raporlar = [];
        if (!Array.isArray(birlesikDetay.ihrac_ev)) birlesikDetay.ihrac_ev = defaultRaporDetay.ihrac_ev;
        if (!Array.isArray(birlesikDetay.ihrac_mis)) birlesikDetay.ihrac_mis = defaultRaporDetay.ihrac_mis;
        
        setRaporDetay(birlesikDetay); 
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
    
    // 🔥 SADECE İLK KAYITTA TARİH ATILIR, SONRA GÜNCELLENMEZ 🔥
    const mevcutDetay = parseDetay(gecerliAktifMaclar.find(m => m.id === macId)?.tff_rapor_detaylari);
    kaydedilecekDetay.islem_saati = mevcutDetay.islem_saati || Date.now();

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

  // 🔥 EKRAN ANA YÖNLENDİRİCİSİ (APP ROUTER) 🔥
  
  if (aktifEkran === 'dashboard') {
    // Şifre kontrolü için dashboard yüklenirken bir güvenlik kontrolü yapalım
    // Eğer seciliKomiser.sifre '1923' ise ana ekranda bir uyarı banner'ı gösterilir
    const sifreUyariGoster = seciliKomiser?.sifre === '1923';

    return (
      <main className="min-h-screen bg-slate-100 flex flex-col font-sans">
        {renderOrtakHeader(false)}
        <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6">
          
          {sifreUyariGoster && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
                  <div className="flex items-center gap-3">
                      <span className="text-2xl">⚠️</span>
                      <div className="text-left">
                          <h4 className="text-red-800 font-black text-sm uppercase tracking-wide">Güvenlik Uyarısı</h4>
                          <p className="text-red-700 text-xs font-medium">Sisteme varsayılan şifre (1923) ile giriş yaptınız. Lütfen şifrenizi güncelleyin.</p>
                      </div>
                  </div>
                  <button onClick={() => setSifreDegistirAcik(true)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded shadow-sm text-xs uppercase tracking-widest w-full sm:w-auto">Şifremi Değiştir</button>
              </div>
          )}

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
            
            {/* ŞİFRE DEĞİŞTİRME BUTONU (DASHBOARD) */}
            <div className="absolute top-4 right-4 z-20">
                <button onClick={() => setSifreDegistirAcik(true)} className="bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-500 p-2 rounded-lg shadow transition-colors text-xs font-bold flex items-center gap-1">
                    🔑 Şifremi Değiştir
                </button>
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
              <p className="text-xs md:text-sm mt-1 text-slate-400 font-medium">Görev aldığınız liglerin detaylı dökümü.</p>
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

        {/* 🔥 ŞİFRE DEĞİŞTİRME MODALI 🔥 */}
        {sifreDegistirAcik && (
            <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in-up border border-slate-300 p-6">
                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">ŞİFREYİ DEĞİŞTİR</h2>
                    <form onSubmit={sifreDegistirSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Mevcut Şifreniz</label>
                            <input type="password" value={eskiSifre} onChange={e => setEskiSifre(e.target.value)} maxLength={4} className="w-full border-2 border-slate-200 rounded-lg p-3 text-center text-xl font-black tracking-widest focus:border-blue-500 focus:outline-none" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Yeni Şifreniz (4 Haneli Rakam)</label>
                            <input type="password" value={yeniSifre} onChange={e => setYeniSifre(e.target.value)} maxLength={4} pattern="\d{4}" className="w-full border-2 border-slate-200 rounded-lg p-3 text-center text-xl font-black tracking-widest focus:border-blue-500 focus:outline-none" required />
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button type="button" onClick={() => setSifreDegistirAcik(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-lg transition-colors text-sm">İptal</button>
                            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors text-sm shadow-md">Kaydet</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

      </main>
    )
  }

  if (aktifEkran === 'gorevKartlari') {
    return (
      <main className="min-h-screen bg-slate-100 flex flex-col font-sans relative">
        {renderOrtakHeader(true)}
        <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 overflow-y-auto">
          <div id="gorev-karti-alani" className="min-h-full">
            <div className="bg-white p-4 rounded-xl shadow-sm mb-5 border-b-4 border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left">
                <h4 className="text-lg font-black text-slate-800 tracking-wide uppercase">{seciliKomiser?.ad_soyad || '-'}</h4>
                <p className="text-blue-700 font-bold mt-1">{globalAktifHaftaNo}. Hafta Görev Bülteni</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={tebellugKaydet} disabled={hepsiTebellugEdilmis || tebellugYukleniyor || gecerliAktifMaclar.length === 0} className={`text-sm font-bold py-2 px-4 rounded-lg shadow flex items-center gap-2 transition-colors ${hepsiTebellugEdilmis ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' : gecerliAktifMaclar.length > 0 ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
                  {tebellugYukleniyor ? 'İşleniyor...' : hepsiTebellugEdilmis ? '✓ Tebellüğ Edildi' : 'Tebellüğ Et (Görevleri Aldım)'}
                </button>
                <button onClick={kartiIndir} className="bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold py-2 px-4 rounded-lg shadow">İndir / Paylaş</button>
              </div>
            </div>

            {macYukleniyor ? (
              <div className="text-center text-slate-600 py-8 animate-pulse font-black tracking-widest">GÖREVLERİNİZ ARANIYOR...</div>
            ) : (
              <>
                <div className="mb-6">
                  {gecerliAktifMaclar.length === 0 ? (
                    <div className="text-center text-slate-500 py-8 bg-white rounded-xl text-sm font-bold border border-slate-200">Aktif göreviniz bulunmuyor.</div>
                  ) : (
                    <div className="space-y-4">
                      {gecerliAktifMaclar.map((mac, idx) => (
                        <div key={mac.id || `gkart-${idx}`}>
                          {renderOrjinalGorevKarti(mac, false)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {Object.keys(gecmisHaftalar).length > 0 && (
                  <div className="mt-8 border-t border-slate-300 pt-6">
                    <button onClick={() => setArsivAcik(!arsivAcik)} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-4 px-5 rounded-xl shadow-sm flex justify-between items-center transition-colors">
                      <span className="text-sm md:text-base uppercase tracking-widest font-black">Geçmiş Maç Arşivi</span><span className="text-xl">{arsivAcik ? '▲' : '▼'}</span>
                    </button>
                    {arsivAcik && (
                      <div className="mt-4 space-y-4">
                        {Object.keys(gecmisHaftalar).map(Number).sort((a, b) => b - a).map(haftaNo => (
                          <div key={`hafta-${haftaNo}`} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                            <button onClick={() => haftaToggle(haftaNo)} className="w-full bg-white text-slate-800 font-bold py-3 px-5 flex justify-between items-center text-xs md:text-sm hover:bg-slate-50 border-b border-slate-100">
                              <span>{haftaNo}. Hafta Görevleri <span className="bg-slate-800 text-white text-[10px] md:text-xs px-2 py-1 rounded ml-2">{(gecmisHaftalar[haftaNo] || []).length} Görev</span></span>
                              <span className="text-slate-400">{acikHaftalar.includes(haftaNo) ? '▲' : '▼'}</span>
                            </button>
                            {acikHaftalar.includes(haftaNo) && (
                              <div className="p-2 md:p-4 bg-slate-50 space-y-4">
                                {(gecmisHaftalar[haftaNo] || []).map((mac: any, idx: number) => (
                                  <div key={mac.id || `gecmis-${idx}`} className="opacity-95 hover:opacity-100 transition-opacity">
                                    {renderOrjinalGorevKarti(mac, true)}
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

        {/* 🔥 STATÜ MODALI 🔥 */}
        {acikStatu && (
            <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up border border-slate-300">
                    <div className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700">
                        <h2 className="text-white font-black tracking-widest uppercase text-sm flex items-center gap-2"><span className="text-xl">ℹ️</span> {acikStatu.baslik}</h2>
                        <button onClick={() => setAcikStatu(null)} className="text-slate-300 hover:text-white font-bold text-xl leading-none transition-colors">✕</button>
                    </div>
                    <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        <div className="border-b border-slate-200 pb-3">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">🏃 Yaş Sınırı</h4>
                            <p className="text-sm font-bold text-slate-800 leading-snug">{acikStatu.yas_siniri}</p>
                        </div>
                        <div className="flex gap-4 border-b border-slate-200 pb-3">
                            <div className="flex-1">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">⏱️ Müsabaka Süresi</h4>
                                <p className="text-sm font-black text-blue-700">{acikStatu.sure}</p>
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
                    <div className="bg-slate-50 p-3 text-center border-t border-slate-200">
                        <button onClick={() => setAcikStatu(null)} className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-8 rounded-lg text-xs uppercase tracking-widest transition-colors w-full shadow-sm">ANLADIM, KAPAT</button>
                    </div>
                </div>
            </div>
        )}
        
        {/* 🔥 TFF RAPORU TAM EKRAN (ARŞİV) MODALI 🔥 */}
        {arsivTamEkranMac && (
            <div className="fixed inset-0 bg-black/90 z-[120] flex flex-col backdrop-blur-sm">
                <div className="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center shrink-0 shadow-lg">
                    <h2 className="text-xs md:text-lg font-black text-white tracking-widest uppercase truncate flex-1 pr-4">📄 TFF RAPORU: {arsivTamEkranMac.ev_sahibi} <span className="font-medium text-slate-400">vs</span> {arsivTamEkranMac.misafir_takim}</h2>
                    <div className="flex items-center gap-3 shrink-0">
                        <button onClick={() => tffTutanakIndir(arsivTamEkranMac, 'arsiv-tam')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 md:px-4 md:py-2 rounded text-[10px] md:text-xs font-bold tracking-widest shadow-lg flex items-center gap-2 transition-colors">📸 İNDİR</button>
                        <button onClick={() => setArsivTamEkranMac(null)} className="text-slate-400 hover:text-red-500 font-bold text-2xl md:text-3xl leading-none transition-colors">✕</button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto bg-slate-300 p-2 md:p-8 flex justify-center items-start custom-scrollbar">
                    <div className="shadow-2xl bg-white w-full max-w-none md:max-w-max transform origin-top mx-auto">
                        {renderTffRaporu(arsivTamEkranMac, 'arsiv-tam')}
                    </div>
                </div>
            </div>
        )}

      </main>
    )
  }

  if (aktifEkran === 'istatistiklerim') {
    let amatorCount = 0; let profCount = 0; let gelisimCount = 0; let kadinCount = 0;
    const amatorKategoriler: Record<string, number> = {};
    const profKategoriler: Record<string, number> = {};
    const gelisimKategoriler: Record<string, number> = {};
    const kadinKategoriler: Record<string, number> = {};

    const maclar = Array.isArray(komiserMaclari) ? komiserMaclari : [];
    maclar.forEach(mac => {
        if (!mac) return;
        const anaKat = getAnaKategori(mac?.kategori_adi);
        const katAdi = formatKategori(mac?.kategori_adi);
        
        if (anaKat === 'profesyonel') { 
            profCount++; profKategoriler[katAdi] = (profKategoriler[katAdi] || 0) + 1; 
        } else if (anaKat === 'gelisim') { 
            gelisimCount++; gelisimKategoriler[katAdi] = (gelisimKategoriler[katAdi] || 0) + 1; 
        } else if (anaKat === 'kadin') { 
            kadinCount++; kadinKategoriler[katAdi] = (kadinKategoriler[katAdi] || 0) + 1; 
        } else { 
            amatorCount++; amatorKategoriler[katAdi] = (amatorKategoriler[katAdi] || 0) + 1; 
        }
    });

    const siraliAmatorler = Object.entries(amatorKategoriler).sort((a,b) => b[1] - a[1]);
    const siraliProflar = Object.entries(profKategoriler).sort((a,b) => b[1] - a[1]);
    const siraliGelisimler = Object.entries(gelisimKategoriler).sort((a,b) => b[1] - a[1]);
    const siraliKadinlar = Object.entries(kadinKategoriler).sort((a,b) => b[1] - a[1]);

    return (
      <main className="min-h-screen bg-slate-100 flex flex-col font-sans">
        {renderOrtakHeader(true)}
        <div className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 overflow-y-auto">
            <div className="bg-white rounded-xl p-5 md:p-8 border border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-200 pb-5 mb-8 gap-4">
                    <div className="text-center md:text-left">
                        <h3 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tight">{seciliKomiser?.ad_soyad || 'Komiser'}</h3>
                        <span className="text-slate-500 text-xs font-mono font-bold tracking-widest mt-1 inline-block">SİCİL: {seciliKomiser?.komiser_id || '-'}</span>
                    </div>
                    <div className="bg-slate-800 px-6 py-4 rounded-xl shadow-md border border-slate-700 min-w-[160px]">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">Toplam Görev Sayısı</div>
                        <div className="text-4xl font-black text-white text-center mt-1">{maclar.length}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                        <h4 className="text-slate-800 font-black text-sm tracking-widest uppercase mb-4 border-b border-slate-200 pb-2 flex justify-between items-center">
                            AMATÖR LİGLER <span className="bg-slate-800 text-white px-2.5 py-1 rounded text-xs">{amatorCount}</span>
                        </h4>
                        <ul className="space-y-2">
                            {siraliAmatorler.length === 0 && <li className="text-xs text-slate-400 italic">Bu kategoride kayıt yok.</li>}
                            {siraliAmatorler.map(([kat, count]) => (
                                <li key={kat} className="flex justify-between items-center bg-white p-2.5 rounded text-xs border border-slate-100 shadow-sm"><span className="text-slate-600 font-bold truncate pr-2">{kat}</span><span className="font-black text-slate-800">{count}</span></li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                        <h4 className="text-slate-800 font-black text-sm tracking-widest uppercase mb-4 border-b border-slate-200 pb-2 flex justify-between items-center">
                            GELİŞİM LİGLERİ <span className="bg-slate-800 text-white px-2.5 py-1 rounded text-xs">{gelisimCount}</span>
                        </h4>
                        <ul className="space-y-2">
                            {siraliGelisimler.length === 0 && <li className="text-xs text-slate-400 italic">Bu kategoride kayıt yok.</li>}
                            {siraliGelisimler.map(([kat, count]) => (
                                <li key={kat} className="flex justify-between items-center bg-white p-2.5 rounded text-xs border border-slate-100 shadow-sm"><span className="text-slate-600 font-bold truncate pr-2">{kat}</span><span className="font-black text-slate-800">{count}</span></li>
                            ))}
                        </ul>
                    </div>
                    
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                        <h4 className="text-slate-800 font-black text-sm tracking-widest uppercase mb-4 border-b border-slate-200 pb-2 flex justify-between items-center">
                            KADIN FUTBOL LİGLERİ <span className="bg-slate-800 text-white px-2.5 py-1 rounded text-xs">{kadinCount}</span>
                        </h4>
                        <ul className="space-y-2">
                            {siraliKadinlar.length === 0 && <li className="text-xs text-slate-400 italic">Bu kategoride kayıt yok.</li>}
                            {siraliKadinlar.map(([kat, count]) => (
                                <li key={kat} className="flex justify-between items-center bg-white p-2.5 rounded text-xs border border-slate-100 shadow-sm"><span className="text-slate-600 font-bold truncate pr-2">{kat}</span><span className="font-black text-slate-800">{count}</span></li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                        <h4 className="text-slate-800 font-black text-sm tracking-widest uppercase mb-4 border-b border-slate-200 pb-2 flex justify-between items-center">
                            PROFESYONEL LİGLER <span className="bg-slate-800 text-white px-2.5 py-1 rounded text-xs">{profCount}</span>
                        </h4>
                        <ul className="space-y-2">
                            {siraliProflar.length === 0 && <li className="text-xs text-slate-400 italic">Bu kategoride kayıt yok.</li>}
                            {siraliProflar.map(([kat, count]) => (
                                <li key={kat} className="flex justify-between items-center bg-white p-2.5 rounded text-xs border border-slate-100 shadow-sm"><span className="text-slate-600 font-bold truncate pr-2">{kat}</span><span className="font-black text-slate-800">{count}</span></li>
                            ))}
                        </ul>
                    </div>
                </div>

            </div>
        </div>
      </main>
    )
  }

  // 🔥 EKRAN 4: BÜLTEN ARAMA 🔥
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
      <main className="min-h-screen bg-slate-100 flex flex-col font-sans">
        {renderOrtakHeader(true)}
        <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 overflow-y-auto">
          <div className="bg-slate-800 rounded-xl shadow-md mb-6 border-b-4 border-slate-600 overflow-hidden">
            <button onClick={() => setAramaTuruAcik(!aramaTuruAcik)} className="w-full p-5 flex justify-between items-center hover:bg-slate-700 transition-colors">
              <h4 className="text-lg md:text-xl font-black text-white tracking-wide uppercase flex items-center gap-2">🔍 Saha ve Görev İstihbaratı</h4><span className="text-slate-300 text-xl">{aramaTuruAcik ? '▲' : '▼'}</span>
            </button>
            {aramaTuruAcik && (
              <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200 space-y-4 animate-fade-in-down">
                <div><label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Saha Komiseri Adı</label><input list="komiser-listesi" type="text" placeholder="Komiser arayın..." value={aramaKomiser} onChange={(e) => setAramaKomiser(e.target.value)} className="w-full bg-white border-2 border-slate-300 text-slate-800 px-4 py-3 rounded-lg focus:outline-none focus:border-slate-500 transition-colors text-sm font-bold" /><datalist id="komiser-listesi">{siraliKomiserler.map((k, i) => <option key={`kom-${i}`} value={k.ad_soyad || ''} />)}</datalist></div>
                <div><label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Saha Adı</label><input list="saha-listesi" type="text" placeholder="Saha arayın..." value={aramaSaha} onChange={(e) => setAramaSaha(e.target.value)} className="w-full bg-white border-2 border-slate-300 text-slate-800 px-4 py-3 rounded-lg focus:outline-none focus:border-slate-500 transition-colors text-sm font-bold" /><datalist id="saha-listesi">{siraliSahalar.map((saha, i) => <option key={`sah-${i}`} value={saha as string} />)}</datalist></div>
                <div><label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Takım veya Lig Adı</label><input list="takim-listesi" type="text" placeholder="Takım veya lig arayın..." value={aramaTakim} onChange={(e) => setAramaTakim(e.target.value)} className="w-full bg-white border-2 border-slate-300 text-slate-800 px-4 py-3 rounded-lg focus:outline-none focus:border-slate-500 transition-colors text-sm font-bold" /><datalist id="takim-listesi">{siraliTakimlar.map((takim, i) => <option key={`tak-${i}`} value={takim as string} />)}</datalist></div>
                {(aramaKomiser || aramaSaha || aramaTakim) && (
                  <div className="pt-2 text-right"><button onClick={() => { setAramaKomiser(''); setAramaSaha(''); setAramaTakim(''); setAcikAramaMacId(null); }} className="text-slate-500 hover:text-slate-800 text-xs uppercase tracking-widest font-black transition-colors bg-white px-3 py-1.5 rounded border border-slate-300 shadow-sm">Filtreleri Temizle</button></div>
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
                  <div key={mac.id || `arama-${idx}`} className="bg-white border-l-4 border-slate-800 shadow-sm rounded-r-xl overflow-hidden transition-all hover:shadow-md border-y border-r border-slate-200">
                    <button onClick={() => setAcikAramaMacId(isAcik ? null : mac.id)} className="w-full text-left p-3 md:p-4 flex justify-between items-center hover:bg-slate-50 focus:outline-none">
                        <div className="flex-1 pr-2">
                            <div className="flex items-center gap-2 mb-1"><span className="bg-slate-100 text-slate-700 border border-slate-300 text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider">{formatMacKodu(mac?.mac_kodu)}</span><span className="text-slate-600 text-[10px] font-black uppercase tracking-widest">{mac?.kategori_adi || '-'}</span></div>
                            <span className="font-black text-slate-900 text-sm md:text-base leading-tight block uppercase">{mac?.ev_sahibi || '-'} <span className="text-slate-400 font-medium mx-1">vs</span> {mac?.misafir_takim || '-'}</span>
                        </div>
                        <span className={`text-slate-400 text-xl leading-none transition-transform ${isAcik ? 'rotate-180 text-slate-800' : ''}`}>▼</span>
                    </button>
                    {isAcik && (
                        <div className="p-3 md:p-4 border-t border-slate-200 bg-slate-50 animate-fade-in-down">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-sm text-slate-700">
                              <div className="flex flex-col"><span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wider">Tarih & Saat</span><span className="font-bold text-slate-800 text-xs md:text-sm">{guvenliTarih(mac?.tarih)} - {guvenliSaat(mac?.saat)}</span></div>
                              <div className="flex flex-col"><span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wider">Saha</span><span className="font-bold text-slate-800 text-xs md:text-sm leading-tight">{mac?.saha || '-'}</span></div>
                              <div className="flex flex-col sm:mt-2 pt-2 sm:pt-3 border-t border-slate-200"><span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wider">Kategori / Lig</span><span className="font-bold text-slate-800 text-xs md:text-sm leading-tight">{mac?.kategori_adi || '-'} <span className="text-[9px] md:text-xs font-normal text-slate-500 block sm:inline mt-0.5 sm:mt-0 sm:ml-1">(Kod: {formatMacKodu(mac?.mac_kodu)})</span></span></div>
                              <div className="flex flex-col sm:mt-2 pt-2 sm:pt-3 border-t border-slate-200"><span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wider">Atanan Görev</span><span className="font-extrabold text-slate-700 text-xs md:text-sm">{gorevTuruBelirle(mac?.kategori_adi || '', mac?.mac_kodu || '')}</span></div>
                              <div className="flex flex-col sm:mt-2 pt-2 sm:pt-3 border-t border-slate-300 col-span-1 sm:col-span-2 bg-white p-3 rounded-lg border border-slate-300 shadow-sm"><span className="text-[9px] md:text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-wider">Müsabaka Saha Komiseri</span><span className="font-black text-slate-900 text-sm md:text-base">{komiserIsim}</span></div>
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

  // 🔥 EKRAN 5: SKOR VE SAHA RAPORU (BEYAZ EKRAN HATASI GİDERİLDİ) 🔥
  if (aktifEkran === 'skorRapor') {
    const tebellugEdilenMaclar = Array.isArray(gecerliAktifMaclar) ? gecerliAktifMaclar.filter(m => m?.tebellug_edildi === true) : [];

    return (
      <main className="min-h-screen bg-slate-100 flex flex-col font-sans">
        
        <datalist id="hakem-listesi">
            {hakemListesi?.map((hakem, i) => <option key={`hakem-${i}`} value={hakem || ''} />)}
        </datalist>
        <datalist id="gozlemci-listesi">
            {gozlemciListesi?.map((gozlemci, i) => <option key={`gozlemci-${i}`} value={gozlemci || ''} />)}
        </datalist>

        {renderOrtakHeader(true)}
        <div className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 overflow-y-auto">
          <div className="bg-white p-5 rounded-xl shadow-sm mb-6 border-b-4 border-slate-800 text-center border border-slate-200">
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
                
                const pDetay = parseDetay(mac.tff_rapor_detaylari); // 🔥 GÜVENLİ PARSE 🔥
                const detayliGonderilmis = pDetay?.detayli_kaydedildi === true;

                let borderClass = 'border-slate-200';
                if (!raporGonderilmis) { borderClass = 'border-slate-300 hover:border-slate-400'; } 
                else if (detayliGoster && !detayliGonderilmis) { borderClass = 'border-red-400'; } 
                else { borderClass = 'border-green-500'; }
                if (acikMi) borderClass = 'border-slate-800 shadow-lg';

                return (
                  <div key={mac.id || `skor-${idx}`} className={`bg-white rounded-xl shadow-sm border-2 transition-all ${borderClass}`}>
                    <button onClick={() => raporFormunuAc(mac)} className={`w-full text-left p-4 md:p-5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50 transition-colors ${raporGonderilmis && !acikMi ? 'bg-slate-50' : ''}`}>
                      <div className="w-full sm:w-auto pr-0 sm:pr-4">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="bg-slate-100 text-slate-800 border border-slate-300 text-[9px] md:text-[10px] px-2 py-0.5 rounded font-black tracking-wider uppercase">{formatMacKodu(mac?.mac_kodu)}</span>
                          <span className={`${detayliGoster ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-slate-700 bg-slate-100 border-slate-300'} border text-[10px] md:text-[11px] px-2 py-0.5 rounded font-black uppercase tracking-wider`}>{mac?.kategori_adi || 'LİG BELİRTİLMEMİŞ'}</span>
                          <span className="text-slate-500 text-[10px] md:text-xs font-bold uppercase">{gorevTuruBelirle(mac?.kategori_adi, mac?.mac_kodu)}</span>
                        </div>
                        
                        {/* AKTİF MAÇ KARTINDA DA "EV SAHİBİ ÜSTTE, MİSAFİR ALTTA" TASARIMI */}
                        <div className="flex flex-col gap-1 mb-1 mt-2">
                            <span className="font-black text-base md:text-xl text-slate-900 leading-snug uppercase truncate">{mac?.ev_sahibi || '-'}</span>
                            <span className="font-black text-base md:text-xl text-slate-900 leading-snug uppercase truncate">{mac?.misafir_takim || '-'}</span>
                        </div>
                        
                        <p className="text-slate-500 text-[10px] md:text-xs mt-2 font-medium">{mac?.saha || '-'} | <span className="font-bold text-slate-700">{guvenliTarih(mac?.tarih)} - {guvenliSaat(mac?.saat)}</span></p>
                      </div>
                      <div className="w-full sm:w-auto flex justify-end mt-2 sm:mt-0">
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col gap-2 items-end w-full sm:w-auto">
                                <span className={`px-3 py-2 rounded-md text-[10px] md:text-[11px] font-black shadow-sm flex items-center justify-center min-w-[160px] md:min-w-[180px] uppercase tracking-widest border ${raporGonderilmis ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-600 text-white border-red-700 animate-pulse'}`}>{raporGonderilmis ? '✓ SKOR GÖNDERİLDİ' : '❌ SKOR BEKLENİYOR'}</span>
                                {detayliGoster && (<span className={`px-3 py-2 rounded-md text-[10px] md:text-[11px] font-black shadow-sm flex items-center justify-center min-w-[160px] md:min-w-[180px] uppercase tracking-widest border ${detayliGonderilmis ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-red-50 text-red-800 border-red-300 animate-pulse'}`}>{detayliGonderilmis ? '✓ DETAYLI TAMAM' : '🚨 DETAYLI RAPOR YOK'}</span>)}
                            </div>
                            <div className={`hidden sm:flex items-center justify-center w-10 h-10 shrink-0 rounded-full border shadow-sm transition-colors ${acikMi ? 'bg-slate-800 border-slate-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-500'}`}><span className="text-lg font-black leading-none">{acikMi ? '▲' : '▼'}</span></div>
                        </div>
                      </div>
                    </button>

                    {acikMi && (
                      <div className="p-4 md:p-6 border-t-2 border-slate-100 bg-slate-50 rounded-b-xl animate-fade-in-down">
                        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 md:p-6 mb-6 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-400"></div>
                          <h4 className="font-black text-slate-700 border-b border-slate-100 pb-3 mb-5 text-sm md:text-base flex items-center gap-2 uppercase tracking-widest"><span className="text-xl">⚡</span> {detayliGoster ? '1. AŞAMA: HIZLI SKOR BİLDİRİMİ' : 'MÜSABAKA SKOR VE OLAY BİLDİRİMİ'}</h4>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-8">
                            <div>
                              <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 text-center">Maç Durumu</label>
                              <select value={macDurumu} onChange={(e:any) => setMacDurumu(e.target.value)} className="w-full p-3 md:p-4 border-2 border-slate-200 rounded-xl font-black text-sm md:text-base text-slate-700 bg-white text-center appearance-none cursor-pointer focus:border-slate-500 focus:outline-none transition-colors shadow-sm">
                                <option value="oynandi">Müsabaka Tamamlandı</option><option value="yarida_kaldi">Maç Yarıda Kaldı</option><option value="takimlar_cikmadi">Takım(lar) Sahaya Çıkmadı</option>
                              </select>
                              
                              {macDurumu === 'oynandi' && (
                                <div className="mt-5 bg-slate-50 p-4 border border-slate-200 rounded-xl flex items-center justify-between gap-3 w-full shadow-inner">
                                  <div className="flex-1 flex flex-col items-center justify-center min-w-0"><label className="block text-[10px] font-black text-slate-500 mb-2 w-full text-center truncate px-1 uppercase">{mac?.ev_sahibi || '-'}</label><select value={evSkor} onChange={e => setEvSkor(e.target.value)} className="w-20 h-14 text-center text-2xl font-black border-2 border-slate-300 rounded-xl focus:border-slate-500 cursor-pointer appearance-none bg-white shadow-sm"><option value="" disabled>-</option>{skorSecenekleri.map(s => <option key={`ev-${s}`} value={s}>{s}</option>)}</select></div>
                                  <span className="text-2xl font-black text-slate-300">-</span>
                                  <div className="flex-1 flex flex-col items-center justify-center min-w-0"><label className="block text-[10px] font-black text-slate-500 mb-2 w-full text-center truncate px-1 uppercase">{mac?.misafir_takim || '-'}</label><select value={misafirSkor} onChange={e => setMisafirSkor(e.target.value)} className="w-20 h-14 text-center text-2xl font-black border-2 border-slate-300 rounded-xl focus:border-slate-500 cursor-pointer appearance-none bg-white shadow-sm"><option value="" disabled>-</option>{skorSecenekleri.map(s => <option key={`misafir-${s}`} value={s}>{s}</option>)}</select></div>
                                </div>
                              )}
                              
                              {macDurumu === 'yarida_kaldi' && (
                                <div className="mt-5 bg-red-50 p-5 border border-red-200 rounded-xl text-center shadow-sm">
                                    <span className="text-4xl block mb-2">🛑</span>
                                    <p className="text-xs font-bold text-red-800 leading-relaxed">Maç yarıda kaldığı için skor kilitlenmiştir. <br/>Lütfen yarıda kalma sebebini ve (eğer varsa) o anki skoru aşağıdaki 'Sistem Notu' kısmına detaylıca yazınız.</p>
                                </div>
                              )}
                              
                              {macDurumu === 'takimlar_cikmadi' && (
                                <div className="mt-5 bg-amber-50 p-5 border border-amber-200 rounded-xl text-center shadow-sm">
                                    <span className="text-4xl block mb-2">🏟️</span>
                                    <p className="text-xs font-bold text-amber-800 leading-relaxed">Takımlar sahaya çıkmadığı için skor kilitlenmiştir. <br/>Lütfen Sistem Notu kısmına hangi takımın gelmediğini belirtiniz.</p>
                                </div>
                              )}
                            </div>
                            <div>
                              <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 text-center">Saha Olayları</label>
                              <div className="grid grid-cols-3 gap-2 mb-2">
                                <button onClick={() => setOlayDurumu('olaysiz')} className={`p-2 md:p-3 rounded-xl font-bold border-2 transition-all flex flex-col items-center justify-center min-h-[60px] ${olayDurumu === 'olaysiz' ? 'bg-green-50 border-green-400 text-green-900 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}><span className="text-[10px] md:text-sm text-center leading-none font-black uppercase">OLAYSIZ</span></button>
                                <button onClick={() => setOlayDurumu('teknik_olay')} className={`p-2 md:p-3 rounded-xl font-bold border-2 transition-all flex flex-col items-center justify-center min-h-[60px] ${olayDurumu === 'teknik_olay' ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}><span className="text-[10px] md:text-sm mb-1 leading-none text-center font-black uppercase">TEKNİK</span><span className="text-[8px] md:text-[9px] font-bold text-center opacity-80 leading-none">(İhraç, vb.)</span></button>
                                <button onClick={() => setOlayDurumu('emniyetlik_olay')} className={`p-2 md:p-3 rounded-xl font-bold border-2 transition-all flex flex-col items-center justify-center min-h-[60px] ${olayDurumu === 'emniyetlik_olay' ? 'bg-red-50 border-red-400 text-red-900 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}><span className="text-[10px] md:text-sm mb-1 leading-none text-center font-black uppercase">EMNİYET</span><span className="text-[8px] md:text-[9px] font-bold text-center opacity-80 leading-none">(Kavga vb.)</span></button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => { setOlayDurumu('hava_muhalefeti'); setMacDurumu('yarida_kaldi'); }} className={`p-3 rounded-xl font-bold border-2 transition-all text-[10px] md:text-xs flex items-center justify-center gap-1.5 min-h-[44px] uppercase tracking-wider ${olayDurumu === 'hava_muhalefeti' ? 'bg-slate-800 border-slate-900 text-white shadow-sm' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-300'}`}>☁️ Hava Muhalefeti</button>
                                <button onClick={() => { setOlayDurumu('saha_sorunu'); setMacDurumu('yarida_kaldi'); }} className={`p-3 rounded-xl font-bold border-2 transition-all text-[10px] md:text-xs flex items-center justify-center gap-1.5 min-h-[44px] uppercase tracking-wider ${olayDurumu === 'saha_sorunu' ? 'bg-slate-800 border-slate-900 text-white shadow-sm' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-300'}`}>🏟️ Tesis Sorunu</button>
                              </div>
                            </div>
                          </div>
                          <div className="mt-5 md:mt-6 border-t border-slate-100 pt-5">
                            <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Sistem Notu / Hızlı Rapor</label>
                            <textarea value={raporNotu} onChange={e => handleHizliNotChange(e.target.value)} className={`w-full p-4 border-2 rounded-xl font-serif text-[11px] md:text-sm min-h-[80px] md:min-h-[100px] shadow-inner transition-colors ${olayDurumu !== 'olaysiz' && raporNotu === '' ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-none'}`} placeholder={olayDurumu === 'olaysiz' && macDurumu === 'oynandi' ? "İzmir Şube Yönetimine iletmek istediğiniz not varsa buraya yazabilirsiniz..." : "Lütfen yaşanan olayın veya yarıda kalma sebebinin detayını (dakika ve skorla birlikte) yazınız..."}></textarea>
                          </div>
                          <button onClick={() => skorRaporunuGonder(mac.id, 'hizli')} disabled={skorKaydediliyor} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black py-4 rounded-xl shadow-sm transition-transform hover:scale-[1.01] text-xs md:text-sm uppercase tracking-widest mt-5 disabled:opacity-70 flex items-center justify-center gap-2">
                              {skorKaydediliyor ? '⚙️ GÖNDERİLİYOR...' : (raporGonderilmis ? (detayliGoster ? '💾 HIZLI SKORU GÜNCELLE' : '💾 SKORU GÜNCELLE') : (detayliGoster ? '🚀 HIZLI SKORU İLET' : '🚀 YÖNETİME İLET'))}
                          </button>
                        </div>

                        {detayliGoster && (
                          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 md:p-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-600"></div>
                            <h4 className="font-black text-slate-700 border-b border-slate-100 pb-3 mb-5 text-center text-sm md:text-base uppercase tracking-widest">DETAYLI MÜSABAKA RAPORU</h4>
                            <div className="mb-6 overflow-x-auto pb-4 custom-scrollbar">
                              {renderTffRaporu(mac, 'aktif')}
                            </div>

                            <div className="tff-no-print bg-slate-50 border border-slate-200 p-4 rounded-xl text-[10px] md:text-xs text-slate-600 mb-5 text-center font-medium shadow-inner">
                                💡 <b className="text-slate-800">Bilgilendirme Notu:</b> Yüklediğiniz fotoğraflar güvenlik sebebiyle veritabanına kaydedilmez. Resmi "PNG OLARAK İNDİR" butonuna basarak fotoğraflı kanıt dosyanızı anında cihazınıza indirebilir ve saklayabilirsiniz.
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mt-2">
                              <button onClick={() => tffTutanakIndir(mac, 'aktif')} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-black py-4 rounded-xl shadow-sm transition-colors text-xs md:text-sm flex items-center justify-center gap-2 uppercase tracking-widest">📸 FOTOĞRAF (PNG) İNDİR</button>
                              <button onClick={() => skorRaporunuGonder(mac.id, 'detayli')} disabled={skorKaydediliyor} className={`flex-1 text-white font-black py-4 rounded-xl shadow-sm transition-colors text-xs md:text-sm flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-70 ${detayliGonderilmis ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-700 hover:bg-slate-800 animate-pulse'}`}>
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

  // 🔥 EKRAN 6: MAZERET BİLDİRİMİ 🔥
  if (aktifEkran === 'mazeretBildir') {
    return (
      <main className="min-h-screen bg-slate-100 flex flex-col font-sans">
        {renderOrtakHeader(true)}
        
        {mazeretKaydedildi ? (
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="bg-emerald-50 border-2 border-emerald-500 text-emerald-800 p-8 md:p-10 rounded-2xl text-center shadow-xl animate-fade-in-up max-w-md w-full">
                    <span className="text-6xl md:text-7xl block mb-5 drop-shadow-md">✅</span>
                    <h3 className="text-xl md:text-2xl font-black uppercase tracking-widest mb-3 text-emerald-900">BAŞARILI!</h3>
                    <p className="font-bold text-sm md:text-base leading-relaxed">Müsaitlik / Mazeret bildiriminiz Türkiye Futbol Saha Komiserleri İzmir Şube Yönetimine başarıyla iletilmiştir.</p>
                    <div className="mt-6 flex justify-center">
                        <div className="w-8 h-8 border-4 border-emerald-300 border-t-emerald-700 rounded-full animate-spin"></div>
                    </div>
                    <p className="text-[10px] md:text-xs mt-3 text-emerald-600 font-bold uppercase tracking-widest">Ana Ekrana Yönlendiriliyorsunuz...</p>
                </div>
            </div>
        ) : (
            <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 overflow-y-auto">
               <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 border border-slate-200">
                  <div className="text-center md:text-left border-b border-slate-100 pb-4 mb-6">
                      <h2 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tight">Müsaitlik / Mazeret Bildirimi</h2>
                      <p className="text-sm md:text-base font-bold text-slate-500 mt-2">Önümüzdeki {globalAktifHaftaNo + 1}. Hafta için görev alma durumunuzu belirtiniz.</p>
                  </div>

                  <div className="space-y-4 mb-8">
                     <button onClick={() => { setMazeretTipi('yok'); setKompleYokum(true); }} className={`w-full p-5 md:p-6 rounded-xl border-2 font-black text-left uppercase tracking-wide transition-all ${mazeretTipi === 'yok' ? 'border-red-400 bg-red-50 text-red-800 shadow-sm' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}><span className="text-xl mr-2">⛔</span> Tüm Hafta Mazeretliyim (Görev İstemiyorum)</button>
                     <button onClick={() => { setMazeretTipi('full'); setKompleYokum(false); }} className={`w-full p-5 md:p-6 rounded-xl border-2 font-black text-left uppercase tracking-wide transition-all ${mazeretTipi === 'full' ? 'border-blue-400 bg-blue-50 text-blue-800 shadow-sm' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}><span className="text-xl mr-2">✅</span> Tüm Hafta Müsaitim (Merkez/Deplasman Uyar)</button>
                     <button onClick={() => { setMazeretTipi('secmeli'); setKompleYokum(false); }} className={`w-full p-5 md:p-6 rounded-xl border-2 font-black text-left uppercase tracking-wide transition-all ${mazeretTipi === 'secmeli' ? 'border-amber-400 bg-amber-50 text-amber-800 shadow-sm' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}><span className="text-xl mr-2">📅</span> Sadece Seçtiğim Günler ve Saatler Müsaitim</button>
                  </div>

                  {mazeretTipi === 'full' && (
                      <div className="bg-blue-50 p-6 rounded-xl mb-8 border border-blue-200 animate-fade-in-down shadow-sm">
                          <h4 className="font-black text-blue-900 mb-4 text-sm uppercase tracking-widest">Hangi bölgelerde görev alabilirsiniz?</h4>
                          <div className="flex gap-6">
                              <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={genelMerkez} onChange={(e) => setGenelMerkez(e.target.checked)} className="w-6 h-6 text-blue-600 rounded focus:ring-blue-500 cursor-pointer" /><span className="font-bold text-slate-800 text-base">Merkez</span></label>
                              <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={genelDeplasman} onChange={(e) => setGenelDeplasman(e.target.checked)} className="w-6 h-6 text-blue-600 rounded focus:ring-blue-500 cursor-pointer" /><span className="font-bold text-slate-800 text-base">Deplasman</span></label>
                          </div>
                      </div>
                  )}

                  {mazeretTipi === 'secmeli' && (
                      <div className="mb-8 animate-fade-in-down space-y-3">
                          <h4 className="font-black text-slate-700 mb-4 text-sm uppercase tracking-widest px-2">Müsait Olduğunuz Günleri Seçiniz</h4>
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
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Sistem Notu (Opsiyonel)</label>
                      <textarea value={mazeretNotu} onChange={(e) => setMazeretNotu(e.target.value)} className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none min-h-[120px] font-medium text-sm text-slate-700 bg-slate-50 transition-colors" placeholder="Varsa şube yönetimine iletmek istediğiniz özel bir not..."></textarea>
                  </div>

                  <button onClick={mazeretKaydet} disabled={mazeretKaydediliyor || (!mazeretTipi && !kompleYokum)} className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-50 disabled:hover:bg-slate-800 text-white font-black py-5 rounded-xl shadow-sm uppercase tracking-widest transition-transform hover:scale-[1.01] flex items-center justify-center gap-2">
                      {mazeretKaydediliyor ? '⚙️ İŞLENİYOR...' : '🚀 BİLDİRİMİ GÖNDER'}
                  </button>
               </div>
            </div>
        )}
      </main>
    )
  }

  // 🔥 EKRAN 7: GİRİŞ EKRANI (ŞİFRELİ SİSTEM) 🔥
  if (aktifEkran === 'giris') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
        
        {sifremiUnuttumAcik && (
            <div className="fixed inset-0 bg-black/80 z-[150] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in-up border border-slate-300 p-6 text-center">
                    <span className="text-5xl block mb-4">🔐</span>
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest mb-2">ŞİFRENİZİ Mİ UNUTTUNUZ?</h2>
                    <p className="text-sm font-bold text-slate-500 mb-6 leading-relaxed">Hesabınızın güvenliği nedeniyle şifre sıfırlama işlemleri sadece sistem yöneticisi tarafından yapılmaktadır. Lütfen Yönetim ile iletişime geçiniz.</p>
                    
                    {/* 🔥 SELÇUK HOCANIN NUMARASINI BURAYA YAZ (905 ile başlasın boşluk olmasın) 🔥 */}
                    <a href={`https://wa.me/905425452081?text=Selçuk%20hocam%20merhaba,%20saha%20komiseri%20sistemi%20şifremi%20unuttum.%20Sıfırlar%20mısınız?`} target="_blank" className="w-full bg-[#25D366] hover:bg-[#1ebc59] text-white font-black py-3 rounded-lg shadow transition-colors flex items-center justify-center gap-2 mb-3">
                        💬 WHATSAPP'TAN YAZ
                    </a>
                    
                    <button onClick={() => setSifremiUnuttumAcik(false)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-lg transition-colors text-sm">Giriş Ekranına Dön</button>
                </div>
            </div>
        )}

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
          <form onSubmit={girisYap} className="space-y-4">
            <div>
              <input type="text" placeholder="Sicil Numaranız" value={kullaniciIdInput} onChange={(e) => setKullaniciIdInput(e.target.value)} onKeyDown={enterTusuKontrol} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3.5 text-center text-slate-800 font-black tracking-[0.2em] text-lg focus:outline-none focus:border-red-500 focus:bg-white transition-all shadow-inner" required />
            </div>
            <div>
              <input type="password" placeholder="4 Haneli Şifreniz" value={sifreInput} onChange={(e) => setSifreInput(e.target.value)} onKeyDown={enterTusuKontrol} maxLength={4} inputMode="numeric" pattern="\d{4}" className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3.5 text-center text-slate-800 font-black tracking-[0.5em] text-lg focus:outline-none focus:border-red-500 focus:bg-white transition-all shadow-inner" required />
            </div>
            {girisHatasi && <p className="text-red-500 text-xs font-bold text-center bg-red-50 p-2 rounded-lg border border-red-100">{girisHatasi}</p>}
            <button type="submit" disabled={girisYukleniyor} className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-[0_8px_20px_rgba(220,38,38,0.3)] transition-all disabled:opacity-50 hover:-translate-y-0.5 mt-2">
              {girisYukleniyor ? 'GİRİŞ YAPILIYOR...' : 'SİSTEME GİRİŞ YAP'}
            </button>
            <div className="pt-2">
                <button type="button" onClick={() => setSifremiUnuttumAcik(true)} className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors underline decoration-dotted">Şifremi Unuttum</button>
            </div>
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