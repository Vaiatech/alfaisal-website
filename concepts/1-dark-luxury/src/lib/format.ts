// Arabic-Indic numerals in Naskh are used only as ornamental indexes.
export const ar = (n: number) => String(n).padStart(2, '0').replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
