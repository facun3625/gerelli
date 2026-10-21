import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/registro", "/demo", "/revendedores", "/preguntas-frecuentes", "/terminos", "/privacidad"],
      disallow: ["/admin/", "/platform/", "/registro/", "/socios", "/api/"],
    },
    sitemap: "https://urbi.com.ar/sitemap.xml",
  };
}
