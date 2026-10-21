export function toWhatsAppLink(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  const digits = value.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}`;
}

// A diferencia de toWhatsAppLink (abre el chat vacío), esta arma el link
// con el mensaje ya cargado — el admin solo tiene que apretar enviar en
// WhatsApp Web.
export function toWhatsAppMessageLink(phone: string, text: string) {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function toInstagramLink(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  const handle = value.replace(/^@/, "");
  return `https://instagram.com/${handle}`;
}

export function toFacebookLink(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  const handle = value.replace(/^@/, "");
  return `https://facebook.com/${handle}`;
}

export function toYoutubeLink(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  const handle = value.replace(/^@/, "");
  return `https://youtube.com/@${handle}`;
}
