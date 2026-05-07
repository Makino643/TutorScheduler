import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";

import { Providers } from "@/components/providers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "@/lib/i18n";
import "./globals.css";

/** Inter is reliable when Google Fonts is reachable; variable name matches `globals.css`. */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TutorFlow",
  description: "1-on-1 tutor scheduler",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const localeValue = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeValue) ? localeValue : DEFAULT_LOCALE;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var root=document.documentElement;var tk='tutorflow-theme';var tv=localStorage.getItem(tk);root.classList.remove('theme-neo-dark','theme-neo-light');if(tv==='neo-dark'){root.classList.add('theme-neo-dark','dark');}else if(tv==='neo-light'){root.classList.add('theme-neo-light');root.classList.remove('dark');}else if(tv==='dark'){root.classList.add('dark');}else if(tv==='light'){root.classList.remove('dark');}else{var d=window.matchMedia('(prefers-color-scheme: dark)').matches;root.classList.toggle('dark',d);}var lk='tutorflow-locale';var lv=localStorage.getItem(lk);if(lv==='en'||lv==='zh'){document.cookie=lk+'='+lv+'; path=/; max-age=31536000; samesite=lax';root.setAttribute('lang',lv);} }catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
