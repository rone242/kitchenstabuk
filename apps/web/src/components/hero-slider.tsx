"use client";
import { useState } from "react";
import Image from "next/image";
import { useI18n } from "@repo/i18n/client";
import type { ServiceImage } from "@/lib/catalogue";
export function HeroSlider({
  slides,
}: {
  slides: (ServiceImage & { id: string })[];
}) {
  const { t, locale } = useI18n();
  const [index, setIndex] = useState(0);
  const images = slides.filter((slide) => slide.publicUrl);
  const slide = images[index % images.length];
  if (!slide?.publicUrl) return null;
  return (
    <section
      className="hero-slider"
      aria-label={t("صور شريط العرض")}
      aria-roledescription="carousel"
    >
      <Image
        src={slide.publicUrl}
        alt={
          (locale === "en" ? slide.altTextEn : slide.altTextAr) ||
          t("صورة من خدماتنا")
        }
        fill
        sizes="(max-width: 760px) 100vw, 50vw"
        unoptimized
        priority
      />
      {images.length > 1 && (
        <div className="slider-controls">
          <button
            type="button"
            onClick={() =>
              setIndex((value) => (value - 1 + images.length) % images.length)
            }
          >
            {t("السابق")}
          </button>
          <span aria-live="polite">
            {index + 1} / {images.length}
          </span>
          <button
            type="button"
            onClick={() => setIndex((value) => (value + 1) % images.length)}
          >
            {t("التالي")}
          </button>
        </div>
      )}
    </section>
  );
}
