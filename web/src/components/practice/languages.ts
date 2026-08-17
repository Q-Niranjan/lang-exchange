export type Language = {
  code: string;
  name: string;
  flag: string;
  hello: string;
};

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", flag: "🇬🇧", hello: "Hello" },
  { code: "es", name: "Spanish", flag: "🇪🇸", hello: "Hola" },
  { code: "fr", name: "French", flag: "🇫🇷", hello: "Bonjour" },
  { code: "de", name: "German", flag: "🇩🇪", hello: "Hallo" },
  { code: "hi", name: "Hindi", flag: "🇮🇳", hello: "नमस्ते" },
  { code: "ja", name: "Japanese", flag: "🇯🇵", hello: "こんにちは" },
  { code: "ko", name: "Korean", flag: "🇰🇷", hello: "안녕하세요" },
  { code: "zh", name: "Chinese", flag: "🇨🇳", hello: "你好" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹", hello: "Olá" },
  { code: "ar", name: "Arabic", flag: "🇸🇦", hello: "مرحبا" },
  { code: "ta", name: "Tamil", flag: "🇮🇳", hello: "வணக்கம்" },
  { code: "te", name: "Telugu", flag: "🇮🇳", hello: "నமస్కారం" },
  { code: "bn", name: "Bengali", flag: "🇧🇩", hello: "হ্যালো" },
  { code: "it", name: "Italian", flag: "🇮🇹", hello: "Ciao" },
];

export const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
export type Level = (typeof LEVELS)[number];

export const HELLO_WORDS = LANGUAGES.map((l) => l.hello);

export function languageByCode(code: string) {
  return LANGUAGES.find((l) => l.code === code);
}

export function languageLabel(code?: string) {
  const lang = code ? languageByCode(code) : undefined;
  if (!lang) return "Partner";
  return `${lang.flag} ${lang.name}`;
}

export function initials(name: string) {
  const parts = name.replace(/[_-]+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "P";
}

export function displayName(username: string) {
  const cleaned = username.replace(/[_-]+/g, " ").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${capitalize(parts[0])} ${parts[1][0].toUpperCase()}.`;
  }
  return capitalize(cleaned || "Partner");
}

function capitalize(value: string) {
  if (!value) return value;
  return value[0].toUpperCase() + value.slice(1);
}

export const PROMPTS = [
  "Try asking: what did they do last weekend?",
  "Ask about their favorite local food.",
  "Ask what music they've been listening to.",
  "Ask about a place they'd love to visit.",
];

export const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500";
