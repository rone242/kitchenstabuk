"use client";
import { useState, type FormEvent } from "react";
import { translator, type Locale } from "@repo/i18n";

export function ReviewForm({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}/catalogue/reviews`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: values.get("customerName"),
            email: values.get("email"),
            cityName: values.get("cityName"),
            rating: Number(values.get("rating")),
            body: values.get("body"),
          }),
        },
      );
      if (!response.ok)
        throw new Error(
          response.status === 429
            ? t("محاولات كثيرة. يرجى المحاولة بعد دقيقة.")
            : t("تعذر إرسال التقييم. تحقق من البيانات وحاول مجدداً."),
        );
      setSent(true);
      form.reset();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : t("تعذر إرسال التقييم. تحقق من البيانات وحاول مجدداً."),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section id="write-review" className="review-submission">
      <h2>{t("شاركنا تجربتك")}</h2>
      <p>{t("لن يُنشر بريدك الإلكتروني. يظهر تقييمك بعد موافقة الإدارة.")}</p>
      {sent ? (
        <p role="status">{t("شكراً لك! تم إرسال تقييمك للمراجعة.")}</p>
      ) : (
        <form onSubmit={submit}>
          <fieldset disabled={busy}>
            <label>
              {t("الاسم")}
              <input
                name="customerName"
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
              />
            </label>
            <label>
              {t("البريد الإلكتروني")}
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                dir="ltr"
              />
            </label>
            <label>
              {t("المدينة (اختياري)")}
              <input
                name="cityName"
                maxLength={100}
                autoComplete="address-level2"
              />
            </label>
            <label>
              {t("التقييم")}
              <select name="rating" defaultValue="5">
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value} / 5
                  </option>
                ))}
              </select>
            </label>
            <label className="review-body">
              {t("تجربتك")}
              <textarea
                name="body"
                required
                minLength={10}
                maxLength={2000}
                rows={4}
              />
            </label>
          </fieldset>
          {error && <p role="alert">{error}</p>}
          <button className="primary-button" disabled={busy}>
            {busy ? t("جارٍ الإرسال...") : t("إرسال التقييم")}
          </button>
        </form>
      )}
    </section>
  );
}
