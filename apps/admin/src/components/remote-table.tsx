"use client";

import { AlertTriangle, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";

export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
}

export function RemoteTable<T>({ endpoint, columns }: { endpoint: string; columns: Column<T>[] }) {
  const [rows, setRows] = useState<T[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<T[]>(endpoint)
      .then(setRows)
      .catch((reason: unknown) => {
        setError(reason instanceof ApiError && reason.status === 403 ? "ليست لديك الصلاحية لعرض هذه البيانات." : "تعذر تحميل البيانات حالياً.");
      })
      .finally(() => setLoading(false));
  }, [endpoint]);

  if (loading) return <div className="panel flex items-center gap-3 text-slate-500"><LoaderCircle className="size-5 animate-spin" /> جارٍ تحميل البيانات...</div>;
  if (error) return <div className="panel flex items-center gap-3 text-red-700"><AlertTriangle className="size-5" />{error}</div>;

  return (
    <div className="panel overflow-x-auto p-0">
      <table className="w-full min-w-[680px] text-right text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
          <tr>{columns.map((column) => <th className="px-5 py-4 font-bold" key={column.key}>{column.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => <tr key={index} className="hover:bg-slate-50/70">{columns.map((column) => <td className="px-5 py-4 text-slate-700" key={column.key}>{column.render(row)}</td>)}</tr>)}
          {!rows.length ? <tr><td colSpan={columns.length} className="px-5 py-12 text-center text-slate-400">لا توجد بيانات بعد.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}
