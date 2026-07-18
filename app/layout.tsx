import type { Metadata } from "next";

import AuthProvider from "@/components/providers/session-provider";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

import "./globals.css";

export const metadata: Metadata = {
  title:
    "IJKRI | International Journal of Knowledge, Research and Innovation",
  description:
    "Official publishing platform of Innovare Academic Publishing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        <AuthProvider>
          <Header />

          <main className="flex-1">
            {children}
          </main>

          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}