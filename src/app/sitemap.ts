import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: "https://urbi.com.ar", lastModified, changeFrequency: "weekly", priority: 1 },
    { url: "https://urbi.com.ar/registro", lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: "https://urbi.com.ar/demo", lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: "https://urbi.com.ar/revendedores", lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: "https://urbi.com.ar/preguntas-frecuentes", lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: "https://urbi.com.ar/terminos", lastModified, changeFrequency: "monthly", priority: 0.3 },
    { url: "https://urbi.com.ar/privacidad", lastModified, changeFrequency: "monthly", priority: 0.3 },
  ];
}
