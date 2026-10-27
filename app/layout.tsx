import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import "./brand.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Клинический Компас",
  icons: { icon: "/logo.svg?v=brain-tree" },
  description: "Цифровой ассистент для пациентов с тревожно-депрессивной симптоматикой",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${manrope.variable} ${manrope.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
