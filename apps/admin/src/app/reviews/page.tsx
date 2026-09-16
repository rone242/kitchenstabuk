"use client";
import { useEffect, useState } from "react";
import { useI18n } from "@repo/i18n/client";
import { AdminShell } from "@/components/admin-shell";
import { PageHeader } from "@/components/page-header";
import { apiFetch } from "@/lib/api";
interface Review {
  id: string;
  customerName: string;
  email: string | null;
  cityName: string | null;
  rating: number;
  body: string;
  status: string;
  createdAt: string;
}
export default function ReviewsPage() {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<Review[]>([]);
  const [status, setStatus] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    apiFetch<{ data: Review[]; meta: { totalPages: number } }>(
      `/admin/reviews?page=${page}&status=${status}`,
    )
      .then((result) => {
        if (active) {
          setRows(result.data);
          setPages(result.meta.totalPages);
          setError("");
        }
      })
      .catch(() => {
        if (active) setError(t("تعذر تحميل التقييمات."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, status, refresh, t]);
  async function update(review: Review, next?: string) {
    if (!next && !window.confirm(t("حذف هذا التقييم نهائياً؟"))) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/admin/reviews/${review.id}`, {
        method: next ? "PATCH" : "DELETE",
        ...(next ? { body: JSON.stringify({ status: next }) } : {}),
      });
      setLoading(true);
      if (rows.length === 1 && page > 1) setPage(page - 1);
      else setRefresh((value) => value + 1);
    } catch {
      setError(t("تعذر تحديث التقييم."));
    } finally {
      setBusy(false);
    }
  }
  const labels: Record<string, string> = {
    PENDING: t("بانتظار الموافقة"),
    APPROVED: t("معتمد"),
    REJECTED: t("مرفوض"),
  };
  return (
    <AdminShell>
      <PageHeader
        eyebrow={t("المحتوى")}
        title={t("آراء العملاء")}
        description={t("راجع تقييمات العملاء واعتمدها أو ارفضها قبل النشر.")}
      />
      <label>
        {t("الحالة")}{" "}
        <select
          value={status}
          disabled={busy}
          onChange={(event) => {
            setLoading(true);
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          {Object.entries(labels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert">
          {error}{" "}
          <button
            onClick={() => {
              setLoading(true);
              setRefresh((value) => value + 1);
            }}
          >
            {t("إعادة المحاولة")}
          </button>
        </p>
      )}
      {loading ? (
        <p role="status">{t("جارٍ التحميل...")}</p>
      ) : (
        <div className="review-admin-list">
          {!rows.length && !error && (
            <p>{t("لا توجد تقييمات في هذه الحالة.")}</p>
          )}
          {rows.map((review) => (
            <article key={review.id} className="review-admin-card">
              <h2>
                {review.customerName} · {review.rating} / 5
              </h2>
              <p>
                {review.email ?? "—"} · {review.cityName} ·{" "}
                {new Date(review.createdAt).toLocaleDateString(locale)}
              </p>
              <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {review.body}
              </p>
              <p>{labels[review.status]}</p>
              <div className="review-admin-actions">
                {review.status !== "APPROVED" && (
                  <button
                    disabled={busy}
                    onClick={() => update(review, "APPROVED")}
                  >
                    {t("اعتماد ونشر")}
                  </button>
                )}
                {review.status !== "REJECTED" && (
                  <button
                    disabled={busy}
                    onClick={() => update(review, "REJECTED")}
                  >
                    {t("رفض وإخفاء")}
                  </button>
                )}
                {review.status !== "PENDING" && (
                  <button
                    disabled={busy}
                    onClick={() => update(review, "PENDING")}
                  >
                    {t("إعادة للمراجعة")}
                  </button>
                )}
                <button disabled={busy} onClick={() => update(review)}>
                  {t("حذف")}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="review-admin-actions">
        <button
          disabled={page <= 1 || busy || loading}
          onClick={() => {
            setLoading(true);
            setPage((value) => value - 1);
          }}
        >
          {t("السابق")}
        </button>
        <span>
          {page} / {Math.max(1, pages)}
        </span>
        <button
          disabled={page >= pages || busy || loading}
          onClick={() => {
            setLoading(true);
            setPage((value) => value + 1);
          }}
        >
          {t("التالي")}
        </button>
      </div>
    </AdminShell>
  );
}
