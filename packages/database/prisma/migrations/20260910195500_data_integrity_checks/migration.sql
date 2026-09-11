-- Business invariants that Prisma's schema language cannot currently express.
ALTER TABLE "Service"
  ADD CONSTRAINT "Service_price_values_check"
    CHECK (
      ("priceType" = 'QUOTE_REQUIRED' AND "startingPrice" IS NULL AND "maximumPrice" IS NULL)
      OR ("priceType" = 'FIXED' AND "startingPrice" IS NOT NULL AND "startingPrice" >= 0 AND "maximumPrice" IS NULL)
      OR ("priceType" = 'STARTING_FROM' AND "startingPrice" IS NOT NULL AND "startingPrice" >= 0 AND "maximumPrice" IS NULL)
      OR ("priceType" = 'RANGE' AND "startingPrice" IS NOT NULL AND "maximumPrice" IS NOT NULL AND "startingPrice" >= 0 AND "maximumPrice" >= "startingPrice")
    );

ALTER TABLE "CustomerReview"
  ADD CONSTRAINT "CustomerReview_rating_check" CHECK ("rating" BETWEEN 1 AND 5);

ALTER TABLE "MediaAsset"
  ADD CONSTRAINT "MediaAsset_dimensions_check"
    CHECK ("sizeBytes" >= 0 AND ("width" IS NULL OR "width" > 0) AND ("height" IS NULL OR "height" > 0));

ALTER TABLE "Redirect"
  ADD CONSTRAINT "Redirect_statusCode_check" CHECK ("statusCode" IN (301, 302, 307, 308));

ALTER TABLE "ServiceRequest"
  ADD CONSTRAINT "ServiceRequest_trackingCode_length_check" CHECK (char_length("trackingCode") >= 24);

ALTER TABLE "User"
  ADD CONSTRAINT "User_phoneNormalized_check"
    CHECK ("phoneNormalized" IS NULL OR "phoneNormalized" ~ '^\+9665[0-9]{8}$');

ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_phoneNormalized_check"
    CHECK ("phoneNormalized" ~ '^\+9665[0-9]{8}$');

ALTER TABLE "ContactSubmission"
  ADD CONSTRAINT "ContactSubmission_phoneNormalized_check"
    CHECK ("phoneNormalized" IS NULL OR "phoneNormalized" ~ '^\+9665[0-9]{8}$');

ALTER TABLE "Faq"
  ADD CONSTRAINT "Faq_single_parent_check"
    CHECK (NOT ("serviceId" IS NOT NULL AND "categoryId" IS NOT NULL));

ALTER TABLE "Country"
  ADD CONSTRAINT "Country_isoCode_check" CHECK ("isoCode" = upper("isoCode"));

ALTER TABLE "ServiceLocation"
  ADD CONSTRAINT "ServiceLocation_scopeKey_check"
    CHECK (
      ("districtId" IS NULL AND "scopeKey" = '*')
      OR ("districtId" IS NOT NULL AND "scopeKey" = "districtId"::text)
    );

-- A selected option must belong to the same dynamic field as its answer.
CREATE FUNCTION validate_request_answer_option() RETURNS trigger AS $$
DECLARE
  answer_field UUID;
  option_field UUID;
BEGIN
  SELECT "serviceFieldId" INTO answer_field
    FROM "ServiceRequestAnswer" WHERE "id" = NEW."answerId";
  SELECT "fieldId" INTO option_field
    FROM "ServiceFieldOption" WHERE "id" = NEW."optionId";
  IF answer_field IS DISTINCT FROM option_field THEN
    RAISE EXCEPTION 'Selected option does not belong to the answered service field';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ServiceRequestAnswerOption_field_match"
  BEFORE INSERT OR UPDATE ON "ServiceRequestAnswerOption"
  FOR EACH ROW EXECUTE FUNCTION validate_request_answer_option();

-- District references must belong to the selected city.
CREATE UNIQUE INDEX "District_id_cityId_key" ON "District"("id", "cityId");

ALTER TABLE "ServiceLocation"
  ADD CONSTRAINT "ServiceLocation_district_city_fkey"
  FOREIGN KEY ("districtId", "cityId") REFERENCES "District"("id", "cityId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ServiceRequest"
  ADD CONSTRAINT "ServiceRequest_district_city_fkey"
  FOREIGN KEY ("districtId", "cityId") REFERENCES "District"("id", "cityId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
