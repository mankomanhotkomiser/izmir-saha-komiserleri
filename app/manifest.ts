import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'İzmir Saha Komiserleri Operasyon Merkezi',
    short_name: 'SahaKom',
    description: 'TFF İzmir Şubesi Saha Operasyon Sistemi',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#dc2626',
    icons: [
      {
        src: '/icon', 
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}