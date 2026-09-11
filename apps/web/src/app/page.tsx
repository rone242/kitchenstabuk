import Link from "next/link";
import { ArrowUpLeft, MapPin, Wrench } from "lucide-react";
import { catalogueFetch, Options, price, Service } from "@/lib/catalogue";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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
  let failed = false;
  try {
    const [choices, services] = await Promise.all([
      catalogueFetch<Options>("options"),
      catalogueFetch<{
        data: Service[];
        meta: { total: number; totalPages: number };
      }>(`services?${filters}`),
    ]);
    options = choices ?? options;
    result = services;
  } catch {
    failed = true;
  }
  const page = Number(filters.get("page") ?? 1);
  function pageUrl(next: number) {
    const query = new URLSearchParams(filters);
    query.set("page", String(next));
    return `/?${query}#services`;
  }
  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/">
          خدماتك<span>الخدمات المحلية، أقرب إليك</span>
        </Link>
        <a href="#services" className="nav-link">
          استكشف الخدمات <ArrowUpLeft size={18} />
        </a>
      </header>
      <main>
        <section className="hero">
          <div className="hero-inner">
            <span className="eyebrow">
              <MapPin size={16} /> خدمات محلية في السعودية
            </span>
            <h1>
              كل ما يحتاجه منزلك،
              <br />
              <em>يبدأ من هنا.</em>
            </h1>
            <p>
              اكتشف الخدمات المتاحة في مدينتك، وتعرّف على تفاصيلها وأسعارها في
              مكان واحد.
            </p>
            <a className="primary-button" href="#services">
              ابحث عن خدمتك <ArrowUpLeft size={20} />
            </a>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="roof" />
            <div className="house">
              <Wrench size={70} strokeWidth={1.2} />
              <span>عناية بكل التفاصيل</span>
            </div>
          </div>
        </section>
        <section id="services" className="catalogue">
          <div className="section-heading">
            <div>
              <span className="eyebrow">دليل الخدمات</span>
              <h2>كيف نقدر نساعدك؟</h2>
            </div>
            <p>اختر مدينتك للعثور على الخدمات المتاحة بالقرب منك.</p>
          </div>
          <form className="filters" action="/#services">
            <label>
              ابحث عن خدمة
              <input
                name="search"
                defaultValue={filters.get("search") ?? ""}
                placeholder="مثلاً: صيانة المطابخ"
                maxLength={120}
              />
            </label>
            <label>
              المدينة
              <select name="cityId" defaultValue={filters.get("cityId") ?? ""}>
                <option value="">كل المدن</option>
                {options.cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.nameAr}
                  </option>
                ))}
              </select>
            </label>
            <label>
              التصنيف
              <select
                name="categoryId"
                defaultValue={filters.get("categoryId") ?? ""}
              >
                <option value="">كل التصنيفات</option>
                {options.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.nameAr}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-button">عرض الخدمات</button>
          </form>
          {failed ? (
            <div className="empty" role="alert">
              <h3>تعذر تحميل الخدمات الآن</h3>
              <p>يرجى المحاولة مرة أخرى بعد قليل.</p>
              <Link href="/">إعادة المحاولة</Link>
            </div>
          ) : !result?.data.length ? (
            <div className="empty">
              <h3>لا توجد خدمات مطابقة حالياً</h3>
              <p>جرّب مدينة أو تصنيفاً آخر.</p>
              <Link href="/">عرض كل الخدمات</Link>
            </div>
          ) : (
            <>
              <p className="result-count">{result.meta.total} خدمة</p>
              <div className="service-grid">
                {result.data.map((service) => (
                  <article className="service-card" key={service.id}>
                    <div className="service-icon">
                      <Wrench size={26} />
                    </div>
                    <span className="category-name">
                      {service.category.nameAr}
                    </span>
                    <h3>
                      <Link href={`/services/${service.slug}`}>
                        {service.nameAr}
                      </Link>
                    </h3>
                    <p>{service.summary}</p>
                    <div className="card-bottom">
                      <span>{price(service)}</span>
                      <Link
                        aria-label={`تفاصيل ${service.nameAr}`}
                        href={`/services/${service.slug}`}
                      >
                        <ArrowUpLeft size={22} />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
              <nav className="pagination" aria-label="صفحات الخدمات">
                {page > 1 && <Link href={pageUrl(page - 1)}>السابق</Link>}
                <span>الصفحة {page}</span>
                {page < result.meta.totalPages && (
                  <Link href={pageUrl(page + 1)}>التالي</Link>
                )}
              </nav>
            </>
          )}
        </section>
      </main>
      <footer>خدماتك — دليل الخدمات المحلية في السعودية</footer>
    </>
  );
}
