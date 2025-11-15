import { Injectable } from '@nestjs/common';
import { CreateEducationPartnerDto } from './dto/create-education-partner.dto';
import { UpdateEducationPartnerDto } from './dto/update-education-partner.dto';

@Injectable()
export class EducationPartnersService {
  create(createEducationPartnerDto: CreateEducationPartnerDto) {
    return 'This action adds a new educationPartner';
  }

  findAll() {
    return `This action returns all educationPartners`;
  }

  findOne(id: number) {
    return `This action returns a #${id} educationPartner`;
  }

  update(id: number, updateEducationPartnerDto: UpdateEducationPartnerDto) {
    return `This action updates a #${id} educationPartner`;
  }

  remove(id: number) {
    return `This action removes a #${id} educationPartner`;
  }
}
