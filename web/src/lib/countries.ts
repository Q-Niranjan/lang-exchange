export type Country = {
  code: string;
  name: string;
  dial: string;
};

/** ISO2 → flag emoji */
export function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export const COUNTRIES: Country[] = [
  { code: "IN", name: "India", dial: "91" },
  { code: "US", name: "United States", dial: "1" },
  { code: "GB", name: "United Kingdom", dial: "44" },
  { code: "CA", name: "Canada", dial: "1" },
  { code: "AU", name: "Australia", dial: "61" },
  { code: "AE", name: "United Arab Emirates", dial: "971" },
  { code: "SA", name: "Saudi Arabia", dial: "966" },
  { code: "SG", name: "Singapore", dial: "65" },
  { code: "MY", name: "Malaysia", dial: "60" },
  { code: "PK", name: "Pakistan", dial: "92" },
  { code: "BD", name: "Bangladesh", dial: "880" },
  { code: "NP", name: "Nepal", dial: "977" },
  { code: "LK", name: "Sri Lanka", dial: "94" },
  { code: "DE", name: "Germany", dial: "49" },
  { code: "FR", name: "France", dial: "33" },
  { code: "ES", name: "Spain", dial: "34" },
  { code: "IT", name: "Italy", dial: "39" },
  { code: "PT", name: "Portugal", dial: "351" },
  { code: "NL", name: "Netherlands", dial: "31" },
  { code: "BE", name: "Belgium", dial: "32" },
  { code: "CH", name: "Switzerland", dial: "41" },
  { code: "AT", name: "Austria", dial: "43" },
  { code: "SE", name: "Sweden", dial: "46" },
  { code: "NO", name: "Norway", dial: "47" },
  { code: "DK", name: "Denmark", dial: "45" },
  { code: "FI", name: "Finland", dial: "358" },
  { code: "PL", name: "Poland", dial: "48" },
  { code: "RU", name: "Russia", dial: "7" },
  { code: "UA", name: "Ukraine", dial: "380" },
  { code: "TR", name: "Turkey", dial: "90" },
  { code: "EG", name: "Egypt", dial: "20" },
  { code: "ZA", name: "South Africa", dial: "27" },
  { code: "NG", name: "Nigeria", dial: "234" },
  { code: "KE", name: "Kenya", dial: "254" },
  { code: "BR", name: "Brazil", dial: "55" },
  { code: "MX", name: "Mexico", dial: "52" },
  { code: "AR", name: "Argentina", dial: "54" },
  { code: "CO", name: "Colombia", dial: "57" },
  { code: "CL", name: "Chile", dial: "56" },
  { code: "PE", name: "Peru", dial: "51" },
  { code: "JP", name: "Japan", dial: "81" },
  { code: "KR", name: "South Korea", dial: "82" },
  { code: "CN", name: "China", dial: "86" },
  { code: "HK", name: "Hong Kong", dial: "852" },
  { code: "TW", name: "Taiwan", dial: "886" },
  { code: "TH", name: "Thailand", dial: "66" },
  { code: "VN", name: "Vietnam", dial: "84" },
  { code: "ID", name: "Indonesia", dial: "62" },
  { code: "PH", name: "Philippines", dial: "63" },
  { code: "NZ", name: "New Zealand", dial: "64" },
  { code: "IE", name: "Ireland", dial: "353" },
  { code: "IL", name: "Israel", dial: "972" },
  { code: "QA", name: "Qatar", dial: "974" },
  { code: "KW", name: "Kuwait", dial: "965" },
  { code: "OM", name: "Oman", dial: "968" },
  { code: "BH", name: "Bahrain", dial: "973" },
  { code: "JO", name: "Jordan", dial: "962" },
  { code: "LB", name: "Lebanon", dial: "961" },
  { code: "IQ", name: "Iraq", dial: "964" },
  { code: "IR", name: "Iran", dial: "98" },
  { code: "AF", name: "Afghanistan", dial: "93" },
  { code: "MM", name: "Myanmar", dial: "95" },
  { code: "KH", name: "Cambodia", dial: "855" },
  { code: "LA", name: "Laos", dial: "856" },
  { code: "GR", name: "Greece", dial: "30" },
  { code: "CZ", name: "Czech Republic", dial: "420" },
  { code: "RO", name: "Romania", dial: "40" },
  { code: "HU", name: "Hungary", dial: "36" },
  { code: "SK", name: "Slovakia", dial: "421" },
  { code: "BG", name: "Bulgaria", dial: "359" },
  { code: "HR", name: "Croatia", dial: "385" },
  { code: "RS", name: "Serbia", dial: "381" },
  { code: "SI", name: "Slovenia", dial: "386" },
  { code: "LT", name: "Lithuania", dial: "370" },
  { code: "LV", name: "Latvia", dial: "371" },
  { code: "EE", name: "Estonia", dial: "372" },
  { code: "IS", name: "Iceland", dial: "354" },
  { code: "LU", name: "Luxembourg", dial: "352" },
  { code: "MT", name: "Malta", dial: "356" },
  { code: "CY", name: "Cyprus", dial: "357" },
  { code: "MA", name: "Morocco", dial: "212" },
  { code: "DZ", name: "Algeria", dial: "213" },
  { code: "TN", name: "Tunisia", dial: "216" },
  { code: "GH", name: "Ghana", dial: "233" },
  { code: "ET", name: "Ethiopia", dial: "251" },
  { code: "TZ", name: "Tanzania", dial: "255" },
  { code: "UG", name: "Uganda", dial: "256" },
  { code: "ZW", name: "Zimbabwe", dial: "263" },
  { code: "EC", name: "Ecuador", dial: "593" },
  { code: "VE", name: "Venezuela", dial: "58" },
  { code: "UY", name: "Uruguay", dial: "598" },
  { code: "PY", name: "Paraguay", dial: "595" },
  { code: "BO", name: "Bolivia", dial: "591" },
  { code: "CR", name: "Costa Rica", dial: "506" },
  { code: "PA", name: "Panama", dial: "507" },
  { code: "DO", name: "Dominican Republic", dial: "1" },
  { code: "PR", name: "Puerto Rico", dial: "1" },
  { code: "JM", name: "Jamaica", dial: "1" },
  { code: "KZ", name: "Kazakhstan", dial: "7" },
  { code: "UZ", name: "Uzbekistan", dial: "998" },
  { code: "AZ", name: "Azerbaijan", dial: "994" },
  { code: "GE", name: "Georgia", dial: "995" },
  { code: "AM", name: "Armenia", dial: "374" },
  { code: "BY", name: "Belarus", dial: "375" },
  { code: "MD", name: "Moldova", dial: "373" },
  { code: "AL", name: "Albania", dial: "355" },
  { code: "MK", name: "North Macedonia", dial: "389" },
  { code: "BA", name: "Bosnia and Herzegovina", dial: "387" },
  { code: "ME", name: "Montenegro", dial: "382" },
  { code: "XK", name: "Kosovo", dial: "383" },
  { code: "MN", name: "Mongolia", dial: "976" },
  { code: "BN", name: "Brunei", dial: "673" },
  { code: "MV", name: "Maldives", dial: "960" },
  { code: "BT", name: "Bhutan", dial: "975" },
];

const byCode = new Map(COUNTRIES.map((c) => [c.code, c]));
const byDialLength = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);

const TZ_TO_COUNTRY: Record<string, string> = {
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Toronto": "CA",
  "Europe/London": "GB",
  "Europe/Paris": "FR",
  "Europe/Berlin": "DE",
  "Europe/Madrid": "ES",
  "Europe/Rome": "IT",
  "Europe/Amsterdam": "NL",
  "Asia/Dubai": "AE",
  "Asia/Singapore": "SG",
  "Asia/Tokyo": "JP",
  "Asia/Seoul": "KR",
  "Asia/Shanghai": "CN",
  "Australia/Sydney": "AU",
  "Pacific/Auckland": "NZ",
  "Asia/Karachi": "PK",
  "Asia/Dhaka": "BD",
  "Asia/Kathmandu": "NP",
  "Asia/Colombo": "LK",
  "America/Sao_Paulo": "BR",
  "America/Mexico_City": "MX",
};

export function getCountry(code: string): Country {
  return byCode.get(code) ?? COUNTRIES[0];
}

/** Guess country from browser timezone / locale. */
export function detectCountryCode(): string {
  if (typeof window === "undefined") return "IN";
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TZ_TO_COUNTRY[tz]) return TZ_TO_COUNTRY[tz];
  } catch {
    /* ignore */
  }
  const lang = navigator.language ?? "";
  const region = lang.split("-")[1]?.toUpperCase();
  if (region && byCode.has(region)) return region;
  return "IN";
}

export function formatE164(country: Country, nationalDigits: string): string {
  const digits = nationalDigits.replace(/\D/g, "");
  if (!digits) return "";
  return `+${country.dial}${digits}`;
}

/** Parse +919876543210 → country + national digits */
export function parsePhoneNumber(raw: string): { country: Country; national: string } {
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (!cleaned || cleaned === "+") {
    return { country: getCountry(detectCountryCode()), national: "" };
  }

  const digits = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;

  if (cleaned.startsWith("+") || digits.length > 10) {
    for (const c of byDialLength) {
      if (digits.startsWith(c.dial)) {
        return { country: c, national: digits.slice(c.dial.length) };
      }
    }
  }

  return { country: getCountry(detectCountryCode()), national: digits.replace(/^0+/, "") };
}

export const POPULAR_CODES = ["IN", "US", "GB", "CA", "AU", "AE", "SG", "DE", "FR", "JP"];

export function sortedCountries(query: string): Country[] {
  const q = query.trim().toLowerCase();
  const list = q
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.dial.includes(q) ||
          c.code.toLowerCase().includes(q),
      )
    : COUNTRIES;

  return [...list].sort((a, b) => {
    const aPop = POPULAR_CODES.indexOf(a.code);
    const bPop = POPULAR_CODES.indexOf(b.code);
    if (aPop !== -1 || bPop !== -1) {
      if (aPop === -1) return 1;
      if (bPop === -1) return -1;
      return aPop - bPop;
    }
    return a.name.localeCompare(b.name);
  });
}
