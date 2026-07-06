export const site = {
  name: "Yongzhe Wang",
  secondaryName: "Wang Yongzhe",
  // Terminal prompt identity used in the header breadcrumb and boot sequence.
  handle: "ryan@wang",
  title: "Yongzhe Wang",
  description: "Academic homepage, course notes, and paper reading notes by Yongzhe Wang.",
  url: "https://ryanw0608.github.io/HomePage/"
};

export type ContentLanguage = "zh" | "en" | "mixed";
export type PrimaryLanguage = "zh" | "en";

export function htmlLang(language: ContentLanguage, primaryLanguage?: PrimaryLanguage): "zh-CN" | "en" {
  if (language === "zh") return "zh-CN";
  if (language === "en") return "en";
  return primaryLanguage === "zh" ? "zh-CN" : "en";
}

export function absoluteUrl(pathname: string): string {
  return new URL(pathname.replace(/^\//, ""), site.url).toString();
}
