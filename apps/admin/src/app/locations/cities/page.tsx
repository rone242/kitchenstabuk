import { AdminShell } from "@/components/admin-shell";
import { LocationManager } from "@/components/location-manager";
import { PageHeader } from "@/components/page-header";
export default function CitiesPage() { return <AdminShell><PageHeader eyebrow="نطاق الخدمة" title="المدن" description="إدارة المدن التي يمكن تفعيل الخدمات فيها." /><LocationManager kind="cities" /></AdminShell>; }
