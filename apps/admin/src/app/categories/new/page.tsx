import { AdminShell } from "@/components/admin-shell";
import { CategoryForm } from "@/components/category-form";
import { PageHeader } from "@/components/page-header";

export default function NewCategoryPage() { return <AdminShell><PageHeader eyebrow="دليل الخدمات" title="تصنيف جديد" description="أضف تصنيفاً واضحاً يساعد العميل في الوصول إلى الخدمة." /><CategoryForm /></AdminShell>; }
