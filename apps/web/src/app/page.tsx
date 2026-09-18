import { ContactButtons } from "@/components/contact-buttons";
import { getSiteSettings } from "@/lib/site-settings";
import { HeroSlider } from "@/components/hero-slider";
import { ReviewForm } from "@/components/review-form";
import { getI18n } from "@/lib/locale";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpLeft, Clock3, MapPin, Quote, Star, Wrench } from "lucide-react";
import {
  catalogueFetch,
  HomeContent,
  Options,
  price,
  Service,
} from "@/lib/catalogue";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { t, locale } = await getI18n();

  const input = await searchParams;
  const filters = new URLSearchParams();
  for (const key of ["search", "cityId", "categoryId", "page"]) {
    if (typeof input[key] === "string" && input[key])
      filters.set(key, input[key]);
  }
  filters.set("pageSize", "12");
  let options: Options = { categories: [], cities: [] };
  let result: {
    data: Service[];
    meta: { total: number; totalPages: number };
  } | null = null;
  let homeContent: HomeContent = { portfolio: [], reviews: [], settings: {} };
  const [choices, services, content, siteSettings] = await Promise.allSettled([
    catalogueFetch<Options>("options", locale),
    catalogueFetch<{
      data: Service[];
      meta: { total: number; totalPages: number };
    }>(`services?${filters}`, locale),
    catalogueFetch<HomeContent>("homepage", locale),
    getSiteSettings(locale),
  ]);
  if (choices.status === "fulfilled") options = choices.value ?? options;
  if (services.status === "fulfilled") result = services.value;
  if (content.status === "fulfilled")
    homeContent = content.value ?? homeContent;
  const settings =
    siteSettings.status === "fulfilled" ? siteSettings.value : {};
  const failed = services.status === "rejected" || result === null;
  for (const [endpoint, response] of [
    ["options", choices],
    ["services", services],
    ["homepage", content],
  ] as const) {
    if (response.status === "rejected")
      console.error(`Catalogue ${endpoint} request failed`, response.reason);
  }
  const page = Number(filters.get("page") ?? 1);
  function pageUrl(next: number) {
    const query = new URLSearchParams(filters);
    query.set("page", String(next));
    return `/${locale}?${query}#services`;
  }
  return (
    <>
      <main>
        <section
          className="hero"
          style={
            settings.heroBackground?.publicUrl
              ? {
                  backgroundImage: `linear-gradient(#bdd7cf, rgb(233 238 229 / .65)), url("${settings.heroBackground.publicUrl}")`,
                }
              : undefined
          }
        >
          <div className="hero-inner">
            <Link
              className="eyebrow hero-location-link"
              href="#office-location"
            >
              <MapPin size={16} />
              {(locale === "en"
                ? settings.locationTitleEn
                : settings.locationTitleAr) || t("خدمات محلية في السعودية")}
            </Link>
            <h1>
              {t("كل ما يحتاجه منزلك،")}
              <br />
              <em>{t("يبدأ من هنا.")}</em>
            </h1>
            <p>
              {t(
                "اكتشف الخدمات المتاحة في مدينتك، وتعرّف على تفاصيلها وأسعارها في مكان واحد.",
              )}
            </p>
            <a className="primary-button" href="#services">
              {t("ابحث عن خدمتك")}
              <ArrowUpLeft size={20} />
            </a>
          </div>
          {settings.slides?.length ? (
            <HeroSlider slides={settings.slides} />
          ) : settings.heroArt?.publicUrl ? (
            <div className="hero-art hero-art-image" aria-hidden="true">
              <Image
                src={settings.heroArt.publicUrl}
                alt=""
                fill
                sizes="(max-width: 800px) 70vw, 300px"
                unoptimized
              />
            </div>
          ) : (
            <div className="hero-art" aria-hidden="true">
              <div className="roof" />
              <div className="house">
                <Wrench size={70} strokeWidth={1.2} />
                <span>{t("عناية بكل التفاصيل")}</span>
              </div>
            </div>
          )}
        </section>
        <section id="services" className="catalogue">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t("دليل الخدمات")}</span>
              <h2>{t("كيف نقدر نساعدك؟")}</h2>
            </div>
            <p>{t("اختر مدينتك للعثور على الخدمات المتاحة بالقرب منك.")}</p>
          </div>
          <form className="filters" action={`/${locale}#services`}>
            <label>
              {t("ابحث عن خدمة")}
              <input
                name="search"
                defaultValue={filters.get("search") ?? ""}
                placeholder={t("مثلاً: صيانة المطابخ")}
                maxLength={120}
              />
            </label>
            <label>
              {t("المدينة")}
              <select name="cityId" defaultValue={filters.get("cityId") ?? ""}>
                <option value="">{t("كل المدن")}</option>
                {options.cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("التصنيف")}
              <select
                name="categoryId"
                defaultValue={filters.get("categoryId") ?? ""}
              >
                <option value="">{t("كل التصنيفات")}</option>
                {options.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-button">{t("عرض الخدمات")}</button>
          </form>
          {failed ? (
            <div className="empty" role="alert">
              <h3>{t("تعذر تحميل الخدمات الآن")}</h3>
              <p>{t("يرجى المحاولة مرة أخرى بعد قليل.")}</p>
              <Link href={`/${locale}`}>{t("إعادة المحاولة")}</Link>
            </div>
          ) : !result?.data.length ? (
            <div className="empty">
              <h3>{t("لا توجد خدمات مطابقة حالياً")}</h3>
              <p>{t("جرّب مدينة أو تصنيفاً آخر.")}</p>
              <Link href={`/${locale}`}>{t("عرض كل الخدمات")}</Link>
            </div>
          ) : (
            <>
              <p className="result-count">
                {new Intl.NumberFormat(locale).format(result.meta.total)}{" "}
                {t("خدمة")}
              </p>
              <div className="service-grid">
                {result.data.map((service) => (
                  <article className="service-card" key={service.id}>
                    <Link
                      className="service-card-image"
                      href={`/${locale}/services/${service.slug}`}
                      aria-label={service.name}
                    >
                      {service.coverImage?.publicUrl ? (
                        <Image
                          src={service.coverImage.publicUrl}
                          alt={
                            (locale === "en"
                              ? service.coverImage.altTextEn
                              : service.coverImage.altTextAr) || service.name
                          }
                          fill
                          sizes="(max-width: 520px) 100vw, (max-width: 800px) 50vw, 33vw"
                          unoptimized
                        />
                      ) : (
                        <Wrench size={48} aria-hidden="true" />
                      )}
                    </Link>
                    <span className="category-name">
                      {service.category.name}
                    </span>
                    <h3>
                      <Link href={`/${locale}/services/${service.slug}`}>
                        {service.name}
                      </Link>
                    </h3>
                    <p>{service.summary}</p>
                    <div className="card-bottom">
                      <span>{price(service, locale)}</span>
                    </div>
                    <div className="card-actions">
                      <Link
                        className="card-book-button"
                        href={`/${locale}/services/${service.slug}`}
                      >
                        {t("احجز الآن")}
                      </Link>
                      <ContactButtons
                        phone={homeContent.settings["contact.phone"]}
                        whatsapp={homeContent.settings["contact.whatsapp"]}
                        locale={locale}
                        serviceName={service.name}
                      />
                    </div>
                  </article>
                ))}
              </div>
              <nav className="pagination" aria-label={t("صفحات الخدمات")}>
                {page > 1 && (
                  <Link href={pageUrl(page - 1)}>{t("السابق")}</Link>
                )}
                <span>
                  {t("الصفحة")} {new Intl.NumberFormat(locale).format(page)}
                </span>
                {page < result.meta.totalPages && (
                  <Link href={pageUrl(page + 1)}>{t("التالي")}</Link>
                )}
              </nav>
            </>
          )}
        </section>
        {homeContent.portfolio.length > 0 ? (
          <section id="recent-work" className="showcase-section">
            <div className="section-heading showcase-heading">
              <div>
                <span className="eyebrow">{t("أعمال أنجزناها مؤخراً")}</span>
                <h2>{t("نتائج يمكنك رؤيتها")}</h2>
              </div>
              <p>{t("نماذج من الخدمات التي نُفذت بعناية لعملائنا.")}</p>
            </div>
            <div className="portfolio-grid">
              {homeContent.portfolio.map((item) => (
                <Link
                  className="portfolio-card"
                  key={item.id}
                  href={`/${locale}/projects/${item.id}`}
                >
                  <div className="portfolio-image">
                    {item.image?.publicUrl ? (
                      <Image
                        src={item.image.publicUrl}
                        alt={
                          (locale === "en"
                            ? item.image.altTextEn
                            : item.image.altTextAr) || item.titleAr
                        }
                        width={item.image.width || 720}
                        height={item.image.height || 480}
                        unoptimized
                      />
                    ) : (
                      <Wrench size={38} strokeWidth={1.4} />
                    )}
                  </div>
                  <div className="portfolio-copy">
                    <span>{item.serviceName}</span>
                    <h3>{item.titleAr}</h3>
                    {item.description ? <p>{item.description}</p> : null}
                    {item.cityName ? (
                      <small>
                        <MapPin size={14} /> {item.cityName}
                      </small>
                    ) : null}
                  </div>
                  <span className="portfolio-view-link">
                    {t("عرض تفاصيل المشروع")} <ArrowUpLeft size={16} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
        {homeContent.reviews.length > 0 ? (
          <section id="reviews" className="reviews-section">
            <div className="reviews-intro">
              <span className="eyebrow">{t("آراء العملاء")}</span>
              <h2>{t("ثقة بُنيت على خدمة واضحة")}</h2>
              <p>{t("تجارب حقيقية من عملاء استخدموا خدمات المنصة.")}</p>
            </div>
            <div className="reviews-grid">
              {homeContent.reviews.map((review) => (
                <article className="review-card" key={review.id}>
                  <Quote className="quote-icon" size={30} />
                  <div
                    className="review-stars"
                    aria-label={`${review.rating} / 5`}
                  >
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        key={index}
                        size={15}
                        fill={index < review.rating ? "currentColor" : "none"}
                      />
                    ))}
                  </div>
                  <blockquote>{review.body}</blockquote>
                  <div className="review-author">
                    <span>{review.customerName.slice(0, 1)}</span>
                    <div>
                      <strong>{review.customerName}</strong>
                      {review.cityName ? (
                        <small>{review.cityName}</small>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
        {options.cities.length > 0 ? (
          <section id="locations" className="locations-section">
            <div className="locations-heading">
              <span className="eyebrow">
                <MapPin size={16} /> {t("المواقع")}
              </span>
              <h2>{t("ابحث عن خدمات في مدينتك")}</h2>
              <p>{t("اختر مدينتك لعرض الخدمات المتاحة فيها.")}</p>
            </div>
            <div className="locations-list">
              {options.cities.map((city) => (
                <Link
                  key={city.id}
                  className="location-card"
                  href={`/${locale}?cityId=${city.id}#services`}
                >
                  <MapPin size={20} />
                  <span>{city.name}</span>
                  <ArrowUpLeft size={17} />
                </Link>
              ))}
            </div>
          </section>
        ) : null}
        {Number.isFinite(Number(settings.officeLatitude)) &&
        Number.isFinite(Number(settings.officeLongitude)) ? (
          <section id="office-location" className="office-location-section">
            <div className="office-location-copy">
              <span className="eyebrow">
                <MapPin size={16} /> {t("موقعنا")}
              </span>
              <h2>
                {(locale === "en"
                  ? settings.officeTitleEn
                  : settings.officeTitleAr) || t("زوروا مكتبنا")}
              </h2>
              <p>
                {(locale === "en"
                  ? settings.officeAddressEn
                  : settings.officeAddressAr) ||
                  t("يمكنك العثور علينا بسهولة عبر الخريطة.")}
              </p>
              <a
                className="primary-button"
                href={`https://www.google.com/maps?q=${settings.officeLatitude},${settings.officeLongitude}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("فتح في خرائط Google")} <ArrowUpLeft size={18} />
              </a>
            </div>
            <iframe
              className="office-map"
              title={t("موقع المكتب على الخريطة")}
              src={`https://www.google.com/maps?q=${settings.officeLatitude},${settings.officeLongitude}&z=15&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </section>
        ) : null}
        <ReviewForm locale={locale} />
      </main>
      <footer className="site-footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <strong>{t("خدماتك")}</strong>
            <p>{t("منصة سعودية لطلب الخدمات المحلية بسهولة وثقة")}</p>
          </div>
          <div>
            <h3>{t("روابط سريعة")}</h3>
            <Link href={`/${locale}`}>{t("الرئيسية")}</Link>
            <Link href={`/${locale}#services`}>{t("جميع الخدمات")}</Link>
            <Link href={`/${locale}#reviews`}>{t("آراء العملاء")}</Link>
            <Link href={`/${locale}#office-location`}>{t("موقعنا")}</Link>
          </div>
          <div>
            <h3>{t("تواصل معنا")}</h3>
            <ContactButtons
              phone={homeContent.settings["contact.phone"]}
              whatsapp={homeContent.settings["contact.whatsapp"]}
              locale={locale}
            />
            {homeContent.settings["contact.workingHours"] ? (
              <p className="footer-detail">
                <Clock3 size={15} />
                {homeContent.settings["contact.workingHours"]}
              </p>
            ) : null}
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {t("خدماتك")}.{" "}
            {t("جميع الحقوق محفوظة.")}
          </span>
          <span>{t("خدماتك — دليل الخدمات المحلية في السعودية")}</span>
        </div>
      </footer>
    </>
  );
}
