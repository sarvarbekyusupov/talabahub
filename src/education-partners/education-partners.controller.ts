import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EducationPartnersService } from './education-partners.service';
import { CreateEducationPartnerDto } from './dto/create-education-partner.dto';
import { UpdateEducationPartnerDto } from './dto/update-education-partner.dto';

@Controller('education-partners')
export class EducationPartnersController {
  constructor(private readonly educationPartnersService: EducationPartnersService) {}

  @Post()
  create(@Body() createEducationPartnerDto: CreateEducationPartnerDto) {
    return this.educationPartnersService.create(createEducationPartnerDto);
  }

  @Get()
  findAll() {
    return this.educationPartnersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.educationPartnersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEducationPartnerDto: UpdateEducationPartnerDto) {
    return this.educationPartnersService.update(+id, updateEducationPartnerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.educationPartnersService.remove(+id);
  }
}
