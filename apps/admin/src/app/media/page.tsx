import { AdminShell } from "@/components/admin-shell";
import { MediaLibrary } from "@/components/media-library";
import { PageHeader } from "@/components/page-header";

export default function MediaPage() { return <AdminShell><PageHeader eyebrow="الأصول الرقمية" title="مكتبة الوسائط" description="ارفع صوراً موثوقة وأعد استخدامها في التصنيفات والخدمات." /><MediaLibrary /></AdminShell>; }
