ALTER TABLE "PortfolioItem" ADD COLUMN "beforeImageId" UUID;

CREATE INDEX "PortfolioItem_beforeImageId_idx" ON "PortfolioItem"("beforeImageId");

ALTER TABLE "PortfolioItem"
ADD CONSTRAINT "PortfolioItem_beforeImageId_fkey"
FOREIGN KEY ("beforeImageId") REFERENCES "MediaAsset"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
