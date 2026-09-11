import Link from "next/link";
import { notFound } from "next/navigation";
import { catalogueFetch, price, Service } from "@/lib/catalogue";

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let service: Service | null;
  try {
    service = await catalogueFetch<Service>(
      `services/${encodeURIComponent(slug)}`,
    );
  } catch {
    return (
      <main className="catalogue empty">
        <h1>تعذر تحميل الخدمة الآن</h1>
        <p>يرجى المحاولة مرة أخرى بعد قليل.</p>
        <Link href="/">العودة إلى الخدمات</Link>
      </main>
    );
  }
  if (!service) notFound();
  return (
    <>
      <header className="site-header">
        <Link href="/" className="brand">
          خدماتك
        </Link>
        <Link href="/">جميع الخدمات</Link>
      </header>
      <main className="catalogue detail">
        <span className="eyebrow">{service.category.nameAr}</span>
        <h1>{service.nameAr}</h1>
        <p className="lead">{service.summary}</p>
        <div className="price-panel">
          {price(service)}
          {service.durationText && <span>المدة: {service.durationText}</span>}
        </div>
        <h2>عن الخدمة</h2>
        <p className="description">{service.description}</p>
        {service.benefits.length > 0 && (
          <>
            <h2>مميزات الخدمة</h2>
            <ul>
              {service.benefits.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </>
        )}
        {service.processSteps.length > 0 && (
          <>
            <h2>خطوات التنفيذ</h2>
            <ol>
              {service.processSteps.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ol>
          </>
        )}
        <Link className="primary-button" href="/">
          تصفح خدمات أخرى
        </Link>
      </main>
    </>
  );
}
