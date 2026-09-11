"use client";

import { MapPin, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

interface District { id: string; nameAr: string }
interface City { id: string; nameAr: string; districts: District[] }
interface Region { id: string; nameAr: string; cities: City[] }
interface Country { id: string; regions: Region[] }
interface Existing { cityId: string; districtId: string | null; localIntroduction?: string | null; localPricingText?: string | null; seoTitle?: string | null; seoDescription?: string | null; isActive: boolean }

export function ServiceLocationsEditor({ serviceId }: { serviceId: string }) {
  const [countries, setCountries] = useState<Country[]>([]); const [existing, setExisting] = useState<Existing[]>([]); const [selected, setSelected] = useState<Set<string>>(new Set()); const [message, setMessage] = useState("");
  useEffect(() => { Promise.all([apiFetch<Country[]>("/admin/locations/options"), apiFetch<Existing[]>(`/admin/locations/services/${serviceId}`)]).then(([options, saved]) => { setCountries(options); setExisting(saved); setSelected(new Set(saved.map((item) => key(item.cityId, item.districtId)))); }).catch(() => setMessage("تعذر تحميل مناطق التغطية.")); }, [serviceId]);
  const regions = useMemo(() => countries.flatMap((country) => country.regions), [countries]);
  function toggle(scope: string) { setSelected((current) => { const next = new Set(current); if (next.has(scope)) next.delete(scope); else next.add(scope); return next; }); }
  async function save() { const previous = new Map(existing.map((item) => [key(item.cityId, item.districtId), item])); const locations = [...selected].map((scope) => { const [cityId, districtId] = scope.split(":"); const old = previous.get(scope); return { cityId, districtId: districtId === "ALL" ? undefined : districtId, isActive: old?.isActive ?? true, localIntroduction: old?.localIntroduction ?? undefined, localPricingText: old?.localPricingText ?? undefined, seoTitle: old?.seoTitle ?? undefined, seoDescription: old?.seoDescription ?? undefined }; }); try { await apiFetch(`/admin/locations/services/${serviceId}`, { method: "PUT", body: JSON.stringify({ locations }) }); setMessage("تم حفظ نطاق التغطية."); } catch (reason) { setMessage(reason instanceof Error ? reason.message : "تعذر الحفظ."); } }
  return <section className="panel"><p className="eyebrow">التغطية</p><h2 className="form-section-title mt-1">المدن والأحياء المتاحة</h2><p className="mt-2 text-sm text-slate-500">اختر المدينة كاملة أو حدد أحياء بعينها.</p>{message ? <p className="info-banner mt-4">{message}</p> : null}<div className="mt-5 space-y-5">{regions.map((region) => <div key={region.id}><h3 className="mb-3 flex items-center gap-2 font-black text-slate-800"><MapPin className="size-4 text-emerald-600" />{region.nameAr}</h3><div className="grid gap-3 md:grid-cols-2">{region.cities.map((city) => <article className="rounded-xl border border-slate-200 p-4" key={city.id}><label className="check-field"><input type="checkbox" checked={selected.has(key(city.id, null))} onChange={() => toggle(key(city.id, null))} /><strong>{city.nameAr} — جميع الأحياء</strong></label>{city.districts.length ? <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">{city.districts.map((district) => <label className="check-field text-sm" key={district.id}><input type="checkbox" checked={selected.has(key(city.id, district.id))} onChange={() => toggle(key(city.id, district.id))} /><span>{district.nameAr}</span></label>)}</div> : null}</article>)}</div></div>)}</div><button onClick={save} type="button" className="primary-button mt-5 px-6"><Save className="size-4" /> حفظ التغطية</button></section>;
}
function key(cityId: string, districtId: string | null) { return `${cityId}:${districtId ?? "ALL"}`; }
