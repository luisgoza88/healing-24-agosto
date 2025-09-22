import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { MotionConfig } from 'framer-motion'

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Healing Forest Admin",
  description: "Panel de administración Healing Forest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} antialiased`}>
        <MotionConfig reducedMotion="user">
          <Providers>
            {children}
          </Providers>
        </MotionConfig>
      </body>
    </html>
  );
}
