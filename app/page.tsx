"use client"
import React, { useState, useEffect, Fragment } from 'react'
import { supabase } from '../lib/supabase'
import { toPng } from 'html-to-image'
import RehberModal from '../components/RehberModal'

// =========================================================================
// ⚙️ YÖNETİCİ AYARLARI
// =========================================================================
const TEST_MODU_MAZERET_SUREKLI_ACIK = true; 
// =========================================================================

const AMATOR_MERKEZ_LOGO = "https://upload.wikimedia.org/wikipedia/tr/0/0a/TFF_logo.png?utm_source=tr.wikipedia.org&utm_campaign=index&utm_content=original";
const GELISIM_SOL_LOGO = "https://upload.wikimedia.org/wikipedia/tr/0/0a/TFF_logo.png?utm_source=tr.wikipedia.org&utm_campaign=index&utm_content=original";
const GELISIM_SAG_LOGO = "https://upload.wikimedia.org/wikipedia/tr/0/0a/TFF_logo.png?utm_source=tr.wikipedia.org&utm_campaign=index&utm_content=original"; 
const DERNEK_LOGO = "https://upload.wikimedia.org/wikipedia/tr/0/0a/TFF_logo.png?utm_source=tr.wikipedia.org&utm_campaign=index&utm_content=original"; 

type EkranTuru = 'giris' | 'dashboard' | 'gorevKartlari' | 'skorRapor' | 'mazeretBildir' | 'bultenArama' | 'istatistiklerim' | 'bordrolarim';

// 🔥 ACIKMAZSIZ TÜRKÇE ÇEVİRMEN MOTORU 🔥
const turkceBuyukHarf = (metin: any) => {
    if (!metin) return '';
    return String(metin)
        .replace(/i/g, 'İ')
        .replace(/ı/g, 'I')
        .replace(/ğ/g, 'Ğ')
        .replace(/ü/g, 'Ü')
        .replace(/ş/g, 'Ş')
        .replace(/ö/g, 'Ö')
        .replace(/ç/g, 'Ç')
        .toUpperCase();
}

const parseDetay = (raw: any) => {
    if (!raw) return {};
    let obj = raw;
    if (typeof obj === 'string') { try { obj = JSON.parse(obj); } catch(e) { return {}; } }
    if (typeof obj !== 'object' || obj === null) return {};
    return obj;
};

const getAnaKategori = (kategori: any) => {
    if (!kategori) return 'amator';
    const kat = turkceBuyukHarf(kategori);
    if ((kat.includes('SÜPER LİG') && !kat.includes('AMATÖR') && !kat.includes('KADIN')) || (kat.includes('1. LİG') && !kat.includes('AMATÖR') && !kat.includes('KADIN')) || (kat.includes('2. LİG') && !kat.includes('AMATÖR') && !kat.includes('KADIN')) || (kat.includes('3. LİG') && !kat.includes('AMATÖR') && !kat.includes('KADIN')) || kat.includes('ZİRAAT') || kat.includes('TÜRKİYE KUPASI')) return 'profesyonel';
    if (kat.includes('KADIN') || kat.includes('KIZ')) return 'kadin';
    if (kat.includes('GELİŞİM') || kat.includes('AKADEMİ') || kat.includes('ELİT') || kat.includes('PAF') || kat.includes('TFF U')) return 'gelisim';
    return 'amator';
}

const raporTurunuBelirle = (kategori: any) => {
    const anaKat = getAnaKategori(kategori);
    if (anaKat === 'profesyonel') return 'yok';
    if (anaKat === 'gelisim') return 'gelisim';
    return 'amator'; 
}

const detayliRaporGosterilirMi = (kategori: any) => raporTurunuBelirle(kategori) !== 'yok'; 

const getHakemGosterimModu = (kategori: any) => {
    if (!kategori) return 'dort_kutu';
    const anaKat = getAnaKategori(kategori);
    if (anaKat !== 'amator') return 'dort_kutu'; 
    const kat = turkceBuyukHarf(kategori);
    if (kat.includes('U11') || kat.includes('U 11') || kat.includes('U-11') || kat.includes('U12') || kat.includes('U 12') || kat.includes('U-12') || kat.includes('U13') || kat.includes('U 13') || kat.includes('U-13') || kat.includes('U14') || kat.includes('U 14') || kat.includes('U-14') || kat.includes('11 YAŞ') || kat.includes('12 YAŞ') || kat.includes('13 YAŞ') || kat.includes('14 YAŞ')) return 'tek_hakem';
    if (kat.includes('U15') || kat.includes('U 15') || kat.includes('U-15') || kat.includes('U16') || kat.includes('U 16') || kat.includes('U-16') || kat.includes('15 YAŞ') || kat.includes('16 YAŞ')) return 'uc_hakem';
    return 'dort_kutu'; 
};

const formatKategori = (rawKategori: any) => {
    if (!rawKategori) return 'BELİRTİLMEMİŞ LİG';
    let kat = turkceBuyukHarf(rawKategori).trim();
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

const getAyYil = (tarihMetni: any) => {
    if (!tarihMetni) return null;
    try {
        const str = String(tarihMetni).trim();
        let y = 0, m = 0;
        if (str.includes('.')) {
            const p = str.split('.');
            if (p.length === 3) { m = Number(p[1]); y = Number(p[2]); }
            else if (p.length === 2) { m = Number(p[1]); y = new Date().getFullYear(); }
        } else if (str.includes('/')) {
            const p = str.split('/');
            if (p.length === 3) { m = Number(p[1]); y = Number(p[2]); }
            else if (p.length === 2) { m = Number(p[1]); y = new Date().getFullYear(); }
        } else if (str.includes('-')) {
            const p = str.split('-');
            if (p.length === 3) {
                if (p[0].length === 4) { y = Number(p[0]); m = Number(p[1]); }
                else { m = Number(p[1]); y = Number(p[2]); }
            } else if (p.length === 2) {
                m = Number(p[1]); y = new Date().getFullYear();
            }
        }
        if (y > 2000 && m >= 1 && m <= 12) return `${y}-${String(m).padStart(2, '0')}`;
        return null;
    } catch (e) { return null; }
}

const isBordroKategori = (kategori: any) => {
    if (!kategori) return true; 
    const kat = turkceBuyukHarf(kategori);
    if (kat.includes('GELİŞİM') || kat.includes('AKADEMİ') || kat.includes('ELİT') || kat.includes('PAF') || kat.includes('KADIN') || kat.includes('KIZ')) {
        return false; 
    }
    return true;
}

const cumaBul = (tarihMetni: any) => {
    if (!tarihMetni) return 0
    try {
      const str = String(tarihMetni).trim();
      let y = 0, m = 0, dNum = 0;
      if (str.includes('.')) {
          const p = str.split('.');
          if (p.length === 3) { dNum = Number(p[0]); m = Number(p[1]) - 1; y = Number(p[2]); }
          else if (p.length === 2) { dNum = Number(p[0]); m = Number(p[1]) - 1; y = new Date().getFullYear(); }
      } else if (str.includes('/')) {
          const p = str.split('/');
          if (p.length === 3) { dNum = Number(p[0]); m = Number(p[1]) - 1; y = Number(p[2]); }
          else if (p.length === 2) { dNum = Number(p[0]); m = Number(p[1]) - 1; y = new Date().getFullYear(); }
      } else if (str.includes('-')) {
          const p = str.split('-');
          if (p.length === 3) {
              if (p[0].length === 4) { y = Number(p[0]); m = Number(p[1]) - 1; dNum = Number(p[2]); }
              else { dNum = Number(p[0]); m = Number(p[1]) - 1; y = Number(p[2]); }
          } else if (p.length === 2) {
              dNum = Number(p[0]); m = Number(p[1]) - 1; y = new Date().getFullYear();
          }
      }
      if (!y || isNaN(y)) return 0;
      const d = new Date(y, m, dNum);
      if (isNaN(d.getTime())) return 0;
      const gun = d.getDay();
      const fark = gun >= 5 ? gun - 5 : gun + 2;
      d.setDate(d.getDate() - fark);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    } catch (e) { return 0; }
}

const getZaman = (mac: any) => {
    if (!mac || !mac.tarih) return 0;
    try {
        const str = String(mac.tarih);
        let y = 0, m = 0, dNum = 0;
        if (str.includes('.')) {
            const p = str.split('.');
            if (p.length === 3) { dNum = Number(p[0]); m = Number(p[1]) - 1; y = Number(p[2]); }
            else if (p.length === 2) { dNum = Number(p[0]); m = Number(p[1]) - 1; y = new Date().getFullYear(); }
        } else if (str.includes('-')) {
            const p = str.split('-');
            if (p.length === 3) {
                if (p[0].length === 4) { y = Number(p[0]); m = Number(p[1]) - 1; dNum = Number(p[2]); }
                else { dNum = Number(p[0]); m = Number(p[1]) - 1; y = Number(p[2]); }
            }
        }
        let saat = 0, dakika = 0;
        if (mac.saat) {
            const strSaat = String(mac.saat);
            const parcaSaat = strSaat.split(':');
            saat = parseInt(parcaSaat[0] || '0', 10);
            dakika = parseInt(parcaSaat[1] || '0', 10);
        }
        const d = new Date(y, m, dNum, saat, dakika);
        return isNaN(d.getTime()) ? 0 : d.getTime();
    } catch (e) { return 0; }
};

const siralamaFiltresi = (a: any, b: any) => getZaman(a) - getZaman(b);

const isMazeretWindowOpen = () => {
    if (TEST_MODU_MAZERET_SUREKLI_ACIK) return true;
    const now = new Date();
    const day = now.getDay(); 
    const hour = now.getHours();
    const min = now.getMinutes();
    if (day === 0 && hour >= 23) return true; 
    if (day === 1) return true;                
    if (day === 2 && (hour < 8 || (hour === 8 && min < 30))) return true; 
    return false;
};

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
                Evet 
                <div className={`w-4 h-4 border border-black flex items-center justify-center text-xs font-bold bg-white ${deger === 'evet' ? 'bg-slate-200' : ''}`}>{deger === 'evet' ? 'X' : ''}</div>
                <input type="radio" className="hidden" checked={deger === 'evet'} onChange={() => onChange('evet')} disabled={!isAktif} />
            </label>
            <label className={`flex items-center gap-1 text-[10px] ${isAktif ? 'cursor-pointer' : 'pointer-events-none'}`}>
                Hayır 
                <div className={`w-4 h-4 border border-black flex items-center justify-center text-xs font-bold bg-white ${deger === 'hayir' ? 'bg-slate-200' : ''}`}>{deger === 'hayir' ? 'X' : ''}</div>
                <input type="radio" className="hidden" checked={deger === 'hayir'} onChange={() => onChange('hayir')} disabled={!isAktif} />
            </label>
        </div>
    </div>
);

const temizHakem = (isim: any) => {
    if (!isim) return '';
    const s = turkceBuyukHarf(isim).trim();
    if (s.includes('TIKLA VE')) return '';
    return s;
};

export default function Home() {
  const [aktifEkran, setAktifEkran] = useState<EkranTuru>('giris')
  const [kullaniciIdInput, setKullaniciIdInput] = useState('')
  const [sifreInput, setSifreInput] = useState('')
  const [girisHatasi, setGirisHatasi] = useState<string | null>(null)
  const [girisYukleniyor, setGirisYukleniyor] = useState(false)
  const [seciliKomiser, setSeciliKomiser] = useState<any | null>(null)
  const [sifreDegistirAcik, setSifreDegistirAcik] = useState(false)
  const [eskiSifre, setEskiSifre] = useState('')
  const [yeniSifre, setYeniSifre] = useState('')
  const [sifremiUnuttumAcik, setSifremiUnuttumAcik] = useState(false)
  const [rehberAcik, setRehberAcik] = useState(false)
  const [zorunluMazeret, setZorunluMazeret] = useState(false)
  
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
  const [acikStatu, setAcikStatu] = useState<any | null>(null) 
  const [arsivTamEkranMac, setArsivTamEkranMac] = useState<any | null>(null) 
  const [acikBordroAy, setAcikBordroAy] = useState<string | null>(null) 
  const [tamEkranBordroAy, setTamEkranBordroAy] = useState<string | null>(null) 

  const [tcKimlik, setTcKimlik] = useState('')
  const [bankaAdi, setBankaAdi] = useState('')
  const [subeKodu, setSubeKodu] = useState('')
  const [hesapNo, setHesapNo] = useState('')
  const [ibanNo, setIbanNo] = useState('')
  const [finansKaydediliyor, setFinansKaydediliyor] = useState(false)

  const [profUcretDurumlari, setProfUcretDurumlari] = useState<Record<number, string>>({})

  const defaultGunDurumu = { active: false, merkez: true, deplasman: false, tumGun: false, baslangic: '09:00', bitis: '22:00' }
  const [gunler, setGunler] = useState<Record<string, any>>({
    cuma: { ...defaultGunDurumu }, cumartesi: { ...defaultGunDurumu }, pazar: { ...defaultGunDurumu },
    pazartesi: { ...defaultGunDurumu }, sali: { ...defaultGunDurumu }, carsamba: { ...defaultGunDurumu }, persembe: { ...defaultGunDurumu }
  })

  const [mazeretNotu, setMazeretNotu] = useState('')
  const [acikSkorMacId, setAcikSkorMacId] = useState<number | null>(null)
  const [evSkor, setEvSkor] = useState<string>('')
  const [misafirSkor, setMisafirSkor] = useState<string>('')
  const [macDurumu, setMacDurumu] = useState<'' | 'oynandi' | 'yarida_kaldi' | 'oynanmadi' | 'takimlar_cikmadi'>('')
  const [olayDurumu, setOlayDurumu] = useState<'olaysiz' | 'teknik_olay' | 'emniyetlik_olay' | 'hava_muhalefeti' | 'saha_sorunu'>('olaysiz')
  const [raporNotu, setRaporNotu] = useState('')
  
  // 🔥 FOTOĞRAF MOTORU İÇİN STATE GÜNCELLEMELERİ 🔥
  const [ekRaporFotolar, setEkRaporFotolar] = useState<Record<string, string>>({}); // Ekranda gösterecek önizlemeler (veya URL'ler)
  const [ekRaporDosyalar, setEkRaporDosyalar] = useState<Record<string, File>>({}); // Gerçek fotoğraf dosyaları (Supabase'e fırlatılacak)

  const defaultRaporDetay = {
    hakem: '', y_hakem_1: '', y_hakem_2: '', hakem_4: '', gozlemci: '', 
    saglik: '', guvenlik: '', guvenlik_amiri: '', guvenlik_telefon: '', saglik_adi: '', saglik_telefon: '', 
    islem_saati: 0,
    ihrac_ev: [{forma: '', isim: '', lisans: ''}, {forma: '', isim: '', lisans: ''}],
    ihrac_mis: [{forma: '', isim: '', lisans: ''}, {forma: '', isim: '', lisans: ''}],
    tff_not: '', detayli_kaydedildi: false,
    gelisim_sorular: { ambulans: null, doktor: null, anons: null, sedyeci: null, degerlendirme: '', soyunma_odasi: null, oyun_alani: null, kale_aglari: null, saha_cizgileri: null, kose_gonderleri: null, teknik_alan: null, yedek_kulubeleri: null, skor_tabelasi: null, oyuncu_degistirme: null, isim_listeleri: null, forma_setleri: null, wc_hijyen: null, misafir_gelis_gidis: '', soyunma_odasi_kisitlama: null, misafir_tribun_yer: null, guvenlik_sayisi: '', isletimsel_1: '', isletimsel_2: '', isletimsel_3: '', olumsuz_diger: '' },
    gelisim_fotolar: {}, // 🔥 YENİ: GELİŞİM LİGİ ÖZEL FOTOĞRAFLARI BURADA TUTULACAK
    ek_raporlar: []
  };
  
  const [raporDetay, setRaporDetay] = useState<any>(defaultRaporDetay);
  const [skorKaydediliyor, setSkorKaydediliyor] = useState(false)

  // ==========================================
  // HESAPLAMALAR VE TARİH BEYNİ
  // ==========================================
  let gecerliAktifMaclar: any[] = [];
  const gecmisHaftalar: Record<number, any[]> = {};

  if (haftaReferanslari.length > 0 && seciliKomiser && Array.isArray(komiserMaclari)) {
    komiserMaclari.forEach((mac: any) => {
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
  Object.keys(gecmisHaftalar).forEach((haftaNoStr: string) => { 
      const haftaNo = Number(haftaNoStr);
      gecmisHaftalar[haftaNo].sort(siralamaFiltresi); 
  });

  const tebellugEdilenMaclar = Array.isArray(gecerliAktifMaclar) ? gecerliAktifMaclar.filter((m: any) => m?.tebellug_edildi === true) : [];
  const eksikSkorSayisi = tebellugEdilenMaclar.filter((m: any) => m && !m.skor_girildi).length;
  const eksikDetayliSayisi = tebellugEdilenMaclar.filter((m: any) => {
      if (!m || !m.skor_girildi || !detayliRaporGosterilirMi(m.kategori_adi)) return false;
      const parsed = parseDetay(m.tff_rapor_detaylari);
      return !parsed.detayli_kaydedildi;
  }).length;

  const hepsiTebellugEdilmis = gecerliAktifMaclar.length > 0 && gecerliAktifMaclar.every((mac: any) => mac?.tebellug_edildi === true)
  const tebellugBekleyenSayisi = gecerliAktifMaclar.filter((m: any) => m && !m.tebellug_edildi).length;
  const herSeyTamam = gecerliAktifMaclar.length > 0 && tebellugBekleyenSayisi === 0 && eksikSkorSayisi === 0 && eksikDetayliSayisi === 0;

  const skorSecenekleri = Array.from({ length: 31 }, (_, i) => String(i));
  const sifreUyariGoster = seciliKomiser?.sifre === '1923';
  const mazeretAcik = isMazeretWindowOpen();

  // İstatistikler için
  let amatorCount = 0; let profCount = 0; let gelisimCount = 0; let kadinCount = 0;
  const amatorKategoriler: Record<string, number> = {};
  const profKategoriler: Record<string, number> = {};
  const gelisimKategoriler: Record<string, number> = {};
  const kadinKategoriler: Record<string, number> = {};

  const maclarForIstatistik = Array.isArray(komiserMaclari) ? komiserMaclari : [];
  maclarForIstatistik.forEach((mac: any) => {
      if (!mac) return;
      const anaKat = getAnaKategori(mac?.kategori_adi);
      const katAdi = formatKategori(mac?.kategori_adi);
      if (anaKat === 'profesyonel') { profCount++; profKategoriler[katAdi] = (profKategoriler[katAdi] || 0) + 1; } 
      else if (anaKat === 'gelisim') { gelisimCount++; gelisimKategoriler[katAdi] = (gelisimKategoriler[katAdi] || 0) + 1; } 
      else if (anaKat === 'kadin') { kadinCount++; kadinKategoriler[katAdi] = (kadinKategoriler[katAdi] || 0) + 1; } 
      else { amatorCount++; amatorKategoriler[katAdi] = (amatorKategoriler[katAdi] || 0) + 1; }
  });

  const siraliAmatorler = Object.entries(amatorKategoriler).sort((a: any, b: any) => b[1] - a[1]);
  const siraliProflar = Object.entries(profKategoriler).sort((a: any, b: any) => b[1] - a[1]);
  const siraliGelisimler = Object.entries(gelisimKategoriler).sort((a: any, b: any) => b[1] - a[1]);
  const siraliKadinlar = Object.entries(kadinKategoriler).sort((a: any, b: any) => b[1] - a[1]);

  const guvenliTumMaclar = Array.isArray(tumAktifMaclar) ? tumAktifMaclar : [];
  let filtrelenmisMaclar = guvenliTumMaclar;
  if (aramaKomiser.trim() !== '') {
    const q = turkceBuyukHarf(aramaKomiser);
    filtrelenmisMaclar = filtrelenmisMaclar.filter((mac: any) => {
      const isim = turkceBuyukHarf((Array.isArray(tumKomiserler) ? tumKomiserler : []).find((k: any) => String(k.komiser_id) === String(mac?.komiser_id))?.ad_soyad || "");
      return isim.includes(q);
    });
  }
  if (aramaSaha.trim() !== '') {
    const q = turkceBuyukHarf(aramaSaha);
    filtrelenmisMaclar = filtrelenmisMaclar.filter((mac: any) => turkceBuyukHarf(mac?.saha || '').includes(q));
  }
  if (aramaTakim.trim() !== '') {
    const q = turkceBuyukHarf(aramaTakim);
    filtrelenmisMaclar = filtrelenmisMaclar.filter((mac: any) => turkceBuyukHarf(mac?.ev_sahibi || '').includes(q) || turkceBuyukHarf(mac?.misafir_takim || '').includes(q) || turkceBuyukHarf(mac?.kategori_adi || '').includes(q));
  }
  
  const safeKomiserler = Array.isArray(tumKomiserler) ? tumKomiserler : [];
  const siraliKomiserler = [...safeKomiserler].sort((a: any, b: any) => (a.ad_soyad || '').localeCompare(b.ad_soyad || '', 'tr-TR'));
  const siraliSahalar = Array.from(new Set(guvenliTumMaclar.map((m: any) => m?.saha).filter(Boolean))).sort((a: any, b: any) => String(a).localeCompare(String(b), 'tr-TR'));
  const siraliTakimlar = Array.from(new Set([...guvenliTumMaclar.map((m: any) => m?.ev_sahibi), ...guvenliTumMaclar.map((m: any) => m?.misafir_takim)].filter(Boolean))).sort((a: any, b: any) => String(a).localeCompare(String(b), 'tr-TR'));

  const haftaToggle = (haftaNo: number) => { 
      setAcikHaftalar((prev: number[]) => prev.includes(haftaNo) ? prev.filter((h: number) => h !== haftaNo) : [...prev, haftaNo]); 
  }

  // ==========================================
  // DB KONTROLLERİ VE USEEFFECT
  // ==========================================
  useEffect(() => {
    let isMounted = true;
    if (seciliKomiser && globalAktifHaftaNo > 0) {
        const checkZorunluMazeret = async () => {
            if (isMazeretWindowOpen()) {
                const hedefHafta = globalAktifHaftaNo + 1;
                const { data, error } = await supabase
                    .from('mazeretler')
                    .select('id')
                    .eq('komiser_id', seciliKomiser.komiser_id)
                    .eq('hafta_no', hedefHafta);
                
                if (isMounted) {
                    if (!error && (!data || data.length === 0)) { setZorunluMazeret(true); } 
                    else { setZorunluMazeret(false); }
                }
            } else {
                if (isMounted) setZorunluMazeret(false);
            }
        };
        checkZorunluMazeret();
    }
    return () => { isMounted = false; };
  }, [seciliKomiser, globalAktifHaftaNo]);

  useEffect(() => {
    if (aktifEkran === 'dashboard' && !zorunluMazeret) {
      const okunduMu = localStorage.getItem('izmirSahaRehberOkundu');
      if (okunduMu !== 'true') { setRehberAcik(true); }
    }
  }, [aktifEkran, zorunluMazeret]);

  const rehberiKapatVeKaydet = () => {
    localStorage.setItem('izmirSahaRehberOkundu', 'true');
    setRehberAcik(false);
  };

  const finansBilgileriniGetir = async (kId: string) => {
    try {
      const { data, error } = await supabase.from('komiser_finans').select('*').eq('komiser_id', kId).single();
      if (data && !error) {
        setTcKimlik(data.tc_kimlik || '');
        setBankaAdi(data.banka_adi || '');
        setSubeKodu(data.sube_kodu || '');
        setHesapNo(data.hesap_no || '');
        setIbanNo(data.iban || '');
      }
    } catch (err) { console.error("Finans bilgisi çekilemedi", err); }
  }

  const finansBilgileriniKaydet = async () => {
    if (!seciliKomiser?.komiser_id) return;
    setFinansKaydediliyor(true);
    try {
      const payload = {
        komiser_id: seciliKomiser.komiser_id,
        tc_kimlik: tcKimlik,
        banka_adi: bankaAdi,
        sube_kodu: subeKodu,
        hesap_no: hesapNo,
        iban: ibanNo
      };
      const { error } = await supabase.from('komiser_finans').upsert(payload, { onConflict: 'komiser_id' });
      if (error) throw error;
      alert("✅ Finansal bilgileriniz sisteme güvenle kaydedildi!");
    } catch (err: any) {
      alert("Hata: " + err.message);
    }
    setFinansKaydediliyor(false);
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const kayitliId = localStorage.getItem('izmirKomiserId')
        const kayitliSifre = localStorage.getItem('izmirKomiserSifre')
        
        const kayitliProfUcret = localStorage.getItem('bordro_prof_ucret');
        if(kayitliProfUcret) setProfUcretDurumlari(JSON.parse(kayitliProfUcret));

        if (kayitliId && kayitliSifre) { otomatikGirisYap(kayitliId, kayitliSifre) }
      } catch (e) { console.error(e) }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const bankaBilgisiGuncelle = (alan: string, deger: string) => {
      if(alan === 'tc') setTcKimlik(deger);
      if(alan === 'banka') setBankaAdi(deger);
      if(alan === 'sube') setSubeKodu(deger);
      if(alan === 'hesap') setHesapNo(deger);
      if(alan === 'iban') setIbanNo(deger);
  }

  const profUcretGuncelle = (macId: number, deger: string) => {
      const yeniDurum = { ...profUcretDurumlari, [macId]: deger };
      setProfUcretDurumlari(yeniDurum);
      localStorage.setItem('bordro_prof_ucret', JSON.stringify(yeniDurum));
  }

  const otomatikGirisYap = async (id: string, sifre: string) => {
    try {
      const { data, error } = await supabase.from('komiserler').select('*').eq('komiser_id', id).single()
      if (data && !error) {
        const dbSifre = data.sifre || '1923'; 
        if (dbSifre === sifre) {
            setSeciliKomiser(data)
            await komiserDetayGetir(data)
            await finansBilgileriniGetir(data.komiser_id); 
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
          const cumalar = tumMaclarGecici.map((mac: any) => mac?.tarih ? cumaBul(mac.tarih) : 0).filter((t: number) => t > 0)
          const essizCumalar = Array.from(new Set(cumalar)).sort((a: any, b: any) => a - b)
          
          if(essizCumalar.length > 0) {
            setHaftaReferanslari(essizCumalar as number[])
            
            const suAn = Date.now();
            let enYakinHaftaNo = 1;
            let minFark = Infinity;
            essizCumalar.forEach((cuma: any, idx: number) => {
                const fark = Math.abs(cuma - suAn);
                if (fark < minFark) {
                    minFark = fark;
                    enYakinHaftaNo = idx + 1;
                }
            });
            
            setGlobalAktifHaftaNo(enYakinHaftaNo)

            const aktifCumaTarihi = essizCumalar[enYakinHaftaNo - 1]
            let aktifHaftaMaclari = tumMaclarGecici.filter((mac: any) => mac?.tarih && cumaBul(mac.tarih) === aktifCumaTarihi)
            
            if(aktifHaftaMaclari.length > 0) {
                const tarihler = aktifHaftaMaclari.map((m: any) => new Date(String(m.tarih)).getTime()).filter((t: number) => !isNaN(t));
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
        if (hakemData && aktif) { setHakemListesi(hakemData.map((h: any) => h.ad_soyad)); }

        const { data: gozlemciData } = await supabase.from('gozlemciler').select('ad_soyad').order('ad_soyad')
        if (gozlemciData && aktif) { setGozlemciListesi(gozlemciData.map((g: any) => g.ad_soyad)); }

      } catch (err: any) { console.error(err) }
    }
    if(aktifEkran !== 'giris') { arkaPlaniHazirla(); }
    return () => { aktif = false; }
  }, [aktifEkran])

  const updateGun = (key: string, field: string, val: any) => { setGunler((prev: Record<string, any>) => ({ ...prev, [key]: { ...prev[key], [field]: val } })) }

  const girisYap = async (e?: React.FormEvent) => {
    if (e) e.preventDefault() 
    setGirisYukleniyor(true); setGirisHatasi(null);
    let girilenSicil = kullaniciIdInput.trim()
    if (/^\d{4,10}$/.test(girilenSicil) && !girilenSicil.startsWith('35')) { girilenSicil = '35' + girilenSicil }
    if (!girilenSicil) { setGirisHatasi("Lütfen sicil numaranızı girin."); setGirisYukleniyor(false); return; }
    if (!sifreInput) { setGirisHatasi("Lütfen şifrenizi girin."); setGirisYukleniyor(false); return; }

    try {
      const { data, error } = await supabase.from('komiserler').select('*').eq('komiser_id', girilenSicil).single()
      if (error || !data) { setGirisHatasi("Bu sicil numarasına ait saha komiseri bulunamadı."); setGirisYukleniyor(false); return; }
      
      const dbSifre = data.sifre || '1923'; 
      if (dbSifre !== sifreInput) {
          setGirisHatasi("Hatalı şifre girdiniz!"); 
          setGirisYukleniyor(false); 
          return;
      }
      setSeciliKomiser(data)
      localStorage.setItem('izmirKomiserId', data.komiser_id)
      localStorage.setItem('izmirKomiserSifre', sifreInput)
      await komiserDetayGetir(data)
      await finansBilgileriniGetir(data.komiser_id); 
      setAktifEkran('dashboard') 
    } catch (err) { setGirisHatasi("Bağlantı sorunu oluştu, tekrar deneyin.") } 
    finally { setGirisYukleniyor(false) }
  }

  const enterTusuKontrol = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') girisYap() }

  const sifreDegistirSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const guncelSifre = seciliKomiser?.sifre || '1923';
      if (eskiSifre !== guncelSifre) { alert("Mevcut şifrenizi yanlış girdiniz!"); return; }
      if (yeniSifre.length !== 4 || !/^\d+$/.test(yeniSifre)) { alert("Yeni şifreniz 4 haneli RAKAM olmalıdır!"); return; }
      
      try {
          if (!seciliKomiser?.komiser_id) { alert("Kullanıcı sicil numarası bulunamadı!"); return; }
          const { error } = await supabase.from('komiserler').update({ sifre: yeniSifre }).eq('komiser_id', seciliKomiser.komiser_id);
          if (!error) {
              alert("✅ Şifreniz başarıyla güncellendi!");
              setSeciliKomiser({...seciliKomiser, sifre: yeniSifre});
              localStorage.setItem('izmirKomiserSifre', yeniSifre);
              setSifreDegistirAcik(false);
              setEskiSifre(''); setYeniSifre('');
          } else {
              alert("Şifre güncellenirken bir hata oluştu: " + error.message);
          }
      } catch(err: any) { alert("Bağlantı hatası: " + err.message); }
  }

  const cikisYap = () => {
    setSeciliKomiser(null); setKullaniciIdInput(''); setSifreInput(''); setKomiserMaclari([]);
    setAramaKomiser(''); setAramaSaha(''); setAramaTakim('');
    setAktifEkran('giris'); setArsivAcik(false); setAcikHaftalar([]);
    setAcikStatu(null); setArsivTamEkranMac(null); setTamEkranBordroAy(null); setAcikBordroAy(null);
    setZorunluMazeret(false);
    setMazeretTipi(null); setKompleYokum(false); setGenelMerkez(true); setGenelDeplasman(false); setMazeretNotu('');
    setTcKimlik(''); setBankaAdi(''); setSubeKodu(''); setHesapNo(''); setIbanNo('');
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
    if (kod.includes('DENETÇİ') || katStr.includes('BAL') || katStr.includes('BÖLGESEL')) return "BAL LİGİ DENETÇİSİ";
    if (kod.includes('STAJ')) return "STAJYER / SAHA KOMİSERİ";
    if (anaKat === 'profesyonel') return "SAHA KOMİSERİ";
    if (anaKat === 'gelisim') {
        if (katStr.includes('U17') || katStr.includes('U19') || katStr.includes('PAF')) return "GELİŞİM DENETÇİSİ";
        return "GELİŞİM DENETÇİSİ / SAHA KOMİSERİ";
    }
    return "SAHA KOMİSERİ";
  }

  const tebellugKaydet = async () => {
    if (gecerliAktifMaclar.length === 0) return;
    setTebellugYukleniyor(true);
    const aktifMacIdleri = gecerliAktifMaclar.map((m: any) => m.id);
    const { error } = await supabase.from('musabakalar').update({ tebellug_edildi: true }).in('id', aktifMacIdleri);
    if (!error) { setKomiserMaclari((prev: any[]) => prev.map((m: any) => aktifMacIdleri.includes(m.id) ? { ...m, tebellug_edildi: true } : m)); } 
    else { alert("Görevler onaylanırken bir hata oluştu."); }
    setTebellugYukleniyor(false);
  }

  const mazeretKaydet = async () => {
    if (!mazeretTipi && !kompleYokum) { alert("⚠️ Lütfen size uygun olan seçeneklerden birini işaretleyiniz!"); return; }
    if (mazeretTipi === 'full' && !genelMerkez && !genelDeplasman) { alert("⚠️ Tüm Hafta Müsaitim seçeneğini işaretlediniz ancak Merkez veya Deplasman seçmediniz."); return; }
    if (mazeretTipi === 'secmeli') {
      const aktifGunVarMi = Object.values(gunler).some((g: any) => g.active);
      if (!aktifGunVarMi) { alert("⚠️ Seçmeli müsaitlik dediniz ancak hiçbir gün seçmediniz. Lütfen müsait olduğunuz günleri işaretleyiniz."); return; }
    }
    setMazeretKaydediliyor(true);
    const hedefHafta = globalAktifHaftaNo + 1;
    const temizGunler = JSON.parse(JSON.stringify(gunler));
    if (kompleYokum || mazeretTipi === 'yok') { Object.keys(temizGunler).forEach((g: string) => { temizGunler[g].active = false; }); } 
    else if (mazeretTipi === 'full') { Object.keys(temizGunler).forEach((g: string) => { temizGunler[g] = { active: true, merkez: genelMerkez, deplasman: genelDeplasman, tumGun: true, baslangic: '09:00', bitis: '22:00' }; }); }

    const payload = {
      komiser_id: seciliKomiser?.komiser_id || '', hafta_no: hedefHafta, komple_yok: kompleYokum || mazeretTipi === 'yok', aciklama: mazeretNotu,
      detaylar: { mod: mazeretTipi, genelMerkez: mazeretTipi === 'full' ? genelMerkez : null, genelDeplasman: mazeretTipi === 'full' ? genelDeplasman : null, gunler: (mazeretTipi === 'secmeli' || mazeretTipi === 'full') ? temizGunler : null }
    };
    try {
      await supabase.from('mazeretler').delete().match({ komiser_id: seciliKomiser?.komiser_id || '', hafta_no: hedefHafta });
      const { error } = await supabase.from('mazeretler').insert([payload]);
      if (!error) {
        setMazeretKaydedildi(true); 
        setZorunluMazeret(false); 
        setTimeout(() => { setAktifEkran('dashboard'); setMazeretKaydedildi(false); }, 3000); 
      } else { alert("Sisteme iletilemedi: " + error.message); }
    } catch (err) { alert("Bağlantı hatası oluştu."); } 
    finally { setMazeretKaydediliyor(false); }
  }

  const skorFormunuSifirla = () => {
    setEvSkor(''); setMisafirSkor(''); setMacDurumu(''); setOlayDurumu('olaysiz'); setRaporNotu(''); setAcikSkorMacId(null); setRaporDetay(defaultRaporDetay);
    setEkRaporFotolar({});
    setEkRaporDosyalar({}); 
  }

  const raporFormunuAc = (mac: any) => {
    if (acikSkorMacId === mac.id) { skorFormunuSifirla(); } 
    else {
      setAcikSkorMacId(mac.id);
      if (mac.skor_girildi) {
        setEvSkor(mac.ev_sahibi_skor != null ? String(mac.ev_sahibi_skor) : '');
        setMisafirSkor(mac.misafir_skor != null ? String(mac.misafir_skor) : '');
        setMacDurumu(mac.mac_durumu || ''); setOlayDurumu(mac.olay_durumu || 'olaysiz'); setRaporNotu(mac.rapor_notu || '');
        
        const parsedDetay = parseDetay(mac.tff_rapor_detaylari);
        const birlesikDetay = { ...defaultRaporDetay, ...parsedDetay };
        if (!birlesikDetay.gelisim_sorular || typeof birlesikDetay.gelisim_sorular !== 'object') birlesikDetay.gelisim_sorular = defaultRaporDetay.gelisim_sorular;
        if (!birlesikDetay.gelisim_fotolar || typeof birlesikDetay.gelisim_fotolar !== 'object') birlesikDetay.gelisim_fotolar = {};
        if (!Array.isArray(birlesikDetay.ek_raporlar)) birlesikDetay.ek_raporlar = [];
        if (!Array.isArray(birlesikDetay.ihrac_ev)) birlesikDetay.ihrac_ev = defaultRaporDetay.ihrac_ev;
        if (!Array.isArray(birlesikDetay.ihrac_mis)) birlesikDetay.ihrac_mis = defaultRaporDetay.ihrac_mis;
        
        // 🔥 DAHA ÖNCE YÜKLENMİŞ FOTOĞRAFLARI (LİNKLERİ) EKRANA ÇEKME ZEKASI 🔥
        const yeniFotolar: Record<string, string> = {};
        
        // 1. Ek Raporların Fotoğrafları
        birlesikDetay.ek_raporlar.forEach((ek: any) => {
            if (ek.foto_url) yeniFotolar[ek.id] = ek.foto_url;
        });

        // 2. Gelişim Ligi Fotoğrafları (Ev, Misafir, Sağlık vb.)
        if (birlesikDetay.gelisim_fotolar) {
            Object.keys(birlesikDetay.gelisim_fotolar).forEach(k => {
                if (birlesikDetay.gelisim_fotolar[k]) yeniFotolar[k] = birlesikDetay.gelisim_fotolar[k];
            });
        }

        setEkRaporFotolar(yeniFotolar);
        setEkRaporDosyalar({}); // Bunlar zaten Supabase'de var, fırlatmaya gerek yok.

        setRaporDetay(birlesikDetay); 
      } else { 
          setEvSkor(''); setMisafirSkor(''); setMacDurumu(''); setOlayDurumu('olaysiz'); setRaporNotu(''); setRaporDetay(defaultRaporDetay); 
          setEkRaporFotolar({}); 
          setEkRaporDosyalar({});
      }
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
      setRaporDetay((prev:any) => ({ ...prev, ek_raporlar: [...(Array.isArray(prev.ek_raporlar) ? prev.ek_raporlar : []), { id: Date.now(), text: '' }] }));
  }
  
  const ekRaporSil = (id: number) => {
      setRaporDetay((prev:any) => ({ ...prev, ek_raporlar: (Array.isArray(prev.ek_raporlar) ? prev.ek_raporlar : []).filter((r:any) => r.id !== id) }));
      
      const yeniFotolar = {...ekRaporFotolar};
      delete yeniFotolar[id];
      setEkRaporFotolar(yeniFotolar);

      const yeniDosyalar = {...ekRaporDosyalar};
      delete yeniDosyalar[id];
      setEkRaporDosyalar(yeniDosyalar);
  }
  
  const ekRaporGuncelle = (id: number, text: string) => {
      setRaporDetay((prev:any) => ({ ...prev, ek_raporlar: (Array.isArray(prev.ek_raporlar) ? prev.ek_raporlar : []).map((r:any) => r.id === id ? { ...r, text } : r) }));
  }
  
  // 🔥 FOTOĞRAF SEÇİLİNCE HEM EKRANA (BASE64) HEM DE KASAYA (FİLE) HAZIRLAMA ZEKASI 🔥
  // Geliştirildi: Artık sadece sayılarla (ek rapor) değil, string anahtarlarla (gelisim_ev_esame vb.) da çalışıyor!
  const handleFotoYukle = (id: string | number, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (event) => { 
              if(event.target?.result) { 
                  // 1. Ekrandaki kutuya fotoğrafı yansıt
                  setEkRaporFotolar((prev: any) => ({ ...prev, [id]: event.target!.result as string })); 
                  // 2. Fırlatmak üzere kargoya (Supabase) asıl dosyayı hazırla
                  setEkRaporDosyalar((prev: any) => ({ ...prev, [id]: file }));
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

  const bordroIndirYazdir = () => {
      const element = document.getElementById(`bordro-print-area`);
      if (!element) {
          alert("Bordro ekranda bulunamadı. Lütfen sayfayı yenileyip tekrar deneyin.");
          return;
      }

      try {
          const printWindow = window.open('', '_blank');
          if (!printWindow) {
              alert("Lütfen tarayıcınızın 'Açılır Pencere' (Pop-up) engelleyicisini kapatın.");
              return;
          }

          const reportHtml = element.outerHTML;
          const doc = printWindow.document;

          doc.write(`
              <!DOCTYPE html>
              <html>
              <head>
                  <title>Bordro_${seciliKomiser?.ad_soyad}_${tamEkranBordroAy}</title>
                  <meta charset="utf-8">
                  <script src="https://cdn.tailwindcss.com"></script>
                  <style>
                      @media print {
                          @page { margin: 8mm; size: A4 portrait; }
                          body { 
                              -webkit-print-color-adjust: exact !important; 
                              print-color-adjust: exact !important; 
                              background-color: white !important; 
                              margin: 0 !important;
                              padding: 0 !important;
                          }
                          .tff-no-print { display: none !important; }
                          .mobile-zoom { 
                              zoom: 0.90 !important; 
                              transform: none !important; 
                          } 
                          input, select, textarea {
                              border: none !important;
                              background: transparent !important;
                              outline: none !important;
                              -webkit-appearance: none;
                              -moz-appearance: none;
                              appearance: none;
                              color: black !important;
                          }
                      }
                      body { font-family: Arial, sans-serif; background: #ffffff; color: #000000; }
                      .border-black { border-color: #000000 !important; }
                      table { width: 100%; border-collapse: collapse; }
                      th, td { border: 1px solid black; padding: 4px; }
                  </style>
              </head>
              <body>
                  <div style="width: 100%; max-width: 800px; margin: 0 auto; background: white;">
                      ${reportHtml}
                  </div>
                  <script>
                      setTimeout(function() {
                          window.print();
                          window.close();
                      }, 1000);
                  </script>
              </body>
              </html>
          `);
          doc.close();
      } catch (err) {
          alert("PDF/Yazdır ekranı hazırlanırken bir sorun oluştu.");
      }
  }

  const yeniHakemleriKaydet = async (detaylar: any) => {
      const girilenHakemler = [
          detaylar.hakem, detaylar.y_hakem_1, detaylar.y_hakem_2, detaylar.hakem_4
      ].map((h: any) => h ? turkceBuyukHarf(h).trim() : '').filter((h: string) => h.length > 2 && !h.includes("SEÇ") && !h.includes("YAZ"));

      if (girilenHakemler.length > 0) {
          try {
              const { data: mevcutHakemler } = await supabase.from('hakemler').select('ad_soyad');
              const guncelListe = (mevcutHakemler || []).map((h: any) => turkceBuyukHarf(h.ad_soyad));
              const eklenecekler = girilenHakemler.filter((h: string) => !guncelListe.includes(h));

              if (eklenecekler.length > 0) {
                  const uniqueEklenecekler = Array.from(new Set(eklenecekler));
                  const insertPayload = uniqueEklenecekler.map((ad: any) => ({ ad_soyad: ad }));
                  
                  const { error } = await supabase.from('hakemler').insert(insertPayload);
                  if (!error) {
                      setHakemListesi((prev: string[]) => {
                          const newList = [...prev];
                          uniqueEklenecekler.forEach((h: any) => { if (!newList.map((x: string) => turkceBuyukHarf(x)).includes(h)) newList.push(h); });
                          return newList.sort((a: string, b: string) => a.localeCompare(b, 'tr-TR'));
                      });
                  }
              }
          } catch (err) { console.error("Hakem kaydetme fonksiyonunda hata:", err); }
      }
  }

  const yeniGozlemciyiKaydet = async (detaylar: any) => {
      const girilenGozlemci = detaylar.gozlemci ? turkceBuyukHarf(detaylar.gozlemci).trim() : '';
      if (girilenGozlemci.length > 2 && !girilenGozlemci.includes("SEÇ") && !girilenGozlemci.includes("YAZ")) {
          try {
              const { data: mevcutGozlemciler } = await supabase.from('gozlemciler').select('ad_soyad');
              const guncelListe = (mevcutGozlemciler || []).map((g: any) => turkceBuyukHarf(g.ad_soyad));
              
              if (!guncelListe.includes(girilenGozlemci)) {
                  const { error } = await supabase.from('gozlemciler').insert([{ ad_soyad: girilenGozlemci }]);
                  if (!error) {
                      setGozlemciListesi((prev: string[]) => {
                          const newList = [...prev, girilenGozlemci];
                          return newList.sort((a: string, b: string) => a.localeCompare(b, 'tr-TR'));
                      });
                  }
              }
          } catch (err) { console.error("Gözlemci kaydetme hatası:", err); }
      }
  }

  // 🔥 SİSTEMİN KALBİ: SKOR VE FOTOĞRAFLARI GÖNDEREN MERKEZ 🔥
  const skorRaporunuGonder = async (macId: number, kayitTuru: 'hizli' | 'detayli') => {
    
    if (macDurumu === '') {
        alert("⚠️ DİKKAT: Lütfen önce Müsabaka Durumunu (Tamamlandı / Yarıda Kaldı vb.) seçiniz!");
        return;
    }

    const lowerNot = raporNotu.toLocaleLowerCase('tr-TR');
    const olayYaridaMi = lowerNot.includes('tatil') ||
                        lowerNot.includes('yarıda kaldı') ||
                        lowerNot.includes('yarida kaldi') ||
                        lowerNot.includes('yarıda kaldi') ||
                        lowerNot.includes('yarida kaldı') ||
                        lowerNot.includes('tamamlanamadı') ||
                        lowerNot.includes('tamamlanamadi') ||
                        lowerNot.includes('oynanmadı') ||
                        lowerNot.includes('oynanmadi');

    if (olayYaridaMi && macDurumu === 'oynandi') {
        alert("🚨 DİKKAT: Raporunuzda maçın tatil edildiğini, yarıda kaldığını veya oynanmadığını belirttiniz!\n\nBu yüzden müsabaka durumunu 'Müsabaka Tamamlandı' olarak seçemezsiniz. Lütfen durumu 'Maç Yarıda Kaldı' veya 'Oynanmadı' olarak düzeltip tekrar gönderiniz.");
        return;
    }

    if (macDurumu === 'oynandi' && (evSkor === '' || misafirSkor === '')) { alert("⚠️ Lütfen maçın skorunu giriniz."); return; }
    if ((olayDurumu === 'teknik_olay' || olayDurumu === 'emniyetlik_olay') && raporNotu.trim() === '') { alert("⚠️ Olaylı bir maç bildirdiniz. Lütfen detaylıca durumu yazınız."); return; }
    if (kayitTuru === 'detayli') {
        if (!raporDetay.hakem || raporDetay.hakem.trim() === '' || raporDetay.hakem.includes('TIKLA VE') || raporDetay.hakem.includes('YAZ')) { 
            alert("⚠️ Detaylı Raporu iletmek için lütfen en azından Orta Hakem bilgisini giriniz!"); return; 
        }
    }

    setSkorKaydediliyor(true);
    let kaydedilecekDetay = { ...raporDetay };
    kaydedilecekDetay.hakem = temizHakem(kaydedilecekDetay.hakem);
    kaydedilecekDetay.y_hakem_1 = temizHakem(kaydedilecekDetay.y_hakem_1);
    kaydedilecekDetay.y_hakem_2 = temizHakem(kaydedilecekDetay.y_hakem_2);
    kaydedilecekDetay.hakem_4 = temizHakem(kaydedilecekDetay.hakem_4);
    kaydedilecekDetay.gozlemci = temizHakem(kaydedilecekDetay.gozlemci);
    
    const mevcutDetay = parseDetay(gecerliAktifMaclar.find((m: any) => m.id === macId)?.tff_rapor_detaylari);
    kaydedilecekDetay.islem_saati = mevcutDetay.islem_saati || Date.now();

    if (kayitTuru === 'detayli') { 
        kaydedilecekDetay.detayli_kaydedildi = true; 
        
        // 🔥 SUPABASE ÇOKLU FOTOĞRAF FIRLATMA OPERASYONU (YENİ VE ZIRHLI) 🔥
        const guncelEkRaporlar = [...(kaydedilecekDetay.ek_raporlar || [])];
        const yeniGelisimFotolar = { ...(kaydedilecekDetay.gelisim_fotolar || {}) };
        
        for (const key of Object.keys(ekRaporDosyalar)) {
            const dosya = ekRaporDosyalar[key];
            if (dosya) {
                const dosyaUzantisi = dosya.name.split('.').pop() || 'jpg';
                const fileName = `mac_${macId}_foto_${key}_${Date.now()}.${dosyaUzantisi}`;
                
                // 1. Depoya fırlat
                const { data, error } = await supabase.storage.from('rapor_resimleri').upload(fileName, dosya, {
                    cacheControl: '3600',
                    upsert: false
                });

                if (!error && data) {
                    // 2. Depodan açık adresi (linki) iste
                    const { data: publicUrlData } = supabase.storage.from('rapor_resimleri').getPublicUrl(fileName);
                    const publicUrl = publicUrlData.publicUrl;
                    
                    // 3. Linki doğru yere mühürle!
                    if (key.startsWith('gelisim_')) {
                        // Eğer bu Gelişim Ligi esame/kart kutucuğu ise...
                        yeniGelisimFotolar[key] = publicUrl;
                    } else {
                        // Eğer bu Amatör veya yedek "Ek Rapor" fotoğrafı ise...
                        const idx = guncelEkRaporlar.findIndex((r: any) => String(r.id) === String(key));
                        if (idx !== -1) {
                            guncelEkRaporlar[idx].foto_url = publicUrl;
                        }
                    }
                } else {
                    console.error("Fotoğraf depoya gönderilemedi:", error);
                }
            }
        }
        
        // Yüklenen tüm linkleri asıl rapora dahil et
        kaydedilecekDetay.ek_raporlar = guncelEkRaporlar;
        kaydedilecekDetay.gelisim_fotolar = yeniGelisimFotolar;

        await yeniHakemleriKaydet(kaydedilecekDetay); 
        await yeniGozlemciyiKaydet(kaydedilecekDetay); 
    } else { 
        kaydedilecekDetay.detayli_kaydedildi = raporDetay.detayli_kaydedildi || false; 
    }

    const guncellenecekVeri = {
      ev_sahibi_skor: (macDurumu === 'takimlar_cikmadi' || macDurumu === 'oynanmadi' || evSkor === '') ? null : Number(evSkor),
      misafir_skor: (macDurumu === 'takimlar_cikmadi' || macDurumu === 'oynanmadi' || misafirSkor === '') ? null : Number(misafirSkor),
      mac_durumu: macDurumu, olay_durumu: olayDurumu, rapor_notu: raporNotu, skor_girildi: true, tff_rapor_detaylari: kaydedilecekDetay
    };

    try {
      const { error } = await supabase.from('musabakalar').update(guncellenecekVeri).eq('id', macId);
      if (!error) {
        setKomiserMaclari((prev: any[]) => prev.map((m: any) => m.id === macId ? { ...m, ...guncellenecekVeri } : m));
        alert(kayitTuru === 'detayli' ? "✅ TFF Detaylı Resmi Tutanağı (ve Fotoğraflar) Şube Yönetimine başarıyla iletildi!" : "✅ Hızlı Skor Bildirimi İzmir Şube Yönetimine iletildi!");
      } else { alert("Hata oluştu: " + error.message); }
    } catch (err) { alert("Bağlantı hatası!"); } 
    finally { setSkorKaydediliyor(false); }
  }

  // ==========================================
  // COMPONENT GÖRSEL FONKSİYONLARI
  // ==========================================
  const renderOrtakHeader = (geriButonuGoster = false) => (
    <header className="bg-slate-800 text-white shadow-md sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 py-4 md:py-5 flex justify-between items-center">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="hidden sm:flex items-center justify-center bg-white p-1.5 rounded-lg shadow-sm border border-slate-200">
              <img src={DERNEK_LOGO} alt="Logo" className="w-10 h-10 object-contain" crossOrigin="anonymous" />
          </div>
          <div>
            <h1 className="font-black text-xl md:text-2xl leading-tight tracking-wide text-white">SAHA OPERASYON MERKEZİ</h1>
            <h1 className="font-bold text-lg md:text-xl leading-tight text-slate-300 tracking-wide">İZMİR ŞUBESİ</h1>
            <div className="mt-2 inline-block bg-slate-900/50 px-3 py-1 rounded border border-slate-700 shadow-sm">
                <p className="text-slate-100 text-[10px] md:text-xs font-bold tracking-wider">{globalAktifHaftaNo}. PROGRAM HAFTASI {haftaTarihAraligi ? `(${haftaTarihAraligi})` : ''}</p>
            </div>
          </div>
        </div>
        {geriButonuGoster && !zorunluMazeret ? (
          <button onClick={() => { setAktifEkran('dashboard'); setArsivAcik(false); setAcikHaftalar([]); skorFormunuSifirla(); setAramaKomiser(''); setAramaSaha(''); setAramaTakim(''); setAcikStatu(null); setArsivTamEkranMac(null); setTamEkranBordroAy(null); setAcikBordroAy(null); }} className="flex items-center gap-1.5 bg-slate-100 text-slate-800 hover:bg-white text-xs md:text-sm font-bold py-2.5 px-5 rounded-lg shadow-sm transition-colors border border-slate-300 tracking-widest">
              GERİ DÖN
          </button>
        ) : (
          <button onClick={cikisYap} className="bg-red-700 hover:bg-red-800 text-white text-xs md:text-sm font-bold py-2.5 px-5 rounded-lg shadow transition-colors tracking-widest border border-red-800">
              ÇIKIŞ
          </button>
        )}
      </div>
    </header>
  );

  const renderGunSatiri = (key: string, label: string) => {
    const g = gunler[key]
    return (
      <div key={key} className={`border ${g.active ? 'border-blue-400 bg-blue-50/50 shadow-sm' : 'border-slate-200 bg-white'} rounded-xl overflow-hidden mb-3 transition-colors`}>
        <label className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${g.active ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
          <input type="checkbox" checked={g.active} onChange={(e: any) => updateGun(key, 'active', e.target.checked)} className="w-6 h-6 text-blue-600 rounded focus:ring-blue-500 cursor-pointer" />
          <span className={`font-bold text-lg ${g.active ? 'text-blue-800' : 'text-slate-600'}`}>{turkceBuyukHarf(label)}</span>
        </label>
        {g.active && (
          <div className="p-4 border-t border-blue-100 bg-white animate-fade-in-down space-y-4">
            <div className="flex flex-wrap gap-6 bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={g.merkez} onChange={(e: any) => updateGun(key, 'merkez', e.target.checked)} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" />
                  <span className="text-sm font-bold text-slate-700">MERKEZ</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={g.deplasman} onChange={(e: any) => updateGun(key, 'deplasman', e.target.checked)} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" />
                  <span className="text-sm font-bold text-slate-700">DEPLASMAN</span>
              </label>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm">
              <label className="flex items-center gap-3 cursor-pointer mb-3 pb-3 border-b border-slate-200">
                  <input type="checkbox" checked={g.tumGun} onChange={(e: any) => updateGun(key, 'tumGun', e.target.checked)} className="w-6 h-6 text-green-600 rounded focus:ring-green-500" />
                  <span className="text-base font-bold text-slate-800">TÜM GÜN MÜSAİTİM</span>
              </label>
              {!g.tumGun && (
                <div className="mt-2 animate-fade-in-down">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <label className="block text-xs tracking-wider font-bold text-slate-500 mb-1">BAŞLANGIÇ SAATİ</label>
                        <input type="time" value={g.baslangic} onChange={(e: any) => updateGun(key, 'baslangic', e.target.value)} className="w-full p-3 border-2 border-slate-300 rounded-lg focus:border-blue-500 font-mono text-base" />
                    </div>
                    <span className="text-slate-400 font-bold mt-5">-</span>
                    <div className="flex-1">
                        <label className="block text-xs tracking-wider font-bold text-slate-500 mb-1">BİTİŞ SAATİ</label>
                        <input type="time" value={g.bitis} onChange={(e: any) => updateGun(key, 'bitis', e.target.value)} className="w-full p-3 border-2 border-slate-300 rounded-lg focus:border-blue-500 font-mono text-base" />
                    </div>
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
        const s = turkceBuyukHarf(katAdi);
        return tumStatuler.find((st: any) => st.kategori_anahtar && s.includes(turkceBuyukHarf(st.kategori_anahtar)));
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
                    <span className="font-black text-slate-900 text-sm md:text-lg leading-tight truncate">{turkceBuyukHarf(mac.ev_sahibi || '-')}</span>
                    <span className="font-black text-base md:text-xl text-white bg-slate-800 px-3 py-1 rounded shadow-inner whitespace-nowrap min-w-[40px] text-center">{mac.ev_sahibi_skor}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="font-black text-slate-900 text-sm md:text-lg leading-tight truncate">{turkceBuyukHarf(mac.misafir_takim || '-')}</span>
                    <span className="font-black text-base md:text-xl text-white bg-slate-800 px-3 py-1 rounded shadow-inner whitespace-nowrap min-w-[40px] text-center">{mac.misafir_skor}</span>
                </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
                <span className="font-black text-slate-900 text-sm md:text-lg leading-tight truncate">{turkceBuyukHarf(mac.ev_sahibi || '-')}</span>
                <span className="font-black text-slate-900 text-sm md:text-lg leading-tight truncate">{turkceBuyukHarf(mac.misafir_takim || '-')}</span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-sm text-slate-700 mt-2 bg-slate-50 p-2 md:p-3 rounded-lg border border-slate-100">
          <div className="flex flex-col">
              <span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold tracking-wider">TARİH & SAAT</span>
              <span className="font-bold text-slate-800 text-xs md:text-sm">{guvenliTarih(mac.tarih)} - {guvenliSaat(mac.saat)}</span>
          </div>
          <div className="flex flex-col">
              <span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold tracking-wider">SAHA</span>
              <span className="font-bold text-slate-800 text-xs md:text-sm leading-tight">{turkceBuyukHarf(mac.saha || '-')}</span>
          </div>
          <div className="flex flex-col sm:mt-2 pt-2 sm:pt-3 border-t border-slate-200">
              <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] md:text-xs text-slate-400 font-semibold tracking-wider">KATEGORİ / LİG</span>
                  {bagliStatu && (
                      <button onClick={() => setAcikStatu(bagliStatu)} className="text-[9px] bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-bold transition-colors flex items-center gap-1 shadow-sm">
                          ℹ️ STATÜ
                      </button>
                  )}
              </div>
              <span className="font-bold text-slate-800 text-xs md:text-sm leading-tight">
                  {turkceBuyukHarf(mac.kategori_adi || '-')} <span className="text-[9px] md:text-xs font-normal text-slate-500 block sm:inline mt-0.5 sm:mt-0 sm:ml-1">(KOD: {formatMacKodu(mac?.mac_kodu)})</span>
              </span>
          </div>
          <div className="flex flex-col sm:mt-2 pt-2 sm:pt-3 border-t border-slate-200">
              <span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold tracking-wider">ATANAN GÖREV</span>
              <span className="font-extrabold text-blue-700 text-xs md:text-sm">{turkceBuyukHarf(gorevTuruBelirle(mac.kategori_adi, mac.mac_kodu))}</span>
          </div>
          {isArsiv && mac.skor_girildi && (
            <div className="col-span-1 sm:col-span-2 flex flex-col sm:mt-2 pt-2 sm:pt-3 border-t border-slate-200">
                <span className="text-[10px] md:text-xs text-slate-400 mb-2 font-semibold tracking-wider">MÜSABAKA GÖREVLİLERİ</span>
                <div className="flex flex-col gap-1.5">
                    {parsedDetay.hakem && <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm"><span className="text-[11px] text-slate-500 font-bold">HAKEM:</span><span className="text-xs font-black text-slate-800">{turkceBuyukHarf(parsedDetay.hakem)}</span></div>}
                    {parsedDetay.y_hakem_1 && <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm"><span className="text-[11px] text-slate-500 font-bold">1. YARDIMCI HAKEM:</span><span className="text-xs font-black text-slate-800">{turkceBuyukHarf(parsedDetay.y_hakem_1)}</span></div>}
                    {parsedDetay.y_hakem_2 && <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm"><span className="text-[11px] text-slate-500 font-bold">2. YARDIMCI HAKEM:</span><span className="text-xs font-black text-slate-800">{turkceBuyukHarf(parsedDetay.y_hakem_2)}</span></div>}
                    {parsedDetay.hakem_4 && <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm"><span className="text-[11px] text-slate-500 font-bold">4. HAKEM:</span><span className="text-xs font-black text-slate-800">{turkceBuyukHarf(parsedDetay.hakem_4)}</span></div>}
                    {parsedDetay.gozlemci && <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm"><span className="text-[11px] text-slate-500 font-bold">GÖZLEMCİ:</span><span className="text-xs font-black text-slate-800">{turkceBuyukHarf(parsedDetay.gozlemci)}</span></div>}
                    <div className="grid grid-cols-2 gap-2 mt-1">
                        <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm"><span className="text-[10px] text-slate-500 font-bold">SAĞLIK GÖREVLİSİ:</span><span className={`text-[10px] font-black px-2 py-0.5 rounded ${parsedDetay.saglik === 'var' || parsedDetay.saglik_adi === 'VAR' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{parsedDetay.saglik === 'var' || parsedDetay.saglik_adi === 'VAR' ? 'VAR' : 'YOK'}</span></div>
                        <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm"><span className="text-[10px] text-slate-500 font-bold">EMNİYET GÜCÜ:</span><span className={`text-[10px] font-black px-2 py-0.5 rounded ${parsedDetay.guvenlik === 'var' || parsedDetay.guvenlik_amiri === 'VAR' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{parsedDetay.guvenlik === 'var' || parsedDetay.guvenlik_amiri === 'VAR' ? 'VAR' : 'YOK'}</span></div>
                    </div>
                </div>
            </div>
          )}
        </div>
        {isArsiv && mac.skor_girildi && parsedDetay.detayli_kaydedildi && (
            <div className="mt-3 pt-3 border-t border-slate-200">
                <button onClick={() => setArsivTamEkranMac(mac)} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 rounded-lg shadow-sm text-xs md:text-sm tracking-widest flex items-center justify-center gap-2 transition-colors">
                    📄 TFF DETAYLI RAPORUNU GÖRÜNTÜLE
                </button>
            </div>
        )}
      </div>
    )
  }

  // 🔥 YENİ: GELİŞİM LİGİ DOSYA YÜKLEME KUTUCUĞU BİLEŞENİ 🔥
  const RenderGelisimUpload = ({ title, imgKey, desc }: { title: string, imgKey: string, desc?: string }) => {
      const foto = ekRaporFotolar[imgKey];
      return (
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between gap-3 shadow-sm mb-2">
              <div className="flex-1">
                  <h5 className="font-bold text-slate-800 text-[11px]">{title}</h5>
                  {desc && <p className="text-[9px] text-slate-500 mt-0.5">{desc}</p>}
              </div>
              <div className="shrink-0 flex items-center gap-2">
                  {foto && <img src={foto} className="w-10 h-10 object-cover rounded border border-slate-300" alt="Önizleme" />}
                  <label className={`cursor-pointer px-3 py-1.5 rounded shadow-sm text-[10px] font-black transition-colors whitespace-nowrap text-white ${foto ? 'bg-slate-700 hover:bg-slate-800' : 'bg-blue-600 hover:bg-blue-700'}`}>
                      {foto ? '🔄 DEĞİŞTİR' : '📸 YÜKLE'}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFotoYukle(imgKey, e)} />
                  </label>
              </div>
          </div>
      );
  }

  const renderTffRaporu = (mac: any, prefix: string) => {
      let safeRaporDetay = prefix === 'aktif' ? raporDetay : parseDetay(mac?.tff_rapor_detaylari);
      const raporTuru = raporTurunuBelirle(mac?.kategori_adi);
      const hakemModu = getHakemGosterimModu(mac?.kategori_adi);
      const hakemBaslik = hakemModu === 'tek_hakem' ? 'HAKEM' : (hakemModu === 'uc_hakem' ? 'HAKEMLER' : 'HAKEMLER VE GÖZLEMCİ');
      const komiserTamIsim = turkceBuyukHarf(seciliKomiser?.ad_soyad || 'KOMİSER');
      const komiserIlkIsim = typeof komiserTamIsim === 'string' ? komiserTamIsim.split(' ')[0] : 'KOMİSER';
      const komiserTelefon = seciliKomiser?.telefon || '';

      const ihracEvListesi = Array.isArray(safeRaporDetay.ihrac_ev) ? safeRaporDetay.ihrac_ev : [];
      const ihracMisListesi = Array.isArray(safeRaporDetay.ihrac_mis) ? safeRaporDetay.ihrac_mis : [];
      const ekRaporlarListesi = Array.isArray(safeRaporDetay.ek_raporlar) ? safeRaporDetay.ek_raporlar : [];
      const maxSatir = Math.max(ihracEvListesi.length, ihracMisListesi.length) || 1;
      const raporTarihi = safeRaporDetay.islem_saati ? new Date(safeRaporDetay.islem_saati).toLocaleDateString('tr-TR') : new Date().toLocaleDateString('tr-TR');

      // 🔥 CANLI ÖNİZLEME VE İNDİRME İÇİN FOTOĞRAF ZEKASI 🔥
      const gelisimPrintFotolar = prefix === 'aktif' 
          ? Object.keys(ekRaporFotolar).filter((k: string) => k.startsWith('gelisim_')).reduce((obj: any, key: string) => { obj[key] = ekRaporFotolar[key]; return obj; }, {})
          : (safeRaporDetay.gelisim_fotolar || {});

      return (
          <div id={`${prefix}-form-${mac?.id}`} className="min-w-[700px] w-full bg-white p-6 border-2 border-black relative font-sans text-black shadow-sm mx-auto flex flex-col gap-6 mobile-zoom">
              <style dangerouslySetInnerHTML={{__html: `@media (max-width: 768px) { .mobile-zoom { zoom: 0.5; } }`}} />
              
              {raporTuru === 'amator' && (
              <div className="border-[3px] border-double border-slate-600 p-4 bolunmez">
                  <div className="flex flex-col items-center mb-6 border-b-[3px] border-double border-red-600 pb-4 relative">
                      <img src={AMATOR_MERKEZ_LOGO} crossOrigin="anonymous" alt="TFF Merkez" className="h-16 w-auto mb-2 drop-shadow-md" />
                      <div className="text-[10px] font-black tracking-widest text-[#E30A17] mb-1">TFF</div>
                      <h2 className="font-extrabold text-xl md:text-2xl tracking-widest mt-1 text-black">TÜRKİYE FUTBOL FEDERASYONU</h2>
                      <h3 className="font-bold text-lg md:text-xl mt-1 text-black">SAHA KOMİSERİ RAPORU</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-0 border border-black mb-6 text-black">
                      <div className="border-r border-black p-2 flex flex-col justify-center border-b border-dashed"><div className="flex items-center gap-2"><span className="text-[10px] font-bold">MÜSABAKANIN YAPILDIĞI YER:</span> <span className="font-black text-xl tracking-wider">İZMİR</span></div></div>
                      <div className="p-2 border-b border-dashed border-black"><div className="flex justify-between items-center"><span className="text-[10px] font-bold">MÜSABAKA NO:</span> <span className="font-bold text-sm text-black">{formatMacKodu(mac?.mac_kodu)}</span></div></div>
                      <div className="p-2 border-r border-b border-dashed border-black bg-slate-100/50 text-center font-bold text-xs">KARŞILAŞAN KULÜPLER</div>
                      <div className="p-2 border-b border-dashed border-black"><div className="flex justify-between items-center"><span className="text-[10px] font-bold">STAD ADI:</span> <span className="font-bold text-xs text-right truncate w-3/4 text-black">{turkceBuyukHarf(mac?.saha || '-')}</span></div></div>
                      <div className="grid grid-cols-4 border-b border-dashed border-black border-r border-l-0">
                          <div className="col-span-3 p-2 flex flex-col justify-center border-r border-dashed border-black"><div className="flex gap-2"><span className="text-[10px] font-bold w-12">EV SAHİBİ:</span> <span className="font-bold text-xs truncate text-black">{turkceBuyukHarf(mac?.ev_sahibi || '-')}</span></div></div>
                          <div className="col-span-1 p-2 flex flex-col items-center justify-center bg-slate-100/30 border-r-0"><span className="text-[10px] font-bold mb-1">SKOR</span><span className="font-black text-lg text-black">{prefix === 'aktif' ? (evSkor || '-') : (mac?.ev_sahibi_skor !== null ? mac?.ev_sahibi_skor : '-')}</span></div>
                      </div>
                      <div className="p-2 border-b border-dashed border-black flex justify-between items-center"><span className="text-[10px] font-bold w-12">KATEGORİ:</span> <span className="font-bold text-[10px] text-right truncate w-2/3 text-black">{turkceBuyukHarf(mac?.kategori_adi || '-')}</span></div>
                      <div className="grid grid-cols-4 border-b border-black border-r border-l-0">
                          <div className="col-span-3 p-2 flex flex-col justify-center border-r border-dashed border-black"><div className="flex gap-2"><span className="text-[10px] font-bold w-12">MİSAFİR:</span> <span className="font-bold text-xs truncate text-black">{turkceBuyukHarf(mac?.misafir_takim || '-')}</span></div></div>
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
                          <div className="flex border-b border-dashed border-black p-1.5 items-center justify-between">
                              <span className="text-[10px] font-bold w-20">HAKEM</span> 
                              {prefix === 'aktif' ? <input list="hakem-listesi" type="text" value={safeRaporDetay?.hakem || ''} onChange={(e: any) => raporDetayGuncelle('hakem', turkceBuyukHarf(e.target.value))} className="w-full text-[11px] outline-none bg-slate-100 border border-slate-300 pl-2 py-1 font-black text-slate-800 ml-2 rounded shadow-sm" placeholder="Seç veya Yeni İsim Yaz..." /> : <span className="w-full text-[11px] font-black ml-2 block text-slate-800">{temizHakem(safeRaporDetay?.hakem)}</span>}
                          </div>
                          {hakemModu !== 'tek_hakem' && (
                              <>
                                  <div className="flex border-b border-dashed border-black p-1.5 items-center justify-between"><span className="text-[10px] font-bold w-20">1.YRD.HAKEM</span> {prefix === 'aktif' ? <input list="hakem-listesi" type="text" value={safeRaporDetay?.y_hakem_1 || ''} onChange={(e: any) => raporDetayGuncelle('y_hakem_1', turkceBuyukHarf(e.target.value))} className="w-full text-[11px] outline-none bg-slate-100 border border-slate-300 pl-2 py-1 font-black text-slate-800 ml-2 rounded shadow-sm" placeholder="Seç veya Yeni İsim Yaz..." /> : <span className="w-full text-[11px] font-black ml-2 block text-slate-800">{temizHakem(safeRaporDetay?.y_hakem_1)}</span>}</div>
                                  <div className="flex border-b border-dashed border-black p-1.5 items-center justify-between"><span className="text-[10px] font-bold w-20">2.YRD.HAKEM</span> {prefix === 'aktif' ? <input list="hakem-listesi" type="text" value={safeRaporDetay?.y_hakem_2 || ''} onChange={(e: any) => raporDetayGuncelle('y_hakem_2', turkceBuyukHarf(e.target.value))} className="w-full text-[11px] outline-none bg-slate-100 border border-slate-300 pl-2 py-1 font-black text-slate-800 ml-2 rounded shadow-sm" placeholder="Seç veya Yeni İsim Yaz..." /> : <span className="w-full text-[11px] font-black ml-2 block text-slate-800">{temizHakem(safeRaporDetay?.y_hakem_2)}</span>}</div>
                              </>
                          )}
                          {hakemModu === 'dort_kutu' && (
                              <div className="flex p-1.5 items-center justify-between"><span className="text-[10px] font-bold w-20">GÖZLEMCİ</span> {prefix === 'aktif' ? <input list="gozlemci-listesi" type="text" value={safeRaporDetay?.gozlemci || ''} onChange={(e: any) => raporDetayGuncelle('gozlemci', turkceBuyukHarf(e.target.value))} className="w-full text-[11px] outline-none bg-slate-100 border border-slate-300 pl-2 py-1 font-black text-slate-800 ml-2 rounded shadow-sm" placeholder="Seç veya Yeni İsim Yaz..." /> : <span className="w-full text-[11px] font-black ml-2 block text-slate-800">{temizHakem(safeRaporDetay?.gozlemci)}</span>}</div>
                          )}
                      </div>
                      <div className="flex flex-col">
                          <div className="flex border-b border-dashed border-black p-1.5 items-center justify-between h-1/2">
                              <span className="text-[10px] font-bold w-24">SAĞLIK MEMURU</span> 
                              {prefix === 'aktif' ? (<select value={safeRaporDetay?.saglik || ''} onChange={(e: any) => raporDetayGuncelle('saglik', e.target.value)} className="w-full text-xs outline-none bg-slate-100 py-1 font-black text-slate-800 ml-2 cursor-pointer text-center rounded border border-slate-300"><option value="">-- SEÇ --</option><option value="var">VAR</option><option value="yok">YOK</option></select>) : (<span className="w-full text-xs font-black ml-2 text-center inline-block">{safeRaporDetay?.saglik === 'var' || safeRaporDetay?.saglik_adi === 'VAR' ? 'VAR' : (safeRaporDetay?.saglik === 'yok' || safeRaporDetay?.saglik_adi === 'YOK' ? 'YOK' : '')}</span>)}
                          </div>
                          <div className="flex p-1.5 items-center justify-between h-1/2">
                              <span className="text-[10px] font-bold w-24">GÜVENLİK</span> 
                              {prefix === 'aktif' ? (<select value={safeRaporDetay?.guvenlik || ''} onChange={(e: any) => raporDetayGuncelle('guvenlik', e.target.value)} className="w-full text-xs outline-none bg-slate-100 py-1 font-black text-slate-800 ml-2 cursor-pointer text-center rounded border border-slate-300"><option value="">-- SEÇ --</option><option value="var">VAR</option><option value="yok">YOK</option></select>) : (<span className="w-full text-xs font-black ml-2 text-center inline-block">{safeRaporDetay?.guvenlik === 'var' || safeRaporDetay?.guvenlik_amiri === 'VAR' ? 'VAR' : (safeRaporDetay?.guvenlik === 'yok' || safeRaporDetay?.guvenlik_amiri === 'YOK' ? 'YOK' : '')}</span>)}
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
                      {Array.from({ length: maxSatir }).map((_, idx: number) => (
                          <div key={`ihrac-${idx}`} className="grid grid-cols-2 text-center text-[11px] border-b border-dashed border-black last:border-b-0 group relative">
                              <div className="grid grid-cols-12 border-r border-black relative">
                                  <div className="col-span-2 p-1 border-r border-dashed border-black">{prefix === 'aktif' ? <input type="text" value={ihracEvListesi[idx]?.forma || ''} onChange={(e: any) => ihracGuncelle('ev', idx, 'forma', turkceBuyukHarf(e.target.value))} className="w-full text-center outline-none bg-slate-50 border border-slate-200 py-1 font-bold text-slate-800 rounded-sm" placeholder="-" /> : <span className="w-full text-center font-bold text-slate-800 block">{ihracEvListesi[idx]?.forma || ''}</span>}</div>
                                  <div className="col-span-7 p-1 border-r border-dashed border-black">{prefix === 'aktif' ? <input type="text" value={ihracEvListesi[idx]?.isim || ''} onChange={(e: any) => ihracGuncelle('ev', idx, 'isim', turkceBuyukHarf(e.target.value))} className="w-full text-left outline-none bg-slate-50 border border-slate-200 px-1 font-bold text-slate-800 rounded-sm" placeholder="" /> : <span className="w-full text-left font-bold text-slate-800 px-1 block">{ihracEvListesi[idx]?.isim || ''}</span>}</div>
                                  <div className="col-span-3 p-1">{prefix === 'aktif' ? <input type="text" value={ihracEvListesi[idx]?.lisans || ''} onChange={(e: any) => ihracGuncelle('ev', idx, 'lisans', turkceBuyukHarf(e.target.value))} className="w-full text-center outline-none bg-slate-50 border border-slate-200 py-1 font-bold text-slate-800 rounded-sm" placeholder="" /> : <span className="w-full text-center font-bold text-slate-800 block">{ihracEvListesi[idx]?.lisans || ''}</span>}</div>
                              </div>
                              <div className="grid grid-cols-12 relative">
                                  <div className="col-span-2 p-1 border-r border-dashed border-black">{prefix === 'aktif' ? <input type="text" value={ihracMisListesi[idx]?.forma || ''} onChange={(e: any) => ihracGuncelle('mis', idx, 'forma', turkceBuyukHarf(e.target.value))} className="w-full text-center outline-none bg-slate-50 border border-slate-200 py-1 font-bold text-slate-800 rounded-sm" placeholder="-" /> : <span className="w-full text-center font-bold text-slate-800 block">{ihracMisListesi[idx]?.forma || ''}</span>}</div>
                                  <div className="col-span-7 p-1 border-r border-dashed border-black">{prefix === 'aktif' ? <input type="text" value={ihracMisListesi[idx]?.isim || ''} onChange={(e: any) => ihracGuncelle('mis', idx, 'isim', turkceBuyukHarf(e.target.value))} className="w-full text-left outline-none bg-slate-50 border border-slate-200 px-1 font-bold text-slate-800 rounded-sm" placeholder="" /> : <span className="w-full text-left font-bold text-slate-800 px-1 block">{ihracMisListesi[idx]?.isim || ''}</span>}</div>
                                  <div className="col-span-3 p-1">{prefix === 'aktif' ? <input type="text" value={ihracMisListesi[idx]?.lisans || ''} onChange={(e: any) => ihracGuncelle('mis', idx, 'lisans', turkceBuyukHarf(e.target.value))} className="w-full text-center outline-none bg-slate-50 border border-slate-200 py-1 font-bold text-slate-800 rounded-sm" placeholder="" /> : <span className="w-full text-center font-bold text-slate-800 block">{ihracMisListesi[idx]?.lisans || ''}</span>}</div>
                              </div>
                          </div>
                      ))}
                      {prefix === 'aktif' && (
                      <div className="grid grid-cols-2 text-center border-t border-black bg-slate-50 tff-no-print" data-html2canvas-ignore>
                          <button onClick={() => ihracSatirEkle('ev')} className="p-1.5 border-r border-black text-blue-600 font-bold text-xs hover:bg-blue-100">+ Ev Sahibi İhraç Ekle</button>
                          <button onClick={() => ihracSatirEkle('mis')} className="p-1.5 text-blue-600 font-bold text-xs hover:bg-blue-100">+ Misafir İhraç Ekle</button>
                      </div>
                      )}
                  </div>
                  <div className="mb-8 text-black">
                      <h3 className="font-bold text-xs text-center border-b border-black pb-1 mb-2 tracking-wide">SEYİRCİ TAŞKINLIKLARI, YÖNETİCİ VE FUTBOLCULARIN HAREKET VE TUTUMLARI</h3>
                      {prefix === 'aktif' ? (<textarea value={safeRaporDetay?.tff_not || ''} onChange={(e: any) => raporDetayGuncelle('tff_not', e.target.value)} className="w-full outline-none bg-slate-50 font-serif text-sm leading-relaxed resize-none overflow-hidden min-h-[150px] border border-slate-300 p-3 shadow-inner rounded-md" placeholder="Olayların detaylarını, varsa zamanı ve numaralarıyla birlikte yazınız..."></textarea>) : (<div className="w-full font-serif text-sm leading-relaxed min-h-[150px] border border-dashed border-slate-300 p-3 rounded-md whitespace-pre-wrap">{safeRaporDetay?.tff_not || mac.rapor_notu || ''}</div>)}
                  </div>
                  <div className="flex justify-between items-end px-4 mt-8 pt-4 text-black">
                      <div className="text-xs font-bold">Rapor düzenlenme tarihi: <span className="ml-2 border-b border-dotted border-black px-2 pb-0.5">{raporTarihi}</span></div>
                      <div className="text-center"><div className="font-serif text-2xl text-slate-800 -mb-2 italic opacity-80" style={{fontFamily: "'Brush Script MT', cursive"}}>{komiserIlkIsim}</div><div className="font-bold text-sm border-b border-black px-4 pb-1">{komiserTamIsim}</div><div className="text-[10px] text-slate-500">GSM Telefon No: {komiserTelefon}</div><div className="text-[10px] font-bold mt-1">SAHA KOMİSERİ</div></div>
                  </div>
              </div>
              )}

              {raporTuru === 'gelisim' && (
              <div className="border-[3px] border-double border-slate-600 p-4 bg-white text-black font-sans bolunmez">
                  <div className="flex items-center justify-between mb-4 border-b-2 border-slate-800 pb-3">
                      <div className="w-1/4 flex justify-start items-center"><img src={GELISIM_SOL_LOGO} crossOrigin="anonymous" alt="TFF Sol" className="h-16 md:h-20 w-auto drop-shadow-md" /></div>
                      <div className="text-center flex-col items-center justify-center w-2/4">
                          <h2 className="font-extrabold text-lg md:text-xl tracking-widest text-black">TÜRKİYE FUTBOL FEDERASYONU</h2>
                          <h3 className="font-bold text-base md:text-lg mt-1 text-black">GELİŞİM LİGLERİ</h3>
                          <h3 className="font-bold text-sm md:text-base mt-1 text-black">MÜSABAKA SAHA KOMİSERİ RAPORU</h3>
                      </div>
                      <div className="w-1/4 flex justify-end items-center"><img src={GELISIM_SAG_LOGO} crossOrigin="anonymous" alt="TFF Sağ" className="h-16 md:h-20 w-auto drop-shadow-md" /></div>
                  </div>

                  <div className="border border-black text-xs font-bold mb-4">
                      <div className="flex border-b border-black text-center bg-slate-100">
                          <div className="w-1/5 border-r border-black p-1.5 flex items-center justify-center">MAÇ TARİHİ</div><div className="w-1/5 border-r border-black p-1.5 flex items-center justify-center">MAÇ SAATİ</div><div className="w-2/5 border-r border-black p-1.5 flex items-center justify-center">STAD ADI(İL/İLÇE)</div><div className="w-1/5 p-1.5 flex items-center justify-center">LİG KATEGORİSİ</div>
                      </div>
                      <div className="flex text-center uppercase">
                          <div className="w-1/5 border-r border-black p-2">{guvenliTarih(mac.tarih)}</div><div className="w-1/5 border-r border-black p-2">{guvenliSaat(mac.saat)}</div><div className="w-2/5 border-r border-black p-2 truncate">{turkceBuyukHarf(mac.saha)}</div><div className="w-1/5 p-2 truncate">{turkceBuyukHarf(mac.kategori_adi)}</div>
                      </div>
                  </div>

                  <div className="border-2 border-black text-xs font-bold mb-6">
                      <div className="grid grid-cols-6 border-b border-black">
                          <div className="col-span-5 border-r border-black p-2 flex gap-2 items-center"><span className="w-40 text-slate-600">EV SAHİBİ TAKIM ADI</span> <span className="text-sm uppercase">{turkceBuyukHarf(mac.ev_sahibi)}</span></div>
                          <div className="col-span-1 grid grid-cols-2 bg-slate-100"><div className="flex items-center justify-center border-r border-slate-300 text-[10px] text-slate-600 font-bold">SKOR</div><div className="flex items-center justify-center text-xl font-black">{prefix === 'aktif' ? (evSkor || '-') : (mac.ev_sahibi_skor !== null ? mac.ev_sahibi_skor : '-')}</div></div>
                      </div>
                      <div className="grid grid-cols-6">
                          <div className="col-span-5 border-r border-black p-2 flex gap-2 items-center"><span className="w-40 text-slate-600">MİSAFİR TAKIM ADI</span> <span className="text-sm uppercase">{turkceBuyukHarf(mac.misafir_takim)}</span></div>
                          <div className="col-span-1 grid grid-cols-2 bg-slate-100"><div className="flex items-center justify-center border-r border-slate-300 text-[10px] text-slate-600 font-bold">SKOR</div><div className="flex items-center justify-center text-xl font-black">{prefix === 'aktif' ? (misafirSkor || '-') : (mac.misafir_skor !== null ? mac.misafir_skor : '-')}</div></div>
                      </div>
                  </div>

                  <h3 className="font-bold text-sm mb-1">GÖREVLİLER</h3>
                  <div className="border border-black text-xs font-bold mb-6">
                      <div className="flex border-b border-black bg-slate-100"><div className="w-1/3 border-r border-black p-1.5">GÖREVİ</div><div className="w-2/3 p-1.5">ADI SOYADI</div></div>
                      <div className="flex border-b border-black"><div className="w-1/3 border-r border-black p-1.5">HAKEM</div><div className="w-2/3 p-1.5">{prefix === 'aktif' ? <input list="hakem-listesi" type="text" value={safeRaporDetay?.hakem || ''} onChange={(e: any) => raporDetayGuncelle('hakem', turkceBuyukHarf(e.target.value))} className="w-full outline-none bg-slate-100 border border-slate-300 px-2 py-1 text-slate-800 font-black rounded" placeholder="Seç veya Yeni İsim Yaz..." /> : <span className="w-full outline-none bg-transparent text-slate-800 font-black block">{temizHakem(safeRaporDetay?.hakem)}</span>}</div></div>
                      <div className="flex border-b border-black"><div className="w-1/3 border-r border-black p-1.5">YARDIMCI HAKEM 1</div><div className="w-2/3 p-1.5">{prefix === 'aktif' ? <input list="hakem-listesi" type="text" value={safeRaporDetay?.y_hakem_1 || ''} onChange={(e: any) => raporDetayGuncelle('y_hakem_1', turkceBuyukHarf(e.target.value))} className="w-full outline-none bg-slate-100 border border-slate-300 px-2 py-1 text-slate-800 font-black rounded" placeholder="Seç veya Yeni İsim Yaz..." /> : <span className="w-full outline-none bg-transparent text-slate-800 font-black block">{temizHakem(safeRaporDetay?.y_hakem_1)}</span>}</div></div>
                      <div className="flex border-b border-black"><div className="w-1/3 border-r border-black p-1.5">YARDIMCI HAKEM 2</div><div className="w-2/3 p-1.5">{prefix === 'aktif' ? <input list="hakem-listesi" type="text" value={safeRaporDetay?.y_hakem_2 || ''} onChange={(e: any) => raporDetayGuncelle('y_hakem_2', turkceBuyukHarf(e.target.value))} className="w-full outline-none bg-slate-100 border border-slate-300 px-2 py-1 text-slate-800 font-black rounded" placeholder="Seç veya Yeni İsim Yaz..." /> : <span className="w-full outline-none bg-transparent text-slate-800 font-black block">{temizHakem(safeRaporDetay?.y_hakem_2)}</span>}</div></div>
                      <div className="flex border-b border-black"><div className="w-1/3 border-r border-black p-1.5">4.HAKEM</div><div className="w-2/3 p-1.5">{prefix === 'aktif' ? <input list="hakem-listesi" type="text" value={safeRaporDetay?.hakem_4 || ''} onChange={(e: any) => raporDetayGuncelle('hakem_4', turkceBuyukHarf(e.target.value))} className="w-full outline-none bg-slate-100 border border-slate-300 px-2 py-1 text-slate-800 font-black rounded" placeholder="Seç veya Yeni İsim Yaz..." /> : <span className="w-full outline-none bg-transparent text-slate-800 font-black block">{temizHakem(safeRaporDetay?.hakem_4)}</span>}</div></div>
                      <div className="flex"><div className="w-1/3 border-r border-black p-1.5">GÖZLEMCİ</div><div className="w-2/3 p-1.5">{prefix === 'aktif' ? <input list="gozlemci-listesi" type="text" value={safeRaporDetay?.gozlemci || ''} onChange={(e: any) => raporDetayGuncelle('gozlemci', turkceBuyukHarf(e.target.value))} className="w-full outline-none bg-slate-100 border border-slate-300 px-2 py-1 text-slate-800 font-black rounded" placeholder="Seç veya Yeni İsim Yaz..." /> : <span className="w-full outline-none bg-transparent text-slate-800 font-black block">{temizHakem(safeRaporDetay?.gozlemci)}</span>}</div></div>
                  </div>

                  <div className="border border-black text-xs font-bold mb-6 w-2/3">
                      <div className="flex border-b border-black">
                          <div className="w-1/2 border-r border-black p-1.5 bg-slate-50">GÜVENLİK GÖREVLİSİ (VAR MI?)</div>
                          <div className="w-1/2 flex items-center justify-center p-1 gap-4">{prefix === 'aktif' ? (<select value={safeRaporDetay?.guvenlik || ''} onChange={(e: any) => raporDetayGuncelle('guvenlik', e.target.value)} className="w-full text-xs outline-none bg-slate-100 py-1 font-black text-slate-800 cursor-pointer text-center rounded border border-slate-200"><option value="">-- SEÇ --</option><option value="var">VAR</option><option value="yok">YOK</option></select>) : (<span className="w-full text-xs font-black text-center inline-block">{safeRaporDetay?.guvenlik === 'var' ? 'VAR' : (safeRaporDetay?.guvenlik === 'yok' ? 'YOK' : '')}</span>)}</div>
                      </div>
                      {safeRaporDetay?.guvenlik === 'var' && (
                          <>
                              <div className="flex border-b border-black bg-slate-50/50"><div className="w-1/2 border-r border-black p-1.5 text-[10px] text-slate-700">↳ GÜVENLİK AMİRİ ADI SOYADI</div><div className="w-1/2 p-1.5">{prefix === 'aktif' ? <input type="text" value={safeRaporDetay?.guvenlik_amiri || ''} onChange={(e: any) => raporDetayGuncelle('guvenlik_amiri', turkceBuyukHarf(e.target.value))} className="w-full outline-none bg-white border border-slate-300 px-2 py-1 rounded font-black placeholder:text-slate-300 placeholder:font-normal" placeholder="Ad Soyad yazınız..." /> : <span className="w-full text-xs font-black text-left inline-block">{temizHakem(safeRaporDetay?.guvenlik_amiri)}</span>}</div></div>
                              <div className="flex border-b border-black bg-slate-50/50"><div className="w-1/2 border-r border-black p-1.5 text-[10px] text-slate-700">↳ GÜVENLİK AMİRİ TELEFON</div><div className="w-1/2 p-1.5">{prefix === 'aktif' ? <input type="text" value={safeRaporDetay?.guvenlik_telefon || ''} onChange={(e: any) => raporDetayGuncelle('guvenlik_telefon', e.target.value)} className="w-full outline-none bg-white border border-slate-300 px-2 py-1 rounded font-black placeholder:text-slate-300 placeholder:font-normal" placeholder="Telefon numarası..." /> : <span className="w-full text-xs font-black text-left inline-block">{temizHakem(safeRaporDetay?.guvenlik_telefon)}</span>}</div></div>
                          </>
                      )}

                      <div className="flex border-b border-black">
                          <div className="w-1/2 border-r border-black p-1.5 bg-slate-50">SAĞLIK MEMURU (VAR MI?)</div>
                          <div className="w-1/2 flex items-center justify-center p-1 gap-4">{prefix === 'aktif' ? (<select value={safeRaporDetay?.saglik || ''} onChange={(e: any) => raporDetayGuncelle('saglik', e.target.value)} className="w-full text-xs outline-none bg-slate-100 py-1 font-black text-slate-800 cursor-pointer text-center rounded border border-slate-300"><option value="">-- SEÇ --</option><option value="var">VAR</option><option value="yok">YOK</option></select>) : (<span className="w-full text-xs font-black text-center inline-block">{safeRaporDetay?.saglik === 'var' ? 'VAR' : (safeRaporDetay?.saglik === 'yok' ? 'YOK' : '')}</span>)}</div>
                      </div>
                      {safeRaporDetay?.saglik === 'var' && (
                          <>
                              <div className="flex border-b border-black bg-slate-50/50"><div className="w-1/2 border-r border-black p-1.5 text-[10px] text-slate-700">↳ SAĞLIK MEMURU ADI SOYADI</div><div className="w-1/2 p-1.5">{prefix === 'aktif' ? <input type="text" value={safeRaporDetay?.saglik_adi || ''} onChange={(e: any) => raporDetayGuncelle('saglik_adi', turkceBuyukHarf(e.target.value))} className="w-full outline-none bg-white border border-slate-300 px-2 py-1 rounded font-black placeholder:text-slate-300 placeholder:font-normal" placeholder="Ad Soyad yazınız..." /> : <span className="w-full text-xs font-black text-left inline-block">{temizHakem(safeRaporDetay?.saglik_adi)}</span>}</div></div>
                              <div className="flex bg-slate-50/50"><div className="w-1/2 border-r border-black p-1.5 text-[10px] text-slate-700">↳ SAĞLIK MEMURU TELEFON</div><div className="w-1/2 p-1.5">{prefix === 'aktif' ? <input type="text" value={safeRaporDetay?.saglik_telefon || ''} onChange={(e: any) => raporDetayGuncelle('saglik_telefon', e.target.value)} className="w-full outline-none bg-white border border-slate-300 px-2 py-1 rounded font-black placeholder:text-slate-300 placeholder:font-normal" placeholder="Telefon numarası..." /> : <span className="w-full text-xs font-black text-left inline-block">{temizHakem(safeRaporDetay?.saglik_telefon)}</span>}</div></div>
                          </>
                      )}
                  </div>

                  <div className="bg-slate-100 p-2 font-black text-sm mb-2">I) ORGANİZASYON :</div>
                  <div className="mb-4 text-xs font-medium space-y-1">
                      <p className="mb-2">(a) Saha Komiserinin oyun alanına gidişi ve oyun alanını kontrolü</p>
                      {gelisimOrganizasyon.map((soru: any) => renderGelisimCheckbox(soru.text, safeRaporDetay?.gelisim_sorular?.[soru.id], (val:any) => gelisimGuncelle(soru.id, val), soru.id, prefix === 'aktif'))}
                      <p className="mt-4 mb-1">(b) Müsabaka sonu değerlendirmesi</p>
                      {prefix === 'aktif' ? <textarea value={safeRaporDetay?.gelisim_sorular?.degerlendirme || ''} onChange={(e: any) => gelisimGuncelle('degerlendirme', e.target.value)} className="w-full border border-slate-300 bg-white p-2 outline-none resize-none h-10 rounded"></textarea> : <div className="w-full border-b border-dashed border-black min-h-[40px]">{safeRaporDetay?.gelisim_sorular?.degerlendirme || ''}</div>}
                  </div>

                  <div className="bg-slate-100 p-2 font-black text-sm mb-2">II) TEKNİK HUSUSLAR :</div>
                  <div className="mb-4 text-xs font-medium space-y-1">
                      <p className="mb-2">a) Aşağıdaki tesis / malzemeler standarlara uygun mudur? (dk. - 60'da kontrol edilecektir )</p>
                      {gelisimTeknik.map((soru: any) => renderGelisimCheckbox(soru.text, safeRaporDetay?.gelisim_sorular?.[soru.id], (val:any) => gelisimGuncelle(soru.id, val), soru.id, prefix === 'aktif'))}
                      <div className="mt-4 space-y-2">
                          {renderGelisimCheckbox("b) Her iki kulüp Müsabaka isim listelerinin, kulüp lisansları ile akreditasyon listelerinin kontrolleri yapılarak hakemlere teslimi denetlendi mi?", safeRaporDetay?.gelisim_sorular?.isim_listeleri, (val:any) => gelisimGuncelle('isim_listeleri', val), 'isim_listeleri', prefix === 'aktif')}
                          {renderGelisimCheckbox("c) Takımlar koyu ve açık renk forma setlerini getirdi mi?", safeRaporDetay?.gelisim_sorular?.forma_setleri, (val:any) => gelisimGuncelle('forma_setleri', val), 'forma_setleri', prefix === 'aktif')}
                          {renderGelisimCheckbox("d) Stadyum WC'leri hijyenik mi? Temizliği yapılmış mı?", safeRaporDetay?.gelisim_sorular?.wc_hijyen, (val:any) => gelisimGuncelle('wc_hijyen', val), 'wc_hijyen', prefix === 'aktif')}
                      </div>
                  </div>

                  <div className="bg-slate-100 p-2 font-black text-sm mb-2">III) GÜVENLİK KONULARI :</div>
                  <div className="mb-4 text-xs font-medium space-y-2">
                      <div className="flex flex-col border-b border-dashed border-slate-300 pb-2"><span>a) Misafir takım geliş ve gidişleri nasıl sağlandı ?</span>{prefix === 'aktif' ? <input type="text" value={safeRaporDetay?.gelisim_sorular?.misafir_gelis_gidis || ''} onChange={(e: any) => gelisimGuncelle('misafir_gelis_gidis', e.target.value)} className="w-full outline-none bg-white border border-slate-300 mt-1 p-1" /> : <span className="w-full border-b border-dotted border-black mt-1 block">{safeRaporDetay?.gelisim_sorular?.misafir_gelis_gidis || ''}</span>}</div>
                      {renderGelisimCheckbox("b) Her iki takım yöneticilerine soyunma odalarına ve koridorlara girebilecek kişiler konusundaki kısıtlamaları ve akreditasyon kartı mecburiyeti hatırlatıldı mı ?", safeRaporDetay?.gelisim_sorular?.soyunma_odasi_kisitlama, (val:any) => gelisimGuncelle('soyunma_odasi_kisitlama', val), 'soyunma_odasi_kisitlama', prefix === 'aktif')}
                      {renderGelisimCheckbox("c) Misafir takım yöneticileri için tribünde uygun yer ayrıldı mı ?", safeRaporDetay?.gelisim_sorular?.misafir_tribun_yer, (val:any) => gelisimGuncelle('misafir_tribun_yer', val), 'misafir_tribun_yer', prefix === 'aktif')}
                      <div className="flex items-center gap-2 border-b border-dashed border-slate-300 py-2"><span>d) Müsabakada görevli Resmi Güvenlik sayısı :</span>{prefix === 'aktif' ? <input type="number" value={safeRaporDetay?.gelisim_sorular?.guvenlik_sayisi || ''} onChange={(e: any) => gelisimGuncelle('guvenlik_sayisi', e.target.value)} className="w-16 border border-slate-300 bg-white text-center outline-none p-1" /> : <span className="font-bold border-b border-black w-16 text-center inline-block">{safeRaporDetay?.gelisim_sorular?.guvenlik_sayisi || '-'}</span>}<span>Kişi</span></div>
                  </div>

                  <div className="bg-slate-100 p-2 font-black text-sm mb-2">IV) İŞLETİMSEL EKSİKLİK :</div>
                  <div className="mb-4 text-xs font-medium space-y-1">
                      <p>Sahadaki eksikliklerin tespit edilerek yazılması,</p>
                      <div className="flex items-center gap-2"><span>1-</span>{prefix === 'aktif' ? <input type="text" value={safeRaporDetay?.gelisim_sorular?.isletimsel_1 || ''} onChange={(e: any) => gelisimGuncelle('isletimsel_1', e.target.value)} className="flex-1 outline-none bg-white border border-slate-300 p-1" /> : <span className="flex-1 border-b border-dotted border-black">{safeRaporDetay?.gelisim_sorular?.isletimsel_1 || ''}</span>}</div>
                      <div className="flex items-center gap-2"><span>2-</span>{prefix === 'aktif' ? <input type="text" value={safeRaporDetay?.gelisim_sorular?.isletimsel_2 || ''} onChange={(e: any) => gelisimGuncelle('isletimsel_2', e.target.value)} className="flex-1 outline-none bg-white border border-slate-300 p-1" /> : <span className="flex-1 border-b border-dotted border-black">{safeRaporDetay?.gelisim_sorular?.isletimsel_2 || ''}</span>}</div>
                      <div className="flex items-center gap-2"><span>3-</span>{prefix === 'aktif' ? <input type="text" value={safeRaporDetay?.gelisim_sorular?.isletimsel_3 || ''} onChange={(e: any) => gelisimGuncelle('isletimsel_3', e.target.value)} className="flex-1 outline-none bg-white border border-slate-300 p-1" /> : <span className="flex-1 border-b border-dotted border-black">{safeRaporDetay?.gelisim_sorular?.isletimsel_3 || ''}</span>}</div>
                  </div>

                  <div className="bg-slate-100 p-2 font-black text-sm mb-2">OLUMLU BULUNMAYAN DİĞER HUSUSLAR :</div>
                  {prefix === 'aktif' ? <textarea value={safeRaporDetay?.gelisim_sorular?.olumsuz_diger || ''} onChange={(e: any) => gelisimGuncelle('olumsuz_diger', e.target.value)} className="w-full border border-slate-300 bg-white p-2 outline-none resize-none min-h-[50px] mb-4 text-xs"></textarea> : <div className="w-full border-b border-dashed border-black min-h-[50px] mb-4 text-xs whitespace-pre-wrap">{safeRaporDetay?.gelisim_sorular?.olumsuz_diger || ''}</div>}

                  <div className="mb-4">
                      <h3 className="font-bold text-xs uppercase mb-1">MÜSABAKA ÖNCESİ, DEVAMI VE BİTİMİNDEKİ OLAYLAR:</h3>
                      <p className="text-[10px] mb-1">(Yönetici,Teknik Adamlar,Futbolcular,Kulüp görevlileri vb.kişilerin eylemleri ayrı ayrı detaylı bir şekilde yazılacaktır.)</p>
                      {prefix === 'aktif' ? (<textarea value={safeRaporDetay?.tff_not || ''} onChange={(e: any) => raporDetayGuncelle('tff_not', e.target.value)} className="w-full outline-none bg-slate-50 font-serif text-sm leading-relaxed resize-none overflow-hidden min-h-[150px] border border-slate-300 p-3 shadow-inner rounded-md" placeholder="Olayların detaylarını, varsa zamanı ve numaralarıyla birlikte yazınız..."></textarea>) : (<div className="w-full font-serif text-sm leading-relaxed min-h-[150px] border border-dashed border-slate-300 p-3 rounded-md whitespace-pre-wrap">{safeRaporDetay?.tff_not || mac.rapor_notu || ''}</div>)}
                  </div>

                  <div className="flex justify-between items-end px-4 mt-8 pt-4 text-black">
                      <div className="text-xs font-bold">Rapor düzenlenme tarihi: <span className="ml-2 border-b border-dotted border-black px-2 pb-0.5">{raporTarihi}</span></div>
                      <div className="text-center"><div className="font-serif text-2xl text-slate-800 -mb-2 italic opacity-80" style={{fontFamily: "'Brush Script MT', cursive"}}>{komiserIlkIsim}</div><div className="font-bold text-sm border-b border-black px-4 pb-1">{komiserTamIsim}</div><div className="text-[10px] text-slate-500">GSM Telefon No: {komiserTelefon}</div><div className="text-[10px] font-bold mt-1">SAHA KOMİSERİ</div></div>
                  </div>
              </div>
              )}

              {/* 🔥 YENİ GELİŞİM LİGİ FOTOĞRAFLARI (İNDİRME VE ÖNİZLEME İÇİN ÇİZİM ZEKASI) 🔥 */}
              {raporTuru === 'gelisim' && Object.keys(gelisimPrintFotolar).length > 0 && (
                  <div className="border-[3px] border-double border-slate-600 p-6 bg-white text-black font-sans mt-8 page-break-before-always bolunmez">
                      <div className="flex items-center gap-3 border-b-2 border-slate-800 pb-3 mb-6">
                          <span className="text-3xl">📸</span>
                          <div>
                              <h3 className="font-black text-lg tracking-widest text-slate-800 uppercase">GELİŞİM LİGİ RESMİ EVRAKLARI</h3>
                              <p className="text-xs text-slate-500 font-bold uppercase">{mac?.ev_sahibi} vs {mac?.misafir_takim}</p>
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          {Object.entries(gelisimPrintFotolar).map(([key, url]) => {
                              if (!url) return null;
                              
                              let title = "Akreditasyon Kartı / Esame";
                              if(key === 'gelisim_ev_esame') title = `Ev Sahibi Esame Listesi`;
                              if(key === 'gelisim_ev_teknik') title = `Ev Sahibi Sahaya Girecekler (Teknik Kadro)`;
                              if(key === 'gelisim_mis_esame') title = `Misafir Takım Esame Listesi`;
                              if(key === 'gelisim_mis_teknik') title = `Misafir Takım Sahaya Girecekler (Teknik Kadro)`;
                              if(key === 'gelisim_saglik') title = `Doktor / ATT Kartı`;
                              if(key === 'gelisim_sedyeci1') title = `1. Sedyeci Kartı`;
                              if(key === 'gelisim_sedyeci2') title = `2. Sedyeci Kartı`;
                              if(key === 'gelisim_saha_gor') title = `Saha Tanzim Görevlisi`;

                              return (
                                  <div key={key} className="border border-slate-300 p-2 rounded-lg bg-slate-50 flex flex-col items-center">
                                      <h4 className="text-[10px] font-black tracking-widest text-slate-700 mb-2 border-b border-slate-200 w-full text-center pb-1 uppercase">{title}</h4>
                                      <img src={url as string} crossOrigin="anonymous" alt={title} className="w-full h-auto max-h-[350px] object-contain border border-slate-300 shadow-sm" />
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              )}

              {/* 🔥 YENİ GELİŞİM LİGİ FOTOĞRAF YÜKLEME ALANI (SADECE KOMİSER EKRANI İÇİN) 🔥 */}
              {prefix === 'aktif' && raporTuru === 'gelisim' && (
                  <div className="border-[3px] border-double border-slate-600 p-4 md:p-6 bg-white text-black font-sans mt-8 tff-no-print">
                      <div className="flex items-center gap-3 border-b-2 border-slate-800 pb-3 mb-6">
                          <span className="text-3xl">📸</span>
                          <div>
                              <h3 className="font-black text-lg tracking-widest text-slate-800">GELİŞİM LİGİ RESMİ EVRAKLARI</h3>
                              <p className="text-xs text-slate-500 font-bold">Lütfen takım esamelerini ve teknik kadro listelerini (A4) okunaklı şekilde yükleyiniz.</p>
                          </div>
                      </div>

                      <div className="space-y-8">
                          {/* EV SAHİBİ */}
                          <div>
                              <h4 className="font-black text-sm bg-blue-100 text-blue-800 p-2 rounded border border-blue-200 mb-3 tracking-widest uppercase">🏠 EV SAHİBİ: {turkceBuyukHarf(mac?.ev_sahibi)}</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                                  <RenderGelisimUpload title="1. Esame Listesi (Futbolcular)" imgKey="gelisim_ev_esame" desc="Ev sahibi takımın tam esame listesi" />
                                  <RenderGelisimUpload title="2. Sahaya Girecekler Listesi" imgKey="gelisim_ev_teknik" desc="Kulübün verdiği toplu A4 belgesi" />
                              </div>
                          </div>

                          {/* MİSAFİR */}
                          <div>
                              <h4 className="font-black text-sm bg-amber-100 text-amber-800 p-2 rounded border border-amber-200 mb-3 tracking-widest uppercase">🚌 MİSAFİR: {turkceBuyukHarf(mac?.misafir_takim)}</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                                  <RenderGelisimUpload title="1. Esame Listesi (Futbolcular)" imgKey="gelisim_mis_esame" desc="Misafir takımın tam esame listesi" />
                                  <RenderGelisimUpload title="2. Sahaya Girecekler Listesi" imgKey="gelisim_mis_teknik" desc="Kulübün verdiği toplu A4 belgesi" />
                              </div>
                          </div>

                          {/* SAĞLIK VE SAHA */}
                          <div>
                              <h4 className="font-black text-sm bg-emerald-100 text-emerald-800 p-2 rounded border border-emerald-200 mb-3 tracking-widest uppercase">🏥 SAĞLIK VE SAHA GÖREVLİLERİ</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                                  <RenderGelisimUpload title="Doktor / Sağlıkçı (ATT) Kartı" imgKey="gelisim_saglik" desc="Maçta görevli sağlık personeli" />
                                  <RenderGelisimUpload title="1. Sedyeci Kartı" imgKey="gelisim_sedyeci1" desc="Ev sahibi takım sedyecisi" />
                                  <RenderGelisimUpload title="2. Sedyeci Kartı" imgKey="gelisim_sedyeci2" desc="İkinci sedyeci" />
                                  <RenderGelisimUpload title="Saha Tanzim Görevlisi" imgKey="gelisim_saha_gor" desc="Saha komiseri yardımcısı/tanzim" />
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* 🔥 ESKİ USUL EK RAPORLAR (AMATÖR VEYA EKSTRA KANIT İÇİN) 🔥 */}
              {ekRaporlarListesi.map((ekRapor: any, index: number) => (
                  <div key={ekRapor.id} className="border-[3px] border-double border-slate-600 p-8 bg-white text-black font-sans relative mt-8 page-break-before-always bolunmez">
                      {prefix === 'aktif' && <button onClick={() => ekRaporSil(ekRapor.id)} className="tff-no-print absolute top-2 right-2 bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1 rounded text-xs font-bold border border-red-200 transition-colors">🗑️ Bu Ek Raporu Sil</button>}
                      
                      {raporTuru === 'amator' ? (
                          <div className="flex flex-col items-center mb-8 border-b-[3px] border-double border-red-600 pb-4 text-center">
                              <img src={AMATOR_MERKEZ_LOGO} crossOrigin="anonymous" alt="TFF Merkez" className="h-16 w-auto mb-2 drop-shadow-md" />
                              <h2 className="font-extrabold text-xl md:text-2xl tracking-widest text-black">TÜRKİYE FUTBOL FEDERASYONU</h2>
                              <h3 className="font-bold text-lg md:text-xl mt-2 text-black">SAHA KOMİSERİ EK RAPOR (EK-{index + 1})</h3>
                          </div>
                      ) : (
                          <div className="flex items-center justify-between mb-8 border-b-2 border-red-600 pb-4">
                              <div className="w-1/4 flex justify-start items-center"><img src={GELISIM_SOL_LOGO} crossOrigin="anonymous" alt="TFF Sol" className="h-16 md:h-20 w-auto drop-shadow-md" /></div>
                              <div className="text-center flex flex-col items-center justify-center w-2/4">
                                  <h2 className="font-extrabold text-xl md:text-2xl tracking-widest text-black">TÜRKİYE FUTBOL FEDERASYONU</h2>
                                  <h3 className="font-bold text-lg md:text-xl mt-2 text-black">SAHA KOMİSERİ EK RAPOR (EK-{index + 1})</h3>
                              </div>
                              <div className="w-1/4 flex justify-end items-center"><img src={GELISIM_SAG_LOGO} crossOrigin="anonymous" alt="TFF Sağ" className="h-16 md:h-20 w-auto drop-shadow-md" /></div>
                          </div>
                      )}

                      <div className="flex border-b border-black text-sm font-bold mb-6">
                          <div className="w-1/2 border-r border-black p-2 flex gap-2"><span className="text-slate-500">MÜSABAKA:</span> <span>{turkceBuyukHarf(mac?.ev_sahibi)} - {turkceBuyukHarf(mac?.misafir_takim)}</span></div>
                          <div className="w-1/4 border-r border-black p-2 flex gap-2"><span className="text-slate-500">TARİH:</span> <span>{guvenliTarih(mac?.tarih)}</span></div>
                          <div className="w-1/4 p-2 flex gap-2"><span className="text-slate-500">MÜSABAKA NO:</span> <span>{formatMacKodu(mac?.mac_kodu)}</span></div>
                      </div>

                      <div className="mb-6">
                          <h3 className="font-bold text-sm bg-slate-100 p-2 border border-slate-300 text-black">OLAY DETAYI VE EK AÇIKLAMA:</h3>
                          {prefix === 'aktif' ? <textarea value={ekRapor.text} onChange={(e: any) => ekRaporGuncelle(ekRapor.id, e.target.value)} className="w-full outline-none border border-slate-300 bg-slate-50 min-h-[200px] p-4 text-sm text-black rounded" placeholder="Buraya olayla ilgili detaylı ek raporunuzu yazabilirsiniz..."></textarea> : <div className="w-full min-h-[200px] p-4 border border-dashed border-black whitespace-pre-wrap">{ekRapor.text}</div>}
                      </div>

                      <div className="mb-8 border border-dashed border-black p-4 min-h-[300px] flex flex-col items-center justify-center relative">
                          <h3 className="font-bold text-sm mb-4 absolute top-0 left-0 bg-white px-2 -mt-2 ml-4 text-black">FOTOĞRAFLI KANIT (VARSA)</h3>
                          
                          {ekRaporFotolar[ekRapor.id] ? (
                              <img src={ekRaporFotolar[ekRapor.id]} crossOrigin="anonymous" alt={`Ek Kanıt ${index + 1}`} className="max-w-full max-h-[400px] object-contain shadow-sm border border-slate-200" />
                          ) : (
                              <div className="text-slate-400 text-center tff-no-print"><span className="text-4xl block mb-2">📸</span><p className="text-sm font-bold">Kanıt Fotoğrafı Yükle</p></div>
                          )}
                          
                          {prefix === 'aktif' && (
                          <label className="tff-no-print absolute bottom-4 right-4 cursor-pointer bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded text-xs font-bold shadow-md transition-colors">
                              {ekRaporFotolar[ekRapor.id] ? 'Fotoğrafı Değiştir' : 'Görsel Seç'}
                              <input type="file" accept="image/*" className="hidden" onChange={(e: any) => handleFotoYukle(ekRapor.id, e)} />
                          </label>
                          )}
                      </div>

                      <div className="flex justify-between items-end mt-12">
                          <div className="text-center w-1/3">
                              <div className="font-serif text-2xl text-slate-800 -mb-2 italic opacity-80" style={{fontFamily: "'Brush Script MT', cursive"}}>{komiserIlkIsim}</div>
                              <div className="font-bold text-sm border-b border-black px-4 pb-1 text-black">{komiserTamIsim}</div>
                              <div className="text-[10px] font-bold mt-1 text-black">SAHA KOMİSERİ</div>
                          </div>
                      </div>
                  </div>
              ))}

              {prefix === 'aktif' && (
              <div className="tff-no-print flex justify-center mt-4">
                  <button onClick={ekRaporEkle} className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all text-sm flex items-center justify-center gap-2 border border-slate-600">
                      <span className="text-lg">📸</span> + EK RAPOR (AMATÖR VEYA EKSTRA KANIT) EKLE
                  </button>
              </div>
              )}

          </div>
      );
  }

  // ==========================================
  // ANA EKRAN YÖNLENDİRİCİSİ (RENDER AKIŞI)
  // ==========================================
  const gercekAktifEkran = zorunluMazeret ? 'mazeretBildir' : aktifEkran;
  let ekranIcerigi = null;

  if (gercekAktifEkran === 'mazeretBildir') {
      ekranIcerigi = (
        <main className="min-h-screen bg-slate-100 flex flex-col font-sans">
          {renderOrtakHeader(!zorunluMazeret)}
          {mazeretKaydedildi ? (<div className="flex-1 flex items-center justify-center p-4"><div className="bg-emerald-50 border-2 border-emerald-500 text-emerald-800 p-8 md:p-10 rounded-2xl text-center shadow-xl animate-fade-in-up max-w-md w-full"><span className="text-6xl md:text-7xl block mb-5 drop-shadow-md">✅</span><h3 className="text-xl md:text-2xl font-black tracking-widest mb-3 text-emerald-900">BAŞARILI!</h3><p className="font-bold text-sm md:text-base leading-relaxed">Müsaitlik / Mazeret bildiriminiz İzmir Şube Yönetimine başarıyla iletilmiştir.</p><div className="mt-6 flex justify-center"><div className="w-8 h-8 border-4 border-emerald-300 border-t-emerald-700 rounded-full animate-spin"></div></div><p className="text-[10px] md:text-xs mt-3 text-emerald-600 font-bold tracking-widest">Sisteme Yönlendiriliyorsunuz...</p></div></div>) : (
              <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 overflow-y-auto">
                 <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 border border-slate-200">
                    
                    {zorunluMazeret && (
                      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl shadow-sm">
                          <h3 className="text-red-800 font-black text-sm md:text-base flex items-center gap-2">
                              <span className="text-xl">⚠️</span> ZORUNLU İŞLEM
                          </h3>
                          <p className="text-red-700 text-xs md:text-sm mt-1 font-medium">
                              Sisteme giriş yapabilmek ve görev alabilmek için önümüzdeki haftanın müsaitlik durumunu bildirmeniz zorunludur. Lütfen aşağıdaki seçeneklerden birini işaretleyerek kaydediniz.
                          </p>
                      </div>
                    )}

                    <div className="text-center md:text-left border-b border-slate-100 pb-4 mb-6"><h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">MÜSAİTLİK VE MAZERET BİLDİRİMİ</h2><p className="text-sm md:text-base font-bold text-slate-500 mt-2">Önümüzdeki {globalAktifHaftaNo + 1}. Hafta için görev alma durumunuzu belirtiniz.</p></div>
                    <div className="space-y-4 mb-8"><button onClick={() => { setMazeretTipi('yok'); setKompleYokum(true); }} className={`w-full p-5 md:p-6 rounded-xl border-2 font-black text-left tracking-wide transition-all ${mazeretTipi === 'yok' ? 'border-red-400 bg-red-50 text-red-800 shadow-sm' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}><span className="text-xl mr-2">⛔</span> TÜM HAFTA MAZERETLİYİM (GÖREV İSTEMİYORUM)</button><button onClick={() => { setMazeretTipi('full'); setKompleYokum(false); }} className={`w-full p-5 md:p-6 rounded-xl border-2 font-black text-left tracking-wide transition-all ${mazeretTipi === 'full' ? 'border-blue-400 bg-blue-50 text-blue-800 shadow-sm' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}><span className="text-xl mr-2">✅</span> TÜM HAFTA MÜSAİTİM (MERKEZ/DEPLASMAN UYAR)</button><button onClick={() => { setMazeretTipi('secmeli'); setKompleYokum(false); }} className={`w-full p-5 md:p-6 rounded-xl border-2 font-black text-left tracking-wide transition-all ${mazeretTipi === 'secmeli' ? 'border-amber-400 bg-amber-50 text-amber-800 shadow-sm' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}><span className="text-xl mr-2">📅</span> SADECE SEÇTİĞİM GÜNLER VE SAATLER MÜSAİTİM</button></div>
                    {mazeretTipi === 'full' && (<div className="bg-blue-50 p-6 rounded-xl mb-8 border border-blue-200 animate-fade-in-down shadow-sm"><h4 className="font-black text-blue-900 mb-4 text-sm tracking-widest">HANGİ BÖLGELERDE GÖREV ALABİLİRSİNİZ?</h4><div className="flex gap-6"><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={genelMerkez} onChange={(e: any) => setGenelMerkez(e.target.checked)} className="w-6 h-6 text-blue-600 rounded focus:ring-blue-500 cursor-pointer" /><span className="font-bold text-slate-800 text-base">MERKEZ</span></label><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={genelDeplasman} onChange={(e: any) => setGenelDeplasman(e.target.checked)} className="w-6 h-6 text-blue-600 rounded focus:ring-blue-500 cursor-pointer" /><span className="font-bold text-slate-800 text-base">DEPLASMAN</span></label></div></div>)}
                    {mazeretTipi === 'secmeli' && (<div className="mb-8 animate-fade-in-down space-y-3"><h4 className="font-black text-slate-700 mb-4 text-sm tracking-widest px-2">MÜSAİT OLDUĞUNUZ GÜNLERİ SEÇİNİZ</h4>{renderGunSatiri('cuma', 'CUMA')}{renderGunSatiri('cumartesi', 'CUMARTESİ')}{renderGunSatiri('pazar', 'PAZAR')}{renderGunSatiri('pazartesi', 'PAZARTESİ')}{renderGunSatiri('sali', 'SALI')}{renderGunSatiri('carsamba', 'ÇARŞAMBA')}{renderGunSatiri('persembe', 'PERŞEMBE')}</div>)}
                    <div className="mb-8"><label className="block text-xs font-black text-slate-500 tracking-widest mb-3">SİSTEM NOTU (OPSİYONEL)</label><textarea value={mazeretNotu} onChange={(e: any) => setMazeretNotu(e.target.value)} className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none min-h-[120px] font-medium text-sm text-slate-700 bg-slate-50 transition-colors" placeholder="Varsa şube yönetimine iletmek istediğiniz özel bir not..."></textarea></div>
                    <button onClick={mazeretKaydet} disabled={mazeretKaydediliyor || (!mazeretTipi && !kompleYokum)} className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-50 disabled:hover:bg-slate-800 text-white font-black py-5 rounded-xl shadow-sm tracking-widest transition-transform hover:scale-[1.01] flex items-center justify-center gap-2">{mazeretKaydediliyor ? '⚙️ İŞLENİYOR...' : '🚀 BİLDİRİMİ GÖNDER'}</button>
                 </div>
              </div>
          )}
        </main>
      );
  } else if (gercekAktifEkran === 'giris') {
      ekranIcerigi = (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-[#dc2626] to-[#b91c1c] rounded-b-[50%] scale-150 transform -translate-y-1/4 shadow-2xl opacity-90"></div>
          <div className="bg-white p-8 md:p-10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] max-w-sm w-full text-center relative z-10 border border-slate-100">
            <div className="flex justify-center mb-6"><div className="w-24 h-24 bg-white rounded-full p-2 shadow-lg border border-slate-100 -mt-16 flex items-center justify-center"><img src={DERNEK_LOGO} crossOrigin="anonymous" alt="TFF Logo" className="w-[85%] h-[85%] object-contain" /></div></div>
            <h1 className="text-sm font-black tracking-widest text-slate-800 leading-snug mb-1">TÜRKİYE FUTBOL SAHA KOMİSERLERİ DERNEĞİ</h1><h2 className="text-[11px] font-bold text-red-600 tracking-widest mb-8">İZMİR ŞUBESİ SAHA OPERASYON SİSTEMİ</h2>
            <form onSubmit={girisYap} className="space-y-4">
              <div><input type="text" placeholder="Sicil Numaranız" value={kullaniciIdInput} onChange={(e: any) => setKullaniciIdInput(e.target.value)} onKeyDown={enterTusuKontrol} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3.5 text-center text-slate-800 font-black tracking-[0.2em] text-lg focus:outline-none focus:border-red-500 focus:bg-white transition-all shadow-inner" required /></div>
              <div><input type="password" placeholder="4 Haneli Şifreniz" value={sifreInput} onChange={(e: any) => setSifreInput(e.target.value)} onKeyDown={enterTusuKontrol} maxLength={4} inputMode="numeric" pattern="\d{4}" className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3.5 text-center text-slate-800 font-black tracking-[0.5em] text-lg focus:outline-none focus:border-red-500 focus:bg-white transition-all shadow-inner" required /></div>
              {girisHatasi && <p className="text-red-500 text-xs font-bold text-center bg-red-50 p-2 rounded-lg border border-red-100">{girisHatasi}</p>}
              <button type="submit" disabled={girisYukleniyor} className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white font-black py-4 rounded-xl tracking-widest shadow-[0_8px_20px_rgba(220,38,38,0.3)] transition-all disabled:opacity-50 hover:-translate-y-0.5 mt-2">{girisYukleniyor ? 'GİRİŞ YAPILIYOR...' : 'SİSTEME GİRİŞ YAP'}</button>
              <div className="pt-2"><button type="button" onClick={() => setSifremiUnuttumAcik(true)} className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors underline decoration-dotted">Şifremi Unuttum</button></div>
            </form>
          </div>
          <div className="absolute bottom-6 text-[10px] text-slate-400 font-medium tracking-widest text-center w-full z-10">SAHAKOM-OS TÜRKİYE © 2026<br/>TÜM HAKLARI SAKLIDIR</div>
        </div>
      );
  } else if (gercekAktifEkran === 'dashboard') {
      ekranIcerigi = (
        <main className="min-h-screen bg-slate-100 flex flex-col font-sans">
          {renderOrtakHeader(false)}
          <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6">
            {sifreUyariGoster && (<div className="bg-red-50 border border-red-200 p-4 rounded-xl shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse"><div className="flex items-center gap-3"><span className="text-2xl">⚠️</span><div className="text-left"><h4 className="text-red-800 font-black text-sm tracking-wide">GÜVENLİK UYARISI</h4><p className="text-red-700 text-xs font-medium">Sisteme varsayılan şifre (1923) ile giriş yaptınız. Lütfen şifrenizi güncelleyin.</p></div></div><button onClick={() => setSifreDegistirAcik(true)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded shadow-sm text-xs tracking-widest w-full sm:w-auto">ŞİFREMİ DEĞİŞTİR</button></div>)}
            <div className="bg-slate-800 rounded-2xl shadow-xl p-6 mb-6 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 border-t-4 border-blue-500 relative overflow-hidden">
              <div className="text-center md:text-left flex-1 relative z-10 w-full"><h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">{turkceBuyukHarf(seciliKomiser?.ad_soyad || 'KOMİSER')}</h2><div className="mt-2 flex flex-wrap justify-center md:justify-start gap-2"><span className="bg-slate-700 text-blue-100 font-mono text-xs font-bold px-3 py-1.5 rounded-md border border-slate-600 shadow-sm">SİCİL NO: {seciliKomiser?.komiser_id || '-'}</span><span className="bg-blue-900/50 text-blue-200 text-xs font-bold px-3 py-1.5 rounded-md border border-blue-800 shadow-sm">BU SEZON: {Array.isArray(komiserMaclari) ? komiserMaclari.length : 0} GÖREV</span></div><div className="mt-5 space-y-3 animate-fade-in-down w-full">{tebellugBekleyenSayisi > 0 ? (<div className="bg-blue-50 border border-blue-300 text-blue-900 px-4 py-3 rounded-lg flex flex-col sm:flex-row items-center justify-between shadow-sm animate-pulse gap-3"><span className="font-bold text-xs md:text-sm flex items-center gap-2">🔔 Yeni Atanan {tebellugBekleyenSayisi} Göreviniz Var!</span><button onClick={() => setAktifEkran('gorevKartlari')} className="w-full sm:w-auto text-[10px] md:text-xs bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded shadow border border-blue-600">ÖNCE TEBELLÜĞ ET</button></div>) : (<>{eksikSkorSayisi > 0 && (<div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded-lg flex flex-col sm:flex-row items-center justify-between shadow-sm gap-3"><span className="font-bold text-xs md:text-sm flex items-center gap-2 text-center sm:text-left">⏳ Skoru Beklenen {eksikSkorSayisi} Maçınız Var</span><button onClick={() => setAktifEkran('skorRapor')} className="w-full sm:w-auto text-[10px] md:text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded shadow border border-amber-500">GİRİŞ YAP</button></div>)}{eksikDetayliSayisi > 0 && (<div className="bg-red-50 border border-red-300 text-red-900 px-4 py-3 rounded-lg flex flex-col sm:flex-row items-center justify-between shadow-sm gap-3"><span className="font-bold text-xs md:text-sm flex items-center gap-2 text-center sm:text-left">📝 Detaylı Raporu Beklenen {eksikDetayliSayisi} Maçınız Var</span><button onClick={() => setAktifEkran('skorRapor')} className="w-full sm:w-auto text-[10px] md:text-xs bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded shadow border border-red-500">RAPORLA</button></div>)}{herSeyTamam && (<div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-lg flex items-start shadow-sm animate-fade-in-up"><span className="text-2xl md:text-3xl mr-3 mt-1">✅</span><div><h4 className="font-black text-sm md:text-base tracking-wider text-emerald-900">{globalAktifHaftaNo}. HAFTA GÖREVLERİ TAMAMLANDI</h4><p className="text-[10px] md:text-xs font-medium mt-0.5 text-emerald-800">Tarafınıza tevdi edilen tüm müsabakaları tebellüğ ettiniz ve raporlamalarını eksiksiz tamamladınız. İzmir Şube Yönetimi adına teşekkür ederiz.</p></div></div>)}</>)}</div></div>
              <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto z-20 shrink-0 mt-2 md:mt-0 justify-center"><button onClick={() => setRehberAcik(true)} className="flex-1 md:flex-none justify-center bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 py-3 px-4 md:p-2.5 rounded-lg shadow-md transition-colors text-xs font-bold flex items-center gap-2">ℹ️ KULLANIM REHBERİ</button><button onClick={() => setSifreDegistirAcik(true)} className="flex-1 md:flex-none justify-center bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-500 py-3 px-4 md:p-2.5 rounded-lg shadow-md transition-colors text-xs font-bold flex items-center gap-2">🔑 ŞİFREMİ DEĞİŞTİR</button></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <button onClick={() => setAktifEkran('gorevKartlari')} className="flex flex-col items-center justify-center p-6 md:p-8 rounded-2xl shadow-md bg-gradient-to-br from-teal-500 to-emerald-600 border-2 border-teal-700 hover:scale-[1.02] transition-transform relative group"><h4 className="font-black text-xl md:text-2xl text-white relative z-10">GÖREV KARTIM</h4><p className="text-sm text-center mt-2 text-teal-100 font-medium relative z-10">Atanan maçlarınızı görün ve görevi tebellüğ edin.</p>{tebellugBekleyenSayisi > 0 && <span className="mt-3 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full animate-bounce relative z-10 shadow-lg">{tebellugBekleyenSayisi} YENİ GÖREV</span>}</button>
              <button onClick={() => setAktifEkran('skorRapor')} className="flex flex-col items-center justify-center p-6 md:p-8 rounded-2xl shadow-md bg-gradient-to-br from-sky-500 to-blue-700 border-2 border-blue-800 hover:scale-[1.02] transition-transform relative group"><h4 className="font-black text-xl md:text-2xl text-white relative z-10 text-center">SKOR VE SAHA RAPORU</h4><p className="text-sm text-center mt-2 text-sky-100 font-medium relative z-10">Hızlı skoru bildirin ve detaylı müsabaka raporu oluşturun.</p></button>
            </div>

            <button onClick={() => setAktifEkran('bordrolarim')} className="w-full mb-4 flex items-center justify-between p-5 md:p-6 rounded-2xl shadow-sm bg-slate-800 border-2 border-slate-700 hover:bg-slate-900 transition-all transform hover:scale-[1.01] group overflow-hidden relative"><div className="text-left relative z-10"><h4 className="font-black text-lg md:text-xl text-white tracking-wide"> MÜSABAKA BORDROLARIM</h4><p className="text-xs md:text-sm mt-1 text-slate-400 font-medium">Aylık görev dökümleriniz ve hakediş listeleriniz.</p></div></button>
            <button onClick={() => setAktifEkran('bultenArama')} className="w-full mb-4 flex items-center justify-between p-5 md:p-6 rounded-2xl shadow-sm bg-slate-800 border-2 border-slate-700 hover:bg-slate-900 transition-all transform hover:scale-[1.01] group overflow-hidden relative"><div className="text-left relative z-10"><h4 className="font-black text-lg md:text-xl text-white tracking-wide">🔍 HAFTALIK BÜLTEN VE GÖREV ARAMA</h4><p className="text-xs md:text-sm mt-1 text-slate-400 font-medium">Saha, takım veya komiser ismine göre İzmir'deki tüm güncel görevleri sorgulayın.</p></div></button>
            <button onClick={() => setAktifEkran('istatistiklerim')} className="w-full mb-4 flex items-center justify-between p-5 md:p-6 rounded-2xl shadow-sm bg-slate-800 border-2 border-slate-700 hover:bg-slate-900 transition-all transform hover:scale-[1.01] group overflow-hidden relative"><div className="text-left relative z-10"><h4 className="font-black text-lg md:text-xl text-white tracking-wide">SEZONLUK İSTATİSTİKLERİM</h4><p className="text-xs md:text-sm mt-1 text-slate-400 font-medium">Görev aldığınız liglerin detaylı dökümü.</p></div></button>
            <button onClick={() => setAktifEkran('mazeretBildir')} className="w-full flex items-center justify-between p-5 md:p-6 rounded-2xl shadow-sm bg-slate-800 border-2 border-slate-700 hover:bg-slate-900 transition-all transform hover:scale-[1.01] group overflow-hidden relative"><div className="text-left relative z-10"><h4 className="font-black text-lg md:text-xl text-white tracking-wide">📅 MÜSAİTLİK VE MAZERET BİLDİRİMİ</h4></div></button>
          </div>
        </main>
      );
  } else if (gercekAktifEkran === 'bordrolarim') {
      
      const bordroGruplari: Record<string, any[]> = {};
      const maclarForBordro = Array.isArray(komiserMaclari) ? komiserMaclari : [];
      
      maclarForBordro.forEach(mac => {
          if (mac.mac_durumu === 'iptal_edildi') return;
          if (!isBordroKategori(mac.kategori_adi)) return;
          const ayYil = getAyYil(mac.tarih);
          if (ayYil) {
              if (!bordroGruplari[ayYil]) bordroGruplari[ayYil] = [];
              bordroGruplari[ayYil].push(mac);
          }
      });
      
      const siraliAylar = Object.keys(bordroGruplari).sort((a, b) => b.localeCompare(a));
      const aylarIsim = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'];

      ekranIcerigi = (
        <main className="min-h-screen bg-slate-100 flex flex-col font-sans">
          {renderOrtakHeader(true)}
          <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 overflow-y-auto">
            <div className="bg-white rounded-xl p-5 md:p-8 border border-slate-200 shadow-sm mb-6">
                <div className="text-center md:text-left mb-6 border-b border-slate-200 pb-5">
                    <h3 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tight">MAÇ BORDROLARIM VE HAKEDİŞLER</h3>
                    <p className="text-sm md:text-base font-bold text-slate-500 mt-2">Aylık görev dökümleriniz burada listelenir. Üzerine tıklayarak maçlarınızı inceleyebilir ve resmi PDF oluşturabilirsiniz.</p>
                </div>

                {siraliAylar.length === 0 ? (
                    <div className="text-center bg-slate-50 p-10 rounded-2xl border border-slate-200"><span className="text-5xl block mb-4 opacity-50">💸</span><p className="text-sm font-bold tracking-widest text-slate-500">HENÜZ BORDROYA UYGUN GÖREV ALDIĞINIZ BİR MAÇ BULUNMUYOR.</p></div>
                ) : (
                    <div className="space-y-4">
                        {siraliAylar.map(ayYil => {
                            const [yil, ay] = ayYil.split('-');
                            const ayIsmi = aylarIsim[Number(ay) - 1];
                            const maclar = bordroGruplari[ayYil].sort(siralamaFiltresi).reverse(); 
                            const isAcik = acikBordroAy === ayYil;
                            
                            return (
                                <div key={ayYil} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <button onClick={() => setAcikBordroAy(isAcik ? null : ayYil)} className="w-full p-5 flex justify-between items-center bg-slate-800 text-white hover:bg-slate-900 transition-colors">
                                        <div className="text-left">
                                            <h4 className="text-lg font-black tracking-widest">{ayIsmi} {yil} BORDROSU</h4>
                                            <p className="text-xs text-blue-300 font-bold mt-1">TOPLAM GÖREV: {maclar.length} MAÇ</p>
                                        </div>
                                        <span className="text-xl">{isAcik ? '▲' : '▼'}</span>
                                    </button>
                                    {isAcik && (
                                        <div className="p-4 bg-slate-50">
                                            <button onClick={() => setTamEkranBordroAy(ayYil)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-lg shadow-sm tracking-widest transition-colors mb-4 flex items-center justify-center gap-2 text-sm uppercase">
                                                <span className="text-xl">🖨️</span> RESMİ BORDRO (PDF) OLUŞTUR VE YAZDIR
                                            </button>
                                            <div className="space-y-3">
                                                {maclar.map((mac: any, i: number) => {
                                                    const anaKat = getAnaKategori(mac.kategori_adi);
                                                    return (
                                                        <div key={i} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-3">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="bg-slate-100 text-slate-700 border border-slate-300 text-[9px] px-2 py-0.5 rounded font-black tracking-wider uppercase">{formatMacKodu(mac.mac_kodu)}</span>
                                                                    <span className="text-slate-500 text-[10px] font-bold uppercase">{guvenliTarih(mac.tarih)} - {guvenliSaat(mac.saat)}</span>
                                                                    {anaKat === 'profesyonel' && <span className="bg-red-100 text-red-700 border border-red-200 text-[9px] px-2 py-0.5 rounded font-black tracking-wider uppercase">PROFESYONEL</span>}
                                                                </div>
                                                                <div className="font-black text-slate-800 text-sm md:text-base leading-tight uppercase">{turkceBuyukHarf(mac.ev_sahibi)} <span className="text-slate-400 font-medium">vs</span> {turkceBuyukHarf(mac.misafir_takim)}</div>
                                                                <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold">📍 {turkceBuyukHarf(mac.saha)} | <span className="text-blue-600">{turkceBuyukHarf(mac.kategori_adi)}</span></div>
                                                            </div>
                                                            <div className="text-left md:text-right">
                                                                <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded">{turkceBuyukHarf(gorevTuruBelirle(mac.kategori_adi, mac.mac_kodu))}</span>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
          </div>
        </main>
      );
  } else if (gercekAktifEkran === 'gorevKartlari') {
      ekranIcerigi = (
        <main className="min-h-screen bg-slate-100 flex flex-col font-sans relative">
          {renderOrtakHeader(true)}
          <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 overflow-y-auto">
            <div id="gorev-karti-alani" className="min-h-full">
              <div className="bg-white p-4 rounded-xl shadow-sm mb-5 border-b-4 border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4"><div className="text-center md:text-left"><h4 className="text-lg font-black text-slate-800 tracking-wide">{turkceBuyukHarf(seciliKomiser?.ad_soyad || '-')}</h4><p className="text-blue-700 font-bold mt-1">{globalAktifHaftaNo}. HAFTA GÖREV BÜLTENİ</p></div><div className="flex flex-wrap justify-center gap-2"><button onClick={tebellugKaydet} disabled={hepsiTebellugEdilmis || tebellugYukleniyor || gecerliAktifMaclar.length === 0} className={`text-sm font-bold py-2 px-4 rounded-lg shadow flex items-center gap-2 transition-colors ${hepsiTebellugEdilmis ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' : gecerliAktifMaclar.length > 0 ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>{tebellugYukleniyor ? 'İŞLENİYOR...' : hepsiTebellugEdilmis ? '✓ TEBELLÜĞ EDİLDİ' : 'TEBELLÜĞ ET (GÖREVLERİ ALDIM)'}</button><button onClick={kartiIndir} className="bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold py-2 px-4 rounded-lg shadow">İNDİR / PAYLAŞ</button></div></div>
              {macYukleniyor ? (<div className="text-center text-slate-600 py-8 animate-pulse font-black tracking-widest">GÖREVLERİNİZ ARANIYOR...</div>) : (
                <Fragment>
                  <div className="mb-6">{gecerliAktifMaclar.length === 0 ? (<div className="text-center text-slate-500 py-8 bg-white rounded-xl text-sm font-bold border border-slate-200">Aktif göreviniz bulunmuyor.</div>) : (<div className="space-y-4">{gecerliAktifMaclar.map((mac: any, idx: number) => (<div key={mac.id || `gkart-${idx}`}>{renderOrjinalGorevKarti(mac, false)}</div>))}</div>)}</div>
                  {Object.keys(gecmisHaftalar).length > 0 && (
                    <div className="mt-8 border-t border-slate-300 pt-6">
                      <button onClick={() => setArsivAcik(!arsivAcik)} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-4 px-5 rounded-xl shadow-sm flex justify-between items-center transition-colors"><span className="text-sm md:text-base tracking-widest font-black">GEÇMİŞ MAÇ ARŞİVİ</span><span className="text-xl">{arsivAcik ? '▲' : '▼'}</span></button>
                      {arsivAcik && (<div className="mt-4 space-y-4">{Object.keys(gecmisHaftalar).map(Number).sort((a: number, b: number) => b - a).map((haftaNo: number) => (<div key={`hafta-${haftaNo}`} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white"><button onClick={() => haftaToggle(haftaNo)} className="w-full bg-white text-slate-800 font-bold py-3 px-5 flex justify-between items-center text-xs md:text-sm hover:bg-slate-50 border-b border-slate-100"><span>{haftaNo}. HAFTA GÖREVLERİ <span className="bg-slate-800 text-white text-[10px] md:text-xs px-2 py-1 rounded ml-2">{(gecmisHaftalar[haftaNo] || []).length} GÖREV</span></span><span className="text-slate-400">{acikHaftalar.includes(haftaNo) ? '▲' : '▼'}</span></button>{acikHaftalar.includes(haftaNo) && (<div className="p-2 md:p-4 bg-slate-50 space-y-4">{(gecmisHaftalar[haftaNo] || []).map((mac: any, idx: number) => (<div key={mac.id || `gecmis-${idx}`} className="opacity-95 hover:opacity-100 transition-opacity">{renderOrjinalGorevKarti(mac, true)}</div>))}</div>)}</div>))}</div>)}
                    </div>
                  )}
                </Fragment>
              )}
            </div>
          </div>
        </main>
      );
  } else if (gercekAktifEkran === 'skorRapor') {
      ekranIcerigi = (
        <main className="min-h-screen bg-slate-100 flex flex-col font-sans">
          <datalist id="hakem-listesi">{hakemListesi?.map((hakem: string, i: number) => <option key={`hakem-${i}`} value={hakem || ''} />)}</datalist>
          <datalist id="gozlemci-listesi">{gozlemciListesi?.map((gozlemci: string, i: number) => <option key={`gozlemci-${i}`} value={gozlemci || ''} />)}</datalist>
          {renderOrtakHeader(true)}
          <div className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 overflow-y-auto">
            <div className="bg-white p-5 rounded-xl shadow-sm mb-6 border-b-4 border-slate-800 text-center border border-slate-200"><h4 className="text-xl md:text-2xl font-black text-slate-800 tracking-widest">SKOR VE SAHA RAPORU</h4><p className="text-slate-500 text-xs md:text-sm mt-1 font-medium">Hızlı skoru bildirebilir ve detaylı rapor oluşturabilirsiniz.</p></div>
            {tebellugEdilenMaclar.length === 0 ? (
              <div className="text-center bg-white p-10 rounded-2xl shadow-sm text-slate-500 border border-slate-200"><span className="text-5xl block mb-4 opacity-50">📋</span><p className="text-sm font-bold tracking-widest">RAPORLANACAK AKTİF (TEBELLÜĞ EDİLMİŞ) GÖREVİNİZ BULUNMUYOR.</p></div>
            ) : (
              <div className="space-y-4 md:space-y-6">
                {tebellugEdilenMaclar.map((mac: any, idx: number) => {
                  if(!mac) return null;
                  const acikMi = acikSkorMacId === mac.id;
                  const raporGonderilmis = mac.skor_girildi === true;
                  const detayliGoster = detayliRaporGosterilirMi(mac.kategori_adi);
                  const pDetay = parseDetay(mac.tff_rapor_detaylari); 
                  const detayliGonderilmis = pDetay?.detayli_kaydedildi === true;
                  let borderClass = 'border-slate-200';
                  if (!raporGonderilmis) { borderClass = 'border-slate-300 hover:border-slate-400'; } else if (detayliGoster && !detayliGonderilmis) { borderClass = 'border-red-400'; } else { borderClass = 'border-green-500'; }
                  if (acikMi) borderClass = 'border-slate-800 shadow-lg';
                  return (
                    <div key={mac.id || `skor-${idx}`} className={`bg-white rounded-xl shadow-sm border-2 transition-all ${borderClass}`}>
                      <button onClick={() => raporFormunuAc(mac)} className={`w-full text-left p-4 md:p-5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50 transition-colors ${raporGonderilmis && !acikMi ? 'bg-slate-50' : ''}`}>
                        <div className="w-full sm:w-auto pr-0 sm:pr-4">
                          <div className="flex flex-wrap items-center gap-2 mb-2"><span className="bg-slate-100 text-slate-800 border border-slate-300 text-[9px] md:text-[10px] px-2 py-0.5 rounded font-black tracking-wider uppercase">{formatMacKodu(mac?.mac_kodu)}</span><span className={`${detayliGoster ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-slate-700 bg-slate-100 border-slate-300'} border text-[10px] md:text-[11px] px-2 py-0.5 rounded font-black tracking-wider`}>{turkceBuyukHarf(mac?.kategori_adi || 'LİG BELİRTİLMEMİŞ')}</span><span className="text-slate-500 text-[10px] md:text-xs font-bold">{turkceBuyukHarf(gorevTuruBelirle(mac?.kategori_adi, mac?.mac_kodu))}</span></div>
                          <div className="flex flex-col gap-1 mb-1 mt-2"><span className="font-black text-base md:text-xl text-slate-900 leading-snug truncate">{turkceBuyukHarf(mac?.ev_sahibi || '-')}</span><span className="font-black text-base md:text-xl text-slate-900 leading-snug truncate">{turkceBuyukHarf(mac?.misafir_takim || '-')}</span></div>
                          <p className="text-slate-500 text-[10px] md:text-xs mt-2 font-medium">{turkceBuyukHarf(mac?.saha || '-')} | <span className="font-bold text-slate-700">{guvenliTarih(mac?.tarih)} - {guvenliSaat(mac?.saat)}</span></p>
                        </div>
                        <div className="w-full sm:w-auto flex justify-end mt-2 sm:mt-0">
                          <div className="flex items-center gap-3">
                              <div className="flex flex-col gap-2 items-end w-full sm:w-auto"><span className={`px-3 py-2 rounded-md text-[10px] md:text-[11px] font-black shadow-sm flex items-center justify-center min-w-[160px] md:min-w-[180px] tracking-widest border ${raporGonderilmis ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-600 text-white border-red-700 animate-pulse'}`}>{raporGonderilmis ? '✓ SKOR GÖNDERİLDİ' : '❌ SKOR BEKLENİYOR'}</span>{detayliGoster && (<span className={`px-3 py-2 rounded-md text-[10px] md:text-[11px] font-black shadow-sm flex items-center justify-center min-w-[160px] md:min-w-[180px] tracking-widest border ${detayliGonderilmis ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-red-50 text-red-800 border-red-300 animate-pulse'}`}>{detayliGonderilmis ? '✓ DETAYLI TAMAM' : '🚨 DETAYLI RAPOR YOK'}</span>)}</div>
                              <div className={`hidden sm:flex items-center justify-center w-10 h-10 shrink-0 rounded-full border shadow-sm transition-colors ${acikMi ? 'bg-slate-800 border-slate-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-500'}`}><span className="text-lg font-black leading-none">{acikMi ? '▲' : '▼'}</span></div>
                          </div>
                        </div>
                      </button>
                      {acikMi && (
                        <div className="p-4 md:p-6 border-t-2 border-slate-100 bg-slate-50 rounded-b-xl animate-fade-in-down">
                          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 md:p-6 mb-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-400"></div><h4 className="font-black text-slate-700 border-b border-slate-100 pb-3 mb-5 text-sm md:text-base flex items-center gap-2 tracking-widest"><span className="text-xl">⚡</span> {detayliGoster ? '1. AŞAMA: HIZLI SKOR BİLDİRİMİ' : 'MÜSABAKA SKOR VE OLAY BİLDİRİMİ'}</h4>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-8">
                              <div>
                                <label className="block text-[10px] md:text-xs font-bold text-slate-500 tracking-widest mb-2 text-center">MAÇ DURUMU</label>
                                <select value={macDurumu} onChange={(e:any) => setMacDurumu(e.target.value)} className={`w-full p-3 md:p-4 border-2 rounded-xl font-black text-sm md:text-base text-center appearance-none cursor-pointer focus:outline-none transition-colors shadow-sm ${macDurumu === '' ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-200 text-slate-700 bg-white focus:border-slate-500'}`}>
                                    <option value="" disabled>-- MÜSABAKANIN DURUMUNU SEÇİNİZ --</option>
                                    <option value="oynandi">MÜSABAKA TAMAMLANDI (OYNANDI)</option>
                                    <option value="yarida_kaldi">MÜSABAKA YARIDA KALDI / TATİL EDİLDİ</option>
                                    <option value="oynanmadi">MÜSABAKA OYNANMADI</option>
                                    <option value="takimlar_cikmadi">TAKIM(LAR) SAHAYA ÇIKMADI</option>
                                </select>
                                
                                {macDurumu === 'oynandi' && (<div className="mt-5 bg-slate-50 p-4 border border-slate-200 rounded-xl flex items-center justify-between gap-3 w-full shadow-inner"><div className="flex-1 flex flex-col items-center justify-center min-w-0"><label className="block text-[10px] font-black text-slate-500 mb-2 w-full text-center truncate px-1 uppercase">{turkceBuyukHarf(mac?.ev_sahibi || '-')}</label><select value={evSkor} onChange={(e: any) => setEvSkor(e.target.value)} className="w-20 h-14 text-center text-2xl font-black border-2 border-slate-300 rounded-xl focus:border-slate-500 cursor-pointer appearance-none bg-white shadow-sm"><option value="" disabled>-</option>{skorSecenekleri.map((s: string) => <option key={`ev-${s}`} value={s}>{s}</option>)}</select></div><span className="text-2xl font-black text-slate-300">-</span><div className="flex-1 flex flex-col items-center justify-center min-w-0"><label className="block text-[10px] font-black text-slate-500 mb-2 w-full text-center truncate px-1 uppercase">{turkceBuyukHarf(mac?.misafir_takim || '-')}</label><select value={misafirSkor} onChange={(e: any) => setMisafirSkor(e.target.value)} className="w-20 h-14 text-center text-2xl font-black border-2 border-slate-300 rounded-xl focus:border-slate-500 cursor-pointer appearance-none bg-white shadow-sm"><option value="" disabled>-</option>{skorSecenekleri.map((s: string) => <option key={`misafir-${s}`} value={s}>{s}</option>)}</select></div></div>)}
                                {macDurumu === 'yarida_kaldi' && (<div className="mt-5 bg-red-50 p-5 border border-red-200 rounded-xl text-center shadow-sm"><span className="text-4xl block mb-2">🛑</span><p className="text-xs font-bold text-red-800 leading-relaxed">Müsabaka yarıda kaldığı veya tatil edildiği için skor kilitlenmiştir. <br/>Lütfen sebebini ve (eğer varsa) o anki skoru aşağıdaki 'Sistem Notu' kısmına detaylıca yazınız.</p></div>)}
                                {macDurumu === 'oynanmadi' && (<div className="mt-5 bg-slate-100 p-5 border border-slate-300 rounded-xl text-center shadow-sm"><span className="text-4xl block mb-2">🌧️</span><p className="text-xs font-bold text-slate-700 leading-relaxed">Müsabaka hiç başlamadığı (oynanmadığı) için skor kilitlenmiştir. <br/>Lütfen oynanmama sebebini (Hava muhalefeti, tesis vb.) 'Sistem Notu' kısmına yazınız.</p></div>)}
                                {macDurumu === 'takimlar_cikmadi' && (<div className="mt-5 bg-amber-50 p-5 border border-amber-200 rounded-xl text-center shadow-sm"><span className="text-4xl block mb-2">🏟️</span><p className="text-xs font-bold text-amber-800 leading-relaxed">Takımlar sahaya çıkmadığı için skor kilitlenmiştir. <br/>Lütfen Sistem Notu kısmına hangi takımın gelmediğini belirtiniz.</p></div>)}
                              </div>
                              <div>
                                <label className="block text-[10px] md:text-xs font-bold text-slate-500 tracking-widest mb-2 text-center">SAHA OLAYLARI</label>
                                <div className="grid grid-cols-3 gap-2 mb-2">
                                  <button onClick={() => setOlayDurumu('olaysiz')} className={`p-2 md:p-3 rounded-xl font-bold border-2 transition-all flex flex-col items-center justify-center min-h-[60px] ${olayDurumu === 'olaysiz' ? 'bg-green-50 border-green-400 text-green-900 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}><span className="text-[10px] md:text-sm text-center leading-none font-black uppercase">OLAYSIZ</span></button>
                                  <button onClick={() => setOlayDurumu('teknik_olay')} className={`p-2 md:p-3 rounded-xl font-bold border-2 transition-all flex flex-col items-center justify-center min-h-[60px] ${olayDurumu === 'teknik_olay' ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}><span className="text-[10px] md:text-sm mb-1 leading-none text-center font-black uppercase">TEKNİK</span><span className="text-[8px] md:text-[9px] font-bold text-center opacity-80 leading-none">(İhraç vb.)</span></button>
                                  <button onClick={() => setOlayDurumu('emniyetlik_olay')} className={`p-2 md:p-3 rounded-xl font-bold border-2 transition-all flex flex-col items-center justify-center min-h-[60px] ${olayDurumu === 'emniyetlik_olay' ? 'bg-red-50 border-red-400 text-red-900 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}><span className="text-[10px] md:text-sm mb-1 leading-none text-center font-black uppercase">EMNİYET</span><span className="text-[8px] md:text-[9px] font-bold text-center opacity-80 leading-none">(Kavga vb.)</span></button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <button onClick={() => setOlayDurumu('hava_muhalefeti')} className={`p-3 rounded-xl font-bold border-2 transition-all text-[10px] md:text-xs flex items-center justify-center gap-1.5 min-h-[44px] uppercase tracking-wider ${olayDurumu === 'hava_muhalefeti' ? 'bg-slate-800 border-slate-900 text-white shadow-sm' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-300'}`}>☁️ HAVA MUHALEFETİ</button>
                                  <button onClick={() => setOlayDurumu('saha_sorunu')} className={`p-3 rounded-xl font-bold border-2 transition-all text-[10px] md:text-xs flex items-center justify-center gap-1.5 min-h-[44px] uppercase tracking-wider ${olayDurumu === 'saha_sorunu' ? 'bg-slate-800 border-slate-900 text-white shadow-sm' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-300'}`}>🏟️ TESİS SORUNU</button>
                                </div>
                              </div>
                            </div>
                            <div className="mt-5 md:mt-6 border-t border-slate-100 pt-5"><label className="block text-[10px] md:text-xs font-bold text-slate-500 tracking-widest mb-2">SİSTEM NOTU / HIZLI RAPOR</label><textarea value={raporNotu} onChange={(e: any) => handleHizliNotChange(e.target.value)} className={`w-full p-4 border-2 rounded-xl font-serif text-[11px] md:text-sm min-h-[80px] md:min-h-[100px] shadow-inner transition-colors ${olayDurumu !== 'olaysiz' && raporNotu === '' ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-none'}`} placeholder={olayDurumu === 'olaysiz' && macDurumu === 'oynandi' ? "İzmir Şube Yönetimine iletmek istediğiniz not varsa buraya yazabilirsiniz..." : "Lütfen yaşanan olayın veya oynanmama/yarıda kalma sebebinin detayını yazınız..."}></textarea></div>
                            <button onClick={() => skorRaporunuGonder(mac.id, 'hizli')} disabled={skorKaydediliyor} className={`w-full text-white font-black py-4 rounded-xl shadow-sm transition-transform hover:scale-[1.01] text-xs md:text-sm tracking-widest mt-5 flex items-center justify-center gap-2 ${macDurumu === '' ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900 disabled:opacity-70'}`}>{skorKaydediliyor ? '⚙️ GÖNDERİLİYOR...' : (raporGonderilmis ? (detayliGoster ? '💾 HIZLI SKORU GÜNCELLE' : '💾 SKORU GÜNCELLE') : (detayliGoster ? '🚀 HIZLI SKORU İLET' : '🚀 YÖNETİME İLET'))}</button>
                          </div>
                          {detayliGoster && (
                            <div className={`bg-white border shadow-sm rounded-xl p-4 md:p-6 relative overflow-hidden transition-all ${macDurumu === '' ? 'opacity-50 pointer-events-none border-slate-200' : 'border-slate-200'}`}>
                              <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-600"></div><h4 className="font-black text-slate-700 border-b border-slate-100 pb-3 mb-5 text-center text-sm md:text-base tracking-widest">DETAYLI MÜSABAKA RAPORU</h4>
                              <div className="mb-6 overflow-x-auto pb-4 custom-scrollbar">{renderTffRaporu(mac, 'aktif')}</div>
                              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mt-2">
                                <button onClick={() => tffTutanakIndir(mac, 'aktif')} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-black py-4 rounded-xl shadow-sm transition-colors text-xs md:text-sm flex items-center justify-center gap-2 tracking-widest">📸 FOTOĞRAF (PNG) İNDİR</button>
                                <button onClick={() => skorRaporunuGonder(mac.id, 'detayli')} disabled={skorKaydediliyor} className={`flex-1 text-white font-black py-4 rounded-xl shadow-sm transition-colors text-xs md:text-sm flex items-center justify-center gap-2 tracking-widest disabled:opacity-70 ${detayliGonderilmis ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-700 hover:bg-slate-800 animate-pulse'}`}>{skorKaydediliyor ? '⚙️ KAYDEDİLİYOR...' : (detayliGonderilmis ? '💾 DETAYLI RAPORU GÜNCELLE' : '🚨 DETAYLI RAPORU İLET (ZORUNLU)')}</button>
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
      );
  } else if (gercekAktifEkran === 'istatistiklerim') {
      ekranIcerigi = (
        <main className="min-h-screen bg-slate-100 flex flex-col font-sans">
          {renderOrtakHeader(true)}
          <div className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 overflow-y-auto">
              <div className="bg-white rounded-xl p-5 md:p-8 border border-slate-200 shadow-sm">
                  <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-200 pb-5 mb-8 gap-4"><div className="text-center md:text-left"><h3 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tight">{turkceBuyukHarf(seciliKomiser?.ad_soyad || 'KOMİSER')}</h3><span className="text-slate-500 text-xs font-mono font-bold tracking-widest mt-1 inline-block">SİCİL: {seciliKomiser?.komiser_id || '-'}</span></div><div className="bg-slate-800 px-6 py-4 rounded-xl shadow-md border border-slate-700 min-w-[160px]"><div className="text-[10px] text-slate-400 font-bold tracking-widest text-center">TOPLAM GÖREV SAYISI</div><div className="text-4xl font-black text-white text-center mt-1">{maclarForIstatistik.length}</div></div></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-5"><h4 className="text-slate-800 font-black text-sm tracking-widest mb-4 border-b border-slate-200 pb-2 flex justify-between items-center">AMATÖR LİGLER <span className="bg-slate-800 text-white px-2.5 py-1 rounded text-xs">{amatorCount}</span></h4><ul className="space-y-2">{siraliAmatorler.length === 0 && <li className="text-xs text-slate-400 italic">Bu kategoride kayıt yok.</li>}{siraliAmatorler.map(([kat, count]: any) => (<li key={kat} className="flex justify-between items-center bg-white p-2.5 rounded text-xs border border-slate-100 shadow-sm"><span className="text-slate-600 font-bold truncate pr-2">{kat}</span><span className="font-black text-slate-800">{count}</span></li>))}</ul></div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-5"><h4 className="text-slate-800 font-black text-sm tracking-widest mb-4 border-b border-slate-200 pb-2 flex justify-between items-center">GELİŞİM LİGLERİ <span className="bg-slate-800 text-white px-2.5 py-1 rounded text-xs">{gelisimCount}</span></h4><ul className="space-y-2">{siraliGelisimler.length === 0 && <li className="text-xs text-slate-400 italic">Bu kategoride kayıt yok.</li>}{siraliGelisimler.map(([kat, count]: any) => (<li key={kat} className="flex justify-between items-center bg-white p-2.5 rounded text-xs border border-slate-100 shadow-sm"><span className="text-slate-600 font-bold truncate pr-2">{kat}</span><span className="font-black text-slate-800">{count}</span></li>))}</ul></div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-5"><h4 className="text-slate-800 font-black text-sm tracking-widest mb-4 border-b border-slate-200 pb-2 flex justify-between items-center">KADIN FUTBOL LİGLERİ <span className="bg-slate-800 text-white px-2.5 py-1 rounded text-xs">{kadinCount}</span></h4><ul className="space-y-2">{siraliKadinlar.length === 0 && <li className="text-xs text-slate-400 italic">Bu kategoride kayıt yok.</li>}{siraliKadinlar.map(([kat, count]: any) => (<li key={kat} className="flex justify-between items-center bg-white p-2.5 rounded text-xs border border-slate-100 shadow-sm"><span className="text-slate-600 font-bold truncate pr-2">{kat}</span><span className="font-black text-slate-800">{count}</span></li>))}</ul></div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-5"><h4 className="text-slate-800 font-black text-sm tracking-widest mb-4 border-b border-slate-200 pb-2 flex justify-between items-center">PROFESYONEL LİGLER <span className="bg-slate-800 text-white px-2.5 py-1 rounded text-xs">{profCount}</span></h4><ul className="space-y-2">{siraliProflar.length === 0 && <li className="text-xs text-slate-400 italic">Bu kategoride kayıt yok.</li>}{siraliProflar.map(([kat, count]: any) => (<li key={kat} className="flex justify-between items-center bg-white p-2.5 rounded text-xs border border-slate-100 shadow-sm"><span className="text-slate-600 font-bold truncate pr-2">{kat}</span><span className="font-black text-slate-800">{count}</span></li>))}</ul></div>
                  </div>
              </div>
          </div>
        </main>
      );
  } else if (gercekAktifEkran === 'bultenArama') {
      ekranIcerigi = (
        <main className="min-h-screen bg-slate-100 flex flex-col font-sans">
          {renderOrtakHeader(true)}
          <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 overflow-y-auto">
            <div className="bg-slate-800 rounded-xl shadow-md mb-6 border-b-4 border-slate-600 overflow-hidden"><button onClick={() => setAramaTuruAcik(!aramaTuruAcik)} className="w-full p-5 flex justify-between items-center hover:bg-slate-700 transition-colors"><h4 className="text-lg md:text-xl font-black text-white tracking-wide flex items-center gap-2">🔍 SAHA VE GÖREV İSTİHBARATI</h4><span className="text-slate-300 text-xl">{aramaTuruAcik ? '▲' : '▼'}</span></button>
              {aramaTuruAcik && (
                <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200 space-y-4 animate-fade-in-down">
                  <div><label className="block text-xs font-bold text-slate-600 tracking-wider mb-2">SAHA KOMİSERİ ADI</label><input list="komiser-listesi" type="text" placeholder="Komiser arayın..." value={aramaKomiser} onChange={(e: any) => setAramaKomiser(e.target.value)} className="w-full bg-white border-2 border-slate-300 text-slate-800 px-4 py-3 rounded-lg focus:outline-none focus:border-slate-500 transition-colors text-sm font-bold" /><datalist id="komiser-listesi">{siraliKomiserler.map((k: any, i: number) => <option key={`kom-${i}`} value={k.ad_soyad || ''} />)}</datalist></div>
                  <div><label className="block text-xs font-bold text-slate-600 tracking-wider mb-2">SAHA ADI</label><input list="saha-listesi" type="text" placeholder="Saha arayın..." value={aramaSaha} onChange={(e: any) => setAramaSaha(e.target.value)} className="w-full bg-white border-2 border-slate-300 text-slate-800 px-4 py-3 rounded-lg focus:outline-none focus:border-slate-500 transition-colors text-sm font-bold" /><datalist id="saha-listesi">{siraliSahalar.map((saha: any, i: number) => <option key={`sah-${i}`} value={saha as string} />)}</datalist></div>
                  <div><label className="block text-xs font-bold text-slate-600 tracking-wider mb-2">TAKIM VEYA LİG ADI</label><input list="takim-listesi" type="text" placeholder="Takım veya lig arayın..." value={aramaTakim} onChange={(e: any) => setAramaTakim(e.target.value)} className="w-full bg-white border-2 border-slate-300 text-slate-800 px-4 py-3 rounded-lg focus:outline-none focus:border-slate-500 transition-colors text-sm font-bold" /><datalist id="takim-listesi">{siraliTakimlar.map((takim: any, i: number) => <option key={`tak-${i}`} value={takim as string} />)}</datalist></div>
                  {(aramaKomiser || aramaSaha || aramaTakim) && (<div className="pt-2 text-right"><button onClick={() => { setAramaKomiser(''); setAramaSaha(''); setAramaTakim(''); setAcikAramaMacId(null); }} className="text-slate-500 hover:text-slate-800 text-xs tracking-widest font-black transition-colors bg-white px-3 py-1.5 rounded border border-slate-300 shadow-sm">FİLTRELERİ TEMİZLE</button></div>)}
                </div>
              )}
            </div>
            <div className="space-y-3">
              {filtrelenmisMaclar.length === 0 ? (<div className="text-center bg-white p-8 rounded-xl shadow-sm text-slate-500 font-bold text-sm border border-slate-200">Aramanızla eşleşen müsabaka bulunamadı.</div>) : (
                filtrelenmisMaclar.map((mac: any, idx: number) => {
                  const safeKomiserler = Array.isArray(tumKomiserler) ? tumKomiserler : [];
                  const komiserIsim = safeKomiserler.find((k: any) => String(k.komiser_id) === String(mac?.komiser_id))?.ad_soyad || "KOMİSER ATANMADI";
                  const isAcik = acikAramaMacId === mac.id;
                  return (
                    <div key={mac.id || `arama-${idx}`} className="bg-white border-l-4 border-slate-800 shadow-sm rounded-r-xl overflow-hidden transition-all hover:shadow-md border-y border-r border-slate-200">
                      <button onClick={() => setAcikAramaMacId(isAcik ? null : mac.id)} className="w-full text-left p-3 md:p-4 flex justify-between items-center hover:bg-slate-50 focus:outline-none"><div className="flex-1 pr-2"><div className="flex items-center gap-2 mb-1"><span className="bg-slate-100 text-slate-700 border border-slate-300 text-[9px] px-2 py-0.5 rounded font-black tracking-wider">{formatMacKodu(mac?.mac_kodu)}</span><span className="text-slate-600 text-[10px] font-black tracking-widest">{turkceBuyukHarf(mac?.kategori_adi || '-')}</span></div><span className="font-black text-slate-900 text-sm md:text-base leading-tight block">{turkceBuyukHarf(mac?.ev_sahibi || '-')} <span className="text-slate-400 font-medium mx-1">vs</span> {turkceBuyukHarf(mac?.misafir_takim || '-')}</span></div><span className={`text-slate-400 text-xl leading-none transition-transform ${isAcik ? 'rotate-180 text-slate-800' : ''}`}>▼</span></button>
                      {isAcik && (<div className="p-3 md:p-4 border-t border-slate-200 bg-slate-50 animate-fade-in-down"><div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-sm text-slate-700"><div className="flex flex-col"><span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold tracking-wider">TARİH & SAAT</span><span className="font-bold text-slate-800 text-xs md:text-sm">{guvenliTarih(mac?.tarih)} - {guvenliSaat(mac?.saat)}</span></div><div className="flex flex-col"><span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold tracking-wider">SAHA</span><span className="font-bold text-slate-800 text-xs md:text-sm leading-tight">{turkceBuyukHarf(mac?.saha || '-')}</span></div><div className="flex flex-col sm:mt-2 pt-2 sm:pt-3 border-t border-slate-200"><span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold tracking-wider">KATEGORİ / LİG</span><span className="font-bold text-slate-800 text-xs md:text-sm leading-tight">{turkceBuyukHarf(mac?.kategori_adi || '-')} <span className="text-[9px] md:text-xs font-normal text-slate-500 block sm:inline mt-0.5 sm:mt-0 sm:ml-1">(KOD: {formatMacKodu(mac?.mac_kodu)})</span></span></div><div className="flex flex-col sm:mt-2 pt-2 sm:pt-3 border-t border-slate-200"><span className="text-[10px] md:text-xs text-slate-400 mb-0.5 font-semibold tracking-wider">ATANAN GÖREV</span><span className="font-extrabold text-slate-700 text-xs md:text-sm">{turkceBuyukHarf(gorevTuruBelirle(mac?.kategori_adi || '', mac?.mac_kodu || ''))}</span></div><div className="flex flex-col sm:mt-2 pt-2 sm:pt-3 border-t border-slate-300 col-span-1 sm:col-span-2 bg-white p-3 rounded-lg border border-slate-300 shadow-sm"><span className="text-[9px] md:text-[10px] text-slate-500 mb-1 font-bold tracking-wider">MÜSABAKA SAHA KOMİSERİ</span><span className="font-black text-slate-900 text-sm md:text-base">{turkceBuyukHarf(komiserIsim)}</span></div></div></div>)}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </main>
      );
  } else {
      ekranIcerigi = (
          <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans">
              <div className="text-center">
                  <h1 className="text-2xl font-black text-slate-800 mb-2">SİSTEM YÜKLENİYOR...</h1>
                  <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
          </div>
      );
  }

  // ==========================================
  // TÜM EKRANLARIN VE ORTAK MODALLARIN ÇIKTISI
  // ==========================================
  return (
      <Fragment>
          {ekranIcerigi}

          {/* --- ORTAK MODALLAR (TÜM EKRANLARDA ÇALIŞABİLİR) --- */}
          {sifreDegistirAcik && (
              <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
                  <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in-up border border-slate-300 p-6">
                      <h2 className="text-lg font-black text-slate-800 tracking-widest mb-4 border-b border-slate-200 pb-2">ŞİFREYİ DEĞİŞTİR</h2>
                      <form onSubmit={sifreDegistirSubmit} className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Mevcut Şifreniz</label>
                              <input type="password" value={eskiSifre} onChange={(e: any) => setEskiSifre(e.target.value)} maxLength={4} className="w-full border-2 border-slate-200 rounded-lg p-3 text-center text-xl font-black tracking-widest focus:border-blue-500 focus:outline-none" required />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Yeni Şifreniz (4 Haneli Rakam)</label>
                              <input type="password" value={yeniSifre} onChange={(e: any) => setYeniSifre(e.target.value)} maxLength={4} pattern="\d{4}" className="w-full border-2 border-slate-200 rounded-lg p-3 text-center text-xl font-black tracking-widest focus:border-blue-500 focus:outline-none" required />
                          </div>
                          <div className="flex gap-3 mt-6">
                              <button type="button" onClick={() => setSifreDegistirAcik(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-lg transition-colors text-sm">İptal</button>
                              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors text-sm shadow-md">Kaydet</button>
                          </div>
                      </form>
                  </div>
              </div>
          )}

          {acikStatu && (
              <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
<div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up border border-slate-300">
                              <div className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700">
                                  <h2 className="text-white font-black tracking-widest text-sm flex items-center gap-2"><span className="text-xl">ℹ️</span> {turkceBuyukHarf(acikStatu.baslik)}</h2>
                                  <button onClick={() => setAcikStatu(null)} className="text-slate-300 hover:text-white font-bold text-xl leading-none transition-colors">✕</button>
                              </div>
                              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                  <div className="border-b border-slate-200 pb-3">
                                      <h4 className="text-[10px] font-bold text-slate-400 mb-1">🏃 YAŞ SINIRI</h4>
                                      <p className="text-sm font-bold text-slate-800 leading-snug">{acikStatu.yas_siniri}</p>
                                  </div>
                                  <div className="flex gap-4 border-b border-slate-200 pb-3">
                                      <div className="flex-1"><h4 className="text-[10px] font-bold text-slate-400 mb-1">⏱️ MÜSABAKA SÜRESİ</h4><p className="text-sm font-black text-blue-700">{acikStatu.sure}</p></div>
                                      <div className="flex-1 border-l border-slate-200 pl-4"><h4 className="text-[10px] font-bold text-slate-400 mb-1">⚽ TOP NUMARASI</h4><p className="text-sm font-black text-amber-600">{acikStatu.top}</p></div>
                                  </div>
                                  <div className="flex gap-4 border-b border-slate-200 pb-3">
                                      <div className="flex-1"><h4 className="text-[10px] font-bold text-slate-400 mb-1">⚖️ HAKEM SAYISI</h4><p className="text-sm font-black text-slate-800">{acikStatu.hakem}</p></div>
                                  </div>
                                  <div className="border-b border-slate-200 pb-3">
                                      <h4 className="text-[10px] font-bold text-slate-400 mb-1">🔄 OYUNCU DEĞİŞİKLİĞİ</h4>
                                      <p className="text-sm font-semibold text-slate-700 leading-snug">{acikStatu.degisiklik}</p>
                                  </div>
                                  <div className="pb-2">
                                      <h4 className="text-[10px] font-bold text-slate-400 mb-1">⚖️ BERABERLİK DURUMU</h4>
                                      <p className="text-sm font-semibold text-slate-700 leading-snug">{acikStatu.beraberlik}</p>
                                  </div>
                              </div>
                              <div className="bg-slate-50 p-3 text-center border-t border-slate-200">
                                  <button onClick={() => setAcikStatu(null)} className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-8 rounded-lg text-xs tracking-widest transition-colors w-full shadow-sm">ANLADIM, KAPAT</button>
                              </div>
                          </div>
                      </div>
                  )}

                  {arsivTamEkranMac && (
                      <div className="fixed inset-0 bg-black/90 z-[120] flex flex-col backdrop-blur-sm">
                          <div className="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center shrink-0 shadow-lg">
                              <h2 className="text-xs md:text-lg font-black text-white tracking-widest truncate flex-1 pr-4">📄 TFF RAPORU: {turkceBuyukHarf(arsivTamEkranMac.ev_sahibi)} <span className="font-medium text-slate-400">vs</span> {turkceBuyukHarf(arsivTamEkranMac.misafir_takim)}</h2>
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

                  {tamEkranBordroAy && (
                      <div className="fixed inset-0 bg-black/90 z-[150] flex flex-col backdrop-blur-sm tff-no-print">
                          <div className="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center shrink-0 shadow-lg">
                              <h2 className="text-xs md:text-lg font-black text-white tracking-widest uppercase flex-1 pr-4 flex items-center gap-2"><span className="text-2xl">🖨️</span> BORDRO ÖNİZLEME: {tamEkranBordroAy}</h2>
                              <div className="flex items-center gap-3 shrink-0">
                                  <button onClick={bordroIndirYazdir} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 md:px-4 md:py-2 rounded text-[10px] md:text-xs font-bold tracking-widest shadow-lg flex items-center gap-2 transition-colors">🖨️ PDF İNDİR / YAZDIR</button>
                                  <button onClick={() => setTamEkranBordroAy(null)} className="text-slate-400 hover:text-red-500 font-bold text-2xl md:text-3xl leading-none transition-colors">✕</button>
                              </div>
                          </div>
                          <div className="flex-1 overflow-auto bg-slate-300 p-2 md:p-8 flex justify-center items-start custom-scrollbar">
                              <div className="shadow-2xl bg-white w-full max-w-[800px] transform origin-top mx-auto">
                                  <div id="bordro-print-area" className="w-full bg-white p-6 relative font-sans text-black mobile-zoom">
                                        <style dangerouslySetInnerHTML={{__html: `@media (max-width: 768px) { .mobile-zoom { zoom: 0.5; } }`}} />
                                        
                                        <h1 className="text-center font-bold text-xl uppercase mb-6 tracking-wide">İZMİR SAHA KOMİSERLERİ DERNEK BAŞKANLIĞINA</h1>
                                        
                                        <table className="w-full text-xs font-bold mb-6 border-collapse border border-black text-left">
                                            <tbody>
                                                <tr><td className="border border-black p-1.5 w-1/4 bg-slate-100/50">ADI SOYADI</td><td className="border border-black p-1.5 w-3/4 uppercase">{turkceBuyukHarf(seciliKomiser?.ad_soyad || '')}</td></tr>
                                                <tr><td className="border border-black p-1.5 bg-slate-100/50">T.C. KİMLİK NO</td><td className="border border-black p-1.5"><input type="text" value={tcKimlik} onChange={e => bankaBilgisiGuncelle('tc', e.target.value)} className="w-full outline-none bg-yellow-50 focus:bg-white" placeholder="Buraya yazınız..." /></td></tr>
                                                <tr><td className="border border-black p-1.5 bg-slate-100/50">BANKA</td><td className="border border-black p-1.5"><input type="text" value={bankaAdi} onChange={e => bankaBilgisiGuncelle('banka', e.target.value)} className="w-full outline-none bg-yellow-50 focus:bg-white" placeholder="Örn: İŞ BANKASI" /></td></tr>
                                                <tr><td className="border border-black p-1.5 bg-slate-100/50">ŞUBE KODU</td><td className="border border-black p-1.5"><input type="text" value={subeKodu} onChange={e => bankaBilgisiGuncelle('sube', e.target.value)} className="w-full outline-none bg-yellow-50 focus:bg-white" placeholder="Örn: 3447-YEŞİLYURT" /></td></tr>
                                                <tr><td className="border border-black p-1.5 bg-slate-100/50">BANKA HESAP NO</td><td className="border border-black p-1.5"><input type="text" value={hesapNo} onChange={e => bankaBilgisiGuncelle('hesap', e.target.value)} className="w-full outline-none bg-yellow-50 focus:bg-white" placeholder="Hesap no..." /></td></tr>
                                                <tr><td className="border border-black p-1.5 bg-slate-100/50">BANKA IBAN NO</td><td className="border border-black p-1.5"><input type="text" value={ibanNo} onChange={e => bankaBilgisiGuncelle('iban', e.target.value)} className="w-full outline-none bg-yellow-50 focus:bg-white" placeholder="TR..." /></td></tr>
                                            </tbody>
                                        </table>

                                        <div className="text-right mb-6 mt-2 tff-no-print">
                                            <button onClick={finansBilgileriniKaydet} disabled={finansKaydediliyor} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-xs font-bold tracking-widest shadow-md transition-colors">
                                                {finansKaydediliyor ? '⚙️ KAYDEDİLİYOR...' : '💾 BİLGİLERİMİ SİSTEME KAYDET'}
                                            </button>
                                        </div>

                                        <div className="text-[10px] mb-8 relative">
                                            <p className="uppercase mb-8">{tamEkranBordroAy.replace('-', '/')} AYIN DA GÖREV ALDIĞIM MAÇ<br/>VE YOL ÜCRETLERİ AŞAĞIDAKİ GİBİDİR. TAHSİL EDİLDİĞİNDE YUKARIDAKİ<br/>BANKA HESABIMA YATIRILMASINI ARZ EDERİM.</p>
                                            <div className="absolute right-0 top-6 text-center">
                                                <div className="font-bold mb-6">İMZA</div>
                                                <div className="uppercase">{turkceBuyukHarf(seciliKomiser?.ad_soyad || '')}</div>
                                            </div>
                                        </div>

                                        <div className="text-[9px] mb-4 font-bold tracking-tight">
                                            <p>(lütfen tüm açıklamaları okuduktan sonra eksiksiz doldurunuz)</p>
                                            <p>lütfen ay sonlarında veya engeç takip eden ayın 5'ine kadar gönderiniz.</p>
                                            <p>Göndermiyenlerin ücretleri bankada bekletilecek ve bir sonraki ayın ücretleri ile birlikte ödenecektir</p>
                                            <p>Her ayın 1-31 arasındaki müsabakalar yazılacaktır.Diğer aya denk gelen müsabakalar yazılmayacaktır</p>
                                            <br/>
                                            <p>1.<span className="text-red-600">PROFESYONEL MÜSABAKALARI EN ÜST BÖLÜME YAZINIZ.ÜCRET ALINDI YSA ALINDI OLARAK BELİRTİNİZ</span></p>
                                            <p>2.)MÜSABAKA NEVİ MUHAKKAK YAZILACAKTIR. (S.L-U-19.1AK.U11 GİBİ)</p>
                                            <p>3.)U14-U13-U11 MÜSABAKALARINDA HARCIRAH ÖDENMEMEKTEDİR.İÇ MAÇ SAYILACAK.<br/>DEPLASMANDA BU MAÇLARIN YOL ÜCRETİ DERNEK TARAFINDAN KARŞILANACAKTIR.</p>
                                            <p>4.)HER NEVİDEKİ MÜSABAKALARDA MERKEZ İLÇELERE YOL PARASI YAZMAYINIZ.<br/>GÜZELBAHÇE -YELKİYE-MENDERESE -HARMANDALI YA KADAR OLAN MÜSABAKALARA YOL PARASI YAZILMAYACAKTIR</p>
                                            <p>5). ARKA ARKAYA ÇIKILAN 2 ADET U-11 VEYA 2 ADET U-12 MÜSABAKASI TEK MÜSABAKA SAYILIR.</p>
                                        </div>

                                        <h3 className="text-center font-bold text-red-600 text-[11px] mb-1">ÇIKILAN PROFESYONEL MÜSABAKA</h3>
                                        <table className="w-full text-[10px] font-bold border-collapse border border-black text-center mb-8">
                                            <thead className="bg-white">
                                                <tr>
                                                    <th className="border border-black p-1 w-8"></th>
                                                    <th className="border border-black p-1 w-20">TARİH</th>
                                                    <th className="border border-black p-1 text-left">EV SAHİBİ TAKIM</th>
                                                    <th className="border border-black p-1 w-24">LİGİ</th>
                                                    <th className="border border-black p-1 w-16">YOL</th>
                                                    <th className="border border-black p-1 w-28 text-[8px]">ÜCRET ALINDI / ALINMADI</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(() => {
                                                    const seciliMaclar = komiserMaclari.filter(m => getAyYil(m.tarih) === tamEkranBordroAy && m.mac_durumu !== 'iptal_edildi' && isBordroKategori(m.kategori_adi)).sort(siralamaFiltresi);
                                                    const profMaclar = seciliMaclar.filter(m => getAnaKategori(m.kategori_adi) === 'profesyonel');
                                                    
                                                    if (profMaclar.length === 0) {
                                                        return <tr><td className="border border-black p-1 h-6"></td><td className="border border-black p-1"></td><td className="border border-black p-1 text-left"></td><td className="border border-black p-1"></td><td className="border border-black p-1"></td><td className="border border-black p-1 text-slate-400">-</td></tr>;
                                                    }
                                                    
                                                    return profMaclar.map((m, i) => (
                                                        <tr key={i}>
                                                            <td className="border border-black p-1"></td>
                                                            <td className="border border-black p-1">{guvenliTarih(m.tarih)}</td>
                                                            <td className="border border-black p-1 text-left uppercase">{turkceBuyukHarf(m.ev_sahibi)}</td>
                                                            <td className="border border-black p-1 uppercase">{turkceBuyukHarf(m.kategori_adi)}</td>
                                                            <td className="border border-black p-1"></td>
                                                            <td className="border border-black p-0">
                                                                <select value={profUcretDurumlari[m.id] || ''} onChange={(e) => profUcretGuncelle(m.id, e.target.value)} className="w-full text-center outline-none bg-yellow-50 focus:bg-white text-[9px] font-bold cursor-pointer h-full py-1">
                                                                    <option value="">-- SEÇ --</option>
                                                                    <option value="ALINDI">ALINDI</option>
                                                                    <option value="ALINMADI">ALINMADI</option>
                                                                </select>
                                                            </td>
                                                        </tr>
                                                    ));
                                                })()}
                                            </tbody>
                                        </table>

                                        <table className="w-full text-[10px] font-bold border-collapse border border-black text-center">
                                            <thead className="bg-slate-100">
                                                <tr>
                                                    <th className="border border-black p-1 w-8">S.NO</th>
                                                    <th className="border border-black p-1 w-20">TARİH</th>
                                                    <th className="border border-black p-1 text-left">STAD</th>
                                                    <th className="border border-black p-1 w-12">SAAT</th>
                                                    <th className="border border-black p-1 w-24">NEVİ</th>
                                                    <th className="border border-black p-1 w-24">YOL ÜCRETİ</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(() => {
                                                    const seciliMaclar = komiserMaclari.filter(m => getAyYil(m.tarih) === tamEkranBordroAy && m.mac_durumu !== 'iptal_edildi' && isBordroKategori(m.kategori_adi)).sort(siralamaFiltresi);
                                                    const amatorMaclar = seciliMaclar.filter(m => getAnaKategori(m.kategori_adi) !== 'profesyonel');
                                                    
                                                    if (amatorMaclar.length === 0) {
                                                        return <tr><td className="border border-black p-1 h-6"></td><td className="border border-black p-1"></td><td className="border border-black p-1 text-left"></td><td className="border border-black p-1"></td><td className="border border-black p-1"></td><td className="border border-black p-1"></td></tr>;
                                                    }

                                                    return amatorMaclar.map((m, i) => (
                                                        <tr key={i}>
                                                            <td className="border border-black p-1">{i + 1}</td>
                                                            <td className="border border-black p-1">{guvenliTarih(m.tarih)}</td>
                                                            <td className="border border-black p-1 text-left uppercase truncate max-w-[200px]">{turkceBuyukHarf(m.saha)}</td>
                                                            <td className="border border-black p-1">{guvenliSaat(m.saat)}</td>
                                                            <td className="border border-black p-1 uppercase text-[9px] truncate max-w-[100px]">{turkceBuyukHarf(m.kategori_adi)}</td>
                                                            <td className="border border-black p-1"></td>
                                                        </tr>
                                                    ));
                                                })()}
                                                <tr>
                                                    <td colSpan={2} className="border border-black p-1 text-left bg-slate-100/50">TOPLAM İÇ MAÇ</td>
                                                    <td className="border border-black p-1 font-black text-sm">{komiserMaclari.filter(m => getAyYil(m.tarih) === tamEkranBordroAy && m.mac_durumu !== 'iptal_edildi' && isBordroKategori(m.kategori_adi) && getAnaKategori(m.kategori_adi) !== 'profesyonel').length}</td>
                                                    <td colSpan={2} className="border border-black p-1 bg-slate-100/50">TOPLAM DIŞ MAÇ</td>
                                                    <td className="border border-black p-1 text-left bg-slate-100/50"><span className="float-left">TOPLAM YOL ÜCRETİ</span></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}

                  <RehberModal isOpen={rehberAcik} onClose={rehberiKapatVeKaydet} />
              </Fragment>
          );
        }