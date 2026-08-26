"use client"
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toPng } from 'html-to-image'

// --- LOGO LİNKLERİ ---
const AMATOR_MERKEZ_LOGO = "https://upload.wikimedia.org/wikipedia/tr/0/0a/TFF_logo.png?utm_source=tr.wikipedia.org&utm_campaign=index&utm_content=original";
const GELISIM_SOL_LOGO = "https://upload.wikimedia.org/wikipedia/tr/0/0a/TFF_logo.png?utm_source=tr.wikipedia.org&utm_campaign=index&utm_content=original";
const GELISIM_SAG_LOGO = "https://upload.wikimedia.org/wikipedia/tr/0/0a/TFF_logo.png?utm_source=tr.wikipedia.org&utm_campaign=index&utm_content=original"; 

// --- AKILLI ARAMA İÇİN HAKEM LİSTESİ ---
const HAKEM_LISTESI = [
    "ABDULLAH MURAT TOK", "ALİ CAN ALP", "ARDA SÜZEN", "AYBERK DEMİRBAŞ", "AYKUT SERGİN", 
    "BATU ARIBAKIR", "BAŞAR KALBİNUR", "BERK ALTAN", "BERKAY ERDEMİR", "BERKAY TÜRKEKUL", 
    "BERSAN DURAN", "CEM KUŞCU", "DAMLA TARKAN", "DAVUT DAKUL ÇELİK", "DENİZCAN ŞAHİN", 
    "DİRENÇ TONUSLUOĞLU", "EGEMEN SAVRAN", "EMRE BUZAK", "EMRE GÜZEL", "ERDEM DEMİRTAŞ", 
    "ERDEM TEMEL", "ESRA TOPLU", "FATMA ÖZLEM TURSUN", "FATİH TOKAİL", "FUAT FİLİZ", 
    "FURKAN BORA ALTINTAŞ", "GÖKMEN BALTACI", "GÖNÜL KARASAKAL", "GÖRKEM BAĞADUR", 
    "GÜNER MUMCU TAŞTAN", "GÜRKAN ÖZBALKANLI", "HACI MAHMUT YILDIRIM", "HAKAN YÜNCÜ", 
    "HALİL ALP DAĞDELEN", "HALİL UMUT MELER", "HARUN DAYAN", "HASAN HÜSEYİN YAZICILAR", 
    "HÜSEYİN AYLAK", "HÜSEYİN KIVANÇ DURMAZ", "HÜSNÜ EMRE ÇELİMLİ", "İSMAİL ÇETİN", 
    "KAAN KAYA", "KEREM SİNEM", "LEVENT BALCI", "MAHMUT CAN GÖÇLÜ", "MEHMET ÇAĞATAY LAKOT", 
    "MELİH KURTULUŞ", "MERT TOSUN", "MEVLÜT BOZOK", "MUHAMMED FURKAN SAĞLAM", "MUHAMMET ALİ DOĞAN", 
    "MUHAMMET ALPEREN ÇOPUR", "MUHAMMET DAĞ", "MUHAMMET FURKAN KARA", "MURAT CAN YOUMER", 
    "MUSTAFA ÇATAL", "NURİ TOKMAK", "OĞUZ GÖZETENLER", "OĞUZHAN HAMİTOĞLU", "ORHUN ÖTÜ", 
    "REBER KARADAŞ", "REFİK ERİM", "REZİDA GÜL EMİROĞLU", "REŞAT ONUR COŞKUNSES", "SERGEN ÖZGİRİ", 
    "SEZGİN ÇINAR", "SONER ACAR", "ŞEVKET TEKER", "UĞURCAN FİLİBE", "UMUT TOKMAK", "YİĞİT ARSLAN", 
    "YİĞİT YEKSİN", "YUSUF ÖKMEN"
];

type EkranTuru = 'giris' | 'dashboard' | 'gorevKartlari' | 'skorRapor' | 'mazeretBildir' | 'bultenArama' | 'istatistiklerim';

const raporTurunuBelirle = (kategori: any) => {
    if (!kategori) return 'amator';
    const kat = String(kategori).toLocaleUpperCase('tr-TR');
    if (kat.includes('GELİŞİM') || kat.includes('AKADEMİ') || kat.includes('ELİT')) return 'gelisim';
    if (kat.includes('PROF') || kat.includes('NESİNE') || kat.includes('KADIN') || kat.includes('BÖLGESEL') || kat.includes('BAL') || kat.includes('3. LİG') || kat.includes('2. LİG')) return 'yok';
    return 'amator';
}

const detayliRaporGosterilirMi = (kategori: any) => {
  if (!kategori) return true;
  const kat = String(kategori).toLocaleUpperCase('tr-TR');
  if (kat.includes('GELİŞİM') || kat.includes('TFF') || kat.includes('PROF') || kat.includes('KADIN') || kat.includes('ELİT') || kat.includes('AKADEMİ') || kat.includes('BÖLGESEL') || kat.includes('BAL')) return false; 
  return true; 
}

const formatKategori = (rawKategori: any) => {
    if (!rawKategori) return 'BELİRTİLMEMİŞ LİG';
    let kat = String(rawKategori).toLocaleUpperCase('tr-TR').trim();
    if (kat.includes('GELİŞİM')) return kat.match(/U\s*(\d{2})/) ? `TFF U${kat.match(/U\s*(\d{2})/)?.[1]} GELİŞİM LİGİ` : 'TFF GELİŞİM LİGİ';
    if (kat.includes('SÜPER AMATÖR')) return 'SÜPER AMATÖR LİG';
    if (kat.includes('1.') && kat.includes('AMATÖR')) return '1. AMATÖR LİG';
    if (kat.match(/U\s*(\d{2})/) && !kat.includes('PROF') && !kat.includes('KADIN') && !kat.includes('ELİT')) return `İZMİR U${kat.match(/U\s*(\d{2})/)?.[1]} LİGİ`;
    return kat;
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

export default function Home() {
  const [aktifEkran, setAktifEkran] = useState<EkranTuru>('giris')
  const [kullaniciIdInput, setKullaniciIdInput] = useState('')
  const [girisHatasi, setGirisHatasi] = useState<string | null>(null)
  const [girisYukleniyor, setGirisYukleniyor] = useState(false)
  const [seciliKomiser, setSeciliKomiser] = useState<any | null>(null)
  const [komiserMaclari, setKomiserMaclari] = useState<any[]>([])
  const [tumAktifMaclar, setTumAktifMaclar] = useState<any[]>([])
  const [tumKomiserler, setTumKomiserler] = useState<any[]>([])
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
    hakem: '', y_hakem_1: '', y_hakem_2: '', hakem_4: '', gozlemci: '', saglik: '', guvenlik: '',
    guvenlik_amiri: '', guvenlik_telefon: '', saglik_adi: '',
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
    const temizId = kullaniciIdInput.replace(/\s+/g, '')
    if (!temizId) { setGirisHatasi("Lütfen ID numaranızı girin."); setGirisYukleniyor(false); return; }

    try {
      const { data, error } = await supabase.from('komiserler').select('*').eq('komiser_id', temizId).single()
      if (error || !data) { setGirisHatasi("Bu ID numarasına ait saha komiseri bulunamadı."); setGirisYukleniyor(false); return; }
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
    const kat = String(kategori || "").toUpperCase()
    const kod = String(macKodu || "").toUpperCase()
    if (kod.includes('DENETÇİ') || kat.includes('BAL') || kat.includes('BÖLGESEL')) return "BAL Ligi Denetçisi"
    if (kod.includes('STAJ')) return "Stajyer / Saha Komiseri"
    if (kat.includes('PROF') || kat.includes('NESİNE') || kat.includes('3. LİG') || kat.includes('2. LİG')) return "Saha Komiseri"
    if (kat.includes('GELİŞİM') || kat.includes('AKADEMİ') || kat.includes('ELİT')) {
        if (kat.includes('U17') || kat.includes('U19') || kat.includes('PAF')) return "Gelişim Denetçi"
        if (kat.includes('U13') || kat.includes('U14') || kat.includes('U15') || kat.includes('U16') || kat.includes('14') || kat.includes('15')) return "Gelişim Denetçi / Saha Komiseri"
        return "Gelişim Denetçi / Saha Komiseri"
    }
    return "Saha Komiseri"
  }

  const renderOrjinalGorevKarti = (mac: any) => {
    if (!mac) return null;
    return (
      <div className="bg-white border-l-4 border-blue-800 shadow-md rounded-r-xl p-3 md:p-4 mb-3">
        <div className="flex justify-between items-start mb-2 border-b border-slate-100 pb-2">
          <span className="font-bold text-blue-950 text-base md:text-xl leading-tight">{mac.ev_sahibi || '-'} <span className="text-slate-400 font-medium mx-1 text-sm md:text-base">vs</span> {mac.misafir_takim || '-'}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-sm text-slate-700 mt-2 bg-slate-50 p-2 md:p-3 rounded-lg border border-slate-100">
          <div className="flex flex-col"><span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wider">Tarih & Saat</span><span className="font-bold text-slate-800 text-xs md:text-sm">{guvenliTarih(mac.tarih)} - {guvenliSaat(mac.saat)}</span></div>
          <div className="flex flex-col"><span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wider">Saha</span><span className="font-bold text-slate-800 text-xs md:text-sm leading-tight">{mac.saha || '-'}</span></div>
          <div className="flex flex-col sm:mt-2 pt-2 sm:pt-3 border-t border-slate-200"><span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wider">Kategori / Lig</span><span className="font-bold text-slate-800 text-xs md:text-sm leading-tight">{mac.kategori_adi || '-'} <span className="text-[9px] md:text-xs font-normal text-slate-500 block sm:inline mt-0.5 sm:mt-0 sm:ml-1">(Kod: {mac.mac_kodu || '-'})</span></span></div>
          <div className="flex flex-col sm:mt-2 pt-2 sm:pt-3 border-t border-slate-200"><span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wider">Atanan Görev</span><span className="font-extrabold text-blue-700 text-xs md:text-sm">{gorevTuruBelirle(mac.kategori_adi, mac.mac_kodu)}</span></div>
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
        setEvSkor(mac.ev_sahibi_skor !== null ? mac.ev_sahibi_skor.toString() : '');
        setMisafirSkor(mac.misafir_skor !== null ? mac.misafir_skor.toString() : '');
        setMacDurumu(mac.mac_durumu || 'oynandi'); setOlayDurumu(mac.olay_durumu || 'olaysiz'); setRaporNotu(mac.rapor_notu || '');
        if (mac.tff_rapor_detaylari) { 
            const birlesikDetay = { ...defaultRaporDetay, ...mac.tff_rapor_detaylari };
            if (!birlesikDetay.gelisim_sorular) birlesikDetay.gelisim_sorular = defaultRaporDetay.gelisim_sorular;
            if (!birlesikDetay.ek_raporlar) birlesikDetay.ek_raporlar = [];
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
          ek_raporlar: [...(prev.ek_raporlar || []), { id: Date.now(), text: '' }]
      }));
  }
  
  const ekRaporSil = (id: number) => {
      setRaporDetay((prev:any) => ({
          ...prev, 
          ek_raporlar: (prev.ek_raporlar || []).filter((r:any) => r.id !== id)
      }));
      const yeniFotolar = {...ekRaporFotolar};
      delete yeniFotolar[id];
      setEkRaporFotolar(yeniFotolar);
  }
  
  const ekRaporGuncelle = (id: number, text: string) => {
      setRaporDetay((prev:any) => ({
          ...prev, 
          ek_raporlar: (prev.ek_raporlar || []).map((r:any) => r.id === id ? { ...r, text } : r)
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

  const tffTutanakIndir = async (mac: any) => {
    const element = document.getElementById(`tff-form-${mac.id}`);
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
      } catch (err) { alert("Resmi Tutanak indirilirken cihazınızdan kaynaklı bir sorun oluştu. Lütfen ekran görüntüsü alınız."); }
    }
  }

  const skorRaporunuGonder = async (macId: number, kayitTuru: 'hizli' | 'detayli') => {
    if (macDurumu === 'oynandi' && (evSkor === '' || misafirSkor === '')) { alert("⚠️ Lütfen maçın skorunu giriniz."); return; }
    if ((olayDurumu === 'teknik_olay' || olayDurumu === 'emniyetlik_olay') && raporNotu.trim() === '') { alert("⚠️ Olaylı bir maç bildirdiniz. Lütfen 'Görev Raporu / Hızlı Not' kısmına detayı yazınız."); return; }
    if (kayitTuru === 'detayli') {
        if (!raporDetay.hakem || raporDetay.hakem.trim() === '') { alert("⚠️ Detaylı Raporu iletmek için lütfen en azından Orta Hakem bilgisini giriniz!"); return; }
    }

    setSkorKaydediliyor(true);
    let kaydedilecekDetay = { ...raporDetay };
    if (kayitTuru === 'detayli') { kaydedilecekDetay.detayli_kaydedildi = true; } 
    else { kaydedilecekDetay.detayli_kaydedildi = raporDetay.detayli_kaydedildi || false; }

    const guncellenecekVeri = {
      ev_sahibi_skor: (macDurumu === 'takimlar_cikmadi' || evSkor === '') ? null : Number(evSkor),
      misafir_skor: (macDurumu === 'takimlar_cikmadi' || misafirSkor === '') ? null : Number(misafirSkor),
      mac_durumu: macDurumu, olay_durumu: olayDurumu, rapor_notu: raporNotu, skor_girildi: true, tff_rapor_detaylari: kaydedilecekDetay
    };

    try {
      const { error } = await supabase.from('musabakalar').update(guncellenecekVeri).eq('id', macId);
      if (!error) {
        setKomiserMaclari(prev => prev.map(m => m.id === macId ? { ...m, ...guncellenecekVeri } : m));
        alert(kayitTuru === 'detayli' ? "✅ TFF Detaylı Resmi Tutanağı Karargaha başarıyla iletildi!" : "✅ Hızlı Skor Bildirimi Karargaha iletildi!");
      } else { alert("Hata oluştu: " + error.message); }
    } catch (err) { alert("Bağlantı hatası!"); } 
    finally { setSkorKaydediliyor(false); }
  }

  const skorSecenekleri = Array.from({ length: 31 }, (_, i) => i.toString());
  const haftaToggle = (haftaNo: number) => { setAcikHaftalar(prev => prev.includes(haftaNo) ? prev.filter(h => h !== haftaNo) : [...prev, haftaNo]) }

  const OrtakHeader = ({ geriButonuGoster = false }: { geriButonuGoster?: boolean }) => (
    <header className="bg-blue-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-bold text-sm md:text-base leading-tight">İzmir Futbol Saha</h1>
            <h1 className="font-bold text-sm md:text-base leading-tight text-blue-200">Komiserleri Derneği</h1>
            <p className="text-blue-300 text-[10px] mt-0.5 font-mono">{globalAktifHaftaNo}. Program Haftası {haftaTarihAraligi ? `(${haftaTarihAraligi})` : ''}</p>
          </div>
        </div>
        {geriButonuGoster ? (
          <button onClick={() => { setAktifEkran('dashboard'); setArsivAcik(false); setAcikHaftalar([]); skorFormunuSifirla(); setAramaKomiser(''); setAramaSaha(''); setAramaTakim(''); }} className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs md:text-sm font-bold py-1.5 px-3 rounded-lg shadow transition-colors border border-blue-500">Geri</button>
        ) : (
          <button onClick={cikisYap} className="bg-red-600 hover:bg-red-700 text-white text-xs md:text-sm font-bold py-1.5 px-3 rounded shadow transition-colors">Çıkış</button>
        )}
      </div>
    </header>
  )

  const GelisimCheckbox = ({ etiket, deger, onDegisim }: { etiket: string, deger: any, onDegisim: any }) => (
      <div className="flex justify-between items-center border-b border-dashed border-slate-300 py-1">
          <span className="text-[10px] w-3/4">{etiket}</span>
          <div className="flex gap-4 w-1/4 justify-end pr-2">
              <label className="flex items-center gap-1 cursor-pointer text-[10px]">
                  Evet <div className={`w-4 h-4 border border-black flex items-center justify-center text-xs font-bold bg-white ${deger === 'evet' ? 'bg-slate-200' : ''}`}>{deger === 'evet' ? 'X' : ''}</div>
                  <input type="radio" className="hidden" checked={deger === 'evet'} onChange={() => onDegisim('evet')} />
              </label>
              <label className="flex items-center gap-1 cursor-pointer text-[10px]">
                  Hayır <div className={`w-4 h-4 border border-black flex items-center justify-center text-xs font-bold bg-white ${deger === 'hayir' ? 'bg-slate-200' : ''}`}>{deger === 'hayir' ? 'X' : ''}</div>
                  <input type="radio" className="hidden" checked={deger === 'hayir'} onChange={() => onDegisim('hayir')} />
              </label>
          </div>
      </div>
  );

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

  if (aktifEkran === 'dashboard') {
    return (
      <main className="min-h-screen bg-slate-200 flex flex-col font-sans">
        <OrtakHeader />
        <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 flex flex-col md:flex-row items-center gap-6 border-t-4 border-blue-900">
            <div className="text-center md:text-left flex-1">
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">{seciliKomiser?.ad_soyad || 'Komiser'}</h2>
              <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-2">
                <span className="bg-blue-100 text-blue-800 font-mono text-xs font-bold px-3 py-1 rounded-full border border-blue-200">ID: {seciliKomiser?.komiser_id || '-'}</span>
                <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full border border-green-200">Bu Sezon: {Array.isArray(komiserMaclari) ? komiserMaclari.length : 0} Görev</span>
              </div>
              
              <div className="mt-4 space-y-2 animate-fade-in-down">
                {tebellugBekleyenSayisi > 0 ? (
                  <div className="bg-purple-100 border border-purple-500 text-purple-900 px-4 py-3 rounded-lg flex flex-col sm:flex-row items-center justify-between shadow-sm animate-pulse gap-3">
                    <span className="font-bold text-xs md:text-sm flex items-center gap-2"><span className="text-lg">🚨</span> Yeni Atanan {tebellugBekleyenSayisi} Göreviniz Var!</span>
                    <button onClick={() => setAktifEkran('gorevKartlari')} className="w-full sm:w-auto text-[10px] md:text-xs bg-purple-700 hover:bg-purple-800 text-white font-bold py-2 px-4 rounded shadow">ÖNCE TEBELLÜĞ ET</button>
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
                       <div className="bg-emerald-100 border border-emerald-500 text-emerald-900 px-4 py-3 rounded-lg flex items-start shadow-sm animate-fade-in-up">
                          <span className="text-2xl md:text-3xl mr-3 mt-1">✅</span>
                          <div>
                              <h4 className="font-black text-sm md:text-base uppercase tracking-wider">{globalAktifHaftaNo}. Hafta Görevleri Tamamlandı</h4>
                              <p className="text-[10px] md:text-xs font-medium mt-0.5 text-emerald-800">Tarafınıza tevdi edilen tüm müsabakaları tebellüğ ettiniz ve raporlamalarını eksiksiz tamamladınız. Operasyon merkezimiz adına teşekkür ederiz.</p>
                          </div>
                       </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <button onClick={() => setAktifEkran('gorevKartlari')} className="flex flex-col items-center justify-center p-6 rounded-2xl shadow-md bg-white border-2 border-blue-200 hover:border-blue-500 hover:shadow-blue-200 transition-all transform hover:scale-105">
                <h4 className="font-bold text-lg text-slate-800">Görev Kartım</h4>
                <p className="text-xs text-center mt-2 text-slate-500">Atanan maçlarınızı görün ve görevi tebellüğ edin.</p>
                {tebellugBekleyenSayisi > 0 && <span className="mt-3 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-bounce">{tebellugBekleyenSayisi} YENİ GÖREV</span>}
            </button>
            <button onClick={() => setAktifEkran('skorRapor')} className="flex flex-col items-center justify-center p-6 rounded-2xl shadow-md bg-white border-2 border-green-200 hover:border-green-500 hover:shadow-green-200 transition-all transform hover:scale-105"><h4 className="font-bold text-lg text-slate-800 text-center">Skor & Saha Raporu</h4><p className="text-xs text-center mt-2 text-slate-500">Hızlı skoru bildirin ve detaylı müsabaka raporu oluşturun.</p></button>
          </div>
          <button onClick={() => setAktifEkran('bultenArama')} className="w-full mb-4 flex items-center justify-between p-4 md:p-6 rounded-2xl shadow-md bg-slate-800 border-2 border-slate-700 hover:border-slate-500 hover:bg-slate-900 transition-all transform hover:scale-105">
            <div className="text-left">
              <h4 className="font-bold text-lg text-white">🔍 Haftalık Bülten & Görev Arama</h4>
              <p className="text-xs mt-1 text-slate-400">Saha, takım veya komiser ismine göre İzmir'deki tüm güncel görevleri sorgulayın.</p>
            </div>
          </button>
          <button onClick={() => setAktifEkran('istatistiklerim')} className="w-full mb-4 flex items-center justify-between p-4 md:p-6 rounded-2xl shadow-md bg-indigo-800 border-2 border-indigo-700 hover:border-indigo-500 hover:bg-indigo-900 transition-all transform hover:scale-105">
            <div className="text-left">
              <h4 className="font-bold text-lg text-white">📊 Sezonluk İstatistiklerim</h4>
              <p className="text-xs mt-1 text-indigo-200">Görev aldığınız liglerin ve sahaların detaylı istihbarat dökümü.</p>
            </div>
          </button>
          {mazeretAcik ? (
            <button onClick={() => setAktifEkran('mazeretBildir')} className="w-full flex items-center justify-between p-4 md:p-6 rounded-2xl shadow-md bg-white border-2 border-red-200 hover:border-red-500 transition-all transform hover:scale-105">
              <div className="text-left"><h4 className="font-bold text-lg text-slate-800">Müsaitlik / Mazeret Bildir</h4></div>
            </button>
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
                <h4 className="text-lg font-bold text-blue-900 tracking-wide uppercase">{seciliKomiser?.ad_soyad || '-'}</h4>
                <p className="text-red-600 font-semibold mt-1">{globalAktifHaftaNo}. Hafta Görev Bülteni</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={tebellugKaydet} disabled={hepsiTebellugEdilmis || tebellugYukleniyor || gecerliAktifMaclar.length === 0} className={`text-sm font-bold py-2 px-4 rounded-lg shadow flex items-center gap-2 transition-colors ${hepsiTebellugEdilmis ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300' : gecerliAktifMaclar.length > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
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
                      <span className="text-sm md:text-base">Geçmiş Maç Arşivi</span><span className="text-xl">{arsivAcik ? '▲' : '▼'}</span>
                    </button>
                    {arsivAcik && (
                      <div className="mt-4 space-y-4">
                        {Object.keys(gecmisHaftalar).map(Number).sort((a, b) => b - a).map(haftaNo => (
                          <div key={`hafta-${haftaNo}`} className="border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                            <button onClick={() => haftaToggle(haftaNo)} className="w-full bg-slate-300 text-slate-900 font-bold py-3 px-5 flex justify-between items-center text-xs md:text-sm">
                              <span>{haftaNo}. Hafta Görevleri <span className="bg-slate-800 text-white text-[10px] md:text-xs px-2 py-1 rounded ml-2">{(gecmisHaftalar[haftaNo] || []).length} Görev</span></span>
                              <span>{acikHaftalar.includes(haftaNo) ? '▲' : '▼'}</span>
                            </button>
                            {acikHaftalar.includes(haftaNo) && (
                              <div className="p-2 md:p-4 bg-slate-100 space-y-4">
                                {(gecmisHaftalar[haftaNo] || []).map((mac: any, idx: number) => (
                                  <div key={mac.id || `gecmis-${idx}`} className="opacity-95">
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
      </main>
    )
  }

  if (aktifEkran === 'istatistiklerim') {
    let amatorCount = 0; let profCount = 0;
    const amatorKategoriler: Record<string, number> = {};
    const profKategoriler: Record<string, number> = {};
    const sahalar: Record<string, number> = {};

    const maclar = Array.isArray(komiserMaclari) ? komiserMaclari : [];
    maclar.forEach(mac => {
        if (!mac) return;
        const isProf = !detayliRaporGosterilirMi(mac.kategori_adi);
        const katAdi = formatKategori(mac.kategori_adi);
        const sahaAdi = mac.saha || 'BELİRTİLMEMİŞ SAHA';
        if (isProf) { profCount++; profKategoriler[katAdi] = (profKategoriler[katAdi] || 0) + 1; } 
        else { amatorCount++; amatorKategoriler[katAdi] = (amatorKategoriler[katAdi] || 0) + 1; }
        sahalar[sahaAdi] = (sahalar[sahaAdi] || 0) + 1;
    });

    const siraliAmatorler = Object.entries(amatorKategoriler).sort((a,b) => b[1] - a[1]);
    const siraliProflar = Object.entries(profKategoriler).sort((a,b) => b[1] - a[1]);
    const siraliSahalar = Object.entries(sahalar).sort((a,b) => b[1] - a[1]);

    return (
      <main className="min-h-screen bg-slate-200 flex flex-col font-sans">
        <OrtakHeader geriButonuGoster={true} />
        <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 overflow-y-auto">
            <div className="bg-white rounded-xl p-4 md:p-6 border-t-4 border-indigo-600 shadow-lg">
                <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-200 pb-4 mb-6 gap-4">
                    <div className="text-center md:text-left">
                        <h3 className="text-2xl font-black text-slate-800">{seciliKomiser?.ad_soyad || 'Komiser'}</h3>
                        <span className="text-indigo-600 text-xs font-mono font-bold tracking-widest">SİCİL DOSYASI</span>
                    </div>
                    <div className="bg-indigo-100 px-6 py-2 rounded-lg shadow-sm border border-indigo-200 min-w-[150px]">
                        <div className="text-[10px] text-indigo-800 font-bold uppercase tracking-wider text-center">Toplam Sezon Görevi</div>
                        <div className="text-3xl font-black text-indigo-900 text-center">{maclar.length}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 relative overflow-hidden shadow-sm">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                        <h4 className="text-blue-800 font-bold text-sm tracking-wider uppercase mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
                            <span>🛡️ Amatör Ligler</span>
                            <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs">{amatorCount} Maç</span>
                        </h4>
                        <ul className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                            {siraliAmatorler.length === 0 && <li className="text-xs text-slate-400 italic">Görev kaydı yok.</li>}
                            {siraliAmatorler.map(([kat, count]) => (
                                <li key={kat} className="flex justify-between items-center bg-white p-2 rounded text-xs border border-slate-100 shadow-sm"><span className="text-slate-600 font-bold">{kat}</span><span className="font-black text-blue-600">{count}</span></li>
                            ))}
                        </ul>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 relative overflow-hidden shadow-sm">
                        <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                        <h4 className="text-purple-800 font-bold text-sm tracking-wider uppercase mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
                            <span>🏆 Profesyonel / Gelişim</span>
                            <span className="bg-purple-600 text-white px-2 py-0.5 rounded text-xs">{profCount} Maç</span>
                        </h4>
                        <ul className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                            {siraliProflar.length === 0 && <li className="text-xs text-slate-400 italic">Görev kaydı yok.</li>}
                            {siraliProflar.map(([kat, count]) => (
                                <li key={kat} className="flex justify-between items-center bg-white p-2 rounded text-xs border border-slate-100 shadow-sm"><span className="text-slate-600 font-bold">{kat}</span><span className="font-black text-purple-600">{count}</span></li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                    <h4 className="text-emerald-800 font-bold text-sm tracking-wider uppercase mb-3 flex items-center gap-2 border-b border-slate-200 pb-2"><span className="text-lg">🏟️</span> GÖREV YAPTIĞINIZ SAHALAR</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                        {siraliSahalar.length === 0 && <span className="text-xs text-slate-400 italic">Görev kaydı yok.</span>}
                        {siraliSahalar.map(([saha, count]) => (
                            <div key={saha} className="flex justify-between items-center bg-white p-2.5 rounded border border-slate-100 shadow-sm"><span className="text-slate-700 text-[11px] font-bold truncate pr-2" title={saha}>{saha}</span><span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-1 rounded font-black shrink-0">{count} Kez</span></div>
                        ))}
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
        const isim = (Array.isArray(tumKomiserler) ? tumKomiserler : []).find(k => k.komiser_id === mac.komiser_id)?.ad_soyad || "";
        return isim.toLocaleLowerCase('tr-TR').includes(q);
      });
    }
    if (aramaSaha.trim() !== '') {
      const q = aramaSaha.toLocaleLowerCase('tr-TR');
      filtrelenmisMaclar = filtrelenmisMaclar.filter(mac => (mac.saha || '').toLocaleLowerCase('tr-TR').includes(q));
    }
    if (aramaTakim.trim() !== '') {
      const q = aramaTakim.toLocaleLowerCase('tr-TR');
      filtrelenmisMaclar = filtrelenmisMaclar.filter(mac => 
        (mac.ev_sahibi || '').toLocaleLowerCase('tr-TR').includes(q) || 
        (mac.misafir_takim || '').toLocaleLowerCase('tr-TR').includes(q) ||
        (mac.kategori_adi || '').toLocaleLowerCase('tr-TR').includes(q)
      );
    }
    const siraliKomiserler = Array.isArray(tumKomiserler) ? [...tumKomiserler].sort((a, b) => (a.ad_soyad || '').localeCompare(b.ad_soyad || '', 'tr-TR')) : [];
    const siraliSahalar = Array.from(new Set(guvenliTumMaclar.map(m => m.saha).filter(Boolean))).sort((a, b) => (a as string).localeCompare(b as string, 'tr-TR'));
    const siraliTakimlar = Array.from(new Set([...guvenliTumMaclar.map(m => m.ev_sahibi), ...guvenliTumMaclar.map(m => m.misafir_takim)].filter(Boolean))).sort((a, b) => (a as string).localeCompare(b as string, 'tr-TR'));

    return (
      <main className="min-h-screen bg-slate-200 flex flex-col font-sans">
        <OrtakHeader geriButonuGoster={true} />
        <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 overflow-y-auto">
          <div className="bg-slate-800 rounded-xl shadow-lg mb-6 border-b-4 border-blue-500 overflow-hidden">
            <button onClick={() => setAramaTuruAcik(!aramaTuruAcik)} className="w-full p-4 flex justify-between items-center hover:bg-slate-700 transition-colors">
              <h4 className="text-lg md:text-xl font-black text-white tracking-wide uppercase flex items-center gap-2">🔍 Saha ve Görev İstihbaratı</h4><span className="text-white text-xl">{aramaTuruAcik ? '▲' : '▼'}</span>
            </button>
            {aramaTuruAcik && (
              <div className="p-4 md:p-6 bg-slate-900 border-t border-slate-700 space-y-4 animate-fade-in-down">
                <div><label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Saha Komiseri Adı</label><input list="komiser-listesi" type="text" placeholder="Komiser arayın..." value={aramaKomiser} onChange={(e) => setAramaKomiser(e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-sm" /><datalist id="komiser-listesi">{siraliKomiserler.map((k, i) => <option key={`kom-${i}`} value={k.ad_soyad || ''} />)}</datalist></div>
                <div><label className="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Saha Adı</label><input list="saha-listesi" type="text" placeholder="Saha arayın..." value={aramaSaha} onChange={(e) => setAramaSaha(e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-amber-500 transition-colors text-sm" /><datalist id="saha-listesi">{siraliSahalar.map((saha, i) => <option key={`sah-${i}`} value={saha as string} />)}</datalist></div>
                <div><label className="block text-xs font-bold text-green-400 uppercase tracking-wider mb-2">Takım veya Lig Adı</label><input list="takim-listesi" type="text" placeholder="Takım veya lig arayın..." value={aramaTakim} onChange={(e) => setAramaTakim(e.target.value)} className="w-full bg-slate-800 border-2 border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-green-500 transition-colors text-sm" /><datalist id="takim-listesi">{siraliTakimlar.map((takim, i) => <option key={`tak-${i}`} value={takim as string} />)}</datalist></div>
                {(aramaKomiser || aramaSaha || aramaTakim) && (
                  <div className="pt-2 text-right"><button onClick={() => { setAramaKomiser(''); setAramaSaha(''); setAramaTakim(''); setAcikAramaMacId(null); }} className="text-slate-400 hover:text-red-400 text-sm font-bold underline transition-colors">Filtreleri Temizle</button></div>
                )}
              </div>
            )}
          </div>
          <div className="space-y-3">
            {filtrelenmisMaclar.length === 0 ? (
              <div className="text-center bg-white p-8 rounded-xl shadow-sm text-slate-500 font-bold text-sm">Aramanızla eşleşen müsabaka bulunamadı.</div>
            ) : (
              filtrelenmisMaclar.map((mac, idx) => {
                const komiserIsim = (Array.isArray(tumKomiserler) ? tumKomiserler : []).find(k => k.komiser_id === mac.komiser_id)?.ad_soyad || "Komiser Atanmadı";
                const isAcik = acikAramaMacId === mac.id;
                return (
                  <div key={mac.id || `arama-${idx}`} className="bg-white border-l-4 border-slate-800 shadow-md rounded-r-xl overflow-hidden transition-all">
                    <button onClick={() => setAcikAramaMacId(isAcik ? null : mac.id)} className="w-full text-left p-3 md:p-4 flex justify-between items-center hover:bg-slate-50 focus:outline-none">
                        <div className="flex-1 pr-2">
                            <div className="flex items-center gap-2 mb-1"><span className="bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">{mac?.mac_kodu || '-'}</span><span className="text-blue-600 text-[10px] font-bold uppercase">{mac?.kategori_adi || '-'}</span></div>
                            <span className="font-bold text-blue-950 text-sm md:text-base leading-tight block">{mac?.ev_sahibi || '-'} <span className="text-slate-400 font-medium mx-1">vs</span> {mac?.misafir_takim || '-'}</span>
                        </div>
                        <span className="text-slate-500 text-lg leading-none">{isAcik ? '▲' : '▼'}</span>
                    </button>
                    {isAcik && (
                        <div className="p-3 md:p-4 border-t border-slate-100 bg-slate-50 animate-fade-in-down">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-sm text-slate-700">
                              <div className="flex flex-col"><span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wider">Tarih & Saat</span><span className="font-bold text-slate-800 text-xs md:text-sm">{guvenliTarih(mac?.tarih)} - {guvenliSaat(mac?.saat)}</span></div>
                              <div className="flex flex-col"><span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wider">Saha</span><span className="font-bold text-slate-800 text-xs md:text-sm leading-tight">{mac?.saha || '-'}</span></div>
                              <div className="flex flex-col sm:mt-2 pt-2 sm:pt-3 border-t border-slate-200"><span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wider">Kategori / Lig</span><span className="font-bold text-slate-800 text-xs md:text-sm leading-tight">{mac?.kategori_adi || '-'} <span className="text-[9px] md:text-xs font-normal text-slate-500 block sm:inline mt-0.5 sm:mt-0 sm:ml-1">(Kod: {mac?.mac_kodu || '-'})</span></span></div>
                              <div className="flex flex-col sm:mt-2 pt-2 sm:pt-3 border-t border-slate-200"><span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold uppercase tracking-wider">Atanan Görev</span><span className="font-extrabold text-blue-700 text-xs md:text-sm">{gorevTuruBelirle(mac?.kategori_adi || '', mac?.mac_kodu || '')}</span></div>
                              <div className="flex flex-col sm:mt-2 pt-2 sm:pt-3 border-t border-slate-300 col-span-1 sm:col-span-2 bg-white p-2 rounded border"><span className="text-[9px] md:text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-wider">Müsabaka Saha Komiseri</span><span className="font-black text-red-700 text-sm md:text-base">{komiserIsim}</span></div>
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

  if (aktifEkran === 'mazeretBildir') {
    return (
      <main className="min-h-screen bg-slate-100 flex flex-col font-sans">
        <OrtakHeader geriButonuGoster={true} />
        <div className="flex-1 w-full max-w-2xl mx-auto p-4 md:p-6 pb-20">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-t-4 border-blue-500">
            {mazeretKaydedildi ? (
              <div className="p-10 text-center animate-fade-in-down"><div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div><h2 className="text-xl md:text-2xl font-bold text-slate-800">Müsaitlik Durumu İletildi!</h2><p className="text-slate-500 text-sm md:text-base mt-2">Merkezimize başarıyla kaydedildi. Ana ekrana yönlendiriliyorsunuz...</p></div>
            ) : (
              <>
                <div className="bg-slate-50 p-6 border-b border-slate-200 text-center"><div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div><h2 className="text-lg md:text-xl font-bold text-slate-800">Haftalık Müsaitlik Durumu</h2><p className="text-slate-500 text-xs md:text-sm mt-1">Önümüzdeki TFF bülteni için görev tercihlerinizi belirleyin.</p></div>
                <div className="p-4 md:p-6 space-y-6 md:space-y-8">
                  <div className={`border rounded-xl p-4 flex items-start gap-4 transition-colors hover:bg-red-50 ${kompleYokum ? 'bg-red-50 border-red-500 ring-2 ring-red-200' : 'bg-white border-slate-200'}`}><input type="checkbox" id="kompleYokum" checked={kompleYokum} onChange={(e) => { setKompleYokum(e.target.checked); if (e.target.checked) { setMazeretTipi(null); } }} className="mt-1 w-6 h-6 text-red-600 rounded cursor-pointer" /><label htmlFor="kompleYokum" className="cursor-pointer"><span className={`block font-bold text-base md:text-lg ${kompleYokum ? 'text-red-700' : 'text-slate-700'}`}>Bu hafta görev alamayacağım.</span><span className="block text-xs md:text-sm mt-1 text-slate-500">İşaretlerseniz tüm hafta boyunca (hafta içi ve hafta sonu) kapalı görünürsünüz.</span></label></div>
                  {!kompleYokum && (
                    <div className="space-y-4 mt-6 md:mt-8 animate-fade-in-down">
                      <div className={`border-2 rounded-xl transition-all ${mazeretTipi === 'full' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-slate-200 bg-white hover:border-blue-300'}`}><label className="flex items-start gap-4 p-4 cursor-pointer"><input type="radio" name="mazeret" checked={mazeretTipi === 'full'} onChange={() => setMazeretTipi('full')} className="w-6 h-6 text-blue-600 mt-0.5" /><div><span className="font-bold text-base md:text-lg text-slate-800 block leading-tight">Tüm Hafta Müsaitim (7/24)</span><span className="text-xs md:text-sm text-slate-500 block mt-1">Günün her saati, haftanın 7 günü her maça açığım.</span></div></label>
                        {mazeretTipi === 'full' && (
                          <div className="p-4 border-t border-blue-200 bg-white m-2 rounded-lg flex flex-col sm:flex-row gap-4 sm:gap-6 animate-fade-in-down"><label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700"><input type="checkbox" checked={genelMerkez} onChange={e => setGenelMerkez(e.target.checked)} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" /> Merkez Görevleri</label><label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700"><input type="checkbox" checked={genelDeplasman} onChange={e => setGenelDeplasman(e.target.checked)} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" /> Deplasman Görevleri</label></div>
                        )}
                      </div>
                      <div className={`border-2 rounded-xl transition-all ${mazeretTipi === 'secmeli' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-slate-200 bg-white hover:border-blue-300'}`}><label className="flex items-start gap-4 p-4 cursor-pointer"><input type="radio" name="mazeret" checked={mazeretTipi === 'secmeli'} onChange={() => setMazeretTipi('secmeli')} className="w-6 h-6 text-blue-600 mt-0.5" /><div><span className="font-bold text-base md:text-lg text-slate-800 block leading-tight">Seçmeli Müsaitlik</span><span className="text-xs md:text-sm text-slate-500 block mt-1">Sadece aşağıda seçeceğim gün ve saatlerde müsaitim.</span></div></label>
                        {mazeretTipi === 'secmeli' && (
                          <div className="p-2 md:p-4 border-t border-blue-200 bg-transparent sm:m-2 rounded-lg space-y-4 animate-fade-in-down">
                            {renderGunSatiri('cuma', 'Cuma')}{renderGunSatiri('cumartesi', 'Cumartesi')}{renderGunSatiri('pazar', 'Pazar')}{renderGunSatiri('pazartesi', 'Pazartesi')}{renderGunSatiri('sali', 'Salı')}{renderGunSatiri('carsamba', 'Çarşamba')}{renderGunSatiri('persembe', 'Perşembe')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="pt-6 border-t border-slate-200 mt-8"><h3 className="font-bold text-sm md:text-base text-slate-700 pb-2 mb-2">Ek Açıklama / Not</h3><textarea value={mazeretNotu} onChange={(e) => setMazeretNotu(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-4 focus:border-blue-500 min-h-[100px] shadow-sm text-sm" placeholder="Yönetime iletmek istediğiniz ek bir not... (Örn: Arabam bozuldu vb.)"></textarea></div>
                  <button onClick={mazeretKaydet} disabled={mazeretKaydediliyor} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg mt-4 text-base md:text-lg disabled:opacity-70">{mazeretKaydediliyor ? 'Kaydediliyor...' : 'Müsaitlik Durumumu Kaydet'}</button>
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