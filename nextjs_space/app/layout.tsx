
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: 'Hodges & Co. WP Studios - We Speak WordPress Fluently',
  description: 'Professional WordPress development studio with 10+ years of experience. Custom WordPress development, hosting, e-commerce, SEO, and maintenance services.',
  keywords: 'WordPress development, WordPress hosting, custom WordPress, e-commerce development, WordPress SEO, WordPress maintenance, WordPress studio',
  openGraph: {
    title: 'Hodges & Co. WP Studios - We Speak WordPress Fluently',
    description: 'Professional WordPress development studio with 10+ years of experience. Custom WordPress development, hosting, e-commerce, SEO, and maintenance services.',
    images: ['/og-image.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hodges & Co. WP Studios - We Speak WordPress Fluently',
    description: 'Professional WordPress development studio with 10+ years of experience.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
