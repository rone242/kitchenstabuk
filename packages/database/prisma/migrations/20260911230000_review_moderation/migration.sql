ALTER TABLE "CustomerReview" ADD COLUMN "email" TEXT;
ALTER TABLE "CustomerReview" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING';
UPDATE "CustomerReview" SET "status" = CASE WHEN "isActive" THEN 'APPROVED' ELSE 'REJECTED' END;
ALTER TABLE "CustomerReview" ADD CONSTRAINT "CustomerReview_status_check" CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED'));
CREATE INDEX "CustomerReview_status_createdAt_idx" ON "CustomerReview"("status", "createdAt");
