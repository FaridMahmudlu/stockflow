import { Controller, Get, Query } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('audit-logs')
@Roles('ADMIN') // Only ADMIN can access audit logs
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll(@Query() query: GetAuditLogsDto) {
    return this.auditLogsService.findAll(query);
  }
}
