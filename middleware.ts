import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Gelen isteğin tam adresini (URL) yakala
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';

  // Varsayılan karargahımız her zaman İzmir
  let sehir = 'izmir';

  /* 
   * SUBDOMAIN (ALT ALAN ADI) YAKALAMA MANTIĞI:
   * kocaeli.tfskd.org -> kocaeli
   * izmir.tfskd.org -> izmir
   * kocaeli.localhost:3000 -> kocaeli (Test ortamı için)
   */
  if (hostname.includes('.')) {
    const subdomain = hostname.split('.')[0];
    // Eğer www veya localhost değilse, şehri subdomain olarak belirle
    if (subdomain !== 'www' && subdomain !== 'localhost' && subdomain !== '127') {
      sehir = subdomain.toLowerCase();
    }
  }

  // Yakalanan şehri görünmez bir kalkan (Header) olarak sistemin içine fırlat
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-sehir', sehir);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Bu radarın hangi sayfalarda çalışacağını belirliyoruz
export const config = {
  matcher: [
    /*
     * Aşağıdaki teknik yollar hariç sistemdeki tüm sayfalarda radar çalışsın:
     * - api (Arka plan işlemleri)
     * - _next/static (Görseller ve CSS'ler)
     * - _next/image (Resim motoru)
     * - favicon.ico (Tarayıcı ikonu)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};