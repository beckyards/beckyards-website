import './globals.css';
import { Archivo, Inter } from 'next/font/google';
import PromoBar from './components/PromoBar';
import Analytics from './components/Analytics';

export const revalidate = 60;

// Self-hosted by next/font (no request to Google at runtime). The CSS variables
// feed --font-display / --font-body in globals.css.
const archivo = Archivo({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-display',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-body',
});

const SITE_NAME = 'BeckYards Landscaping & Design';
const DESCRIPTION =
  'Landscaping that puts you first. Lawn mowing, mulching, bed redesign, planting, seasonal cleanups, and aeration & overseeding from BeckYards Landscaping & Design.';

export const metadata = {
  metadataBase: new URL('https://beckyards.com'),
  title: {
    default: SITE_NAME,
    template: '%s — BeckYards',
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    siteName: SITE_NAME,
    type: 'website',
    locale: 'en_US',
    title: SITE_NAME,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: DESCRIPTION,
  },
};

export const viewport = {
  themeColor: '#f8f8f3',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${archivo.variable} ${inter.variable}`}>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <PromoBar />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
