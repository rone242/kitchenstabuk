import { z } from "zod";

const saudiMobilePattern = /^(?:\+966|00966|966|0)?5\d{8}$/;

export const saudiPhoneSchema = z
  .string()
  .trim()
  .regex(saudiMobilePattern, "رقم الجوال السعودي غير صالح")
  .transform((value) => {
    const local = value.replace(/^(?:\+966|00966|966|0)/, "");
    return `+966${local}`;
  });

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
