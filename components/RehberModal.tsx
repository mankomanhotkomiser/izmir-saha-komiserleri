import React from 'react';

interface RehberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RehberModal({ isOpen, onClose }: RehberModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in-up border border-slate-300 flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-800 p-5 border-b border-slate-700 flex items-center gap-4 shrink-0">
                <span className="text-3xl md:text-4xl drop-shadow-md">📢</span>
                <div>
                    <h2 className="text-lg md:text-xl font-black text-white tracking-widest uppercase">YENİ SİSTEME HOŞ GELDİNİZ!</h2>
                    <p className="text-slate-300 text-[10px] md:text-xs font-bold mt-1 uppercase tracking-wider">Lütfen dijital operasyon sürecini dikkatlice okuyunuz</p>
                </div>
            </div>

            <div className="p-5 md:p-6 overflow-y-auto custom-scrollbar space-y-6 bg-slate-50 flex-1">
                
                {/* 1. AŞAMA */}
                <div className="bg-white p-4 rounded-xl border-l-4 border-amber-500 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-amber-50 text-amber-500 text-6xl opacity-20 -mt-2 -mr-2">📅</div>
                    <h3 className="font-black text-slate-800 text-sm md:text-base uppercase mb-2 flex items-center gap-2 relative z-10">
                        <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs shadow-inner">1. AŞAMA</span> MÜSAİTLİK / MAZERET BİLDİRİMİ
                    </h3>
                    <p className="text-slate-600 text-xs md:text-sm font-medium leading-relaxed relative z-10">
                        Gelecek haftanın bülteni hazırlanmadan önce <b className="text-slate-800">Mazeret Bildir</b> ekranından tüm hafta, belirli günler veya saat aralıklarında müsaitlik durumunuzu <u className="decoration-amber-500 decoration-2">eksiksiz</u> işaretleyiniz.
                    </p>
                </div>

                {/* 2. AŞAMA */}
                <div className="bg-white p-4 rounded-xl border-l-4 border-blue-500 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-blue-50 text-blue-500 text-6xl opacity-20 -mt-2 -mr-2">🤝</div>
                    <h3 className="font-black text-slate-800 text-sm md:text-base uppercase mb-2 flex items-center gap-2 relative z-10">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs shadow-inner">2. AŞAMA</span> GÖREV TEBLİĞ & TEBELLÜĞÜ
                    </h3>
                    <p className="text-slate-600 text-xs md:text-sm font-medium leading-relaxed relative z-10">
                        Bülten yayınlandığında <b className="text-slate-800">Görev Kartım</b> alanına girerek atanan maçlarınızı inceleyiniz ve <b className="text-blue-700 bg-blue-50 px-1 rounded">Tebellüğ Et (Görevleri Aldım)</b> butonuna basarak görevi resmen onaylayınız. 
                        <span className="text-red-600 text-[11px] md:text-xs mt-2 block font-bold bg-red-50 p-2 rounded border border-red-100">⚠️ DİKKAT: Tebellüğ edilmeyen müsabakanın skor girişi ve resmi TFF raporu kesinlikle AÇILAMAZ!</span>
                    </p>
                </div>

                {/* 3. AŞAMA */}
                <div className="bg-white p-4 rounded-xl border-l-4 border-emerald-500 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-emerald-50 text-emerald-500 text-6xl opacity-20 -mt-2 -mr-2">⚽</div>
                    <h3 className="font-black text-slate-800 text-sm md:text-base uppercase mb-2 flex items-center gap-2 relative z-10">
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs shadow-inner">3. AŞAMA</span> HIZLI SKOR BİLDİRİMİ
                    </h3>
                    <p className="text-slate-600 text-xs md:text-sm font-medium leading-relaxed relative z-10">
                        Müsabaka biter bitmez <b className="text-slate-800">Skor & Saha Raporu</b> ekranından maç durumunu, skorları ve varsa saha olaylarını girip <b className="text-emerald-700">Yönetime İlet</b> butonuna basınız.
                    </p>
                </div>

                {/* 4. AŞAMA */}
                <div className="bg-white p-4 rounded-xl border-l-4 border-red-500 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-red-50 text-red-500 text-6xl opacity-20 -mt-2 -mr-2">📄</div>
                    <h3 className="font-black text-slate-800 text-sm md:text-base uppercase mb-2 flex items-center gap-2 relative z-10">
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs shadow-inner">4. AŞAMA</span> DETAYLI TFF RAPORU (ZORUNLU)
                    </h3>
                    <p className="text-slate-600 text-xs md:text-sm font-medium leading-relaxed relative z-10">
                        Hızlı skor bildiriminden hemen sonra açılan resmi TFF tutanağını (Hakem, Sağlık, Güvenlik, İhraçlar vb.) doldurunuz ve <b className="text-red-700 bg-red-50 px-1 rounded">Detaylı Raporu İlet</b> butonuna basarak operasyon sürecini tamamlayınız.
                    </p>
                </div>

            </div>

            <div className="bg-white p-4 md:p-5 border-t border-slate-200 shrink-0 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-10">
                <button 
                    onClick={onClose} 
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black py-4 md:py-5 rounded-xl shadow-md transition-all transform hover:scale-[1.02] text-xs md:text-sm uppercase tracking-widest flex items-center justify-center gap-2 border-2 border-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-300"
                >
                    <span className="text-lg md:text-xl text-emerald-400">✓</span> OKUDUM, ANLADIM VE GÖREV SÜRECİNİ KABUL EDİYORUM
                </button>
            </div>
        </div>
    </div>
  );
}