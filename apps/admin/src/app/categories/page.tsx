import { AdminShell } from "@/components/admin-shell";
import { CatalogueList } from "@/components/catalogue-list";
import { PageHeader } from "@/components/page-header";

export default function CategoriesPage() {
  return <AdminShell><PageHeader eyebrow="دليل الخدمات" title="التصنيفات" description="نظّم الخدمات داخل تصنيفات واضحة وقابلة للبحث." /><CatalogueList type="categories" /></AdminShell>;
}
