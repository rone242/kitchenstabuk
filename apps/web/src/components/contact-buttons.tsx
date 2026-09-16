import { Phone } from "lucide-react";
import { translate, type Locale } from "@repo/i18n";
import { whatsappLink } from "@/lib/catalogue";

export function ContactButtons({
  phone,
  whatsapp,
  locale,
  serviceName,
  className,
}: {
  phone?: string;
  whatsapp?: string;
  locale: Locale;
  serviceName?: string;
  className?: string;
}) {
  const number = (phone ?? "").replace(/[^\d+]/g, "");
  const chat = (whatsapp ?? "").replace(/\D/g, "");
  if (!number && !chat) return null;
  return (
    <div className={`contact-buttons${className ? ` ${className}` : ""}`}>
      {number && (
        <a
          className="contact-icon-button contact-phone"
          href={`tel:${number}`}
          aria-label={translate(locale, "اتصل الآن")}
          title={translate(locale, "اتصل الآن")}
        >
          <Phone size={21} aria-hidden="true" />
        </a>
      )}
      {chat && (
        <a
          className="contact-icon-button contact-whatsapp"
          href={
            serviceName
              ? whatsappLink(chat, serviceName, locale)
              : `https://wa.me/${chat}`
          }
          target="_blank"
          rel="noopener noreferrer"
          aria-label={translate(locale, "تواصل عبر واتساب")}
          title={translate(locale, "تواصل عبر واتساب")}
        >
          <svg
            width="23"
            height="23"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20.4 3.6A11 11 0 0 0 3.1 16.8L1.5 22.5l5.9-1.6A11 11 0 0 0 20.4 3.6Z" />
            <path d="M8 6.5c-.4-.3-1-.2-1.3.2-1 1.2-.7 3.3 1 5.5 1.7 2.3 4.5 4.2 6.5 4.4 1.3.1 2.2-.7 2.6-1.6.2-.4.1-.7-.3-.9l-2.1-1c-.4-.2-.6-.1-.8.2l-.8 1c-1.5-.6-3.2-2-3.9-3.5l.8-1c.2-.3.2-.5.1-.8Z" />
          </svg>
        </a>
      )}
    </div>
  );
}
