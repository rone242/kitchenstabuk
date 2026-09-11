import { AdminShell } from "@/components/admin-shell";
import { LocationManager } from "@/components/location-manager";
import { PageHeader } from "@/components/page-header";
export default function DistrictsPage() { return <AdminShell><PageHeader eyebrow="نطاق الخدمة" title="الأحياء" description="إدارة الأحياء وربطها بمدنها الصحيحة." /><LocationManager kind="districts" /></AdminShell>; }
