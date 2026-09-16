import { ContactButtons } from "@/components/contact-buttons";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpLeft, CalendarDays, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { getI18n } from "@/lib/locale";
import { catalogueFetch, HomeContent, ServiceImage } from "@/lib/catalogue";

interface Project {
  id: string;
  titleAr: string;
  description: string | null;
  completedAt: string | null;
  serviceName: string;
  cityName: string | null;
  image: ServiceImage | null;
  beforeImage: ServiceImage | null;
}

function ProjectPhoto({
  image,
  label,
  fallback,
  locale,
}: {
  image: ServiceImage | null;
  label: string;
  fallback: string;
  locale: "ar" | "en";
}) {
  return (
    <figure className="comparison-card">
      <span>{label}</span>
      {image?.publicUrl ? (
        <Image
          src={image.publicUrl}
          alt={
            (locale === "en" ? image.altTextEn : image.altTextAr) || fallback
          }
          width={image.width || 900}
          height={image.height || 650}
          unoptimized
        />
      ) : (
        <div className="comparison-placeholder">{fallback}</div>
      )}
    </figure>
  );
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { locale, t } = await getI18n();
  const [project, home] = await Promise.all([
    catalogueFetch<Project>(`projects/${encodeURIComponent(id)}`, locale),
    catalogueFetch<HomeContent>("homepage", locale).catch(() => null),
  ]);
  if (!project) notFound();
  return (
    <main className="project-detail">
      <Link className="back-services-link" href={`/${locale}#recent-work`}>
        <ArrowUpLeft size={16} /> {t("العودة إلى الأعمال السابقة")}
      </Link>
      <header className="project-heading">
        <span className="eyebrow">{project.serviceName}</span>
        <h1>{project.titleAr}</h1>
        <div className="project-meta">
          {project.cityName ? (
            <span>
              <MapPin size={16} />
              {project.cityName}
            </span>
          ) : null}
          {project.completedAt ? (
            <span>
              <CalendarDays size={16} />
              {new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA", {
                dateStyle: "medium",
              }).format(new Date(project.completedAt))}
            </span>
          ) : null}
        </div>
      </header>
      <section className="comparison-grid">
        <ProjectPhoto
          image={project.beforeImage}
          label={t("قبل العمل")}
          fallback={t("صورة قبل العمل")}
          locale={locale}
        />
        <ProjectPhoto
          image={project.image}
          label={t("بعد العمل")}
          fallback={t("صورة بعد العمل")}
          locale={locale}
        />
      </section>
      <section className="project-story">
        <span className="eyebrow">{t("تفاصيل المشروع")}</span>
        <h2>{t("ما الذي تم إنجازه؟")}</h2>
        <p>
          {project.description ||
            t(
              "تم تنفيذ الخدمة وفق متطلبات الموقع ومراجعة النتيجة بعد الانتهاء.",
            )}
        </p>
      </section>
      <section className="project-cta">
        <div>
          <span>{t("هل لديك مشروع مشابه؟")}</span>
          <h2>{t("دعنا نساعدك في تنفيذه")}</h2>
        </div>
        <ContactButtons
          phone={home?.settings["contact.phone"]}
          whatsapp={home?.settings["contact.whatsapp"]}
          locale={locale}
          serviceName={project.serviceName}
        />
      </section>
    </main>
  );
}
