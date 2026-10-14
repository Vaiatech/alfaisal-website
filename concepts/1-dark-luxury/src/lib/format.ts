// Ornamental indexes: Arabic-Indic numerals (set in Naskh) on the Arabic site, Latin numerals on the English one.
export const ar = (n: number) => String(n).padStart(2, '0').replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
export const idx = (n: number, lang: 'ar' | 'en' = 'ar') => (lang === 'en' ? String(n).padStart(2, '0') : ar(n));