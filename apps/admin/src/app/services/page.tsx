import { AdminShell } from "@/components/admin-shell";
import { CatalogueList } from "@/components/catalogue-list";
import { PageHeader } from "@/components/page-header";

export default function ServicesPage() {
  return <AdminShell><PageHeader eyebrow="دليل الخدمات" title="الخدمات" description="أدر تفاصيل الخدمات والأسعار والنماذج والتغطية الجغرافية." /><CatalogueList type="services" /></AdminShell>;
}
