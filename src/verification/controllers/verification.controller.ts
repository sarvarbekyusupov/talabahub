import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { VerificationService } from '../services/verification.service';
import {
  CreateVerificationRequestDto,
  UpdateVerificationRequestDto,
  QueryVerificationDto,
  StudentVerificationDto,
  AddUniversityDomainDto,
  VerificationRequestType,
  VerificationStatus,
} from '../dto/verification.dto';

@ApiTags('Verification')
@Controller('verification')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  // ==========================================
  // USER VERIFICATION ENDPOINTS
  // ==========================================

  @Post('requests')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new verification request' })
  @ApiResponse({ status: 201, description: 'Verification request created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Duplicate pending request' })
  async createRequest(@Body() createVerificationDto: CreateVerificationRequestDto, @Request() req) {
    return this.verificationService.createRequest(createVerificationDto, req.user.id);
  }

  @Post('student-verification')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit student verification with university email' })
  @ApiResponse({ status: 201, description: 'Student verification submitted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid university email domain' })
  async submitStudentVerification(@Body() studentVerificationDto: StudentVerificationDto, @Request() req) {
    return this.verificationService.submitStudentVerification(studentVerificationDto, req.user.id);
  }

  @Get('verify-email')
  @ApiOperation({ summary: 'Verify if an email domain is from a recognized university' })
  @ApiQuery({ name: 'email', description: 'Email address to verify' })
  @ApiResponse({ status: 200, description: 'Email verification result' })
  async verifyStudentEmail(@Query('email') email: string) {
    return this.verificationService.verifyStudentEmail(email);
  }

  @Get('my-requests')
  @ApiOperation({ summary: 'Get current user\'s verification requests' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'status', required: false, enum: VerificationStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'requestType', required: false, enum: VerificationRequestType, description: 'Filter by request type' })
  @ApiResponse({ status: 200, description: 'User verification requests retrieved successfully' })
  async getUserRequests(@Query() query: QueryVerificationDto, @Request() req) {
    return this.verificationService.getUserRequests(req.user.id, query);
  }

  // ==========================================
  // ADMIN VERIFICATION ENDPOINTS
  // ==========================================

  @Get('requests')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get all verification requests (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'status', required: false, enum: VerificationStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'requestType', required: false, enum: VerificationRequestType, description: 'Filter by request type' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'reviewedBy', required: false, description: 'Filter by reviewer ID' })
  @ApiResponse({ status: 200, description: 'Verification requests retrieved successfully' })
  async findAll(@Query() query: QueryVerificationDto) {
    return this.verificationService.findAll(query);
  }

  @Get('requests/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get verification request by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Verification request ID' })
  @ApiResponse({ status: 200, description: 'Verification request retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Verification request not found' })
  async findOne(@Param('id') id: string) {
    return this.verificationService.findOne(id);
  }

  @Patch('requests/:id/review')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Review and update verification request (Admin only)' })
  @ApiParam({ name: 'id', description: 'Verification request ID' })
  @ApiResponse({ status: 200, description: 'Verification request reviewed successfully' })
  @ApiResponse({ status: 404, description: 'Verification request not found' })
  @ApiResponse({ status: 400, description: 'Cannot update processed request' })
  async updateRequest(
    @Param('id') id: string,
    @Body() updateVerificationDto: UpdateVerificationRequestDto,
    @Request() req,
  ) {
    return this.verificationService.update(id, updateVerificationDto, req.user.id);
  }

  // ==========================================
  // UNIVERSITY DOMAIN ENDPOINTS
  // ==========================================

  @Post('university-domains')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a university domain (Admin only)' })
  @ApiResponse({ status: 201, description: 'University domain added successfully' })
  @ApiResponse({ status: 400, description: 'Domain already exists' })
  async addUniversityDomain(@Body() addDomainDto: AddUniversityDomainDto) {
    return this.verificationService.addUniversityDomain(addDomainDto);
  }

  @Get('university-domains')
  @ApiOperation({ summary: 'Get all active university domains' })
  @ApiResponse({ status: 200, description: 'University domains retrieved successfully' })
  async getUniversityDomains() {
    return this.verificationService.getUniversityDomains();
  }

  @Patch('university-domains/:id/status')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update university domain status (Admin only)' })
  @ApiParam({ name: 'id', description: 'University domain ID' })
  @ApiQuery({ name: 'isActive', required: true, type: Boolean, description: 'Active status' })
  @ApiResponse({ status: 200, description: 'Domain status updated successfully' })
  @ApiResponse({ status: 404, description: 'University domain not found' })
  async updateUniversityDomainStatus(
    @Param('id') id: string,
    @Query('isActive') isActive: boolean,
  ) {
    return this.verificationService.updateUniversityDomainStatus(id, isActive);
  }

  // ==========================================
  // ANALYTICS ENDPOINTS
  // ==========================================

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get verification statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Verification statistics retrieved successfully' })
  async getVerificationStats() {
    return this.verificationService.getVerificationStats();
  }
}