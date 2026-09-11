import { AdminShell } from "@/components/admin-shell";
import { CategoryForm } from "@/components/category-form";
import { PageHeader } from "@/components/page-header";

export default async function EditCategoryPage({ params }: PageProps<"/categories/[id]">) { const { id } = await params; return <AdminShell><PageHeader eyebrow="دليل الخدمات" title="تعديل التصنيف" description="حدّث بيانات التصنيف وحالة ظهوره." /><CategoryForm categoryId={id} /></AdminShell>; }
