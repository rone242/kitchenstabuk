import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { RequirePermissions } from '../auth/auth.decorators.js';
import { MediaQueryDto, UpdateMediaDto, UploadMediaDto } from './dto/media.dto.js';
import { MediaService } from './media.service.js';

@RequirePermissions('media.manage')
@Controller('admin/media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get() list(@Query() query: MediaQueryDto) { return this.media.list(query); }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024, files: 1 } }))
  upload(@UploadedFile() file: Express.Multer.File | undefined, @Body() input: UploadMediaDto, @Req() request: Request) {
    return this.media.upload(file, input, context(request));
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() input: UpdateMediaDto, @Req() request: Request) {
    return this.media.update(id, input, context(request));
  }

  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string, @Req() request: Request) {
    return this.media.delete(id, context(request));
  }
}

function context(request: Request) {
  return { actorId: request.user!.id, ipAddress: request.ip, userAgent: request.get('user-agent')?.slice(0, 500) };
}
