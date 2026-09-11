export const platformConfig = {
  locale: "ar-SA",
  fallbackLocale: "en",
  direction: "rtl",
  currency: "SAR",
  timezone: "Asia/Riyadh",
  ports: {
    web: 3000,
    admin: 3001,
    api: 4000,
  },
} as const;

export const paginationConfig = {
  defaultPageSize: 20,
  maximumPageSize: 100,
} as const;
