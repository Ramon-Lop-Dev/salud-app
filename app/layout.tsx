// app/layout.tsx
import './globals.css';
import PwaRegistration from './pwa-registration';

export const metadata = {
  title: "Salud Mayor Móvil",
  description: "Aplicación de salud para adultos mayores",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
};

export const viewport = {
  themeColor: "#1f4e79",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full bg-surface">
      <body className="flex flex-col min-h-screen text-on-surface font-body-md">
        <PwaRegistration />
        {children}
      </body>
    </html>
  );
}
