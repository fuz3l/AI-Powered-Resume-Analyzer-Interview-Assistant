import type { Metadata } from "next";
import "./globals.css";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Candidate Matrix — AI Candidate Evaluation Engine",
  description: "Enterprise candidate matching matrix powered by Gemini AI and PostgreSQL pgvector",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#FBFBFA] text-[#111111] min-h-screen font-sans flex flex-col justify-between selection:bg-[#E1F3FE] selection:text-[#1F6C9F]">
        <div className="flex-1">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
