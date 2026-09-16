import { SiteSettingsController } from './site-settings.controller.js';
import { ReviewsController } from './reviews.controller.js';
import { PublicCatalogueController } from './public-catalogue.controller.js';
import { Module } from '@nestjs/common';
import { CatalogueController } from './catalogue.controller.js';
import { CatalogueService } from './catalogue.service.js';

@Module({
  controllers: [
    CatalogueController,
    PublicCatalogueController,
    ReviewsController,
    SiteSettingsController,
  ],
  providers: [CatalogueService],
})
export class CatalogueModule {}
