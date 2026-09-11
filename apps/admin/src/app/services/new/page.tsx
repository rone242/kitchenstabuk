import { AdminShell } from "@/components/admin-shell";
import { PageHeader } from "@/components/page-header";
import { ServiceForm } from "@/components/service-form";

export default function NewServicePage() { return <AdminShell><PageHeader eyebrow="دليل الخدمات" title="خدمة جديدة" description="أضف محتوى الخدمة وسعرها ثم خصص نموذج الطلب والتغطية." /><ServiceForm /></AdminShell>; }
