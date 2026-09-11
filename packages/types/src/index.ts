export type Locale = "ar-SA" | "en";
export type Direction = "rtl" | "ltr";

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiErrorPayload {
  statusCode: number;
  message: string | string[];
  path: string;
  correlationId?: string;
  timestamp: string;
}
