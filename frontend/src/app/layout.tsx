import type { Metadata } from "next";
import "./globals.css";
import "../index.css";
import { AuthProvider } from "../contexts/AuthContext";

// Use system font fallbacks to bypass offline build network failures
const geistSans = { variable: "font-sans" };
const geistMono = { variable: "font-mono" };

export const metadata: Metadata = {
  title: "AAkar - AI-Powered Civic Intelligence",
  description: "Secure, booth-level predictive risk analytics and decision-support knowledge graph.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏛️</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
