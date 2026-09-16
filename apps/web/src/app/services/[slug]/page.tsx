import { ContactButtons } from "@/components/contact-buttons";
import { getI18n } from "@/lib/locale";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Clock3 } from "lucide-react";
import { notFound } from "next/navigation";
import { catalogueFetch, HomeContent, price, Service } from "@/lib/catalogue";

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { t, locale } = await getI18n();

  const { slug } = await params;
  let service: Service | null;
  try {
    service = await catalogueFetch<Service>(
      `services/${encodeURIComponent(slug)}`,
      locale,
    );
  } catch {
    return (
      <main className="catalogue empty">
        <h1>{t("تعذر تحميل الخدمة الآن")}</h1>
        <p>{t("يرجى المحاولة مرة أخرى بعد قليل.")}</p>
        <Link href={`/${locale}`}>{t("العودة إلى الخدمات")}</Link>
      </main>
    );
  }
  if (!service) notFound();
  const homeContent = await catalogueFetch<HomeContent>(
    "homepage",
    locale,
  ).catch(() => null);
  const phone = homeContent?.settings["contact.phone"];
  const whatsapp = homeContent?.settings["contact.whatsapp"];
  return (
    <main className="service-detail">
      <section className="service-detail-hero">
        <div className="service-hero-copy">
          <span className="eyebrow">{service.category.name}</span>
          <h1>{service.name}</h1>
          <p className="lead">{service.summary}</p>
          <div className="service-quick-info">
            <strong>{price(service, locale)}</strong>
            {service.durationText ? (
              <span>
                <Clock3 size={16} /> {service.durationText}
              </span>
            ) : null}
          </div>
        </div>
        {service.coverImage?.publicUrl ? (
          <div className="service-cover">
            <Image
              src={service.coverImage.publicUrl}
              alt={
                (locale === "en"
                  ? service.coverImage.altTextEn
                  : service.coverImage.altTextAr) || service.name
              }
              width={service.coverImage.width || 900}
              height={service.coverImage.height || 650}
              unoptimized
              priority
            />
          </div>
        ) : (
          <div className="service-cover service-cover-placeholder">
            <CheckCircle2 size={64} strokeWidth={1.25} />
          </div>
        )}
      </section>
      <div className="service-content-grid">
        <div className="service-main-copy">
          <section className="detail-panel">
            <h2>{t("عن الخدمة")}</h2>
            <p className="description">{service.description}</p>
          </section>
          {service.benefits.length > 0 ? (
            <section className="detail-panel">
              <h2>{t("مميزات الخدمة")}</h2>
              <ul className="benefit-list">
                {service.benefits.map((item, index) => (
                  <li key={index}>
                    <CheckCircle2 size={19} /> {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {service.processSteps.length > 0 ? (
            <section className="detail-panel">
              <h2>{t("خطوات التنفيذ")}</h2>
              <ol className="process-list">
                {service.processSteps.map((item, index) => (
                  <li key={index}>
                    <span>
                      {new Intl.NumberFormat(locale).format(index + 1)}
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
        <aside className="booking-card">
          <span>{t("ابدأ طلبك اليوم")}</span>
          <h2>{t("هل تحتاج هذه الخدمة؟")}</h2>
          <p>{t("تواصل معنا وسنساعدك في تأكيد التفاصيل والموعد.")}</p>
          <strong>{price(service, locale)}</strong>
          <ContactButtons
            phone={phone}
            whatsapp={whatsapp}
            locale={locale}
            serviceName={service.name}
          />
          <small>{t("عادةً نرد خلال وقت قصير.")}</small>
        </aside>
      </div>
      {service.gallery.some((item) => item.media.publicUrl) ? (
        <section className="service-gallery">
          <div>
            <span className="eyebrow">{t("معرض الخدمة")}</span>
            <h2>{t("صور من أعمال الخدمة")}</h2>
          </div>
          <div className="service-gallery-track">
            {service.gallery.map(({ media }, index) =>
              media.publicUrl ? (
                <Image
                  key={index}
                  src={media.publicUrl}
                  alt={
                    (locale === "en" ? media.altTextEn : media.altTextAr) ||
                    service.name
                  }
                  width={media.width || 720}
                  height={media.height || 480}
                  unoptimized
                />
              ) : null,
            )}
          </div>
        </section>
      ) : null}
      <Link className="back-services-link" href={`/${locale}#services`}>
        {t("تصفح خدمات أخرى")}
      </Link>
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { locale } = await getI18n();
  const { slug } = await params;
  const service = await catalogueFetch<Service>(
    `services/${encodeURIComponent(slug)}`,
    locale,
  ).catch(() => null);
  return service
    ? {
        title: service.seoTitle || service.name,
        description: service.seoDescription || service.summary,
      }
    : {};
}
