import { AdminShell } from "@/components/admin-shell";
import { LocationManager } from "@/components/location-manager";
import { PageHeader } from "@/components/page-header";
export default function RegionsPage() { return <AdminShell><PageHeader eyebrow="نطاق الخدمة" title="المناطق" description="إدارة المناطق الإدارية داخل المملكة." /><LocationManager kind="regions" /></AdminShell>; }
