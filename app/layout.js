import './globals.css';
import PromoBar from './components/PromoBar';
import Analytics from './components/Analytics';

export const revalidate = 60;

export const metadata = {
  title: 'BeckYards Landscaping & Design',
  description: 'Professional landscaping — mowing, mulching, bed redesign, planting, and seasonal cleanups.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <PromoBar />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
