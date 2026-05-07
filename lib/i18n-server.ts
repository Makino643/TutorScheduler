import { cookies } from "next/headers";

import { DEFAULT_LOCALE, type Locale, LOCALE_COOKIE, isLocale } from "@/lib/i18n";

export async function getServerLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
