"use client"
import React, { useState, useEffect, Fragment } from 'react'
import { supabase } from '../../lib/supabase'
import { toPng } from 'html-to-image' 
import * as XLSX from 'xlsx'

const AMATOR_MERKEZ_LOGO = "https://upload.wikimedia.org/wikipedia/tr/0/0a/TFF_logo.png?utm_source=tr.wikipedia.org&utm_campaign=index&utm_content=original";
const GELISIM_SOL_LOGO = "https://upload.wikimedia.org/wikipedia/tr/0/0a/TFF_logo.png?utm_source=tr.wikipedia.org&utm_campaign=index&utm_content=original";
const GELISIM_SAG_LOGO = "https://upload.wikimedia.org/wikipedia/tr/0/0a/TFF_logo.png?utm_source=tr.wikipedia.org&utm_campaign=index&utm_content=original"; 

const raporTurunuBelirle = (kategori: any) => {
    if (!kategori) return 'amator';
    const kat = String(kategori).toLocaleUpperCase('tr-TR');
    if (kat.includes('GELİŞİM') || kat.includes('AKADEMİ') || kat.includes('ELİT') || kat.includes('PAF') || kat.includes('KIZ') || kat.includes('KADIN')) return 'gelisim';
    if (kat.includes('PROF') || kat.includes('NESİNE') || kat.includes('SÜPER') || kat.includes('1. LİG') || kat.includes('2. LİG') || kat.includes('3. LİG') || kat.includes('BÖLGESEL') || kat.includes('BAL')) return 'yok';
    return 'amator';
}

const detayliRaporGosterilirMi = (kategori: any) => {
  const tur = raporTurunuBelirle(kategori);
  return tur !== 'yok'; 
}

const guvenliTarih = (tarihMetni: string | null | undefined) => {
    if (!tarihMetni) return "-";
    try { return new Date(tarihMetni).toLocaleDateString('tr-TR'); } 
    catch (e) { return tarihMetni; }
}

const guvenliSaat = (saatMetni: any) => {
    if (!saatMetni) return "-";
    try { return String(saatMetni).substring(0, 5); } 
    catch (e) { return "-"; }
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

const getGunRengi = (tarihStr: string | null | undefined) => {
    if (!tarihStr) return 'text-black';
    try {
        const d = new Date(tarihStr);
        const day = d.getDay(); 
        if (day === 0) return 'text-red-600'; 
        if (day === 3) return 'text-blue-600'; 
        return 'text-black'; 
    } catch (e) {
        return 'text-black';
    }
};

const temizHakem = (isim: any) => {
    if (!isim) return '';
    const s = String(isim).trim().toLocaleUpperCase('tr-TR');
    if (s.includes('TIKLA VE')) return '';
    return String(isim).trim();
};

const formatMacKodu = (kod: any) => {
    if (!kod) return '-';
    const s = String(kod).trim();
    if (s.length === 1 && !isNaN(Number(s))) return `0${s}`;
    return s;
}

// 🔥 VERCEL'İN VE SENİN EKRANININ BULAMADIĞI SORULAR BURADA 🔥
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

export default function AdminPage() {
  const [sifre, setSifre] = useState('')
  const [girisYapildi, setGirisYapildi] = useState(false)
  const [hata, setHatasi] = useState('')
  
  const [haftalikGruplar, setHaftalikGruplar] = useState<Record<number, any[]>>({})
  const [goruntulenenHafta, setGoruntulenenHafta] = useState<number | null>(null)
  const [sezonlukMaclar, setSezonlukMaclar] = useState<any[]>([]) 
  const [tumKomiserler, setTumKomiserler] = useState<any[]>([])
  const [tumMazeretler, setTumMazeretler] = useState<any[]>([])
  const [globalAktifHaftaNo, setGlobalAktifHaftaNo] = useState<number>(1)
  const [yukleniyor, setYukleniyor] = useState(true)

  const [acikMacId, setAcikMacId] = useState<number | null>(null)
  const [tamEkranRaporMac, setTamEkranRaporMac] = useState<any>(null)

  const [kategoriKirmiziAcik, setKategoriKirmiziAcik] = useState(true)
  const [kategoriDisiplinAcik, setKategoriDisiplinAcik] = useState(true)
  const [kategoriOlaysizAcik, setKategoriOlaysizAcik] = useState(true)
  const [kategoriTebellugAcik, setKategoriTebellugAcik] = useState(true)
  const [kategoriBekleyenAcik, setKategoriBekleyenAcik] = useState(true)
  const [kategoriIptalAcik, setKategoriIptalAcik] = useState(false)
  const [kategoriMazeretAcik, setKategoriMazeretAcik] = useState(false) 
  const [kategoriSicilAcik, setKategoriSicilAcik] = useState(false) 
  const [seciliSicilKomiserId, setSeciliSicilKomiserId] = useState<string>('') 

  const [excelModalAcik, setExcelModalAcik] = useState(false)
  const [yuklenenExcelVerisi, setYuklenenExcelVerisi] = useState<any[]>([])
  const [excelKaydediliyor, setExcelKaydediliyor] = useState(false)
  const [excelHata, setExcelHata] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false) 

  const [bultenModalAcik, setBultenModalAcik] = useState(false)
  const [bultenTab, setBultenTab] = useState<'gorev' | 'sonuc'>('gorev')

  const [atamaSelects, setAtamaSelects] = useState<Record<number, string>>({})
  const [degisimAcikMacId, setDegisimAcikMacId] = useState<number | null>(null)
  const [yeniKomiserId, setYeniKomiserId] = useState<string>('')

  const [acikTebellugKomiser, setAcikTebellugKomiser] = useState<string | null>(null)
  const [susturulanAlarmlar, setSusturulanAlarmlar] = useState<number[]>([]);

  const [sistemYonetimModalAcik, setSistemYonetimModalAcik] = useState(false)
  const [sistemTab, setSistemTab] = useState<'komiser_ekle' | 'mac_ekle' | 'hakem_ekle' | 'statu_ekle'>('komiser_ekle')
  
  const [tumStatuler, setTumStatuler] = useState<any[]>([])
  const [statuForm, setStatuForm] = useState<any>({ id: null, kategori_anahtar: '', baslik: '', yas_siniri: '', sure: '', top: '', degisiklik: '', beraberlik: '', hakem: '' })
  const [statuKaydediliyor, setStatuKaydediliyor] = useState(false)

  const [yeniPersonelAd, setYeniPersonelAd] = useState('')
  const [yeniPersonelSicil, setYeniPersonelSicil] = useState('')
  const [personelEkleniyor, setPersonelEkleniyor] = useState(false)

  const [yeniHakemAd, setYeniHakemAd] = useState('')
  const [hakemEkleniyor, setHakemEkleniyor] = useState(false)

  const [manuelMacKodu, setManuelMacKodu] = useState('')
  const [manuelMacTarih, setManuelMacTarih] = useState('')
  const [manuelMacSaat, setManuelMacSaat] = useState('')
  const [manuelMacSaha, setManuelMacSaha] = useState('')
  const [manuelMacLig, setManuelMacLig] = useState('')
  const [manuelMacEv, setManuelMacEv] = useState('')
  const [manuelMacMis, setManuelMacMis] = useState('')
  const [manuelMacEkleniyor, setManuelMacEkleniyor] = useState(false)

  const girisKontrol = (e: React.FormEvent) => {
    e.preventDefault()
    if (sifre === '1923') { setGirisYapildi(true); setHatasi(''); } 
    else { setHatasi('Hatalı şifre. Yönetim Merkezine giriş reddedildi.') }
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

  useEffect(() => { 
      if (girisYapildi) { 
          veriGetir();
          try {
              const kayitliAlarmlar = localStorage.getItem('karargahSusturulanAlarmlar');
              if (kayitliAlarmlar) setSusturulanAlarmlar(JSON.parse(kayitliAlarmlar));
          } catch(e) {}
      } 
  }, [girisYapildi])

  const alarmSustur = (id: number) => {
      const yeni = [...susturulanAlarmlar, id];
      setSusturulanAlarmlar(yeni);
      localStorage.setItem('karargahSusturulanAlarmlar', JSON.stringify(yeni));
  }

  const veriGetir = async () => {
    setYukleniyor(true)
    try {
      let maclarVerisi: any[] = []; let sayfa = 0; const limit = 1000; let veriKaldimi = true;
      while (veriKaldimi) {
        const { data, error } = await supabase.from('musabakalar').select('*').range(sayfa * limit, (sayfa + 1) * limit - 1)
        if (error) break;
        if (data && Array.isArray(data) && data.length > 0) {
          maclarVerisi = [...maclarVerisi, ...data]
          if (data.length < limit) veriKaldimi = false; else sayfa++;
        } else { veriKaldimi = false }
      }
      setSezonlukMaclar(maclarVerisi);
      
      const { data: komiserlerData } = await supabase.from('komiserler').select('*')
      if (komiserlerData) setTumKomiserler(komiserlerData)

      const { data: mazeretData } = await supabase.from('mazeretler').select('*');
      if (mazeretData) setTumMazeretler(mazeretData);

      const { data: statuData } = await supabase.from('lig_statuleri').select('*');
      if (statuData) setTumStatuler(statuData);

      if (maclarVerisi.length > 0) {
        const cumalar = Array.from(new Set(maclarVerisi.map(mac => mac?.tarih ? cumaBul(mac.tarih) : 0).filter(t => t > 0))).sort((a, b) => a - b);
        const gruplar: Record<number, any[]> = {};
        
        maclarVerisi.forEach(mac => {
            if(!mac.tarih) return;
            const hCuma = cumaBul(mac.tarih);
            const hIndex = cumalar.indexOf(hCuma) + 1;
            if(hIndex > 0) {
                if(!gruplar[hIndex]) gruplar[hIndex] = [];
                gruplar[hIndex].push(mac);
            }
        });

        Object.keys(gruplar).forEach(k => gruplar[Number(k)].sort(siralamaFiltresi));
        setHaftalikGruplar(gruplar);
        
        const aktifHafta = cumalar.length;
        setGlobalAktifHaftaNo(aktifHafta);
        
        if (goruntulenenHafta === null) {
            setGoruntulenenHafta(aktifHafta);
        }
      }
    } catch (err) { console.error(err) }
    setYukleniyor(false)
  }

  const komiserIsmiBul = (id: any) => {
    const komiser = tumKomiserler.find(k => String(k.komiser_id) === String(id))
    return komiser ? komiser.ad_soyad : 'Atanmamış'
  }

  const siraliBultenMaclari = [...(haftalikGruplar[goruntulenenHafta || 1] || [])].sort((a, b) => {
      const kA = komiserIsmiBul(a.komiser_id);
      const kB = komiserIsmiBul(b.komiser_id);
      return kA.localeCompare(kB, 'tr-TR');
  });

  const indirExcel = () => {
      const data = siraliBultenMaclari.map((m, idx) => {
          const komiser = komiserIsmiBul(m.komiser_id);
          let isIptal = m.mac_durumu === 'iptal_edildi';
          let skor = m.skor_girildi ? `${m.ev_sahibi_skor ?? '-'} - ${m.misafir_skor ?? '-'}` : '';
          if(isIptal) skor = 'İPTAL';
          
          let durum = '-';
          if (m.olay_durumu === 'emniyetlik_olay') durum = 'EMNİYETLİK';
          else if (m.olay_durumu === 'teknik_olay') durum = 'İHRAÇ VAR';
          else if (m.olay_durumu === 'olaysiz') durum = 'OLAYSIZ';
          
          if (m.mac_durumu === 'takimlar_cikmadi') durum = 'ÇIKMADI';
          else if (m.mac_durumu === 'yarida_kaldi') durum = 'YARIDA KALDI';
          else if (isIptal) durum = 'İPTAL';

          const row: any = {
              "SIRA": idx + 1,
              "KOD": formatMacKodu(m.mac_kodu),
              "TARİH": guvenliTarih(m.tarih),
              "SAAT": guvenliSaat(m.saat),
              "SAHA": m.saha,
              "KATEGORİ": m.kategori_adi,
              "EV SAHİBİ": m.ev_sahibi
          };

          if (bultenTab === 'sonuc') row["SKOR"] = skor;
          row["MİSAFİR TAKIM"] = m.misafir_takim;
          row["SAHA KOMİSERİ"] = komiser;
          if (bultenTab === 'sonuc') row["DURUM"] = durum;

          return row;
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Bulten_Ozeti");
      XLSX.writeFile(wb, `Izmir_Saha_Komiserleri_${goruntulenenHafta}_Hafta_${bultenTab.toUpperCase()}.xlsx`);
  }

  const indirPDF = () => {
      alert("Açılan pencerede 'Yazıcı / Hedef' kısmından 'PDF Olarak Kaydet'i seçerek mükemmel kalitede belgenizi alabilirsiniz. Belge YATAY olarak ayarlanmıştır.");
      window.print();
  }

  const statuKaydetSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setStatuKaydediliyor(true);
      try {
          const payload = { ...statuForm };
          delete payload.id;
          payload.kategori_anahtar = payload.kategori_anahtar.toLocaleUpperCase('tr-TR').trim();
          
          if (statuForm.id) {
              const { error } = await supabase.from('lig_statuleri').update(payload).eq('id', statuForm.id);
              if (error) throw error;
              alert("✅ Statü başarıyla GÜNCELLENDİ.");
          } else {
              const { error } = await supabase.from('lig_statuleri').insert([payload]);
              if (error) {
                  if (error.code === '23505') alert("Hata: Bu Kategori Anahtarı zaten var. Lütfen listeden onu bulup düzenleyin.");
                  else throw error;
              } else {
                  alert("✅ Statü başarıyla EKLENDİ.");
              }
          }
          setStatuForm({ id: null, kategori_anahtar: '', baslik: '', yas_siniri: '', sure: '', top: '', degisiklik: '', beraberlik: '', hakem: '' });
          veriGetir();
      } catch (err: any) { alert("Hata: " + err.message); }
      setStatuKaydediliyor(false);
  }

  const statuSil = async (id: number) => {
      if (window.confirm("Bu statüyü veritabanından TAMAMEN silmek istediğinize emin misiniz?")) {
          await supabase.from('lig_statuleri').delete().eq('id', id);
          veriGetir();
      }
  }

  const komiserEkle = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!yeniPersonelAd || !yeniPersonelSicil) return;
      setPersonelEkleniyor(true);
      let islenecekSicil = yeniPersonelSicil.trim();
      if (/^\d{4,10}$/.test(islenecekSicil) && !islenecekSicil.startsWith('35')) islenecekSicil = '35' + islenecekSicil;
      try {
          const { error } = await supabase.from('komiserler').insert([{ komiser_id: islenecekSicil, ad_soyad: yeniPersonelAd.toLocaleUpperCase('tr-TR') }]);
          if (error) { if (error.code === '23505') alert("Hata: Bu sicil numarası zaten kayıtlı!"); else throw error; } 
          else { alert("✅ Komiser eklendi."); setYeniPersonelAd(''); setYeniPersonelSicil(''); veriGetir(); }
      } catch (err: any) { alert("Hata: " + err.message); }
      setPersonelEkleniyor(false);
  }

  const hakemEkleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!yeniHakemAd) return;
      setHakemEkleniyor(true);
      try {
          const { error } = await supabase.from('hakemler').insert([{ ad_soyad: yeniHakemAd.toLocaleUpperCase('tr-TR') }]);
          if(error) throw error;
          alert("✅ Hakem eklendi!"); setYeniHakemAd(''); veriGetir(); 
      } catch (err: any) { alert("Hata: " + err.message); }
      setHakemEkleniyor(false);
  }

  const otomatikMacKoduBul = () => {
      if (sezonlukMaclar.length === 0) return '';
      let maxKod = 0;
      sezonlukMaclar.forEach(mac => {
          const kodNum = parseInt(mac.mac_kodu);
          if (!isNaN(kodNum) && kodNum > maxKod) maxKod = kodNum;
      });
      return maxKod > 0 ? String(maxKod + 1) : '';
  }

  const manuelMacEkle = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!manuelMacKodu || !manuelMacTarih || !manuelMacEv || !manuelMacMis) return; 
      setManuelMacEkleniyor(true);
      try {
          const { error } = await supabase.from('musabakalar').insert([{
              mac_kodu: manuelMacKodu, tarih: manuelMacTarih, saat: manuelMacSaat || null, saha: manuelMacSaha.toLocaleUpperCase('tr-TR'),
              kategori_adi: manuelMacLig.toLocaleUpperCase('tr-TR'), ev_sahibi: manuelMacEv.toLocaleUpperCase('tr-TR'),
              misafir_takim: manuelMacMis.toLocaleUpperCase('tr-TR'), komiser_id: null, mac_durumu: 'oynandi',
              olay_durumu: 'olaysiz', skor_girildi: false, tebellug_edildi: false
          }]);
          if (error) throw error;
          alert("✅ Ekstra maç işlendi."); setManuelMacEv(''); setManuelMacMis(''); setManuelMacSaha(''); setManuelMacSaat(''); setManuelMacKodu(String(parseInt(manuelMacKodu) + 1)); veriGetir(); 
      } catch (err: any) { alert("Hata: " + err.message); }
      setManuelMacEkleniyor(false);
  }

  const mukerrerleriTemizle = async () => {
      if(!window.confirm("DİKKAT: Temizlik başlıyor! (Aynı maça atanan FARKLI komiserler SİLİNMEYECEK). Onaylıyor musunuz?")) return;
      setYukleniyor(true);
      try {
          const { data, error } = await supabase.from('musabakalar').select('id, mac_kodu, tarih, kategori_adi, ev_sahibi, misafir_takim, komiser_id').order('id', { ascending: true });
          if(error) throw error;
          const dnaMap = new Map(); const silinecekIdler: number[] = [];
          data.forEach(m => {
              if(!m.ev_sahibi || !m.misafir_takim) return;
              const temizle = (str: any) => String(str || 'bos').replace(/\s+/g, '').toLocaleUpperCase('tr-TR');
              const anahtar = `${temizle(m.mac_kodu)}_${temizle(m.tarih)}_${temizle(m.kategori_adi)}_${temizle(m.ev_sahibi)}_${temizle(m.misafir_takim)}_${String(m.komiser_id || 'atanmamis')}`;
              
              if(dnaMap.has(anahtar)) silinecekIdler.push(m.id);
              else dnaMap.set(anahtar, m.id);
          });

          if(silinecekIdler.length === 0) alert("Sistemde hiç mükerrer maç bulunamadı.");
          else {
              const chunkSize = 200;
              for (let i = 0; i < silinecekIdler.length; i += chunkSize) {
                  const chunk = silinecekIdler.slice(i, i + chunkSize);
                  await supabase.from('musabakalar').delete().in('id', chunk);
              }
              alert(`✅ Başarılı! Toplam ${silinecekIdler.length} adet mükerrer temizlendi.`); veriGetir();
          }
      } catch(e:any) { alert("Hata: " + e.message); }
      setYukleniyor(false);
  }

  const processExcelFile = (file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const data = new Uint8Array(event.target?.result as ArrayBuffer);
              const workbook = XLSX.read(data, { type: 'array' });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
              if (jsonData.length === 0) { setExcelHata("Dosya boş."); return; }

              const islenmisVeri = jsonData.map((row: any) => {
                  const normRow: any = {};
                  Object.keys(row).forEach(k => { normRow[k.trim().toLocaleUpperCase('tr-TR')] = row[k]; });
                  let islenmisTarih = normRow['TARİH'] || normRow['TARIH'] || normRow['TARİH (YYYY-MM-DD)'] || '';
                  if (typeof islenmisTarih === 'number') {
                      const excelDate = new Date(Math.round((islenmisTarih - 25569) * 86400 * 1000));
                      islenmisTarih = excelDate.toISOString().split('T')[0];
                  } else if (islenmisTarih.includes('.')) {
                       const parts = islenmisTarih.split('.'); if(parts.length === 3) islenmisTarih = `${parts[2]}-${parts[1]}-${parts[0]}`;
                  } else if (islenmisTarih.includes('/')) {
                       const parts = islenmisTarih.split('/'); if(parts.length === 3) islenmisTarih = `${parts[2]}-${parts[1]}-${parts[0]}`;
                  }

                  let islenmisSaat = normRow['SAAT'] || '';
                  if (typeof islenmisSaat === 'number') {
                      const totalSeconds = Math.round(islenmisSaat * 86400);
                      const h = Math.floor(totalSeconds / 3600); const m = Math.floor((totalSeconds % 3600) / 60);
                      islenmisSaat = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                  }

                  const rawName = String(normRow['SAHA KOMİSERİ'] || normRow['KOMİSER'] || normRow['TC'] || '').trim();
                  let finalKomiserId = rawName; 
                  if (/^\d{4,10}$/.test(rawName) && !rawName.startsWith('35')) finalKomiserId = '35' + rawName;
                  
                  if (rawName && tumKomiserler.length > 0) {
                      const temizle = (isim: string) => isim.toLocaleUpperCase('tr-TR').replace(/\s+/g, ' ').trim();
                      const matchedKomiser = tumKomiserler.find(k => k.ad_soyad && temizle(k.ad_soyad) === temizle(rawName));
                      if (matchedKomiser) finalKomiserId = matchedKomiser.komiser_id;
                  }

                  return {
                      mac_kodu: String(normRow['M.KODU'] || normRow['MAÇ KODU'] || normRow['KOD'] || ''), tarih: islenmisTarih,
                      saat: islenmisSaat, saha: String(normRow['STAD'] || normRow['SAHA'] || ''),
                      kategori_adi: String(normRow['KATEGORİSİ'] || normRow['LİG'] || ''),
                      ev_sahibi: String(normRow['EV SAHİBİ TAKIM'] || normRow['EV SAHİBİ'] || ''),
                      misafir_takim: String(normRow['MİSAFİR TAKIM'] || normRow['MİSAFİR'] || ''),
                      komiser_id: finalKomiserId, raw_komiser_name: rawName 
                  }
              }).filter(m => {
                  const ev = m.ev_sahibi.trim().toLocaleUpperCase('tr-TR'); const misafir = m.misafir_takim.trim().toLocaleUpperCase('tr-TR');
                  return ev && misafir && ev !== 'BAY' && misafir !== 'BAY';
              });
              setYuklenenExcelVerisi(islenmisVeri); setExcelHata(null);
          } catch (error) { setExcelHata("Dosya okunamadı."); }
      };
      reader.readAsArrayBuffer(file);
  }

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }
  const onDrop = (e: React.DragEvent) => {
      e.preventDefault(); setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processExcelFile(e.dataTransfer.files[0]);
      }
  }

  const bulteniVeritabaninaKaydet = async () => {
      if (yuklenenExcelVerisi.length === 0) return;
      setExcelKaydediliyor(true);
      try {
          const dbVerisi = yuklenenExcelVerisi.map(mac => ({
              mac_kodu: mac.mac_kodu, tarih: mac.tarih || null, saat: mac.saat || null, saha: mac.saha,
              kategori_adi: mac.kategori_adi, ev_sahibi: mac.ev_sahibi, misafir_takim: mac.misafir_takim,
              komiser_id: /^\d+$/.test(mac.komiser_id) ? mac.komiser_id : null
          }));

          const { data: mevcutlar } = await supabase.from('musabakalar').select('mac_kodu, tarih, kategori_adi, ev_sahibi, misafir_takim, komiser_id');
          
          const mevcutAnahtarlar = new Set((mevcutlar || []).map(m => {
              const temizle = (str: any) => String(str || 'bos').replace(/\s+/g, '').toLocaleUpperCase('tr-TR');
              return `${temizle(m.mac_kodu)}_${temizle(m.tarih)}_${temizle(m.kategori_adi)}_${temizle(m.ev_sahibi)}_${temizle(m.misafir_takim)}_${String(m.komiser_id || 'atanmamis')}`;
          }));
          
          const eklenecekler = dbVerisi.filter(m => {
              const temizle = (str: any) => String(str || 'bos').replace(/\s+/g, '').toLocaleUpperCase('tr-TR');
              const anahtar = `${temizle(m.mac_kodu)}_${temizle(m.tarih)}_${temizle(m.kategori_adi)}_${temizle(m.ev_sahibi)}_${temizle(m.misafir_takim)}_${String(m.komiser_id || 'atanmamis')}`;
              return !mevcutAnahtarlar.has(anahtar);
          });

          if (eklenecekler.length === 0) { alert("Tüm maçlar zaten mevcut! (Çift kayıt önlendi)."); setExcelModalAcik(false); setYuklenenExcelVerisi([]); setExcelKaydediliyor(false); return; }
          
          const { error } = await supabase.from('musabakalar').insert(eklenecekler);
          if (error) throw error;
          alert(`✅ Başarılı! ${eklenecekler.length} adet müsabaka eklendi.`);
          setExcelModalAcik(false); setYuklenenExcelVerisi([]); veriGetir(); 
      } catch (err: any) { alert("Hata: " + err.message); } finally { setExcelKaydediliyor(false); }
  }

  const toggleMac = (id: number) => { setAcikMacId(acikMacId === id ? null : id); }

  const sessizMacGuncelle = (macId: number, yeniVeriler: any) => {
      setHaftalikGruplar(prev => {
          const yeniGruplar = { ...prev };
          Object.keys(yeniGruplar).forEach(haftaNo => {
              yeniGruplar[Number(haftaNo)] = yeniGruplar[Number(haftaNo)].map(m => m.id === macId ? { ...m, ...yeniVeriler } : m);
          });
          return yeniGruplar;
      });
      setSezonlukMaclar(prev => prev.map(m => m.id === macId ? { ...m, ...yeniVeriler } : m));
  };

  const islemYapAta = async (macId: number) => {
      const kId = atamaSelects[macId];
      if (!kId) { alert("Komiser seçiniz!"); return; }
      try {
          const { error } = await supabase.from('musabakalar').update({ komiser_id: kId }).eq('id', macId);
          if (error) throw error;
          alert("✅ Atandı!"); sessizMacGuncelle(macId, { komiser_id: kId }); 
      } catch (err: any) { alert("Hata: " + err.message); }
  }

  const islemYapDevir = async (macId: number) => {
      if (!yeniKomiserId) return;
      if (window.confirm("Görevi devretmek istiyor musunuz?")) {
          try {
              const { error } = await supabase.from('musabakalar').update({ komiser_id: yeniKomiserId, tebellug_edildi: false }).eq('id', macId);
              if (error) throw error;
              alert("✅ Devredildi!"); setDegisimAcikMacId(null); setYeniKomiserId(''); sessizMacGuncelle(macId, { komiser_id: yeniKomiserId, tebellug_edildi: false }); 
          } catch (err: any) { alert("Hata: " + err.message); }
      }
  }

  const macIptalEt = async (macId: number) => {
      if (window.confirm("⛔ İptal etmek istediğinize emin misiniz?")) {
          try {
              const guncelVeri = { mac_durumu: 'iptal_edildi', olay_durumu: 'iptal', skor_girildi: true, tebellug_edildi: true, rapor_notu: 'Merkez İptali' };
              const { error } = await supabase.from('musabakalar').update(guncelVeri).eq('id', macId);
              if (error) throw error;
              alert("✅ İptal edildi."); sessizMacGuncelle(macId, guncelVeri); 
          } catch (err: any) { alert("Hata: " + err.message); }
      }
  }

  const tffTutanakIndir = async (mac: any, prefix: string) => {
      const element = document.getElementById(`${prefix}-tff-form-${mac.id}`);
      if (element) {
        try {
          const style = document.createElement('style');
          style.innerHTML = '.tff-no-print { display: none !important; }';
          document.head.appendChild(style);
          const fullWidth = element.scrollWidth;
          const fullHeight = element.scrollHeight;
          const dataURL = await toPng(element as HTMLElement, { 
              backgroundColor: '#ffffff', pixelRatio: 2, cacheBust: true, width: fullWidth, height: fullHeight,
              style: { fontFamily: 'sans-serif', transform: 'scale(1)', transformOrigin: 'top left', margin: '0' } 
          });
          const link = document.createElement('a'); link.href = dataURL; link.download = `Sistem_TFF_Raporu_${mac.ev_sahibi}_vs_${mac.misafir_takim}.png`;
          document.body.appendChild(link); link.click(); document.body.removeChild(link); document.head.removeChild(style);
        } catch (err) { alert("Resmi Tutanak indirilirken cihazınızdan kaynaklı bir sorun oluştu."); }
      }
  }

  const renderTffRaporu = (mac: any, prefix: string) => {
      let safeRaporDetay = mac.tff_rapor_detaylari || {};
      if (typeof safeRaporDetay === 'string') { try { safeRaporDetay = JSON.parse(safeRaporDetay); } catch(e) { safeRaporDetay = {}; } }
      
      const raporTuru = raporTurunuBelirle(mac.kategori_adi);
      const komiserTamIsim = komiserIsmiBul(mac.komiser_id);
      const komiserIlkIsim = typeof komiserTamIsim === 'string' ? komiserTamIsim.split(' ')[0] : 'KOMİSER';
      const ihracEvListesi = Array.isArray(safeRaporDetay.ihrac_ev) ? safeRaporDetay.ihrac_ev : [];
      const ihracMisListesi = Array.isArray(safeRaporDetay.ihrac_mis) ? safeRaporDetay.ihrac_mis : [];
      const maxSatir = Math.max(ihracEvListesi.length, ihracMisListesi.length) || 1;

      const EvetHayirBox = ({ val }: { val: string }) => (
          <div className="flex items-center gap-4 pointer-events-none"><div className="flex items-center gap-1"><span className="w-8 text-right text-slate-700">Evet</span><div className="w-4 h-4 border border-black flex items-center justify-center text-xs font-bold bg-white text-black">{val === 'evet' ? 'X' : ''}</div></div><div className="flex items-center gap-1"><span className="w-8 text-right text-slate-700">Hayır</span><div className="w-4 h-4 border border-black flex items-center justify-center text-xs font-bold bg-white text-black">{val === 'hayir' ? 'X' : ''}</div></div></div>
      );

      return (
          <div id={`${prefix}-tff-form-${mac.id}`} className="min-w-[700px] w-full bg-white p-6 border-2 border-black relative font-sans text-black shadow-sm mx-auto flex flex-col gap-6">
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
                          <div className="col-span-1 p-2 flex flex-col items-center justify-center bg-slate-100/30 border-r-0"><span className="text-[10px] font-bold mb-1">SKOR</span><span className="font-black text-lg text-black">{mac.ev_sahibi_skor !== null ? mac.ev_sahibi_skor : '-'}</span></div>
                      </div>
                      
                      <div className="p-2 border-b border-dashed border-black flex justify-between items-center"><span className="text-[10px] font-bold w-12">KATEGORİ:</span> <span className="font-bold text-[10px] text-right truncate w-2/3 text-black">{mac?.kategori_adi || '-'}</span></div>
                      
                      <div className="grid grid-cols-4 border-b border-black border-r border-l-0">
                          <div className="col-span-3 p-2 flex flex-col justify-center border-r border-dashed border-black"><div className="flex gap-2"><span className="text-[10px] font-bold w-12">MİSAFİR:</span> <span className="font-bold text-xs uppercase truncate text-black">{mac?.misafir_takim || '-'}</span></div></div>
                          <div className="col-span-1 p-2 flex flex-col items-center justify-center bg-slate-100/30 border-r-0"><span className="font-black text-lg text-black">{mac.misafir_skor !== null ? mac.misafir_skor : '-'}</span></div>
                      </div>
                      <div className="flex flex-col border-b border-black">
                          <div className="p-2 flex justify-between items-center border-b border-dashed border-black"><span className="text-[10px] font-bold">TARİH:</span> <span className="font-bold text-xs text-black">{guvenliTarih(mac?.tarih)}</span></div>
                          <div className="p-2 flex justify-between items-center"><span className="text-[10px] font-bold">SAAT:</span> <span className="font-bold text-xs text-black">{guvenliSaat(mac?.saat)}</span></div>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-0 border border-black mb-6 text-black">
                      <div className="bg-slate-100/50 p-1.5 border-r border-b border-dashed border-black text-center text-[11px] font-bold">HAKEM BİLGİLERİ</div>
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
                          <div className="font-serif text-2xl text-blue-800 -mb-2 italic opacity-80" style={{fontFamily: "'Brush Script MT', cursive"}}>{komiserIlkIsim}</div>
                          <div className="font-bold text-sm border-b border-black px-4 pb-1">{komiserTamIsim}</div>
                          <div className="text-[10px] text-slate-500">GSM Telefon No: ''</div>
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
                              <div className="flex border-b border-black bg-blue-50/30">
                                  <div className="w-1/2 border-r border-black p-1.5 text-[10px] text-blue-900">↳ GÜVENLİK AMİRİ ADI SOYADI</div>
                                  <div className="w-1/2 p-1.5">
                                      <span className="w-full text-xs font-black uppercase text-left inline-block">{temizHakem(safeRaporDetay?.guvenlik_amiri)}</span>
                                  </div>
                              </div>
                              <div className="flex border-b border-black bg-blue-50/30">
                                  <div className="w-1/2 border-r border-black p-1.5 text-[10px] text-blue-900">↳ GÜVENLİK AMİRİ TELEFON</div>
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
                              <div className="flex border-b border-black bg-blue-50/30">
                                  <div className="w-1/2 border-r border-black p-1.5 text-[10px] text-blue-900">↳ SAĞLIK MEMURU ADI SOYADI</div>
                                  <div className="w-1/2 p-1.5">
                                      <span className="w-full text-xs font-black uppercase text-left inline-block">{temizHakem(safeRaporDetay?.saglik_adi)}</span>
                                  </div>
                              </div>
                              <div className="flex bg-blue-50/30">
                                  <div className="w-1/2 border-r border-black p-1.5 text-[10px] text-blue-900">↳ SAĞLIK MEMURU TELEFON</div>
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
                          <div className="font-serif text-2xl text-blue-800 -mb-2 italic opacity-80" style={{fontFamily: "'Brush Script MT', cursive"}}>{komiserIlkIsim}</div>
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

  const RaporDurumKarti = ({ mac, tip, isArsiv = false }: { mac: any, tip: 'emniyet' | 'teknik' | 'olaysiz' | 'bekleyen' | 'tebellug' | 'iptal', isArsiv?: boolean }) => {
    let renkSiniflari = { bg: "bg-slate-800", border: "border-slate-700", text: "text-slate-300", badge: "bg-slate-700 text-slate-300" };
    if (tip === 'emniyet') { renkSiniflari = { bg: "bg-red-950/20", border: "border-red-600", text: "text-red-500", badge: "bg-red-600 text-white" }; } 
    else if (tip === 'teknik') { renkSiniflari = { bg: "bg-amber-950/20", border: "border-amber-500", text: "text-amber-500", badge: "bg-amber-600 text-white" }; } 
    else if (tip === 'olaysiz') { renkSiniflari = { bg: "bg-slate-800/80", border: "border-slate-700", text: "text-slate-300", badge: "bg-slate-900 text-white" }; } 
    else if (tip === 'tebellug') { renkSiniflari = { bg: "bg-purple-950/30", border: "border-purple-500", text: "text-purple-400", badge: "bg-purple-600 text-white" }; }
    else if (tip === 'iptal') { renkSiniflari = { bg: "bg-red-950/10", border: "border-red-900/50", text: "text-red-600", badge: "bg-red-900 text-white opacity-60" }; }

    const isAcik = acikMacId === mac.id; 
    const komiserTamIsim = komiserIsmiBul(mac.komiser_id);
    const macBittiMi = mac.skor_girildi === true && mac.mac_durumu !== 'iptal_edildi';

    return (
      <div className={`mb-3 rounded-xl border-l-4 overflow-hidden shadow-md transition-all ${renkSiniflari.border}`}>
        <button onClick={() => toggleMac(mac.id)} className={`w-full text-left p-4 flex justify-between items-center ${renkSiniflari.bg} hover:brightness-125 transition-all focus:outline-none`}>
            <div className="flex-1 pr-4 w-full">
                <div className="flex items-center flex-wrap gap-2 mb-3">
                  <span className={`${renkSiniflari.badge} px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow-sm`}>{formatMacKodu(mac.mac_kodu)}</span>
                  <span className="text-blue-400 text-[10px] font-bold uppercase tracking-wider">{mac.kategori_adi}</span>
                  {tip === 'iptal' && <span className="bg-red-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded animate-pulse">İPTAL EDİLDİ</span>}
                </div>
                <div className="flex flex-col gap-1.5 w-full md:w-3/4 mb-3">
                  <div className="flex justify-between items-center rounded px-2 py-1 bg-slate-900/30">
                      <h3 className={`font-bold text-sm md:text-base uppercase pr-2 truncate w-full ${tip === 'iptal' ? 'text-red-400 line-through opacity-70' : 'text-white'}`}>{mac.ev_sahibi || '-'}</h3>
                      {(tip !== 'bekleyen' && tip !== 'tebellug' && tip !== 'iptal') && <span className="text-lg md:text-xl font-black text-white w-12 text-right tabular-nums">{mac.ev_sahibi_skor !== null ? mac.ev_sahibi_skor : '-'}</span>}
                  </div>
                  <div className="flex justify-between items-center rounded px-2 py-1 bg-slate-900/30">
                      <h3 className={`font-bold text-sm md:text-base uppercase pr-2 truncate w-full ${tip === 'iptal' ? 'text-red-400 line-through opacity-70' : 'text-white'}`}>{mac.misafir_takim || '-'}</h3>
                      {(tip !== 'bekleyen' && tip !== 'tebellug' && tip !== 'iptal') && <span className="text-lg md:text-xl font-black text-white w-12 text-right tabular-nums">{mac.misafir_skor !== null ? mac.misafir_skor : '-'}</span>}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 font-mono leading-snug mt-1">{mac.saha} <br/> <span className="text-blue-300">{guvenliTarih(mac.tarih)} - {guvenliSaat(mac.saat)}</span></div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="text-right hidden sm:block">
                    <span className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Müsabaka Komiseri</span>
                    <span className="bg-slate-950 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shadow-inner">{komiserTamIsim}</span>
                </div>
                <span className={`text-xl transition-transform duration-300 ${renkSiniflari.text} ${isAcik ? 'rotate-180' : ''}`}>▼</span>
            </div>
        </button>

        {isAcik && (
          <div className="bg-slate-900 border-t border-slate-800 p-4 md:p-6 animate-fade-in-down">
             {tip === 'emniyet' && (
                 <div className="mb-4 pb-4 border-b border-slate-800 flex justify-between items-center">
                     {!susturulanAlarmlar.includes(mac.id) ? (
                         <button onClick={() => alarmSustur(mac.id)} className="bg-red-950/80 hover:bg-red-900 border border-red-500 text-white px-4 py-2 rounded-lg text-xs font-black tracking-widest transition-colors flex items-center gap-2 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse">🔇 BU MAÇIN ALARMINI SUSTUR</button>
                     ) : (
                         <span className="bg-slate-900/50 text-slate-500 border border-slate-800 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2">🔕 Bu maçın alarmı Yönetim tarafından susturuldu.</span>
                     )}
                 </div>
             )}
             <div className="sm:hidden mb-4 pb-4 border-b border-slate-800"><span className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Müsabaka Komiseri</span><span className="bg-slate-950 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-inner inline-block">{komiserTamIsim}</span></div>
             {(tip !== 'bekleyen' && tip !== 'tebellug') && (
                 <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 mb-4"><h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 border-b border-slate-800 pb-2">Komiserin Hızlı Olay Notu</h4><p className={`text-sm font-serif leading-relaxed ${tip === 'iptal' ? 'text-red-400 font-bold' : 'text-slate-300'}`}>{mac.rapor_notu || <span className="italic text-slate-600">Not düşülmemiş.</span>}</p></div>
             )}
             {detayliRaporGosterilirMi(mac.kategori_adi) && (tip === 'emniyet' || tip === 'teknik' || tip === 'olaysiz') && (
                 <div className="mt-4">
                    {mac.tff_rapor_detaylari?.detayli_kaydedildi ? (
                        <button onClick={() => setTamEkranRaporMac(mac)} className="w-full bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 border border-blue-800/50 py-4 rounded-lg font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-lg">📄 TFF RESMİ TUTANAĞINI TAM EKRAN GÖRÜNTÜLE</button>
                    ) : (
                        <div className="bg-red-950/40 border border-red-900/50 text-red-400 p-3 rounded-lg text-center text-xs font-bold flex items-center justify-center gap-2 animate-pulse">🚨 KOMİSER DETAYLI TFF RAPORUNU HENÜZ GÖNDERMEDİ</div>
                    )}
                 </div>
             )}
             {!isArsiv && mac.mac_durumu !== 'iptal_edildi' && !macBittiMi && (
                 <div className="flex justify-end gap-3 mt-4 border-t border-slate-800 pt-4"><button onClick={() => macIptalEt(mac.id)} className="bg-red-950/40 hover:bg-red-800/80 text-red-500 border border-red-900 px-3 py-1.5 rounded text-xs font-bold transition-colors">⛔ MAÇI İPTAL ET</button><button onClick={() => setDegisimAcikMacId(degisimAcikMacId === mac.id ? null : mac.id)} className="bg-blue-900/40 hover:bg-blue-800/80 text-blue-400 border border-blue-800/50 px-3 py-1.5 rounded text-xs font-bold transition-colors">🔄 KOMİSER DEĞİŞTİR</button></div>
             )}
             {!isArsiv && degisimAcikMacId === mac.id && mac.mac_durumu !== 'iptal_edildi' && !macBittiMi && (
                 <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-blue-900/50 flex flex-col sm:flex-row gap-2 animate-fade-in-down"><select value={yeniKomiserId} onChange={(e) => setYeniKomiserId(e.target.value)} className="flex-1 bg-slate-900 text-white border border-slate-700 rounded px-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-bold cursor-pointer"><option value="">-- Devredilecek Yeni Komiseri Seçin --</option>{tumKomiserler.sort((a,b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr-TR')).map(k => (<option key={k.komiser_id} value={k.komiser_id}>{k.ad_soyad}</option>))}</select><button onClick={() => islemYapDevir(mac.id)} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded">DEVRİ ONAYLA</button></div>
             )}
          </div>
        )}
      </div>
    )
  }

  const gosterilenMaclar = goruntulenenHafta ? (haftalikGruplar[goruntulenenHafta] || []) : [];
  const isArsiv = goruntulenenHafta !== globalAktifHaftaNo;

  const emniyetlikMaclar = gosterilenMaclar.filter(m => m.skor_girildi && m.olay_durumu === 'emniyetlik_olay' && m.mac_durumu !== 'iptal_edildi')
  const teknikMaclar = gosterilenMaclar.filter(m => m.skor_girildi && (m.olay_durumu === 'teknik_olay' || m.olay_durumu === 'hava_muhalefeti' || m.olay_durumu === 'saha_sorunu') && m.mac_durumu !== 'iptal_edildi')
  const olaysizMaclar = gosterilenMaclar.filter(m => m.skor_girildi && m.olay_durumu === 'olaysiz' && m.mac_durumu !== 'iptal_edildi')
  const iptalEdilenMaclar = gosterilenMaclar.filter(m => m.mac_durumu === 'iptal_edildi')
  const bekleyenMaclar = gosterilenMaclar.filter(m => m.tebellug_edildi && !m.skor_girildi && m.mac_durumu !== 'iptal_edildi')
  const atanmayanMaclar = gosterilenMaclar.filter(m => (!m.komiser_id || m.komiser_id === 'null' || m.komiser_id === '') && m.mac_durumu !== 'iptal_edildi');
  
  const gelecekHaftaNo = globalAktifHaftaNo + 1;
  const gelecekHaftaMazeretleri = tumMazeretler.filter(m => m.hafta_no === gelecekHaftaNo).map(m => {
      const komiserData = tumKomiserler.find(k => String(k.komiser_id) === String(m.komiser_id));
      return { ...m, isim: komiserData ? komiserData.ad_soyad : 'Bilinmeyen Komiser' };
  });

  const islemZamaniAl = (m: any) => {
      if (!m.tff_rapor_detaylari) return 0;
      let d = m.tff_rapor_detaylari;
      if (typeof d === 'string') { try { d = JSON.parse(d); } catch(e){ d={}; } }
      return d.islem_saati || 0;
  }

  const maxOlaysiz = olaysizMaclar.length > 0 ? Math.max(...olaysizMaclar.map(islemZamaniAl)) : -1;
  const maxTeknik = teknikMaclar.length > 0 ? Math.max(...teknikMaclar.map(islemZamaniAl)) : -1;
  const maxEmniyet = emniyetlikMaclar.length > 0 ? Math.max(...emniyetlikMaclar.map(islemZamaniAl)) : -1;

  olaysizMaclar.sort((a,b) => islemZamaniAl(b) - islemZamaniAl(a));
  teknikMaclar.sort((a,b) => islemZamaniAl(b) - islemZamaniAl(a));
  emniyetlikMaclar.sort((a,b) => islemZamaniAl(b) - islemZamaniAl(a));

  const dinamikKategoriler = [
      { id: 'emniyet', tip: 'emniyet', baslik: 'KIRMIZI KATEGORİ (EMNİYETLİK)', maclar: emniyetlikMaclar, maxZaman: maxEmniyet, acik: kategoriKirmiziAcik, setAcik: setKategoriKirmiziAcik, icon: '🚨', bgClass: 'bg-red-950 border border-red-900 text-red-500', btnClass: 'bg-red-600 text-white', hoverText: 'text-red-500' },
      { id: 'teknik', tip: 'teknik', baslik: 'SARI KATEGORİ (TEKNİK İHRAÇLAR)', maclar: teknikMaclar, maxZaman: maxTeknik, acik: kategoriDisiplinAcik, setAcik: setKategoriDisiplinAcik, icon: '⚠️', bgClass: 'bg-amber-950 border border-amber-900 text-amber-500', btnClass: 'bg-amber-600 text-white', hoverText: 'text-amber-500' },
      { id: 'olaysiz', tip: 'olaysiz', baslik: 'SORUNSUZ / OLAYSIZ BİTENLER', maclar: olaysizMaclar, maxZaman: maxOlaysiz, acik: kategoriOlaysizAcik, setAcik: setKategoriOlaysizAcik, icon: '✅', bgClass: 'bg-emerald-950/40 border border-emerald-900 text-emerald-400', btnClass: 'bg-emerald-600 text-white', hoverText: 'text-emerald-400' }
  ];

  dinamikKategoriler.sort((a,b) => b.maxZaman - a.maxZaman);

  const tebellugBekleyenKomiserler = Array.from(gosterilenMaclar.filter(m => !m.tebellug_edildi && m.mac_durumu !== 'iptal_edildi' && m.komiser_id && m.komiser_id !== 'null' && m.komiser_id !== '').reduce((map, mac) => {
        if (!map.has(mac.komiser_id)) { 
            const kData = tumKomiserler.find(k => String(k.komiser_id) === String(mac.komiser_id));
            map.set(mac.komiser_id, { id: mac.komiser_id, isim: kData ? kData.ad_soyad : 'Atanmamış', telefon: kData ? kData.telefon : '', count: 0, maclar: [] }); 
        }
        map.get(mac.komiser_id).count++; map.get(mac.komiser_id).maclar.push(mac);
        return map;
  }, new Map()).values()).sort((a: any, b: any) => a.isim.localeCompare(b.isim, 'tr-TR'));

  const aktifEmniyetlikler = emniyetlikMaclar.filter(m => !susturulanAlarmlar.includes(m.id));
  const sirenAktif = aktifEmniyetlikler.length > 0;

  if (!girisYapildi) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700">
          <div className="text-center mb-8"><span className="text-5xl block mb-4">🛡️</span><h1 className="text-2xl font-black text-white tracking-widest uppercase">YÖNETİM GİRİŞİ</h1></div>
          <form onSubmit={girisKontrol} className="space-y-6">
            <div><input type="password" value={sifre} onChange={(e: any) => setSifre(e.target.value)} className="w-full bg-slate-900 text-white border border-slate-600 rounded-lg px-4 py-3 text-center tracking-[0.5em] font-mono text-xl focus:outline-none focus:border-red-500 transition-colors" placeholder="••••" /></div>
            {hata && <p className="text-red-500 text-sm font-bold text-center">{hata}</p>}
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors tracking-widest">GİRİŞ YAP</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f172a] font-sans text-slate-200">
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes siren-police {
            0%, 100% { box-shadow: 0 0 25px rgba(239, 68, 68, 0.8); border-color: #ef4444; background-color: rgba(69, 10, 10, 0.95); }
            50% { box-shadow: 0 0 25px rgba(59, 130, 246, 0.8); border-color: #3b82f6; background-color: rgba(30, 58, 138, 0.95); }
        }
        .police-siren-active { animation: siren-police 0.8s infinite; }

        @media print {
            @page { size: A4 landscape; margin: 10mm; }
            body * { visibility: hidden !important; }
            #bulten-print-area, #bulten-print-area * { 
                visibility: visible !important; 
                color-adjust: exact !important; 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
            }
            #bulten-print-area { 
                position: absolute !important; 
                left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; box-shadow: none !important; border: none !important; 
            }
            .tff-no-print { display: none !important; }
        }
      `}} />

      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-50 shadow-xl tff-no-print">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl hidden md:block">🇹🇷</span>
            <div>
              <h1 className="font-black text-lg md:text-xl text-white tracking-widest uppercase">İZMİR SAHA KOMİSERLERİ OPERASYON MERKEZİ</h1>
              <p className="text-slate-400 text-xs font-mono">TFF İZMİR SAHA KOMİSERLERİ ({globalAktifHaftaNo}. HAFTA YÖNETİMİ)</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <button onClick={() => setBultenModalAcik(true)} className="bg-purple-600 hover:bg-purple-700 text-white border border-purple-500 px-3 py-1.5 rounded-md text-xs font-black tracking-widest transition-colors shadow-lg animate-pulse">📋 HAFTALIK BÜLTEN</button>
             <button onClick={() => setExcelModalAcik(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 px-3 py-1.5 rounded-md text-xs font-black tracking-widest transition-colors shadow-lg">📥 EXCEL BÜLTEN YÜKLE</button>
             <button onClick={() => { setSistemYonetimModalAcik(true); setManuelMacKodu(otomatikMacKoduBul()); }} className="bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-500 px-3 py-1.5 rounded-md text-xs font-black tracking-widest transition-colors shadow-lg">⚙️ SİSTEM YÖNETİMİ</button>
             <button onClick={mukerrerleriTemizle} className="bg-amber-600 hover:bg-amber-700 text-white border border-amber-500 px-3 py-1.5 rounded-md text-xs font-black tracking-widest transition-colors shadow-lg hidden md:block">🧹 MÜKERRER TEMİZLE</button>
             <button onClick={veriGetir} className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 px-3 py-1.5 rounded text-xs font-bold transition-colors">🔄 YENİLE</button>
             <button onClick={() => setGirisYapildi(false)} className="bg-red-900/50 hover:bg-red-800 text-red-400 border border-red-900 px-3 py-1.5 rounded text-xs font-bold transition-colors">ÇIKIŞ YAP</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 relative">
        
        {bultenModalAcik && (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm tff-no-print">
                <div className="bg-slate-200 rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl animate-fade-in-up">
                    <div className="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center shrink-0">
                        <h2 className="text-base md:text-xl font-black text-white tracking-widest uppercase flex items-center gap-2">
                            📋 {goruntulenenHafta}. HAFTA BÜLTEN VE PANORAMA
                        </h2>
                        <div className="flex items-center gap-4 flex-wrap justify-end">
                            <button onClick={() => indirExcel()} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-xs font-bold tracking-widest shadow-lg flex items-center gap-2 transition-colors">📊 EXCEL İNDİR</button>
                            <button onClick={() => indirPDF()} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded text-xs font-bold tracking-widest shadow-lg flex items-center gap-2 transition-colors">📄 YATAY PDF (YAZDIR)</button>
                            <button onClick={() => setBultenModalAcik(false)} className="text-slate-400 hover:text-red-500 font-bold text-3xl leading-none transition-colors ml-2">✕</button>
                        </div>
                    </div>
                    
                    <div className="flex bg-slate-800 border-b border-slate-700">
                        <button onClick={() => setBultenTab('gorev')} className={`flex-1 py-4 font-black uppercase tracking-widest text-xs transition-colors ${bultenTab === 'gorev' ? 'bg-purple-600 text-white border-b-4 border-white' : 'text-slate-400 hover:text-slate-200'}`}>📅 GÖREV LİSTESİ (HAFTA BAŞI)</button>
                        <button onClick={() => setBultenTab('sonuc')} className={`flex-1 py-4 font-black uppercase tracking-widest text-xs transition-colors ${bultenTab === 'sonuc' ? 'bg-purple-600 text-white border-b-4 border-white' : 'text-slate-400 hover:text-slate-200'}`}>🏆 TOPLU SONUÇLAR (HAFTA BİTİMİ)</button>
                    </div>

                    <div className="p-4 md:p-8 overflow-y-auto flex-1 custom-scrollbar flex justify-center bg-slate-300">
                        <div id="bulten-print-area" className="w-full bg-white p-8 border border-slate-300 shadow-2xl relative font-sans min-h-[1050px] bg-white">
                            
                            <div className="flex justify-between items-center border-b-[3px] border-double border-slate-800 pb-4 mb-6">
                                <img src={AMATOR_MERKEZ_LOGO} crossOrigin="anonymous" alt="TFF Logo" className="h-20 w-auto" />
                                <div className="text-center flex-1 px-4">
                                    <h2 className="font-black text-2xl uppercase tracking-widest text-black">İZMİR SAHA KOMİSERLERİ DERNEĞİ</h2>
                                    <p className="font-bold text-base mt-2 text-slate-800">{goruntulenenHafta}. HAFTA {bultenTab === 'gorev' ? 'MÜSABAKA VE BAŞLANGIÇ GÖREV LİSTESİ' : 'BİTİMİ TOPLU MÜSABAKA SONUÇLARI'}</p>
                                </div>
                                <div className="h-20 w-20"></div> 
                            </div>

                            <table className="w-full text-left text-[11px] md:text-xs border-collapse border border-black bg-white text-black">
                                <thead className="bg-slate-100 text-black">
                                    <tr>
                                        <th className="border border-black p-2 font-bold text-center text-black">KOD</th>
                                        <th className="border border-black p-2 font-bold text-center text-black">TARİH</th>
                                        <th className="border border-black p-2 font-bold text-center text-black">SAAT</th>
                                        <th className="border border-black p-2 font-bold text-black">SAHA</th>
                                        <th className="border border-black p-2 font-bold text-black">KATEGORİ</th>
                                        <th className="border border-black p-2 font-bold text-black">EV SAHİBİ</th>
                                        {bultenTab === 'sonuc' && <th className="border border-black p-2 font-bold text-center text-black">SKOR</th>}
                                        <th className="border border-black p-2 font-bold text-black">MİSAFİR TAKIM</th>
                                        <th className="border border-black p-2 font-bold text-black">SAHA KOMİSERİ</th>
                                        {bultenTab === 'sonuc' && <th className="border border-black p-2 font-bold text-center text-black">DURUM</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {siraliBultenMaclari.map((m, idx) => {
                                        const komiser = komiserIsmiBul(m.komiser_id);
                                        let isIptal = m.mac_durumu === 'iptal_edildi';
                                        let skor = m.skor_girildi ? `${m.ev_sahibi_skor ?? '-'} - ${m.misafir_skor ?? '-'}` : '';
                                        if(isIptal) skor = 'İPTAL';
                                        
                                        let durum = '-';
                                        if (m.olay_durumu === 'emniyetlik_olay') durum = 'EMNİYETLİK';
                                        else if (m.olay_durumu === 'teknik_olay') durum = 'İHRAÇ VAR';
                                        else if (m.olay_durumu === 'olaysiz') durum = 'OLAYSIZ';
                                        
                                        if (m.mac_durumu === 'takimlar_cikmadi') durum = 'ÇIKMADI';
                                        else if (m.mac_durumu === 'yarida_kaldi') durum = 'YARIDA KALDI';
                                        else if (isIptal) durum = 'İPTAL';

                                        const gunRengi = getGunRengi(m.tarih);

                                        return (
                                            <tr key={idx} className={`border-b border-slate-300 ${gunRengi}`}>
                                                <td className="border border-black p-1.5 text-center font-mono font-bold">{formatMacKodu(m.mac_kodu)}</td>
                                                <td className="border border-black p-1.5 text-center font-bold">{guvenliTarih(m.tarih)}</td>
                                                <td className="border border-black p-1.5 text-center font-bold">{guvenliSaat(m.saat)}</td>
                                                <td className="border border-black p-1.5 font-bold truncate max-w-[120px]">{m.saha}</td>
                                                <td className="border border-black p-1.5 font-bold text-[10px]">{m.kategori_adi}</td>
                                                <td className="border border-black p-1.5 font-black uppercase">{m.ev_sahibi}</td>
                                                {bultenTab === 'sonuc' && <td className={`border border-black p-1.5 text-center font-black ${isIptal ? 'bg-red-600 text-white !important' : 'bg-slate-100/50'}`}>{skor}</td>}
                                                <td className="border border-black p-1.5 font-black uppercase">{m.misafir_takim}</td>
                                                <td className="border border-black p-1.5 font-black uppercase text-[10px]">{komiser}</td>
                                                {bultenTab === 'sonuc' && <td className={`border border-black p-1.5 text-center font-black text-[9px] ${isIptal ? 'bg-red-600 text-white !important' : (durum === 'EMNİYETLİK' ? 'text-red-600 !important' : (durum==='OLAYSIZ' ? 'text-green-600 !important' : ''))}`}>{durum}</td>}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <div className="mt-8 pt-4 border-t border-slate-300 flex justify-between text-[10px] text-slate-500">
                                <span>Bu belge İzmir Saha Komiserleri Operasyon Merkezi tarafından otomatik oluşturulmuştur.</span>
                                <span>Tarih: {new Date().toLocaleDateString('tr-TR')} {new Date().toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {sistemYonetimModalAcik && (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm tff-no-print">
                <div className="bg-slate-900 border-2 border-indigo-500 rounded-2xl w-full max-w-3xl overflow-hidden flex flex-col shadow-2xl animate-fade-in-down">
                    <div className="bg-indigo-900/50 p-4 border-b border-indigo-500/50 flex justify-between items-center">
                        <h2 className="text-xl font-black text-indigo-400 tracking-widest uppercase flex items-center gap-2"><span className="text-2xl">⚙️</span> SİSTEM YÖNETİMİ VE MANUEL EKLEMELER</h2>
                        <button onClick={() => setSistemYonetimModalAcik(false)} className="text-slate-400 hover:text-white font-bold text-xl">✕</button>
                    </div>
                    
                    <div className="flex bg-slate-800 border-b border-slate-700 flex-wrap">
                        <button onClick={() => setSistemTab('komiser_ekle')} className={`flex-1 min-w-[120px] py-4 font-black uppercase tracking-widest text-[10px] sm:text-xs transition-colors ${sistemTab === 'komiser_ekle' ? 'bg-indigo-600 text-white border-b-4 border-white' : 'text-slate-400 hover:text-slate-200'}`}>👨‍✈️ YENİ KOMİSER EKLE</button>
                        <button onClick={() => setSistemTab('hakem_ekle')} className={`flex-1 min-w-[120px] py-4 font-black uppercase tracking-widest text-[10px] sm:text-xs transition-colors ${sistemTab === 'hakem_ekle' ? 'bg-indigo-600 text-white border-b-4 border-white' : 'text-slate-400 hover:text-slate-200'}`}>🏃 YENİ HAKEM EKLE</button>
                        <button onClick={() => { setSistemTab('mac_ekle'); setManuelMacKodu(otomatikMacKoduBul()); }} className={`flex-1 min-w-[120px] py-4 font-black uppercase tracking-widest text-[10px] sm:text-xs transition-colors ${sistemTab === 'mac_ekle' ? 'bg-indigo-600 text-white border-b-4 border-white' : 'text-slate-400 hover:text-slate-200'}`}>🏟️ EKSTRA MAÇ EKLE</button>
                        <button onClick={() => setSistemTab('statu_ekle')} className={`flex-1 min-w-[120px] py-4 font-black uppercase tracking-widest text-[10px] sm:text-xs transition-colors ${sistemTab === 'statu_ekle' ? 'bg-indigo-600 text-white border-b-4 border-white' : 'text-slate-400 hover:text-slate-200'}`}>📝 STATÜ YÖNETİMİ</button>
                    </div>

                    <div className="p-6 md:p-8 overflow-y-auto max-h-[70vh] custom-scrollbar bg-[#0f172a]">
                        
                        {sistemTab === 'statu_ekle' && (
                            <div className="space-y-6">
                                <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex justify-between items-start">
                                    <div>
                                        <h3 className="text-emerald-400 font-bold mb-1">Müsabaka Statü ve Kural Zekası</h3>
                                        <p className="text-slate-300 text-xs">Saha komiserlerinin mobil cihazlarında göreceği statüleri buradan yönetebilirsiniz.</p>
                                    </div>
                                    <button onClick={() => setStatuForm({ id: null, kategori_anahtar: '', baslik: '', yas_siniri: '', sure: '', top: '', degisiklik: '', beraberlik: '', hakem: '' })} className="bg-emerald-600 text-white text-[10px] sm:text-xs px-3 py-1.5 rounded font-bold hover:bg-emerald-500 transition-colors shadow-md">+ YENİ STATÜ GİR</button>
                                </div>
                                
                                <form onSubmit={statuKaydetSubmit} className="bg-slate-900 border border-indigo-500/50 p-5 rounded-xl space-y-4 shadow-lg relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Kategori / Lig Anahtarı (Örn: U14)</label><input type="text" value={statuForm.kategori_anahtar} onChange={e => setStatuForm({...statuForm, kategori_anahtar: e.target.value})} className="w-full bg-slate-950 border border-slate-700 text-white font-bold uppercase px-3 py-2 rounded focus:border-indigo-500 focus:outline-none" required placeholder="Lig kodunu yazın..." /></div>
                                        <div><label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Pencere Başlığı (Örn: U14 Ligi Statüsü)</label><input type="text" value={statuForm.baslik} onChange={e => setStatuForm({...statuForm, baslik: e.target.value})} className="w-full bg-slate-950 border border-slate-700 text-white font-bold uppercase px-3 py-2 rounded focus:border-indigo-500 focus:outline-none" required placeholder="Görünecek büyük başlık..." /></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div><label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">⏱️ Süre (Örn: 2x35 Dk)</label><input type="text" value={statuForm.sure} onChange={e => setStatuForm({...statuForm, sure: e.target.value})} className="w-full bg-slate-950 border border-slate-700 text-white text-sm px-3 py-2 rounded focus:border-indigo-500 focus:outline-none" placeholder="Maç süresi..." /></div>
                                        <div><label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">⚽ Top No (Örn: 4 Numara)</label><input type="text" value={statuForm.top} onChange={e => setStatuForm({...statuForm, top: e.target.value})} className="w-full bg-slate-950 border border-slate-700 text-white text-sm px-3 py-2 rounded focus:border-indigo-500 focus:outline-none" placeholder="Top no..." /></div>
                                        <div><label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">⚖️ Hakem (Örn: Tek Hakem)</label><input type="text" value={statuForm.hakem} onChange={e => setStatuForm({...statuForm, hakem: e.target.value})} className="w-full bg-slate-950 border border-slate-700 text-white text-sm px-3 py-2 rounded focus:border-indigo-500 focus:outline-none" placeholder="Hakem sayısı..." /></div>
                                    </div>
                                    <div><label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">🏃 Yaş Sınırı Kuralları</label><textarea value={statuForm.yas_siniri} onChange={e => setStatuForm({...statuForm, yas_siniri: e.target.value})} className="w-full bg-slate-950 border border-slate-700 text-white text-xs px-3 py-2 rounded focus:border-indigo-500 focus:outline-none min-h-[60px]" placeholder="Kimler oynayabilir, kimler oynayamaz..." /></div>
                                    <div><label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">🔄 Oyuncu Değişikliği Kuralları</label><textarea value={statuForm.degisiklik} onChange={e => setStatuForm({...statuForm, degisiklik: e.target.value})} className="w-full bg-slate-950 border border-slate-700 text-white text-xs px-3 py-2 rounded focus:border-indigo-500 focus:outline-none min-h-[60px]" placeholder="Değişiklik sayısı, duraklama kuralları..." /></div>
                                    <div><label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">⚖️ Beraberlik Durumu (Uzatma/Penaltı)</label><textarea value={statuForm.beraberlik} onChange={e => setStatuForm({...statuForm, beraberlik: e.target.value})} className="w-full bg-slate-950 border border-slate-700 text-white text-xs px-3 py-2 rounded focus:border-indigo-500 focus:outline-none min-h-[60px]" placeholder="Eleme maçlarındaki kurallar..." /></div>
                                    <div className="pt-2"><button type="submit" disabled={statuKaydediliyor} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-lg uppercase tracking-widest flex items-center justify-center gap-2 transition-colors shadow-lg">{statuKaydediliyor ? '⚙️ KAYDEDİLİYOR...' : (statuForm.id ? '💾 DEĞİŞİKLİKLERİ GÜNCELLE' : '✅ YENİ STATÜYÜ SİSTEME EKLE')}</button></div>
                                </form>

                                <div className="mt-6 border-t border-slate-700 pt-6">
                                    <h4 className="text-slate-400 font-bold mb-3 uppercase tracking-widest text-xs">Sistemdeki Aktif Statüler ({tumStatuler.length})</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                        {tumStatuler.length === 0 ? (
                                            <div className="col-span-1 md:col-span-2 text-center text-slate-500 text-xs italic bg-slate-800/50 p-4 rounded-lg border border-slate-700">Sistemde henüz kayıtlı bir statü bulunmuyor.</div>
                                        ) : (
                                            tumStatuler.sort((a,b) => a.kategori_anahtar.localeCompare(b.kategori_anahtar)).map((st, i) => (
                                                <div key={i} className="bg-slate-950 border border-slate-700 rounded-lg p-3 flex justify-between items-start hover:border-indigo-500/50 transition-colors">
                                                    <div>
                                                        <div className="text-indigo-400 font-black text-sm mb-1">{st.kategori_anahtar}</div>
                                                        <div className="text-[10px] text-slate-400 line-clamp-1">{st.baslik}</div>
                                                    </div>
                                                    <div className="flex flex-col gap-2 shrink-0 ml-2">
                                                        <button onClick={() => setStatuForm(st)} className="bg-slate-800 hover:bg-slate-700 text-blue-400 px-3 py-1 rounded text-[10px] font-bold transition-colors border border-slate-600 shadow-sm">DÜZENLE</button>
                                                        <button onClick={() => statuSil(st.id)} className="bg-slate-800 hover:bg-red-900/50 text-red-500 px-3 py-1 rounded text-[10px] font-bold transition-colors border border-slate-600 shadow-sm">SİL</button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {sistemTab === 'komiser_ekle' && (
                            <div className="space-y-6">
                                <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl">
                                    <p className="text-slate-300 text-sm font-medium">Sisteme yeni atanan saha komiserini veya stajyeri buradan ekleyebilirsiniz.</p>
                                </div>
                                <form onSubmit={komiserEkle} className="space-y-5">
                                    <div><label className="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Komiser Adı Soyadı</label><input type="text" value={yeniPersonelAd} onChange={(e) => setYeniPersonelAd(e.target.value)} placeholder="Örn: ZÜBEYDE GÜRTEKİN" className="w-full bg-slate-900 border border-slate-600 text-white font-bold uppercase px-4 py-3 rounded-lg focus:border-indigo-500 focus:outline-none" required /></div>
                                    <div><label className="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Sicil / Plaka Numarası</label><input type="text" value={yeniPersonelSicil} onChange={(e) => setYeniPersonelSicil(e.target.value)} placeholder="Örn: 35262790" className="w-full bg-slate-900 border border-slate-600 text-white font-bold font-mono tracking-widest px-4 py-3 rounded-lg focus:border-indigo-500 focus:outline-none" required /></div>
                                    <div className="pt-4"><button type="submit" disabled={personelEkleniyor} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-lg uppercase tracking-widest shadow-lg flex items-center justify-center gap-2">{personelEkleniyor ? '⚙️ EKLENİYOR...' : '✅ SİSTEME KAYDET VE YETKİ VER'}</button></div>
                                </form>
                            </div>
                        )}

                        {sistemTab === 'hakem_ekle' && (
                            <div className="space-y-6">
                                <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl">
                                    <p className="text-slate-300 text-sm font-medium">Yeni aday hakemleri manuel olarak ekleyebilirsiniz. (Not: Komiserler maç raporu gönderirken yazdıkları yeni isimler de otomatik kaydedilir).</p>
                                </div>
                                <form onSubmit={hakemEkleSubmit} className="space-y-5">
                                    <div><label className="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Hakem Adı Soyadı</label><input type="text" value={yeniHakemAd} onChange={(e) => setYeniHakemAd(e.target.value)} placeholder="Örn: Ayşe Yılmaz" className="w-full bg-slate-900 border border-slate-600 text-white font-bold px-4 py-3 rounded-lg focus:border-indigo-500 focus:outline-none" required /></div>
                                    <div className="pt-4"><button type="submit" disabled={hakemEkleniyor} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-lg uppercase tracking-widest flex items-center justify-center gap-2">{hakemEkleniyor ? '⚙️ EKLENİYOR...' : '🏃 VERİTABANINA HAKEM EKLE'}</button></div>
                                </form>
                            </div>
                        )}

                        {sistemTab === 'mac_ekle' && (
                            <div className="space-y-6">
                                <form onSubmit={manuelMacEkle} className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        <div className="md:col-span-1"><label className="block text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Maç Kodu</label><input type="text" value={manuelMacKodu} onChange={(e) => setManuelMacKodu(e.target.value)} className="w-full bg-slate-900 border border-emerald-600/50 text-emerald-400 font-black font-mono text-lg px-4 py-3 rounded-lg focus:outline-none text-center" required /></div>
                                        <div className="md:col-span-1"><label className="block text-xs font-bold text-indigo-400 uppercase mb-2">Tarih</label><input type="date" value={manuelMacTarih} onChange={(e) => setManuelMacTarih(e.target.value)} className="w-full bg-slate-900 border border-slate-600 text-white font-bold px-4 py-3 rounded-lg focus:outline-none" required /></div>
                                        <div className="md:col-span-1"><label className="block text-xs font-bold text-indigo-400 uppercase mb-2">Saat</label><input type="time" value={manuelMacSaat} onChange={(e) => setManuelMacSaat(e.target.value)} className="w-full bg-slate-900 border border-slate-600 text-white font-bold px-4 py-3 rounded-lg focus:outline-none" /></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div><label className="block text-xs font-bold text-indigo-400 uppercase mb-2">Kategori</label><input type="text" value={manuelMacLig} onChange={(e) => setManuelMacLig(e.target.value)} placeholder="Örn: U18 TÜRKİYE ŞAMP." className="w-full bg-slate-900 border border-slate-600 text-white font-bold uppercase px-4 py-3 rounded-lg focus:outline-none" required /></div>
                                        <div><label className="block text-xs font-bold text-indigo-400 uppercase mb-2">Saha</label><input type="text" value={manuelMacSaha} onChange={(e) => setManuelMacSaha(e.target.value)} placeholder="Saha Adı" className="w-full bg-slate-900 border border-slate-600 text-white font-bold uppercase px-4 py-3 rounded-lg focus:outline-none" required /></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                        <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Ev Sahibi</label><input type="text" value={manuelMacEv} onChange={(e) => setManuelMacEv(e.target.value)} className="w-full bg-slate-900 border border-slate-600 text-white font-bold uppercase px-4 py-3 rounded-lg focus:outline-none" required /></div>
                                        <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Misafir Takım</label><input type="text" value={manuelMacMis} onChange={(e) => setManuelMacMis(e.target.value)} className="w-full bg-slate-900 border border-slate-600 text-white font-bold uppercase px-4 py-3 rounded-lg focus:outline-none" required /></div>
                                    </div>
                                    <button type="submit" disabled={manuelMacEkleniyor} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-lg uppercase tracking-widest">{manuelMacEkleniyor ? '⚙️ İŞLENİYOR...' : '🚀 EKSTRA MAÇI SİSTEME YÜKLE'}</button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {tamEkranRaporMac && (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm tff-no-print">
                <div className="bg-slate-200 rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl animate-fade-in-up">
                    <div className="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center shrink-0">
                        <h2 className="text-base md:text-lg font-black text-white tracking-widest uppercase flex items-center gap-2">📄 TFF RAPORU: {tamEkranRaporMac.ev_sahibi} vs {tamEkranRaporMac.misafir_takim}</h2>
                        <div className="flex items-center gap-4">
                            <button onClick={() => tffTutanakIndir(tamEkranRaporMac, 'tam-ekran')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-xs font-bold tracking-widest shadow-lg flex items-center gap-2 transition-colors">📸 PNG İNDİR</button>
                            <button onClick={() => setTamEkranRaporMac(null)} className="text-slate-400 hover:text-red-500 font-bold text-3xl leading-none transition-colors">✕</button>
                        </div>
                    </div>
                    <div className="p-4 md:p-8 overflow-y-auto flex-1 custom-scrollbar flex justify-center bg-slate-300">
                        <div className="shadow-2xl">{renderTffRaporu(tamEkranRaporMac, 'tam-ekran')}</div>
                    </div>
                </div>
            </div>
        )}

        {excelModalAcik && (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm tff-no-print">
                <div className="bg-slate-900 border-2 border-emerald-500 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                    <div className="bg-emerald-900/50 p-4 border-b border-emerald-500/50 flex justify-between items-center">
                        <h2 className="text-xl font-black text-emerald-400 tracking-widest uppercase flex items-center gap-2"><span className="text-2xl">📥</span> YENİ BÜLTEN YÜKLEME MERKEZİ (EXCEL)</h2>
                        <button onClick={() => { setExcelModalAcik(false); setYuklenenExcelVerisi([]); setExcelHata(null); }} className="text-slate-400 hover:text-white font-bold text-xl">✕</button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                        <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl mb-6">
                            <h3 className="text-emerald-400 font-bold mb-2 flex items-center gap-2"><span className="text-xl">🤖</span> İsim Eşleştirme &amp; Çift Komiser Zekası Aktif!</h3>
                            <p className="text-xs text-slate-400 mb-3">TFF Excel&apos;ini direkt yükleyebilirsiniz. Aynı maça farklı TC kimlikli iki ayrı komiser eklerseniz (Süper Amatör vb.), sistem bunu <b>mükerrer saymaz</b>, iki komiseri de maça ayrı ayrı kaydeder.</p>
                        </div>

                        <div className="flex items-center justify-center w-full mb-6">
                            <label onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all ${isDragging ? 'border-emerald-500 bg-emerald-900/30 scale-105' : 'border-slate-600 bg-slate-800 hover:bg-slate-700'}`}>
                                <div className="flex flex-col items-center justify-center pt-5 pb-6 pointer-events-none">
                                    <span className="text-4xl mb-3">{isDragging ? '📥' : '📊'}</span><p className="mb-2 text-sm text-slate-300">{isDragging ? <span className="font-bold text-emerald-400">Bırak!</span> : <><span className="font-bold text-emerald-400">Tıkla</span> veya Sürükle</>}</p>
                                </div>
                                <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={(e) => { if(e.target.files && e.target.files.length > 0) processExcelFile(e.target.files[0]) }} />
                            </label>
                        </div>

                        {excelHata && <div className="bg-red-900/50 border border-red-500 text-red-400 p-4 rounded-lg mb-6 font-bold text-center">{excelHata}</div>}

                        {yuklenenExcelVerisi.length > 0 && (
                            <div className="animate-fade-in-up">
                                <h3 className="text-white font-bold mb-3">🔍 Önizleme ({yuklenenExcelVerisi.length} Maç)</h3>
                                <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-x-auto">
                                    <table className="w-full text-left text-xs text-slate-300 whitespace-nowrap">
                                        <thead className="bg-slate-900 text-slate-400 uppercase"><tr><th className="px-4 py-3">Kod</th><th className="px-4 py-3">Zaman</th><th className="px-4 py-3">Takımlar</th><th className="px-4 py-3">Eşleşme</th></tr></thead>
                                        <tbody>
                                            {yuklenenExcelVerisi.slice(0, 50).map((mac, i) => {
                                                const islesmeBasarili = /^\d+$/.test(mac.komiser_id);
                                                return (
                                                    <tr key={i} className="border-b border-slate-700 hover:bg-slate-700/50">
                                                        <td className="px-4 py-2 text-emerald-400">{mac.mac_kodu}</td>
                                                        <td className="px-4 py-2">{mac.tarih} - {mac.saat}</td>
                                                        <td className="px-4 py-2 font-bold text-white">{mac.ev_sahibi} vs {mac.misafir_takim}</td>
                                                        <td className="px-4 py-2">
                                                            <span className={`px-2 py-1 rounded font-bold ${islesmeBasarili ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700' : 'bg-amber-900/50 text-amber-400 border border-amber-700'}`}>
                                                                {islesmeBasarili ? `✓ ID: ${mac.komiser_id}` : `⚠️ BULUNAMADI`}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {yuklenenExcelVerisi.length > 50 && <div className="text-center p-3 text-slate-500 italic">... ve {yuklenenExcelVerisi.length - 50} maç daha.</div>}
                                </div>
                            </div>
                        )}
                    </div>
                    {yuklenenExcelVerisi.length > 0 && (
                        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-4"><button onClick={() => setYuklenenExcelVerisi([])} className="px-6 py-3 rounded-lg font-bold text-slate-400 hover:text-white transition-colors">İptal Et</button><button onClick={bulteniVeritabaninaKaydet} disabled={excelKaydediliyor} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-3 rounded-lg shadow-lg uppercase tracking-widest disabled:opacity-50 flex items-center gap-2">{excelKaydediliyor ? '⚙️ İŞLENİYOR...' : '🚀 BÜLTENİ SİSTEME KAYDET'}</button></div>
                    )}
                </div>
            </div>
        )}

        {yukleniyor ? (
          <div className="flex flex-col items-center justify-center py-20"><div className="w-12 h-12 border-4 border-slate-700 border-t-red-600 rounded-full animate-spin mb-4"></div><p className="text-slate-400 font-bold animate-pulse tracking-widest">VERİLER ÇEKİLİYOR...</p></div>
        ) : (
          <div className="space-y-8 animate-fade-in-up">
            {Object.keys(haftalikGruplar).length > 0 && (
                <div className="bg-slate-900 p-2 rounded-lg flex overflow-x-auto gap-2 mb-6 shadow-inner custom-scrollbar items-center border border-slate-700">
                    <span className="text-slate-500 font-bold text-xs uppercase tracking-widest px-3">ZAMAN MAKİNESİ:</span>
                    {Object.keys(haftalikGruplar).map(Number).sort((a,b) => a-b).map(haftaNo => (
                        <button key={haftaNo} onClick={() => setGoruntulenenHafta(haftaNo)} className={`px-4 py-2.5 rounded font-bold text-xs whitespace-nowrap transition-colors border shadow-sm ${goruntulenenHafta === haftaNo ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'}`}>{haftaNo === globalAktifHaftaNo ? `🔥 AKTİF OPERASYON (${haftaNo}. HAFTA)` : `📁 ${haftaNo}. HAFTA ARŞİVİ`}</button>
                    ))}
                </div>
            )}
            {!isArsiv && atanmayanMaclar.length > 0 && (
                <div className="bg-red-950/60 border-2 border-red-600 rounded-2xl p-6 mb-6 shadow-2xl animate-pulse">
                    <h3 className="text-red-400 font-black text-xl mb-4 flex items-center gap-3"><span className="text-3xl">🚨</span> DİKKAT: ATANMAMIŞ {atanmayanMaclar.length} ADET MAÇ VAR!</h3>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                        {atanmayanMaclar.map((mac, idx) => (
                            <div key={mac.id || `bos-${idx}`} className="bg-slate-900 border border-red-900/80 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1"><span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow">KOD: {mac.mac_kodu}</span><span className="text-blue-400 text-xs font-bold uppercase">{mac.kategori_adi}</span></div>
                                    <span className="text-white text-base font-bold">{mac.ev_sahibi} <span className="text-slate-500 font-normal">vs</span> {mac.misafir_takim}</span>
                                    <div className="text-[11px] text-slate-400 font-mono mt-1">{mac.saha} | {guvenliTarih(mac.tarih)} - {guvenliSaat(mac.saat)}</div>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <select value={atamaSelects[mac.id] || ''} onChange={(e) => setAtamaSelects({...atamaSelects, [mac.id]: e.target.value})} className="flex-1 bg-slate-950 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 cursor-pointer font-bold"><option value="">-- Komiser Seç --</option>{tumKomiserler.sort((a,b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr-TR')).map(k => (<option key={k.komiser_id} value={k.komiser_id}>{k.ad_soyad}</option>))}</select>
                                    <button onClick={() => islemYapAta(mac.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black px-4 py-2 rounded-lg shadow-lg">ATA</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800 rounded-xl p-4 md:p-6 border-l-4 border-blue-500 shadow-lg relative overflow-hidden group">
                  <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">TOPLAM MAÇ</h3><div className="text-3xl md:text-4xl font-black text-white">{gosterilenMaclar.filter(m => m.mac_durumu !== 'iptal_edildi').length}</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 md:p-6 border-l-4 border-red-500 shadow-lg relative overflow-hidden group">
                  <h3 className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-widest mb-1">EMNİYETLİK OLAYLI</h3><div className="text-3xl md:text-4xl font-black text-red-500">{emniyetlikMaclar.length}</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 md:p-6 border-l-4 border-amber-500 shadow-lg relative overflow-hidden group">
                  <h3 className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-widest mb-1">TEKNİK DİSİPLİN</h3><div className="text-3xl md:text-4xl font-black text-amber-500">{teknikMaclar.length}</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 md:p-6 border-l-4 border-purple-500 shadow-lg relative overflow-hidden group">
                  <h3 className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-widest mb-1">TEBELLÜĞ BEKLEYEN</h3><div className="text-3xl md:text-4xl font-black text-purple-400">{bekleyenMaclar.length}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    {dinamikKategoriler.map(kat => (
                        <div key={kat.id} className="mb-6">
                            <button onClick={() => kat.setAcik(!kat.acik)} className={`w-full flex justify-between items-center p-4 rounded-xl shadow-lg mb-3 hover:brightness-110 transition-all ${kat.id === 'emniyet' && sirenAktif ? 'police-siren-active text-white' : kat.bgClass}`}>
                                <div className="flex items-center gap-3"><span className="text-2xl">{kat.icon}</span><h2 className={`text-lg font-black tracking-widest uppercase ${(kat.id === 'emniyet' && sirenAktif) ? 'text-white drop-shadow-md' : kat.hoverText}`}>{kat.baslik}</h2></div>
                                <div className="flex items-center gap-4"><span className={`${(kat.id === 'emniyet' && sirenAktif) ? 'bg-white text-red-600' : kat.btnClass} px-3 py-1 rounded-full text-xs font-bold shadow-lg`}>{kat.maclar.length} MAÇ</span><span className={`${(kat.id === 'emniyet' && sirenAktif) ? 'text-white' : kat.hoverText}`}>{kat.acik ? '▲' : '▼'}</span></div>
                            </button>
                            {kat.acik && (
                                <div className="space-y-3 animate-fade-in-down pl-2">
                                    {kat.maclar.length === 0 ? (<div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl text-center text-slate-500 text-sm font-medium">Bu haftaya ait {kat.baslik.toLowerCase()} raporu bulunmuyor.</div>) : (kat.maclar.map((mac: any, idx: number) => <RaporDurumKarti key={`${kat.id}-${idx}`} mac={mac} tip={kat.tip as any} isArsiv={isArsiv} />))}
                                </div>
                            )}
                        </div>
                    ))}
                    
                    <div className="mt-6">
                        <button onClick={() => setKategoriMazeretAcik(!kategoriMazeretAcik)} className="w-full flex justify-between items-center bg-teal-950 border border-teal-900 p-4 rounded-xl shadow-lg mb-3 hover:brightness-110 transition-all">
                            <div className="flex items-center gap-3"><span className="text-2xl">📅</span><h2 className="text-lg font-black text-teal-400 tracking-widest uppercase">YENİ HAFTA MÜSAİTLİK DURUMU</h2></div><div className="flex items-center gap-4"><span className="bg-teal-600 text-white px-3 py-1 rounded-full text-xs font-bold">{gelecekHaftaMazeretleri.length} BİLDİRİM</span><span className="text-teal-500">{kategoriMazeretAcik ? '▲' : '▼'}</span></div>
                        </button>
                        {kategoriMazeretAcik && (
                            <div className="space-y-3 animate-fade-in-down pl-2">
                                {gelecekHaftaMazeretleri.length === 0 ? (
                                    <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl text-center text-slate-500 text-sm font-medium">Önümüzdeki {gelecekHaftaNo}. Hafta için henüz hiç mazeret veya müsaitlik bildirimi yapılmamış.</div>
                                ) : (
                                    gelecekHaftaMazeretleri.map((m: any, idx: number) => {
                                        let d = m.detaylar || {};
                                        if(typeof d === 'string') { try{ d=JSON.parse(d); }catch(e){} }
                                        const mod = d.mod || (m.komple_yok ? 'yok' : 'bilinmiyor');

                                        let cardStyle = "bg-slate-900 border border-slate-700";
                                        let badge: any = null; 
                                        
                                        if (m.komple_yok || mod === 'yok') { 
                                            cardStyle = "bg-red-950/20 border border-red-900/50"; 
                                            badge = <span className="bg-red-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded">TÜM HAFTA YOK</span>; 
                                        } else if (mod === 'full') {
                                            cardStyle = "bg-emerald-950/20 border border-emerald-900/50"; 
                                            badge = <span className="bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded">TÜM HAFTA MÜSAİT</span>;
                                        } else if (mod === 'secmeli') {
                                            cardStyle = "bg-blue-950/20 border border-blue-900/50"; 
                                            badge = <span className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded">KISMİ GÜNLER MÜSAİT</span>;
                                        }

                                        return (
                                            <div key={`mazeret-${idx}`} className={`${cardStyle} rounded-xl p-4 shadow-sm`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <div className="font-bold text-slate-200 text-base">{m.isim}</div>
                                                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">SİCİL: {m.komiser_id}</div>
                                                    </div>
                                                    <div>{badge}</div>
                                                </div>
                                                
                                                {mod === 'full' && (
                                                    <div className="mt-3 flex gap-2">
                                                        {d.genelMerkez && <span className="bg-slate-800 text-emerald-400 border border-emerald-900/50 text-[10px] px-2 py-1 rounded font-bold">MERKEZ: VAR</span>}
                                                        {d.genelDeplasman && <span className="bg-slate-800 text-emerald-400 border border-emerald-900/50 text-[10px] px-2 py-1 rounded font-bold">DEPLASMAN: VAR</span>}
                                                    </div>
                                                )}
                                                
                                                {mod === 'secmeli' && d.gunler && (
                                                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {Object.keys(d.gunler).filter(g => d.gunler[g].active).map(g => {
                                                            const gunData = d.gunler[g];
                                                            const gunIsimleri: any = { cuma: 'CUMA', cumartesi: 'CUMARTESİ', pazar: 'PAZAR', pazartesi: 'PAZARTESİ', sali: 'SALI', carsamba: 'ÇARŞAMBA', persembe: 'PERŞEMBE' };
                                                            return (
                                                                <div key={g} className="bg-slate-800/80 border border-slate-700 rounded p-2 text-xs">
                                                                    <div className="font-bold text-blue-400 mb-1">{gunIsimleri[g]}</div>
                                                                    <div className="text-[10px] text-slate-400 flex flex-wrap gap-1">
                                                                        {gunData.merkez && <span className="bg-slate-950 px-1 rounded border border-slate-700">Merkez</span>}
                                                                        {gunData.deplasman && <span className="bg-slate-950 px-1 rounded border border-slate-700">Depl.</span>}
                                                                        <span className="bg-blue-900/30 text-blue-300 px-1 rounded ml-auto border border-blue-800/50">
                                                                            {gunData.tumGun ? 'Tüm Gün' : `${gunData.baslangic} - ${gunData.bitis}`}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}

                                                {m.aciklama && m.aciklama.trim() !== '' && (
                                                    <div className="mt-3 bg-slate-950 border border-slate-800 rounded p-3 text-xs italic text-slate-300">
                                                        <span className="font-bold text-slate-500 mr-2 not-italic">📝 NOT:</span>"{m.aciklama}"
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    <div className="mt-6">
                        <button onClick={() => setKategoriSicilAcik(!kategoriSicilAcik)} className="w-full flex justify-between items-center bg-blue-950 border border-blue-900 p-4 rounded-xl shadow-lg mb-3 hover:brightness-110 transition-all">
                            <div className="flex items-center gap-3"><span className="text-2xl">🗄️</span><h2 className="text-lg font-black text-blue-400 tracking-widest uppercase">KOMİSER SİCİL VE ARŞİV DOSYASI</h2></div><div className="flex items-center gap-4"><span className="text-blue-500">{kategoriSicilAcik ? '▲' : '▼'}</span></div>
                        </button>
                        {kategoriSicilAcik && (
                            <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl animate-fade-in-down mb-3">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Saha Komiseri Seçin</label>
                                <select value={seciliSicilKomiserId} onChange={(e) => setSeciliSicilKomiserId(e.target.value)} className="w-full bg-slate-900 text-white border border-slate-600 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none mb-4 font-bold cursor-pointer"><option value="">-- Komiser Seçiniz --</option>{tumKomiserler.sort((a,b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr-TR')).map(k => (<option key={k.komiser_id} value={k.komiser_id}>{k.ad_soyad}</option>))}</select>
                                {seciliSicilKomiserId && (
                                    <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                                        {(() => {
                                            const komiserinMaclari = sezonlukMaclar.filter(m => String(m.komiser_id) === String(seciliSicilKomiserId)).sort(siralamaFiltresi).reverse();
                                            if (komiserinMaclari.length === 0) return <div className="text-center text-slate-500 text-sm py-4">Bu komisere ait geçmiş görev kaydı bulunamadı.</div>;
                                            return komiserinMaclari.map((mac, idx) => {
                                                const skorMetni = mac.skor_girildi && mac.ev_sahibi_skor !== null ? `${mac.ev_sahibi_skor} - ${mac.misafir_skor}` : 'Skor Bekleniyor';
                                                let pDetay:any = {}; if(mac.tff_rapor_detaylari){ try{ pDetay = typeof mac.tff_rapor_detaylari === 'string' ? JSON.parse(mac.tff_rapor_detaylari) : mac.tff_rapor_detaylari; }catch(e){}}
                                                return (
                                                    <div key={`sicil-${idx}`} className="bg-slate-900 border border-slate-700 rounded-lg p-3">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <div className="text-blue-400 font-bold text-[9px] mb-1 tracking-widest">{mac.kategori_adi} ({mac.mac_kodu})</div>
                                                                <div className="font-bold text-sm text-slate-200 mb-1">{mac.ev_sahibi} <span className="text-slate-500 mx-1 text-[10px]">vs</span> {mac.misafir_takim}</div>
                                                                <div className="text-[10px] text-slate-400">{mac.saha} | <span className="text-emerald-400">{guvenliTarih(mac.tarih)} - {guvenliSaat(mac.saat)}</span></div>
                                                            </div>
                                                            <div className="flex flex-col gap-2 items-end">
                                                                <span className={`px-2 py-1 rounded text-[10px] font-black ${mac.skor_girildi ? 'bg-green-900 text-green-300' : 'bg-slate-700 text-slate-400'}`}>{skorMetni}</span>
                                                                {pDetay?.detayli_kaydedildi && (<button onClick={() => setTamEkranRaporMac(mac)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-colors shadow-sm">📄 RAPORU AÇ</button>)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        })()}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <button onClick={() => setKategoriTebellugAcik(!kategoriTebellugAcik)} className="w-full flex justify-between items-center bg-purple-950 border border-purple-900 p-4 rounded-xl shadow-lg mb-3 hover:brightness-110 transition-all">
                        <div className="flex items-center gap-3"><span className="text-2xl">📬</span><h2 className="text-lg font-black text-purple-400 tracking-widest uppercase">GÖREVİ ONAYLAMAYANLAR</h2></div><div className="flex items-center gap-4"><span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold">{tebellugBekleyenKomiserler.length} KİŞİ</span><span className="text-purple-500">{kategoriTebellugAcik ? '▲' : '▼'}</span></div>
                    </button>
                    {kategoriTebellugAcik && (
                        <div className="space-y-3 animate-fade-in-down pl-2">
                            {tebellugBekleyenKomiserler.length === 0 ? (
                                <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl text-center text-slate-500 text-sm font-medium">Tüm komiserler görevlerini tebellüğ etmiştir.</div>
                            ) : (
                                <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-900 text-slate-400 uppercase text-xs"><tr><th className="px-4 py-3 border-b border-slate-700">Komiser Adı</th><th className="px-4 py-3 border-b border-slate-700 text-right">Bekleyen Maç</th></tr></thead>
                                        <tbody>
                                            {tebellugBekleyenKomiserler.map((k: any, i) => (
                                                <Fragment key={`koms-${i}`}>
                                                <tr className="border-b border-slate-700/50 hover:bg-slate-700/50 cursor-pointer transition-colors" onClick={() => setAcikTebellugKomiser(acikTebellugKomiser === k.id ? null : k.id)}>
                                                    <td className="px-4 py-3 font-bold text-slate-200">{k.isim}<div className="text-[10px] text-slate-400 font-normal mt-0.5">Sicil: {k.id}</div></td>
                                                    <td className="px-4 py-3 text-right"><span className="bg-purple-900 text-purple-200 px-2 py-1 rounded text-xs font-black shadow-sm flex items-center justify-end gap-2 w-fit ml-auto">{k.count} Görev Bekliyor<span className="text-purple-400">{acikTebellugKomiser === k.id ? '▲' : '▼'}</span></span></td>
                                                </tr>
                                                {acikTebellugKomiser === k.id && (
                                                    <tr className="bg-slate-950 border-b border-slate-700/50">
                                                        <td colSpan={2} className="p-3">
                                                            <div className="space-y-2 animate-fade-in-down">
                                                                {k.maclar.map((m: any, mIdx: number) => (
                                                                    <div key={mIdx} className="bg-slate-900 border border-purple-900/50 p-2.5 rounded-lg text-xs shadow-inner">
                                                                        <span className="text-purple-400 font-bold bg-purple-950 px-1.5 py-0.5 rounded mr-1">KOD: {m.mac_kodu}</span> <span className="text-white font-bold">{m.ev_sahibi} <span className="text-slate-500 font-normal">vs</span> {m.misafir_takim}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                                </Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-6">
                        <button onClick={() => setKategoriBekleyenAcik(!kategoriBekleyenAcik)} className="w-full flex justify-between items-center bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-lg mb-3 hover:brightness-110 transition-all">
                            <div className="flex items-center gap-3"><span className="text-2xl">⏳</span><h2 className="text-lg font-black text-slate-300 tracking-widest uppercase">SKOR BEKLENEN MAÇLAR</h2></div><div className="flex items-center gap-4"><span className="bg-slate-600 text-white px-3 py-1 rounded-full text-xs font-bold">{bekleyenMaclar.length} MAÇ</span><span className="text-slate-400">{kategoriBekleyenAcik ? '▲' : '▼'}</span></div>
                        </button>
                        {kategoriBekleyenAcik && (
                            <div className="space-y-3 animate-fade-in-down pl-2">
                                {bekleyenMaclar.length === 0 ? (<div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl text-center text-slate-500 text-sm font-medium">Skoru girilmemiş aktif maç bulunmuyor.</div>) : (bekleyenMaclar.map((mac, idx) => <RaporDurumKarti key={`bekleyen-${idx}`} mac={mac} tip="bekleyen" isArsiv={isArsiv} />))}
                            </div>
                        )}
                    </div>

                    <div className="mt-6">
                        <button onClick={() => setKategoriIptalAcik(!kategoriIptalAcik)} className="w-full flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg mb-3 hover:brightness-110 transition-all opacity-70">
                            <div className="flex items-center gap-3"><span className="text-2xl">⛔</span><h2 className="text-lg font-black text-slate-500 tracking-widest uppercase line-through">İPTAL EDİLEN MAÇLAR</h2></div><div className="flex items-center gap-4"><span className="bg-slate-800 text-slate-400 px-3 py-1 rounded-full text-xs font-bold">{iptalEdilenMaclar.length} MAÇ</span><span className="text-slate-600">{kategoriIptalAcik ? '▲' : '▼'}</span></div>
                        </button>
                        {kategoriIptalAcik && (
                            <div className="space-y-3 animate-fade-in-down pl-2">
                                {iptalEdilenMaclar.length === 0 ? (<div className="bg-slate-800/30 border border-slate-800 p-4 rounded-xl text-center text-slate-600 text-sm font-medium">İptal edilen maç bulunmuyor.</div>) : (iptalEdilenMaclar.map((mac, idx) => <RaporDurumKarti key={`iptal-${idx}`} mac={mac} tip="iptal" isArsiv={isArsiv} />))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}