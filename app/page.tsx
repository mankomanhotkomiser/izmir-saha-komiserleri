"use client"
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// 🔥 LOGO İÇİN KESİN ÇÖZÜM: Direkt TFF'nin şeffaf resmi logosunu webden çekiyoruz. Dosya yükleme derdi yok!
const DERNEK_LOGO = "https://upload.wikimedia.org/wikipedia/tr/0/0a/TFF_logo.png?utm_source=tr.wikipedia.org&utm_campaign=index&utm_content=original"; 

export default function KomiserPage() {
  const [sicilNo, setSicilNo] = useState('')
  const [girisYapildi, setGirisYapildi] = useState(false)
  const [komiserBilgi, setKomiserBilgi] = useState<any>(null)
  const [maclar, setMaclar] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState('')

  const [seciliMac, setSeciliMac] = useState<any>(null)
  const [raporModalAcik, setRaporModalAcik] = useState(false)
  const [hakem1, setHakem1] = useState('')
  const [yrdHakem1, setYrdHakem1] = useState('')
  const [yrdHakem2, setYrdHakem2] = useState('')
  const [hakem4, setHakem4] = useState('')
  const [gozlemci, setGozlemci] = useState('')
  const [evSkor, setEvSkor] = useState<number | string>('')
  const [misSkor, setMisSkor] = useState<number | string>('')
  const [olayDurumu, setOlayDurumu] = useState('olaysiz')
  const [raporNotu, setRaporNotu] = useState('')

  const girisYap = async (e: React.FormEvent) => {
    e.preventDefault()
    setHata('')
    setYukleniyor(true)

    let girilenSicil = sicilNo.trim()
    if (/^\d{4,10}$/.test(girilenSicil) && !girilenSicil.startsWith('35')) {
      girilenSicil = '35' + girilenSicil
    }

    try {
      const { data, error } = await supabase
        .from('komiserler')
        .select('*')
        .eq('komiser_id', girilenSicil)
        .single()

      if (error || !data) {
        setHata('Sicil numarası bulunamadı.')
        setYukleniyor(false)
        return
      }

      setKomiserBilgi(data)
      setGirisYapildi(true)
      maclariGetir(data.komiser_id)
    } catch (err: any) {
      setHata('Sistem hatası oluştu.')
    }
    setYukleniyor(false)
  }

  const maclariGetir = async (kId: string) => {
    const { data } = await supabase
      .from('musabakalar')
      .select('*')
      .eq('komiser_id', kId)
      .order('tarih', { ascending: true })

    if (data) setMaclar(data)
  }

  const temizleKamuflaj = (metin: string) => {
    if (!metin) return ''
    if (metin.toLocaleUpperCase('tr-TR').includes('TIKLA VE')) return ''
    return metin
  }

  const raporGonder = async () => {
    if (!seciliMac) return
    if (!hakem1 || hakem1.trim().length < 2 || hakem1.includes('TIKLA VE')) {
      alert('⚠️ DİKKAT: Müsabaka Hakem adı girilmeden rapor iletilemez!')
      return
    }

    const tffDetay = {
      detayli_kaydedildi: true,
      hakem: temizleKamuflaj(hakem1),
      y_hakem_1: temizleKamuflaj(yrdHakem1),
      y_hakem_2: temizleKamuflaj(yrdHakem2),
      hakem_4: temizleKamuflaj(hakem4),
      gozlemci: temizleKamuflaj(gozlemci)
    }

    try {
      const { error } = await supabase
        .from('musabakalar')
        .update({
          ev_sahibi_skor: Number(evSkor),
          misafir_skor: Number(misSkor),
          skor_girildi: true,
          olay_durumu: olayDurumu,
          rapor_notu: raporNotu,
          tff_rapor_detaylari: JSON.stringify(tffDetay)
        })
        .eq('id', seciliMac.id)

      if (error) throw error
      alert('✅ Rapor başarıyla iletildi!')
      setRaporModalAcik(false)
      maclariGetir(komiserBilgi.komiser_id)
    } catch (e: any) {
      alert('Hata: ' + e.message)
    }
  }

  if (!girisYapildi) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* KIRMIZI - BEYAZ ARKA PLAN EFEKTİ */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-[#dc2626] to-[#b91c1c] rounded-b-[50%] scale-150 transform -translate-y-1/4 shadow-2xl opacity-90"></div>
        
        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] max-w-sm w-full text-center relative z-10 border border-slate-100">
          
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-white rounded-full p-2 shadow-lg border border-slate-100 -mt-16 flex items-center justify-center">
              <img 
                src={DERNEK_LOGO} 
                crossOrigin="anonymous"
                alt="TFF Logo" 
                className="w-[85%] h-[85%] object-contain"
              />
            </div>
          </div>

          <h1 className="text-sm font-black tracking-widest text-slate-800 uppercase leading-snug mb-1">
            TÜRKİYE FUTBOL SAHA KOMİSERLERİ DERNEĞİ
          </h1>
          <h2 className="text-[11px] font-bold text-red-600 tracking-widest uppercase mb-8">
            İZMİR ŞUBESİ SAHA OPERASYON SİSTEMİ
          </h2>

          <form onSubmit={girisYap} className="space-y-6">
            {/* LİBELSİZ, TEMİZ VE MODERN GİRİŞ KUTUSU */}
            <div>
              <input
                type="text"
                value={sicilNo}
                onChange={(e) => setSicilNo(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3.5 text-center text-slate-800 font-black tracking-[0.2em] text-lg focus:outline-none focus:border-red-500 focus:bg-white transition-all shadow-inner"
                required
              />
            </div>
            
            {hata && <p className="text-red-500 text-xs font-bold text-center bg-red-50 p-2 rounded-lg">{hata}</p>}

            <button
              type="submit"
              disabled={yukleniyor}
              className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-[0_8px_20px_rgba(220,38,38,0.3)] transition-all disabled:opacity-50 hover:-translate-y-0.5"
            >
              {yukleniyor ? 'GİRİŞ YAPILIYOR...' : 'SİSTEME GİRİŞ YAP'}
            </button>
          </form>
        </div>
        
        <div className="absolute bottom-6 text-[10px] text-slate-400 font-medium tracking-widest uppercase text-center w-full z-10">
          SahaKom-OS Türkiye © 2026<br/>Tüm Hakları Saklıdır
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200">
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={DERNEK_LOGO} 
              crossOrigin="anonymous"
              alt="Logo" 
              className="w-10 h-10 object-contain rounded-full bg-white p-1 border border-slate-700"
            />
            <div>
              <h1 className="font-black text-xs md:text-sm text-white uppercase tracking-wider">
                TFSKD İZMİR ŞUBESİ
              </h1>
              <p className="text-[10px] text-slate-400 font-bold">
                KOMİSER: <span className="text-emerald-400 uppercase">{komiserBilgi?.ad_soyad}</span> (Sicil: {komiserBilgi?.komiser_id})
              </p>
            </div>
          </div>
          <button
            onClick={() => setGirisYapildi(false)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
          >
            ÇIKIŞ
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-2">
          📋 ATANAN MÜSABAKA GÖREVLERİNİZ ({maclar.length} MAÇ)
        </h2>

        {maclar.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center text-slate-500 font-bold">
            Atanmış aktif bir müsabaka göreviniz bulunmamaktadır.
          </div>
        ) : (
          maclar.map((mac) => {
            const macBitti = mac.skor_girildi === true;
            return (
              <div
                key={mac.id}
                className={`bg-slate-900 border rounded-2xl p-4 md:p-6 shadow-xl transition-all ${
                  macBitti ? 'border-emerald-900/50 bg-emerald-950/10' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="bg-slate-800 text-blue-400 border border-slate-700 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">
                    {mac.mac_kodu} | {mac.kategori_adi}
                  </span>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase ${
                    macBitti ? 'bg-emerald-900 text-emerald-300' : 'bg-amber-900/50 text-amber-400 animate-pulse'
                  }`}>
                    {macBitti ? '✓ RAPORU GÖNDERİLDİ' : '⏳ SKOR VE RAPOR BEKLENİYOR'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="font-bold text-sm md:text-base text-white uppercase">{mac.ev_sahibi}</span>
                    <span className="text-lg md:text-xl font-black text-emerald-400">
                      {mac.ev_sahibi_skor !== null ? mac.ev_sahibi_skor : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    <span className="font-bold text-sm md:text-base text-white uppercase">{mac.misafir_takim}</span>
                    <span className="text-lg md:text-xl font-black text-emerald-400">
                      {mac.misafir_skor !== null ? mac.misafir_skor : '-'}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-400 font-mono mb-4 flex justify-between items-center border-t border-slate-800/60 pt-3">
                  <span>📍 {mac.saha}</span>
                  <span className="text-blue-300 font-bold">📅 {mac.tarih} - {mac.saat}</span>
                </div>

                {!macBitti && (
                  <button
                    onClick={() => {
                      setSeciliMac(mac);
                      setRaporModalAcik(true);
                      setEvSkor('');
                      setMisSkor('');
                      setHakem1('');
                      setYrdHakem1('');
                      setYrdHakem2('');
                      setHakem4('');
                      setGozlemci('');
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest shadow-lg transition-colors"
                  >
                    📝 SKOR GİR VE TFF RAPORU DÜZENLE
                  </button>
                )}
              </div>
            )
          })
        )}
      </main>

      {/* TFF RAPOR DÜZENLEME MODAL */}
      {raporModalAcik && seciliMac && (
        <div className="fixed inset-0 bg-black/85 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-slate-900 border-2 border-emerald-500 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest">
                TFF MÜSABAKA RAPOR FORMU ({seciliMac.mac_kodu})
              </h3>
              <button onClick={() => setRaporModalAcik(false)} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 truncate">{seciliMac.ev_sahibi}</label>
                <input
                  type="number"
                  value={evSkor}
                  onChange={(e) => setEvSkor(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-900 text-white font-black text-center text-xl border border-slate-700 rounded-xl py-2 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 truncate">{seciliMac.misafir_takim}</label>
                <input
                  type="number"
                  value={misSkor}
                  onChange={(e) => setMisSkor(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-900 text-white font-black text-center text-xl border border-slate-700 rounded-xl py-2 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-800 pb-1">GÖREVLİ HAKEMLER VE PERSONEL</h4>
              
              <div>
                <label className="block text-[10px] font-bold text-red-400 uppercase mb-1">MÜSABAKA HAKEMİ (ZORUNLU) *</label>
                <input
                  type="text"
                  value={hakem1}
                  onChange={(e) => setHakem1(e.target.value)}
                  placeholder="Hakemin Adı Soyadı"
                  className="w-full bg-slate-900 text-white font-bold text-xs border border-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">1. YARDIMCI HAKEM</label>
                  <input
                    type="text"
                    value={yrdHakem1}
                    onChange={(e) => setYrdHakem1(e.target.value)}
                    placeholder="1. Yrd. Hakem Adı"
                    className="w-full bg-slate-900 text-white font-bold text-xs border border-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">2. YARDIMCI HAKEM</label>
                  <input
                    type="text"
                    value={yrdHakem2}
                    onChange={(e) => setYrdHakem2(e.target.value)}
                    placeholder="2. Yrd. Hakem Adı"
                    className="w-full bg-slate-900 text-white font-bold text-xs border border-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">4. HAKEM (VARSA)</label>
                  <input
                    type="text"
                    value={hakem4}
                    onChange={(e) => setHakem4(e.target.value)}
                    placeholder="4. Hakem Adı"
                    className="w-full bg-slate-900 text-white font-bold text-xs border border-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">GÖZLEMCİ</label>
                  <input
                    type="text"
                    value={gozlemci}
                    onChange={(e) => setGozlemci(e.target.value)}
                    placeholder="Gözlemci Adı"
                    className="w-full bg-slate-900 text-white font-bold text-xs border border-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">MÜSABAKA OLAY DURUMU</label>
                <select
                  value={olayDurumu}
                  onChange={(e) => setOlayDurumu(e.target.value)}
                  className="w-full bg-slate-900 text-white font-bold text-xs border border-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="olaysiz">🟢 OLAYSIZ / SORUNSUZ BİTTİ</option>
                  <option value="teknik_olay">🟡 SARI KATEGORİ (Çift Sarı, Kırmızı Kart, Disiplin)</option>
                  <option value="emniyetlik_olay">🔴 KIRMIZI KATEGORİ (Emniyetlik, Saha İhlali, Şiddet)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">KOMİSER OLAY VE RAPOR NOTU</label>
                <textarea
                  value={raporNotu}
                  onChange={(e) => setRaporNotu(e.target.value)}
                  rows={3}
                  placeholder="Müsabaka öncesi, sırası ve sonrasındaki olay notlarını detaylıca yazınız..."
                  className="w-full bg-slate-900 text-white text-xs border border-slate-700 rounded-xl p-3 focus:outline-none focus:border-emerald-500 resize-none"
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setRaporModalAcik(false)}
                className="px-5 py-3 rounded-xl font-bold text-xs text-slate-400 hover:text-white"
              >
                İptal
              </button>
              <button
                onClick={raporGonder}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-3 rounded-xl text-xs uppercase tracking-widest shadow-lg"
              >
                🚀 RAPORU KARARGAHA İLET
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}