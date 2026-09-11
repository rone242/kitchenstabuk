import { AdminShell } from "@/components/admin-shell";
import { PageHeader } from "@/components/page-header";
import { ServiceForm } from "@/components/service-form";

export default async function EditServicePage({ params }: PageProps<"/services/[id]">) { const { id } = await params; return <AdminShell><PageHeader eyebrow="دليل الخدمات" title="تعديل الخدمة" description="حدّث المحتوى والحقول الديناميكية ونطاق التغطية." /><ServiceForm serviceId={id} /></AdminShell>; }
