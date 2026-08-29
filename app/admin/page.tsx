"use client"
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { toPng } from 'html-to-image' 
import * as XLSX from 'xlsx'

const AMATOR_MERKEZ_LOGO = "https://upload.wikimedia.org/wikipedia/tr/0/0a/TFF_logo.png?utm_source=tr.wikipedia.org&utm_campaign=index&utm_content=original";
const GELISIM_SOL_LOGO = "https://upload.wikimedia.org/wikipedia/tr/0/0a/TFF_logo.png?utm_source=tr.wikipedia.org&utm_campaign=index&utm_content=original";
const GELISIM_SAG_LOGO = "https://upload.wikimedia.org/wikipedia/tr/0/0a/TFF_logo.png?utm_source=tr.wikipedia.org&utm_campaign=index&utm_content=original"; 

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

export default function AdminPage() {
  const [sifre, setSifre] = useState('')
  const [girisYapildi, setGirisYapildi] = useState(false)
  const [hata, setHatasi] = useState('')
  const [tumMaclar, setTumMaclar] = useState<any[]>([])
  const [sezonlukMaclar, setSezonlukMaclar] = useState<any[]>([]) 
  const [tumKomiserler, setTumKomiserler] = useState<any[]>([])
  const [globalAktifHaftaNo, setGlobalAktifHaftaNo] = useState<number>(1)
  const [yukleniyor, setYukleniyor] = useState(true)

  const [acikMacId, setAcikMacId] = useState<number | null>(null)
  const [acikTffMacId, setAcikTffMacId] = useState<number | null>(null) 

  const [kategoriKirmiziAcik, setKategoriKirmiziAcik] = useState(true)
  const [kategoriDisiplinAcik, setKategoriDisiplinAcik] = useState(true)
  const [kategoriOlaysizAcik, setKategoriOlaysizAcik] = useState(false)
  const [kategoriTebellugAcik, setKategoriTebellugAcik] = useState(true)
  const [kategoriBekleyenAcik, setKategoriBekleyenAcik] = useState(true)
  const [kategoriIptalAcik, setKategoriIptalAcik] = useState(false) // YENİ: İptal edilenler akordeonu
  
  const [kategoriSicilAcik, setKategoriSicilAcik] = useState(false) 
  const [seciliSicilKomiserId, setSeciliSicilKomiserId] = useState<string>('') 
  const [acikSicilTffMacId, setAcikSicilTffMacId] = useState<number | null>(null)

  const [excelModalAcik, setExcelModalAcik] = useState(false)
  const [yuklenenExcelVerisi, setYuklenenExcelVerisi] = useState<any[]>([])
  const [excelKaydediliyor, setExcelKaydediliyor] = useState(false)
  const [excelHata, setExcelHata] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false) 

  // YENİ: TANRI MODU (GOD MODE) YETKİ STATE'LERİ
  const [atamaSelects, setAtamaSelects] = useState<Record<number, string>>({})
  const [degisimAcikMacId, setDegisimAcikMacId] = useState<number | null>(null)
  const [yeniKomiserId, setYeniKomiserId] = useState<string>('')

  const girisKontrol = (e: React.FormEvent) => {
    e.preventDefault()
    if (sifre === '1923') { setGirisYapildi(true); setHatasi(''); } 
    else { setHatasi('Hatalı şifre. Operasyon Merkezine giriş reddedildi.') }
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

  useEffect(() => { if (girisYapildi) { veriGetir() } }, [girisYapildi])

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

      if (maclarVerisi.length > 0) {
        const cumalar = maclarVerisi.map(mac => mac?.tarih ? cumaBul(mac.tarih) : 0).filter(t => t > 0)
        const essizCumalar = Array.from(new Set(cumalar)).sort((a, b) => a - b)
        if(essizCumalar.length > 0) {
            setGlobalAktifHaftaNo(essizCumalar.length)
            const aktifCumaTarihi = essizCumalar[essizCumalar.length - 1]
            const aktifHaftaMaclari = maclarVerisi.filter(mac => mac?.tarih && cumaBul(mac.tarih) === aktifCumaTarihi)
            aktifHaftaMaclari.sort(siralamaFiltresi);
            setTumMaclar(aktifHaftaMaclari)
        }
      }
    } catch (err) { console.error(err) }
    setYukleniyor(false)
  }

  const komiserIsmiBul = (id: any) => {
    const komiser = tumKomiserler.find(k => String(k.komiser_id) === String(id))
    return komiser ? komiser.ad_soyad : 'Atanmamış'
  }

  const toggleMac = (id: number) => { setAcikMacId(acikMacId === id ? null : id); setAcikTffMacId(null); }
  const toggleTff = (id: number) => { setAcikTffMacId(acikTffMacId === id ? null : id) }

  // YENİ: TANRI MODU - MANUEL ATAMA (ERGÜN BABAOĞLU VAKASI ÇÖZÜMÜ)
  const islemYapAta = async (macId: number) => {
      const kId = atamaSelects[macId];
      if (!kId) { alert("Lütfen atanacak komiseri listeden seçiniz!"); return; }
      try {
          const { error } = await supabase.from('musabakalar').update({ komiser_id: kId }).eq('id', macId);
          if (error) throw error;
          alert("✅ Müsabaka komutanlığınızca başarıyla atandı!");
          veriGetir();
      } catch (err: any) { alert("Sistem Hatası: " + err.message); }
  }

  // YENİ: TANRI MODU - CANLI GÖREV DEVRİ
  const islemYapDevir = async (macId: number) => {
      if (!yeniKomiserId) { alert("Lütfen devredilecek yeni komiseri seçiniz!"); return; }
      if (window.confirm("Bu görevi seçili komisere devretmek istediğinize emin misiniz? (Önceki komiserin ekranından tamamen silinecek ve yeni komisere tebellüğ için düşecek)")) {
          try {
              const { error } = await supabase.from('musabakalar').update({ komiser_id: yeniKomiserId, tebellug_edildi: false }).eq('id', macId);
              if (error) throw error;
              alert("✅ Görev devri başarıyla tamamlandı!");
              setDegisimAcikMacId(null);
              setYeniKomiserId('');
              veriGetir();
          } catch (err: any) { alert("Sistem Hatası: " + err.message); }
      }
  }

  // YENİ: TANRI MODU - MAÇ İPTAL ETME
  const macIptalEt = async (macId: number) => {
      if (window.confirm("⛔ DİKKAT: Bu maçı tamamen iptal etmek istediğinize emin misiniz? (Müsabaka komiserin ekranından silinir, görev istatistiğine yansımaz ve arşive kaldırılır)")) {
          try {
              const { error } = await supabase.from('musabakalar').update({
                  mac_durumu: 'iptal_edildi',
                  olay_durumu: 'iptal',
                  skor_girildi: true, // Bekleyen listelerinden düşmesi için
                  tebellug_edildi: true, // Tebellüğ listelerinden düşmesi için
                  rapor_notu: 'Müsabaka Yönetim (Karargah) Kararıyla İptal Edilmiştir.'
              }).eq('id', macId);
              if (error) throw error;
              alert("✅ Müsabaka iptal edildi ve arşive kaldırıldı.");
              veriGetir();
          } catch (err: any) { alert("Sistem Hatası: " + err.message); }
      }
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
              
              if (jsonData.length === 0) { setExcelHata("Yüklediğiniz dosya boş veya okunamadı."); return; }

              const islenmisVeri = jsonData.map((row: any) => {
                  let islenmisTarih = row['TARİH'] || row['Tarih'] || row['tarih'] || row['Tarih (YYYY-MM-DD)'] || '';
                  if (typeof islenmisTarih === 'number') {
                      const excelDate = new Date(Math.round((islenmisTarih - 25569) * 86400 * 1000));
                      islenmisTarih = excelDate.toISOString().split('T')[0];
                  } else if (islenmisTarih.includes('.')) {
                       const parts = islenmisTarih.split('.');
                       if(parts.length === 3) islenmisTarih = `${parts[2]}-${parts[1]}-${parts[0]}`;
                  } else if (islenmisTarih.includes('/')) {
                       const parts = islenmisTarih.split('/');
                       if(parts.length === 3) islenmisTarih = `${parts[2]}-${parts[1]}-${parts[0]}`;
                  }

                  let islenmisSaat = row['SAAT'] || row['Saat'] || row['saat'] || '';
                  if (typeof islenmisSaat === 'number') {
                      const totalSeconds = Math.round(islenmisSaat * 86400);
                      const h = Math.floor(totalSeconds / 3600);
                      const m = Math.floor((totalSeconds % 3600) / 60);
                      islenmisSaat = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                  }

                  const rawName = String(row['SAHA KOMİSERİ'] || row['Saha Komiseri'] || row['KOMİSER'] || row['Komiser'] || row['Komiser ID'] || row['TC'] || '').trim();
                  let finalKomiserId = rawName; 
                  
                  if (rawName && tumKomiserler && tumKomiserler.length > 0) {
                      const nameUpper = rawName.toLocaleUpperCase('tr-TR');
                      const matchedKomiser = tumKomiserler.find(k => k.ad_soyad && k.ad_soyad.toLocaleUpperCase('tr-TR').trim() === nameUpper);
                      if (matchedKomiser) { finalKomiserId = matchedKomiser.komiser_id; }
                  }

                  return {
                      mac_kodu: String(row['M.KODU'] || row['M. Kodu'] || row['Maç Kodu'] || row['MAC KODU'] || row['KOD'] || ''),
                      tarih: islenmisTarih,
                      saat: islenmisSaat,
                      saha: String(row['STAD'] || row['Saha'] || row['SAHA'] || ''),
                      kategori_adi: String(row['KATEGORİSİ'] || row['Kategori'] || row['KATEGORİ'] || ''),
                      ev_sahibi: String(row['EV SAHİBİ TAKIM'] || row['Ev Sahibi'] || row['EV SAHİBİ'] || row['1.Takım'] || ''),
                      misafir_takim: String(row['MİSAFİR TAKIM'] || row['Misafir'] || row['MİSAFİR'] || row['2.Takım'] || ''),
                      komiser_id: finalKomiserId, 
                      raw_komiser_name: rawName 
                  }
              }).filter(m => m.ev_sahibi && m.misafir_takim);

              setYuklenenExcelVerisi(islenmisVeri);
              setExcelHata(null);
          } catch (error) { setExcelHata("Dosya okunurken bir hata oluştu. Lütfen şablona uygun bir Excel yükleyin."); }
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
              mac_kodu: mac.mac_kodu,
              tarih: mac.tarih || null,
              saat: mac.saat || null,
              saha: mac.saha,
              kategori_adi: mac.kategori_adi,
              ev_sahibi: mac.ev_sahibi,
              misafir_takim: mac.misafir_takim,
              komiser_id: /^\d+$/.test(mac.komiser_id) ? mac.komiser_id : null
          }));

          const { error } = await supabase.from('musabakalar').insert(dbVerisi);
          if (error) throw error;
          
          alert(`✅ Başarılı! ${yuklenenExcelVerisi.length} adet müsabaka sisteme işlendi.`);
          setExcelModalAcik(false);
          setYuklenenExcelVerisi([]);
          veriGetir(); 
      } catch (err: any) { alert("Hata oluştu: " + err.message); } 
      finally { setExcelKaydediliyor(false); }
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
        const link = document.createElement('a'); link.href = dataURL; link.download = `OPERASYON_TFF_Raporu_${mac.ev_sahibi}_vs_${mac.misafir_takim}.png`;
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
      const komiserTelefon = ''; 
      
      const ihracEvListesi = Array.isArray(safeRaporDetay.ihrac_ev) ? safeRaporDetay.ihrac_ev : [];
      const ihracMisListesi = Array.isArray(safeRaporDetay.ihrac_mis) ? safeRaporDetay.ihrac_mis : [];
      const maxSatir = Math.max(ihracEvListesi.length, ihracMisListesi.length) || 1;

      const VarYokBox = ({ val }: { val: string }) => (
          <><div className="flex items-center gap-2 mb-1 pointer-events-none"><span className="w-8 text-slate-700">VAR</span><div className="w-4 h-4 border border-black flex items-center justify-center text-xs font-bold bg-white text-black">{val === 'var' ? 'X' : ''}</div></div><div className="flex items-center gap-2 pointer-events-none"><span className="w-8 text-slate-700">YOK</span><div className="w-4 h-4 border border-black flex items-center justify-center text-xs font-bold bg-white text-black">{val === 'yok' ? 'X' : ''}</div></div></>
      );
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
                      <h3 className="font-bold text-lg md:text-xl uppercase mt-1 text-black">SAHA KOMİSERİ RAPORU (AMATÖR LİG)</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-0 border border-black mb-6 text-black">
                      <div className="border-r border-black p-2 flex flex-col justify-center border-b border-dashed"><div className="flex items-center gap-2"><span className="text-[10px] font-bold">MÜSABAKANIN YAPILDIĞI YER:</span> <span className="font-black text-xl tracking-wider">İZMİR</span></div></div>
                      <div className="p-2 border-b border-dashed border-black"><div className="flex justify-between items-center"><span className="text-[10px] font-bold">MÜSABAKA NO:</span> <span className="font-bold text-sm uppercase text-black">{mac?.mac_kodu || '-'}</span></div></div>
                      <div className="p-2 border-r border-b border-dashed border-black bg-slate-100/50 text-center font-bold text-xs">KARŞILAŞAN KULÜPLER</div>
                      <div className="p-2 border-b border-dashed border-black"><div className="flex justify-between items-center"><span className="text-[10px] font-bold">STAD ADI:</span> <span className="font-bold text-xs uppercase text-right truncate w-3/4 text-black">{mac?.saha || '-'}</span></div></div>
                      <div className="grid grid-cols-4 border-b border-dashed border-black border-r border-l-0">
                          <div className="col-span-3 p-2 flex flex-col justify-center border-r border-dashed border-black"><div className="flex gap-2"><span className="text-[10px] font-bold w-12">EV SAHİBİ:</span> <span className="font-bold text-xs uppercase truncate text-black">{mac?.ev_sahibi || '-'}</span></div></div>
                          <div className="col-span-1 p-2 flex flex-col items-center justify-center bg-slate-100/30 border-r-0"><span className="text-[10px] font-bold mb-1">SKOR</span><span className="font-black text-lg text-black">{mac.ev_sahibi_skor !== null ? mac.ev_sahibi_skor : '-'}</span></div>
                      </div>
                      <div className="p-2 border-b border-dashed border-black"><div className="flex justify-between items-center"><span className="text-[10px] font-bold">TARİH:</span> <span className="font-bold text-xs text-black">{guvenliTarih(mac?.tarih)}</span></div></div>
                      <div className="grid grid-cols-4 border-b border-black border-r border-l-0">
                          <div className="col-span-3 p-2 flex flex-col justify-center border-r border-dashed border-black"><div className="flex gap-2"><span className="text-[10px] font-bold w-12">MİSAFİR:</span> <span className="font-bold text-xs uppercase truncate text-black">{mac?.misafir_takim || '-'}</span></div></div>
                          <div className="col-span-1 p-2 flex flex-col items-center justify-center bg-slate-100/30 border-r-0"><span className="font-black text-lg text-black">{mac.misafir_skor !== null ? mac.misafir_skor : '-'}</span></div>
                      </div>
                      <div className="flex flex-col border-b border-black"><div className="p-2 flex justify-between items-center border-b border-dashed border-black"><span className="text-[10px] font-bold">SAAT:</span> <span className="font-bold text-xs text-black">{guvenliSaat(mac?.saat)}</span></div><div className="p-2 flex justify-between items-center"><span className="text-[10px] font-bold">KATEGORİ:</span> <span className="font-bold text-[10px] text-right truncate w-2/3 text-black">{mac?.kategori_adi || '-'}</span></div></div>
                  </div>
                  <div className="grid grid-cols-2 gap-0 border border-black mb-6 text-black">
                      <div className="bg-slate-100/50 p-1.5 border-r border-b border-dashed border-black text-center text-[11px] font-bold">HAKEMLER VE GÖZLEMCİ</div>
                      <div className="bg-slate-100/50 p-1.5 border-b border-dashed border-black text-center text-[11px] font-bold">MÜSABAKADA GÖREVLİ PERSONELLER</div>
                      <div className="border-r border-black flex flex-col">
                          <div className="flex border-b border-dashed border-black p-1.5 items-center justify-between"><span className="text-[10px] font-bold w-20">HAKEM</span> <input readOnly type="text" value={safeRaporDetay?.hakem || ''} className="w-full text-xs outline-none bg-transparent font-black uppercase ml-2 pointer-events-none" /></div>
                          <div className="flex border-b border-dashed border-black p-1.5 items-center justify-between"><span className="text-[10px] font-bold w-20">1.YRD.HAKEM</span> <input readOnly type="text" value={safeRaporDetay?.y_hakem_1 || ''} className="w-full text-xs outline-none bg-transparent font-black uppercase ml-2 pointer-events-none" /></div>
                          <div className="flex border-b border-dashed border-black p-1.5 items-center justify-between"><span className="text-[10px] font-bold w-20">2.YRD.HAKEM</span> <input readOnly type="text" value={safeRaporDetay?.y_hakem_2 || ''} className="w-full text-xs outline-none bg-transparent font-black uppercase ml-2 pointer-events-none" /></div>
                          <div className="flex p-1.5 items-center justify-between"><span className="text-[10px] font-bold w-20">GÖZLEMCİ</span> <input readOnly type="text" value={safeRaporDetay?.gozlemci || ''} className="w-full text-xs outline-none bg-transparent font-black uppercase ml-2 pointer-events-none" /></div>
                      </div>
                      <div className="flex flex-col">
                          <div className="flex border-b border-dashed border-black p-1.5 items-center justify-between h-1/2"><span className="text-[10px] font-bold w-24">SAĞLIK MEMURU</span> <input readOnly type="text" value={safeRaporDetay?.saglik || ''} className="w-full text-xs outline-none bg-transparent font-black uppercase ml-2 pointer-events-none" /></div>
                          <div className="flex p-1.5 items-center justify-between h-1/2"><span className="text-[10px] font-bold w-24">GÜVENLİK</span> <input readOnly type="text" value={safeRaporDetay?.guvenlik || ''} className="w-full text-xs outline-none bg-transparent font-black uppercase ml-2 pointer-events-none" /></div>
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
                          <div className="w-1/5 border-r border-black p-2">{guvenliTarih(mac.tarih)}</div><div className="w-1/5 border-r border-black p-2">{guvenliSaat(mac.saat)}</div><div className="w-2/5 border-r border-black p-2 truncate">{mac.saha}</div><div className="w-1/5 p-2 truncate">{mac.kategori_adi}</div>
                      </div>
                  </div>

                  <div className="border-2 border-black text-xs font-bold mb-6">
                      <div className="grid grid-cols-6 border-b border-black">
                          <div className="col-span-5 border-r border-black p-2 flex gap-2 items-center"><span className="w-40 text-slate-600">EV SAHİBİ TAKIM ADI</span> <span className="uppercase text-sm">{mac.ev_sahibi}</span></div>
                          <div className="col-span-1 p-2 flex justify-between bg-slate-100 items-center"><span className="mr-2">SKOR</span><span className="text-lg font-black">{mac.ev_sahibi_skor !== null ? mac.ev_sahibi_skor : '-'}</span></div>
                      </div>
                      <div className="grid grid-cols-6">
                          <div className="col-span-5 border-r border-black p-2 flex gap-2 items-center"><span className="w-40 text-slate-600">MİSAFİR TAKIM ADI</span> <span className="uppercase text-sm">{mac.misafir_takim}</span></div>
                          <div className="col-span-1 p-2 flex justify-between bg-slate-100 items-center"><span className="mr-2">SKOR</span><span className="text-lg font-black">{mac.misafir_skor !== null ? mac.misafir_skor : '-'}</span></div>
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
                          <div className="w-1/2 border-r border-black p-1.5">GÜVENLİK</div>
                          <div className="w-1/2 flex items-center justify-center p-1 gap-4"><VarYokBox val={safeRaporDetay?.guvenlik} /></div>
                      </div>
                      <div className="flex border-b border-black"><div className="w-1/2 border-r border-black p-1.5">GÜVENLİK AMİRİ ADI SOYADI</div><div className="w-1/2 p-1.5"><input readOnly type="text" value={safeRaporDetay?.guvenlik_amiri || ''} className="w-full outline-none bg-transparent uppercase pointer-events-none" /></div></div>
                      <div className="flex border-b border-black"><div className="w-1/2 border-r border-black p-1.5">GÜVENLİK AMİRİ TELEFON</div><div className="w-1/2 p-1.5"><input readOnly type="text" value={safeRaporDetay?.guvenlik_telefon || ''} className="w-full outline-none bg-transparent uppercase pointer-events-none" /></div></div>
                      <div className="flex border-b border-black">
                          <div className="w-1/2 border-r border-black p-1.5">SAĞLIK MEMURU</div>
                          <div className="w-1/2 flex items-center justify-center p-1 gap-4"><VarYokBox val={safeRaporDetay?.saglik} /></div>
                      </div>
                      <div className="flex"><div className="w-1/2 border-r border-black p-1.5">ADI SOYADI</div><div className="w-1/2 p-1.5"><input readOnly type="text" value={safeRaporDetay?.saglik_adi || ''} className="w-full outline-none bg-transparent uppercase pointer-events-none" /></div></div>
                  </div>

                  <div className="bg-slate-100 p-2 font-black text-sm mb-2">I) ORGANİZASYON :</div>
                  <div className="mb-4 text-xs font-medium space-y-1">
                      <p className="mb-2">(a) Saha Komiserinin oyun alanına gidişi ve oyun alanını kontrolü</p>
                      {gelisimOrganizasyon.map(soru => (<div key={soru.id} className="flex justify-between items-center border-b border-dashed border-slate-300 py-1"><span className="text-[10px] w-3/4">{soru.text}</span><div className="flex gap-4 w-1/4 justify-end pr-2"><EvetHayirBox val={safeRaporDetay?.gelisim_sorular?.[soru.id]} /></div></div>))}
                      <p className="mt-4 mb-1">(b) Müsabaka sonu değerlendirmesi</p>
                      <textarea readOnly value={safeRaporDetay?.gelisim_sorular?.degerlendirme || ''} className="w-full border-b border-dashed border-black bg-transparent outline-none resize-none h-10 pointer-events-none"></textarea>
                  </div>

                  <div className="bg-slate-100 p-2 font-black text-sm mb-2">II) TEKNİK HUSUSLAR :</div>
                  <div className="mb-4 text-xs font-medium space-y-1">
                      <p className="mb-2">a) Aşağıdaki tesis / malzemeler standarlara uygun mudur? (dk. - 60'da kontrol edilecektir )</p>
                      {gelisimTeknik.map(soru => (<div key={soru.id} className="flex justify-between items-center border-b border-dashed border-slate-300 py-1"><span className="text-[10px] w-3/4">{soru.text}</span><div className="flex gap-4 w-1/4 justify-end pr-2"><EvetHayirBox val={safeRaporDetay?.gelisim_sorular?.[soru.id]} /></div></div>))}
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
                          <div className="text-[10px] text-slate-500">GSM Telefon No: {komiserTelefon}</div>
                          <div className="text-[10px] font-bold mt-1">SAHA KOMİSERİ</div>
                      </div>
                  </div>
              </div>
              )}

              {/* --- EK RAPORLAR (KANIT DOSYALARI) KUSURSUZ GÖRÜNÜMÜ --- */}
              {(safeRaporDetay?.ek_raporlar || []).map((ekRapor: any, index: number) => (
                  <div key={ekRapor.id} className="border-[3px] border-double border-slate-600 p-8 bg-white text-black font-sans relative mt-8 page-break-before-always">
                      
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
                          <div className="w-1/2 border-r border-black p-2 flex gap-2"><span className="text-slate-500">MÜSABAKA:</span> <span className="uppercase">{mac.ev_sahibi} - {mac.misafir_takim}</span></div>
                          <div className="w-1/4 border-r border-black p-2 flex gap-2"><span className="text-slate-500">TARİH:</span> <span>{guvenliTarih(mac.tarih)}</span></div>
                          <div className="w-1/4 p-2 flex gap-2"><span className="text-slate-500">MÜSABAKA NO:</span> <span>{mac.mac_kodu}</span></div>
                      </div>

                      <div className="mb-6">
                          <h3 className="font-bold text-sm uppercase mb-2 bg-slate-100 p-2 border border-slate-300 text-black">OLAY DETAYI VE EK AÇIKLAMA:</h3>
                          <textarea readOnly value={ekRapor.text} className="w-full outline-none border border-dashed border-black min-h-[200px] p-4 text-sm bg-transparent pointer-events-none text-black"></textarea>
                      </div>

                      <div className="mb-8 border border-dashed border-black p-4 min-h-[300px] flex flex-col items-center justify-center relative">
                          <h3 className="font-bold text-sm uppercase mb-4 absolute top-0 left-0 bg-white px-2 -mt-2 ml-4 text-black">FOTOĞRAFLI KANIT (VARSA)</h3>
                          <div className="text-slate-400 text-center tff-no-print">
                              <span className="text-4xl block mb-2">📸</span>
                              <p className="text-sm font-bold">Fotoğraflı kanıtlar Operasyon Merkezine değil, doğrudan Saha Komiserinin cihazına PNG olarak kaydedilir.</p>
                          </div>
                      </div>

                      <div className="flex justify-between items-end mt-12">
                          <div className="text-center w-1/3">
                              <div className="font-serif text-2xl text-blue-800 -mb-2 italic opacity-80" style={{fontFamily: "'Brush Script MT', cursive"}}>{komiserIlkIsim}</div>
                              <div className="font-bold text-sm border-b border-black px-4 pb-1 text-black">{komiserTamIsim}</div>
                              <div className="text-[10px] font-bold mt-1 text-black">SAHA KOMİSERİ</div>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      );
  }

  const RaporDurumKarti = ({ mac, tip }: { mac: any, tip: 'emniyet' | 'teknik' | 'olaysiz' | 'bekleyen' | 'tebellug' | 'iptal' }) => {
    let renkSiniflari = { bg: "bg-slate-800", border: "border-slate-700", text: "text-slate-300", badge: "bg-slate-700 text-slate-300" };
    if (tip === 'emniyet') { renkSiniflari = { bg: "bg-red-950/20", border: "border-red-600", text: "text-red-500", badge: "bg-red-600 text-white" }; } 
    else if (tip === 'teknik') { renkSiniflari = { bg: "bg-amber-950/20", border: "border-amber-500", text: "text-amber-500", badge: "bg-amber-600 text-white" }; } 
    else if (tip === 'olaysiz') { renkSiniflari = { bg: "bg-slate-800/80", border: "border-slate-700", text: "text-slate-300", badge: "bg-slate-900 text-white" }; } 
    else if (tip === 'tebellug') { renkSiniflari = { bg: "bg-purple-950/30", border: "border-purple-500", text: "text-purple-400", badge: "bg-purple-600 text-white" }; }
    else if (tip === 'iptal') { renkSiniflari = { bg: "bg-red-950/10", border: "border-red-900/50", text: "text-red-600", badge: "bg-red-900 text-white opacity-60" }; }

    const isAcik = acikMacId === mac.id; const isTffAcik = acikTffMacId === mac.id;
    const komiserTamIsim = komiserIsmiBul(mac.komiser_id);
    const detayliGonderilmis = mac.tff_rapor_detaylari?.detayli_kaydedildi === true;

    return (
      <div className={`mb-3 rounded-xl border-l-4 overflow-hidden shadow-md transition-all ${renkSiniflari.border}`}>
        <button onClick={() => toggleMac(mac.id)} className={`w-full text-left p-4 flex justify-between items-center ${renkSiniflari.bg} hover:brightness-125 transition-all focus:outline-none`}>
            <div className="flex-1 pr-4">
                <div className="flex items-center flex-wrap gap-2 mb-2">
                  <span className={`${renkSiniflari.badge} px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow-sm`}>{mac.mac_kodu}</span>
                  <span className="text-blue-400 text-[10px] font-bold uppercase tracking-wider">{mac.kategori_adi}</span>
                  {tip === 'iptal' && <span className="bg-red-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded animate-pulse">İPTAL EDİLDİ</span>}
                </div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className={`font-bold text-lg md:text-xl ${tip === 'iptal' ? 'text-red-400 line-through opacity-70' : 'text-white'}`}>{mac.ev_sahibi || '-'}</h3>
                  {(tip !== 'bekleyen' && tip !== 'tebellug' && tip !== 'iptal') && (
                      <span className="text-2xl font-black text-white px-2">{mac.ev_sahibi_skor !== null ? mac.ev_sahibi_skor : '-'}</span>
                  )}
                  <span className="text-slate-500 text-sm font-black bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700">VS</span>
                  {(tip !== 'bekleyen' && tip !== 'tebellug' && tip !== 'iptal') && (
                      <span className="text-2xl font-black text-white px-2">{mac.misafir_skor !== null ? mac.misafir_skor : '-'}</span>
                  )}
                  <h3 className={`font-bold text-lg md:text-xl ${tip === 'iptal' ? 'text-red-400 line-through opacity-70' : 'text-white'}`}>{mac.misafir_takim || '-'}</h3>
                </div>
                <div className="text-[10px] text-slate-400 font-mono leading-snug mt-2">{mac.saha} <br/> <span className="text-blue-300">{guvenliTarih(mac.tarih)} - {guvenliSaat(mac.saat)}</span></div>
            </div>
            <div className="flex flex-col items-end gap-2">
                <div className="text-right">
                    <span className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Müsabaka Komiseri</span>
                    <span className="bg-slate-900 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shadow-inner">{komiserTamIsim}</span>
                </div>
                <span className={`text-xl transition-transform duration-300 ${renkSiniflari.text} ${isAcik ? 'rotate-180' : ''}`}>▼</span>
            </div>
        </button>

        {isAcik && (
          <div className="bg-slate-900 border-t border-slate-800 p-4 md:p-6 animate-fade-in-down">
             {(tip !== 'bekleyen' && tip !== 'tebellug') && (
                 <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 mb-4">
                     <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 border-b border-slate-800 pb-2">Komiserin Hızlı Olay Notu</h4>
                     <p className={`text-sm font-serif leading-relaxed ${tip === 'iptal' ? 'text-red-400 font-bold' : 'text-slate-300'}`}>{mac.rapor_notu || <span className="italic text-slate-600">Not düşülmemiş.</span>}</p>
                 </div>
             )}
             
             {detayliRaporGosterilirMi(mac.kategori_adi) && (tip === 'emniyet' || tip === 'teknik' || tip === 'olaysiz') && (
                 <div className="mt-4">
                    {detayliGonderilmis ? (
                        <>
                            <button onClick={() => toggleTff(mac.id)} className="w-full bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 border border-blue-800/50 py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                                📄 TFF RESMİ TUTANAĞINI {isTffAcik ? 'GİZLE' : 'GÖRÜNTÜLE'} {isTffAcik ? '▲' : '▼'}
                            </button>
                            {isTffAcik && (
                                <div className="mt-4 border border-slate-700 rounded-lg overflow-hidden bg-slate-200">
                                    <div className="p-4 overflow-x-auto">{renderTffRaporu(mac, 'admin')}</div>
                                    <div className="bg-slate-800 p-3 border-t border-slate-700 flex justify-end">
                                        <button onClick={() => tffTutanakIndir(mac, 'admin')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded font-bold text-xs uppercase tracking-widest shadow-lg flex items-center gap-2">📸 FOTOĞRAF (PNG) OLARAK İNDİR</button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="bg-red-950/40 border border-red-900/50 text-red-400 p-3 rounded-lg text-center text-xs font-bold flex items-center justify-center gap-2 animate-pulse">
                            🚨 KOMİSER DETAYLI TFF RAPORUNU HENÜZ GÖNDERMEDİ
                        </div>
                    )}
                 </div>
             )}

             {/* YÖNETİM MÜDAHALE BUTONLARI (EKMEL KANUNU - SİLİNMEDEN EKLENDİ) */}
             {mac.mac_durumu !== 'iptal_edildi' && (
                 <div className="flex justify-end gap-3 mt-4 border-t border-slate-800 pt-4">
                     <button onClick={() => macIptalEt(mac.id)} className="bg-red-950/40 hover:bg-red-800/80 text-red-500 border border-red-900 px-3 py-1.5 rounded text-xs font-bold transition-colors">⛔ MAÇI İPTAL ET</button>
                     <button onClick={() => setDegisimAcikMacId(degisimAcikMacId === mac.id ? null : mac.id)} className="bg-blue-900/40 hover:bg-blue-800/80 text-blue-400 border border-blue-800/50 px-3 py-1.5 rounded text-xs font-bold transition-colors">🔄 KOMİSER DEĞİŞTİR</button>
                 </div>
             )}
             
             {degisimAcikMacId === mac.id && mac.mac_durumu !== 'iptal_edildi' && (
                 <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-blue-900/50 flex flex-col sm:flex-row gap-2 animate-fade-in-down">
                     <select value={yeniKomiserId} onChange={(e) => setYeniKomiserId(e.target.value)} className="flex-1 bg-slate-900 text-white border border-slate-700 rounded px-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-bold cursor-pointer">
                         <option value="">-- Devredilecek Yeni Komiseri Seçin --</option>
                         {tumKomiserler.sort((a,b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr-TR')).map(k => (
                             <option key={k.komiser_id} value={k.komiser_id}>{k.ad_soyad}</option>
                         ))}
                     </select>
                     <button onClick={() => islemYapDevir(mac.id)} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded">DEVRİ ONAYLA</button>
                 </div>
             )}
          </div>
        )}
      </div>
    )
  }

  // LİSTE FİLTRELERİ (İPTAL EDİLENLER HARİÇ TUTULDU)
  const emniyetlikMaclar = tumMaclar.filter(m => m.skor_girildi && m.olay_durumu === 'emniyetlik_olay' && m.mac_durumu !== 'iptal_edildi')
  const teknikMaclar = tumMaclar.filter(m => m.skor_girildi && (m.olay_durumu === 'teknik_olay' || m.olay_durumu === 'hava_muhalefeti' || m.olay_durumu === 'saha_sorunu') && m.mac_durumu !== 'iptal_edildi')
  const olaysizMaclar = tumMaclar.filter(m => m.skor_girildi && m.olay_durumu === 'olaysiz' && m.mac_durumu !== 'iptal_edildi')
  const iptalEdilenMaclar = tumMaclar.filter(m => m.mac_durumu === 'iptal_edildi')
  const bekleyenMaclar = tumMaclar.filter(m => m.tebellug_edildi && !m.skor_girildi && m.mac_durumu !== 'iptal_edildi')
  
  const tebellugBekleyenKomiserler = Array.from(tumMaclar.filter(m => !m.tebellug_edildi && m.mac_durumu !== 'iptal_edildi' && m.komiser_id && m.komiser_id !== 'null' && m.komiser_id !== '').reduce((map, mac) => {
        if (!map.has(mac.komiser_id)) { map.set(mac.komiser_id, { id: mac.komiser_id, isim: komiserIsmiBul(mac.komiser_id), count: 0 }); }
        map.get(mac.komiser_id).count++; return map;
  }, new Map()).values()).sort((a: any, b: any) => a.isim.localeCompare(b.isim, 'tr-TR'));

  const atanmayanMaclar = tumMaclar.filter(m => (!m.komiser_id || m.komiser_id === 'null' || m.komiser_id === '') && m.mac_durumu !== 'iptal_edildi');

  if (!girisYapildi) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700">
          <div className="text-center mb-8"><span className="text-5xl block mb-4">🛡️</span><h1 className="text-2xl font-black text-white tracking-widest uppercase">OPERASYON MERKEZİ GİRİŞİ</h1></div>
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
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-50 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-3xl hidden md:block">🇹🇷</span>
            <div>
              <h1 className="font-black text-lg md:text-xl text-white tracking-widest uppercase">İZMİR SAHA KOMİSERLERİ OPERASYON MERKEZİ</h1>
              <p className="text-slate-400 text-xs font-mono">TFF İZMİR SAHA KOMİSERLERİ ({globalAktifHaftaNo}. HAFTA OPERASYONU)</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => setExcelModalAcik(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 px-4 py-1.5 rounded-md text-xs font-black tracking-widest transition-colors shadow-lg animate-pulse">📥 EXCEL BÜLTEN YÜKLE</button>
             <button onClick={veriGetir} className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 px-3 py-1.5 rounded text-xs font-bold transition-colors">🔄 YENİLE</button>
             <button onClick={() => setGirisYapildi(false)} className="bg-red-900/50 hover:bg-red-800 text-red-400 border border-red-900 px-3 py-1.5 rounded text-xs font-bold transition-colors">ÇIKIŞ YAP</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {/* EXCEL YÜKLEME MODALI */}
        {excelModalAcik && (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-slate-900 border-2 border-emerald-500 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                    <div className="bg-emerald-900/50 p-4 border-b border-emerald-500/50 flex justify-between items-center">
                        <h2 className="text-xl font-black text-emerald-400 tracking-widest uppercase flex items-center gap-2"><span className="text-2xl">📥</span> YENİ BÜLTEN YÜKLEME MERKEZİ (EXCEL)</h2>
                        <button onClick={() => { setExcelModalAcik(false); setYuklenenExcelVerisi([]); setExcelHata(null); }} className="text-slate-400 hover:text-white font-bold text-xl">✕</button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                        <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl mb-6">
                            <h3 className="text-emerald-400 font-bold mb-2 flex items-center gap-2"><span className="text-xl">🤖</span> İsim Eşleştirme Zekası Aktif!</h3>
                            <p className="text-xs text-slate-400 mb-3">TFF'nin PDF'sinden çevirdiğiniz Excel'i direkt yükleyebilirsiniz. Sistem komiser ismini (Örn: ADEM YÜKSEL) görünce TC kimliğini kendisi bulur ve maçı ona şifreler.</p>
                            <div className="flex gap-2 flex-wrap font-mono text-[10px] text-white opacity-80">
                                <span className="bg-slate-700 px-2 py-1 rounded">M.KODU</span><span className="bg-slate-700 px-2 py-1 rounded">TARİH</span><span className="bg-slate-700 px-2 py-1 rounded">SAAT</span><span className="bg-slate-700 px-2 py-1 rounded">STAD</span><span className="bg-slate-700 px-2 py-1 rounded">KATEGORİSİ</span><span className="bg-slate-700 px-2 py-1 rounded">EV SAHİBİ TAKIM</span><span className="bg-slate-700 px-2 py-1 rounded">MİSAFİR TAKIM</span><span className="bg-slate-700 px-2 py-1 rounded border border-emerald-500 text-emerald-400">SAHA KOMİSERİ</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-center w-full mb-6">
                            <label 
                                onDragOver={onDragOver} 
                                onDragLeave={onDragLeave} 
                                onDrop={onDrop}
                                className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all ${isDragging ? 'border-emerald-500 bg-emerald-900/30 scale-105' : 'border-slate-600 bg-slate-800 hover:bg-slate-700'}`}
                            >
                                <div className="flex flex-col items-center justify-center pt-5 pb-6 pointer-events-none">
                                    <span className="text-4xl mb-3">{isDragging ? '📥' : '📊'}</span>
                                    <p className="mb-2 text-sm text-slate-300">
                                        {isDragging ? (
                                            <span className="font-bold text-emerald-400">Dosyayı Buraya Bırak!</span>
                                        ) : (
                                            <><span className="font-bold text-emerald-400">Dosya Yüklemek İçin Tıklayın</span> veya Sürükleyin</>
                                        )}
                                    </p>
                                    <p className="text-xs text-slate-500">Desteklenen Format: .xlsx, .xls</p>
                                </div>
                                <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={(e) => { if(e.target.files && e.target.files.length > 0) processExcelFile(e.target.files[0]) }} />
                            </label>
                        </div>

                        {excelHata && <div className="bg-red-900/50 border border-red-500 text-red-400 p-4 rounded-lg mb-6 font-bold text-center">{excelHata}</div>}

                        {yuklenenExcelVerisi.length > 0 && (
                            <div className="animate-fade-in-up">
                                <h3 className="text-white font-bold mb-3 flex items-center justify-between">
                                    <span>🔍 Yükleme Önizlemesi ({yuklenenExcelVerisi.length} Maç Tespit Edildi)</span>
                                </h3>
                                <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-x-auto">
                                    <table className="w-full text-left text-xs text-slate-300 whitespace-nowrap">
                                        <thead className="bg-slate-900 text-slate-400 uppercase">
                                            <tr><th className="px-4 py-3">Maç Kodu</th><th className="px-4 py-3">Zaman</th><th className="px-4 py-3">Saha</th><th className="px-4 py-3">Kategori</th><th className="px-4 py-3">Karşılaşma</th><th className="px-4 py-3">Bulunan Eşleşme (ID)</th></tr>
                                        </thead>
                                        <tbody>
                                            {yuklenenExcelVerisi.slice(0, 50).map((mac, i) => {
                                                const islesmeBasarili = /^\d+$/.test(mac.komiser_id);
                                                return (
                                                <tr key={i} className="border-b border-slate-700 hover:bg-slate-700/50">
                                                    <td className="px-4 py-2 font-mono text-emerald-400">{mac.mac_kodu}</td>
                                                    <td className="px-4 py-2">{mac.tarih} <br/> <span className="text-slate-500">{mac.saat}</span></td>
                                                    <td className="px-4 py-2 truncate max-w-[120px]">{mac.saha}</td>
                                                    <td className="px-4 py-2 truncate max-w-[120px]">{mac.kategori_adi}</td>
                                                    <td className="px-4 py-2 font-bold text-white">{mac.ev_sahibi} vs {mac.misafir_takim}</td>
                                                    <td className="px-4 py-2">
                                                        <span className={`px-2 py-1 rounded font-bold ${islesmeBasarili ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700' : 'bg-amber-900/50 text-amber-400 border border-amber-700'}`}>
                                                            {islesmeBasarili ? `✓ ID: ${mac.komiser_id}` : `⚠️ BULUNAMADI (${mac.raw_komiser_name})`}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )})}
                                        </tbody>
                                    </table>
                                    {yuklenenExcelVerisi.length > 50 && <div className="text-center p-3 text-slate-500 italic">... ve {yuklenenExcelVerisi.length - 50} maç daha.</div>}
                                </div>
                                <div className="mt-3 p-3 bg-amber-900/30 border border-amber-700/50 rounded-lg text-amber-400 text-[10px] font-medium">
                                    💡 <b>NOT:</b> "BULUNAMADI" yazan satırlar veritabanına sorunsuz kaydedilir ancak komiseri "Atanmamış" olarak kalır. Bu maçları daha sonra panelden istediğiniz komisere atayabilirsiniz.
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {yuklenenExcelVerisi.length > 0 && (
                        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-4">
                            <button onClick={() => setYuklenenExcelVerisi([])} className="px-6 py-3 rounded-lg font-bold text-slate-400 hover:text-white transition-colors">İptal Et</button>
                            <button onClick={bulteniVeritabaninaKaydet} disabled={excelKaydediliyor} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-3 rounded-lg shadow-lg uppercase tracking-widest disabled:opacity-50 flex items-center gap-2">
                                {excelKaydediliyor ? '⚙️ SİSTEME İŞLENİYOR...' : '🚀 BÜLTENİ SİSTEME KAYDET VE YAYINLA'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}

        {yukleniyor ? (
          <div className="flex flex-col items-center justify-center py-20"><div className="w-12 h-12 border-4 border-slate-700 border-t-red-600 rounded-full animate-spin mb-4"></div><p className="text-slate-400 font-bold animate-pulse tracking-widest">VERİLER MERKEZDEN ÇEKİLİYOR...</p></div>
        ) : (
          <div className="space-y-8">
            
            {/* YENİ: ATANMAYAN (BOŞ) MAÇLAR UYARISI */}
            {atanmayanMaclar.length > 0 && (
                <div className="bg-red-950/60 border-2 border-red-600 rounded-2xl p-6 mb-6 shadow-2xl animate-pulse">
                    <h3 className="text-red-400 font-black text-xl mb-4 flex items-center gap-3"><span className="text-3xl">🚨</span> DİKKAT: KOMİSERİ OLMAYAN (ATANMAMIŞ) {atanmayanMaclar.length} ADET MAÇ VAR!</h3>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                        {atanmayanMaclar.map((mac, idx) => (
                            <div key={mac.id || `bos-${idx}`} className="bg-slate-900 border border-red-900/80 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1"><span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow">KOD: {mac.mac_kodu}</span><span className="text-blue-400 text-xs font-bold uppercase">{mac.kategori_adi}</span></div>
                                    <span className="text-white text-base font-bold">{mac.ev_sahibi} <span className="text-slate-500 font-normal">vs</span> {mac.misafir_takim}</span>
                                    <div className="text-[11px] text-slate-400 font-mono mt-1">{mac.saha} | {guvenliTarih(mac.tarih)} - {guvenliSaat(mac.saat)}</div>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <select value={atamaSelects[mac.id] || ''} onChange={(e) => setAtamaSelects({...atamaSelects, [mac.id]: e.target.value})} className="flex-1 bg-slate-950 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500 cursor-pointer font-bold">
                                        <option value="">-- Komiser Seç --</option>
                                        {tumKomiserler.sort((a,b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr-TR')).map(k => (
                                            <option key={k.komiser_id} value={k.komiser_id}>{k.ad_soyad}</option>
                                        ))}
                                    </select>
                                    <button onClick={() => islemYapAta(mac.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black px-4 py-2 rounded-lg shadow-lg">ATA</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800 rounded-xl p-4 md:p-6 border-l-4 border-blue-500 shadow-lg relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 text-6xl opacity-10 group-hover:scale-110 transition-transform">⚽</div>
                  <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">BU HAFTA TOPLAM MAÇ</h3>
                  <div className="text-3xl md:text-4xl font-black text-white">{tumMaclar.filter(m => m.mac_durumu !== 'iptal_edildi').length}</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 md:p-6 border-l-4 border-red-500 shadow-lg relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 text-6xl opacity-10 group-hover:scale-110 transition-transform">🚨</div>
                  <h3 className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-widest mb-1">EMNİYETLİK OLAYLI</h3>
                  <div className="text-3xl md:text-4xl font-black text-red-500">{emniyetlikMaclar.length}</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 md:p-6 border-l-4 border-amber-500 shadow-lg relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 text-6xl opacity-10 group-hover:scale-110 transition-transform">⚠️</div>
                  <h3 className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-widest mb-1">TEKNİK DİSİPLİN</h3>
                  <div className="text-3xl md:text-4xl font-black text-amber-500">{teknikMaclar.length}</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 md:p-6 border-l-4 border-purple-500 shadow-lg relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 text-6xl opacity-10 group-hover:scale-110 transition-transform">⏳</div>
                  <h3 className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-widest mb-1">TEBELLÜĞ BEKLEYEN</h3>
                  <div className="text-3xl md:text-4xl font-black text-purple-400">{tumMaclar.filter(m => !m.tebellug_edildi && m.mac_durumu !== 'iptal_edildi').length}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* SOL SÜTUN */}
                <div>
                    <button onClick={() => setKategoriKirmiziAcik(!kategoriKirmiziAcik)} className="w-full flex justify-between items-center bg-red-950 border border-red-900 p-4 rounded-xl shadow-lg mb-3 hover:brightness-110 transition-all">
                        <div className="flex items-center gap-3"><span className="text-2xl">🚨</span><h2 className="text-lg font-black text-red-500 tracking-widest uppercase">KIRMIZI KATEGORİ (EMNİYETLİK)</h2></div>
                        <div className="flex items-center gap-4"><span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold">{emniyetlikMaclar.length} MAÇ</span><span className="text-red-500">{kategoriKirmiziAcik ? '▲' : '▼'}</span></div>
                    </button>
                    {kategoriKirmiziAcik && (
                        <div className="space-y-3 animate-fade-in-down pl-2">
                            {emniyetlikMaclar.length === 0 ? (<div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl text-center text-slate-500 text-sm font-medium">Bu haftaya ait emniyetlik olay raporu bulunmuyor.</div>) : (emniyetlikMaclar.map((mac, idx) => <RaporDurumKarti key={`emniyet-${idx}`} mac={mac} tip="emniyet" />))}
                        </div>
                    )}

                    <div className="mt-6">
                        <button onClick={() => setKategoriDisiplinAcik(!kategoriDisiplinAcik)} className="w-full flex justify-between items-center bg-amber-950 border border-amber-900 p-4 rounded-xl shadow-lg mb-3 hover:brightness-110 transition-all">
                            <div className="flex items-center gap-3"><span className="text-2xl">⚠️</span><h2 className="text-lg font-black text-amber-500 tracking-widest uppercase">SARI KATEGORİ (TEKNİK İHRAÇLAR)</h2></div>
                            <div className="flex items-center gap-4"><span className="bg-amber-600 text-white px-3 py-1 rounded-full text-xs font-bold">{teknikMaclar.length} MAÇ</span><span className="text-amber-500">{kategoriDisiplinAcik ? '▲' : '▼'}</span></div>
                        </button>
                        {kategoriDisiplinAcik && (
                            <div className="space-y-3 animate-fade-in-down pl-2">
                                {teknikMaclar.length === 0 ? (<div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl text-center text-slate-500 text-sm font-medium">Bu haftaya ait teknik disiplin raporu bulunmuyor.</div>) : (teknikMaclar.map((mac, idx) => <RaporDurumKarti key={`teknik-${idx}`} mac={mac} tip="teknik" />))}
                            </div>
                        )}
                    </div>

                    <div className="mt-6">
                        <button onClick={() => setKategoriSicilAcik(!kategoriSicilAcik)} className="w-full flex justify-between items-center bg-blue-950 border border-blue-900 p-4 rounded-xl shadow-lg mb-3 hover:brightness-110 transition-all">
                            <div className="flex items-center gap-3"><span className="text-2xl">🗄️</span><h2 className="text-lg font-black text-blue-400 tracking-widest uppercase">KOMİSER SİCİL VE ARŞİV DOSYASI</h2></div>
                            <div className="flex items-center gap-4"><span className="text-blue-500">{kategoriSicilAcik ? '▲' : '▼'}</span></div>
                        </button>
                        {kategoriSicilAcik && (
                            <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl animate-fade-in-down mb-3">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Saha Komiseri Seçin</label>
                                <select value={seciliSicilKomiserId} onChange={(e) => setSeciliSicilKomiserId(e.target.value)} className="w-full bg-slate-900 text-white border border-slate-600 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none mb-4 font-bold cursor-pointer">
                                    <option value="">-- Komiser Seçiniz --</option>
                                    {tumKomiserler.sort((a,b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr-TR')).map(k => (
                                        <option key={k.komiser_id} value={k.komiser_id}>{k.ad_soyad}</option>
                                    ))}
                                </select>

                                {seciliSicilKomiserId && (
                                    <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                                        {(() => {
                                            const komiserinMaclari = sezonlukMaclar.filter(m => String(m.komiser_id) === String(seciliSicilKomiserId)).sort(siralamaFiltresi).reverse();
                                            if (komiserinMaclari.length === 0) return <div className="text-center text-slate-500 text-sm py-4">Bu komisere ait geçmiş görev kaydı bulunamadı.</div>;
                                            
                                            return komiserinMaclari.map((mac, idx) => {
                                                const isAcik = acikSicilTffMacId === mac.id;
                                                const skorMetni = mac.skor_girildi && mac.ev_sahibi_skor !== null ? `${mac.ev_sahibi_skor} - ${mac.misafir_skor}` : 'Skor Bekleniyor';
                                                const detayliGonderilmis = mac.tff_rapor_detaylari?.detayli_kaydedildi === true;
                                                
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
                                                                {detayliGonderilmis && (
                                                                    <button onClick={() => setAcikSicilTffMacId(isAcik ? null : mac.id)} className="bg-blue-900 hover:bg-blue-800 text-blue-200 px-2 py-1 rounded text-[9px] font-bold uppercase transition-colors">
                                                                        📄 RAPOR {isAcik ? '▲' : '▼'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {isAcik && detayliGonderilmis && (
                                                            <div className="mt-3 border-t border-slate-700 pt-3 animate-fade-in-down">
                                                                <div className="bg-slate-200 rounded p-2 overflow-x-auto">
                                                                    {renderTffRaporu(mac, 'sicil')}
                                                                </div>
                                                                <div className="mt-3 flex justify-end">
                                                                    <button onClick={() => tffTutanakIndir(mac, 'sicil')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-xs font-bold tracking-widest shadow-md flex items-center gap-2">📸 RAPORU PNG İNDİR</button>
                                                                </div>
                                                            </div>
                                                        )}
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

                {/* SAĞ SÜTUN */}
                <div>
                    <button onClick={() => setKategoriTebellugAcik(!kategoriTebellugAcik)} className="w-full flex justify-between items-center bg-purple-950 border border-purple-900 p-4 rounded-xl shadow-lg mb-3 hover:brightness-110 transition-all">
                        <div className="flex items-center gap-3"><span className="text-2xl">📬</span><h2 className="text-lg font-black text-purple-400 tracking-widest uppercase">GÖREVİ ONAYLAMAYANLAR</h2></div>
                        <div className="flex items-center gap-4"><span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold">{tebellugBekleyenKomiserler.length} KİŞİ</span><span className="text-purple-500">{kategoriTebellugAcik ? '▲' : '▼'}</span></div>
                    </button>
                    {kategoriTebellugAcik && (
                        <div className="space-y-3 animate-fade-in-down pl-2">
                            {tebellugBekleyenKomiserler.length === 0 ? (
                                <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl text-center text-slate-500 text-sm font-medium">Tüm komiserler görevlerini tebellüğ etmiştir. (Sorun Yok)</div>
                            ) : (
                                <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-900 text-slate-400 uppercase text-xs"><tr><th className="px-4 py-3 border-b border-slate-700">Komiser Adı</th><th className="px-4 py-3 border-b border-slate-700 text-right">Bekleyen Maç</th></tr></thead>
                                        <tbody>
                                            {tebellugBekleyenKomiserler.map((k: any, i) => (
                                                <tr key={`koms-${i}`} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                                                    <td className="px-4 py-3 font-bold text-slate-200">{k.isim}</td>
                                                    <td className="px-4 py-3 text-right"><span className="bg-purple-900 text-purple-200 px-2 py-1 rounded text-xs font-black">{k.count} Görev Bekliyor</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-6">
                        <button onClick={() => setKategoriBekleyenAcik(!kategoriBekleyenAcik)} className="w-full flex justify-between items-center bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-lg mb-3 hover:brightness-110 transition-all">
                            <div className="flex items-center gap-3"><span className="text-2xl">⏳</span><h2 className="text-lg font-black text-slate-300 tracking-widest uppercase">SKOR BEKLENEN MAÇLAR</h2></div>
                            <div className="flex items-center gap-4"><span className="bg-slate-600 text-white px-3 py-1 rounded-full text-xs font-bold">{bekleyenMaclar.length} MAÇ</span><span className="text-slate-400">{kategoriBekleyenAcik ? '▲' : '▼'}</span></div>
                        </button>
                        {kategoriBekleyenAcik && (
                            <div className="space-y-3 animate-fade-in-down pl-2">
                                {bekleyenMaclar.length === 0 ? (<div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl text-center text-slate-500 text-sm font-medium">Skoru girilmemiş aktif maç bulunmuyor.</div>) : (bekleyenMaclar.map((mac, idx) => <RaporDurumKarti key={`bekleyen-${idx}`} mac={mac} tip="bekleyen" />))}
                            </div>
                        )}
                    </div>

                    <div className="mt-6">
                        <button onClick={() => setKategoriOlaysizAcik(!kategoriOlaysizAcik)} className="w-full flex justify-between items-center bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-lg mb-3 hover:brightness-110 transition-all opacity-80">
                            <div className="flex items-center gap-3"><span className="text-2xl">✅</span><h2 className="text-lg font-black text-slate-400 tracking-widest uppercase">SORUNSUZ / OLAYSIZ BİTENLER</h2></div>
                            <div className="flex items-center gap-4"><span className="bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-xs font-bold">{olaysizMaclar.length} MAÇ</span><span className="text-slate-500">{kategoriOlaysizAcik ? '▲' : '▼'}</span></div>
                        </button>
                        {kategoriOlaysizAcik && (
                            <div className="space-y-3 animate-fade-in-down pl-2">
                                {olaysizMaclar.length === 0 ? (<div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl text-center text-slate-500 text-sm font-medium">Bu haftaya ait sorunsuz maç raporu bulunmuyor.</div>) : (olaysizMaclar.map((mac, idx) => <RaporDurumKarti key={`olaysiz-${idx}`} mac={mac} tip="olaysiz" />))}
                            </div>
                        )}
                    </div>

                    {/* YENİ: İPTAL EDİLEN MAÇLAR AKORDEONU */}
                    <div className="mt-6">
                        <button onClick={() => setKategoriIptalAcik(!kategoriIptalAcik)} className="w-full flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg mb-3 hover:brightness-110 transition-all opacity-70">
                            <div className="flex items-center gap-3"><span className="text-2xl">⛔</span><h2 className="text-lg font-black text-slate-500 tracking-widest uppercase line-through">İPTAL EDİLEN MAÇLAR</h2></div>
                            <div className="flex items-center gap-4"><span className="bg-slate-800 text-slate-400 px-3 py-1 rounded-full text-xs font-bold">{iptalEdilenMaclar.length} MAÇ</span><span className="text-slate-600">{kategoriIptalAcik ? '▲' : '▼'}</span></div>
                        </button>
                        {kategoriIptalAcik && (
                            <div className="space-y-3 animate-fade-in-down pl-2">
                                {iptalEdilenMaclar.length === 0 ? (<div className="bg-slate-800/30 border border-slate-800 p-4 rounded-xl text-center text-slate-600 text-sm font-medium">Yönetim tarafından iptal edilen maç bulunmuyor.</div>) : (iptalEdilenMaclar.map((mac, idx) => <RaporDurumKarti key={`iptal-${idx}`} mac={mac} tip="iptal" />))}
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