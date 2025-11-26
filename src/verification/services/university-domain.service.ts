import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UniversityDomainService {
  private readonly logger = new Logger(UniversityDomainService.name);

  // Known Uzbekistan university domains with their auto-verification status
  private readonly UNIVERSITY_DOMAINS = [
    { domain: '@tatu.uz', universityId: 1, universityName: 'Tashkent University of Information Technologies', autoVerify: true },
    { domain: '@wiut.uz', universityId: 2, universityName: 'Westminster International University in Tashkent', autoVerify: true },
    { domain: '@inha.uz', universityId: 3, universityName: 'Inha University in Tashkent', autoVerify: true },
    { domain: '@tsue.uz', universityId: 4, universityName: 'Tashkent State University of Economics', autoVerify: true },
    { domain: '@nuuz.uz', universityId: 5, universityName: 'National University of Uzbekistan', autoVerify: true },
    { domain: '@tstu.uz', universityId: 6, universityName: 'Tashkent State Technical University', autoVerify: true },
    { domain: '@uzswlu.uz', universityId: 7, universityName: 'Uzbekistan State University of World Languages', autoVerify: true },
    { domain: '@tashkent.uz', universityId: 8, universityName: 'Tashkent State University of Law', autoVerify: true },
    { domain: '@tma.uz', universityId: 9, universityName: 'Tashkent Medical Academy', autoVerify: true },
    { domain: '@tdimu.uz', universityId: 10, universityName: 'Tashkent Dental Institute', autoVerify: true },
    { domain: '@tisi.uz', universityId: 11, universityName: 'Tashkent Institute of Irrigation and Melioration', autoVerify: true },
    { domain: '@tuitm.uz', universityId: 12, universityName: 'Tashkent University of Information Technologies Main Campus', autoVerify: true },
    { domain: '@amcu.uz', universityId: 13, universityName: 'Andijan Machine-Building Institute', autoVerify: true },
    { domain: '@buki.uz', universityId: 14, universityName: 'Bukhara State University', autoVerify: true },
    { domain: '@jspi.uz', universityId: 15, universityName: 'Jizzakh Polytechnic Institute', autoVerify: true },
    { domain: '@kspi.uz', universityId: 16, universityName: 'Karshi State University', autoVerify: true },
    { domain: '@nspi.uz', universityId: 17, universityName: 'Namangan State University', autoVerify: true },
    { domain: '@sdu.uz', universityId: 18, universityName: 'Samarkand State University', autoVerify: true },
    { domain: '@feru.uz', universityId: 19, universityName: 'Ferghana State University', autoVerify: true },
    { domain: '@wti.uz', universityId: 20, universityName: 'World Tourism Institute', autoVerify: true },
  ];

  // Additional generic university patterns (lower priority, requires manual review)
  private readonly UNIVERSITY_PATTERNS = [
    /\.edu\.uz$/, // Main .edu.uz domain
    /\.ac\.uz$/,  // Academic domain
    /\.univ\.uz/, // University domain
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Analyze email to determine if it's from a recognized university
   */
  async analyzeEmail(email: string): Promise<{
    isUniversity: boolean;
    domain: string;
    universityId?: number;
    universityName?: string;
    autoVerify: boolean;
    confidence: 'high' | 'medium' | 'low';
    requiresManualReview: boolean;
  }> {
    const domain = this.extractDomain(email);

    // Check exact domain matches (high confidence)
    const exactMatch = this.UNIVERSITY_DOMAINS.find(ud => ud.domain === domain);
    if (exactMatch) {
      return {
        isUniversity: true,
        domain,
        universityId: exactMatch.universityId,
        universityName: exactMatch.universityName,
        autoVerify: exactMatch.autoVerify,
        confidence: 'high',
        requiresManualReview: false,
      };
    }

    // Check university patterns (medium confidence)
    const patternMatch = this.UNIVERSITY_PATTERNS.some(pattern => {
      const regex = new RegExp(pattern);
      return regex.test(email);
    });

    if (patternMatch) {
      return {
        isUniversity: true,
        domain,
        autoVerify: false,
        confidence: 'medium',
        requiresManualReview: true,
      };
    }

    // Check if it's a student email but not recognized (low confidence)
    if (this.isLikelyStudentEmail(email)) {
      return {
        isUniversity: false,
        domain,
        autoVerify: false,
        confidence: 'low',
        requiresManualReview: true,
      };
    }

    // Definitely not a university email
    return {
      isUniversity: false,
      domain,
      autoVerify: false,
      confidence: 'low',
      requiresManualReview: false,
    };
  }

  /**
   * Get all supported university domains
   */
  async getSupportedDomains(): Promise<Array<{
    domain: string;
    universityId: number;
    universityName: string;
    autoVerify: boolean;
  }>> {
    // Load from database first, then supplement with known domains
    const dbDomains = await this.prisma.universityDomain.findMany({
      where: { isActive: true },
      include: { university: true },
    });

    const domainList = dbDomains.map(ud => ({
      domain: ud.domain,
      universityId: ud.universityId,
      universityName: ud.university.nameUz,
      autoVerify: ud.autoVerify,
    }));

    // Add known domains that aren't in database yet
    for (const knownDomain of this.UNIVERSITY_DOMAINS) {
      if (!domainList.find(d => d.domain === knownDomain.domain)) {
        domainList.push({
          domain: knownDomain.domain,
          universityId: knownDomain.universityId,
          universityName: knownDomain.universityName,
          autoVerify: knownDomain.autoVerify,
        });
      }
    }

    return domainList.sort((a, b) => a.universityName.localeCompare(b.universityName));
  }

  /**
   * Add new university domain
   */
  async addUniversityDomain(data: {
    universityId: number;
    domain: string;
    autoVerify: boolean;
  }): Promise<void> {
    await this.prisma.universityDomain.create({
      data: {
        ...data,
        domain: data.domain.toLowerCase(),
        isActive: true,
      },
    });

    this.logger.log(`Added university domain: ${data.domain} for university ${data.universityId}`);
  }

  /**
   * Check if email is suspicious (fraud indicators)
   */
  async checkEmailSuspicion(email: string, userId: string): Promise<{
    suspicious: boolean;
    reasons: string[];
    score: number;
    requiresReview: boolean;
  }> {
    const reasons: string[] = [];
    let score = 0;

    // Check for disposable/temporary email services
    if (this.isDisposableEmail(email)) {
      reasons.push('Disposable email service detected');
      score += 30;
    }

    // Check for suspicious patterns
    if (this.hasSuspiciousPatterns(email)) {
      reasons.push('Suspicious email pattern');
      score += 20;
    }

    // Check if this email domain was used in fraud before
    const fraudHistory = await this.checkFraudHistory(email);
    if (fraudHistory.count > 0) {
      reasons.push(`Previous fraud activity with this domain (${fraudHistory.count} incidents)`);
      score += fraudHistory.count * 10;
    }

    // Check for multiple accounts from same domain
    const accountCount = await this.countAccountsByDomain(email);
    if (accountCount > 50) { // Unusually high for Uzbekistan universities
      reasons.push(`High number of accounts from this domain (${accountCount})`);
      score += Math.min(accountCount / 5, 25);
    }

    return {
      suspicious: score >= 40,
      reasons,
      score,
      requiresReview: score >= 30,
    };
  }

  /**
   * Extract domain from email
   */
  private extractDomain(email: string): string {
    const atIndex = email.lastIndexOf('@');
    if (atIndex === -1) return '';
    return email.substring(atIndex).toLowerCase();
  }

  /**
   * Check if email appears to be from a student
   */
  private isLikelyStudentEmail(email: string): boolean {
    const commonStudentPatterns = [
      /student\./i,
      /edu\./i,
      /learn\./i,
      /campus\./i,
      /mail\.student\./i,
      /academia\./i,
    ];

    return commonStudentPatterns.some(pattern => pattern.test(email));
  }

  /**
   * Check if email is from disposable email service
   */
  private isDisposableEmail(email: string): boolean {
    const disposableDomains = [
      '10minutemail', 'guerrillamail', 'mailinator', 'tempmail', 'yopmail',
      'throwaway', 'tempinbox', '10minutemail', 'temp-mail', 'maildrop',
      'sharklasers', 'mailcatch', 'mohmal', 'tempmail.org'
    ];

    const domain = this.extractDomain(email);
    return disposableDomains.some(disposable => domain.includes(disposable));
  }

  /**
   * Check for suspicious email patterns
   */
  private hasSuspiciousPatterns(email: string): boolean {
    const suspiciousPatterns = [
      /\d+[a-z]+\d+/i, // Random alphanumeric strings
      /[a-z]{20,}/i, // Very long strings
      /\+[0-9]+@/, // Email aliases with numbers (can indicate multiple accounts)
    ];

    return suspiciousPatterns.some(pattern => pattern.test(email));
  }

  /**
   * Check fraud history for email domain
   */
  private async checkFraudHistory(email: string): Promise<{ count: number; details: any[] }> {
    const domain = this.extractDomain(email);

    const fraudCount = await this.prisma.verificationAuditLog.count({
      where: {
        action: 'VERIFICATION_REJECTED_FRAUD',
        metadata: {
          path: ['emailDomain'],
          equals: domain,
        },
      },
    });

    return { count: fraudCount, details: [] };
  }

  /**
   * Count accounts by domain for unusual pattern detection
   */
  private async countAccountsByDomain(email: string): Promise<number> {
    const domain = this.extractDomain(email);

    return await this.prisma.user.count({
      where: {
        email: {
          endsWith: domain,
        },
      },
    });
  }

  /**
   * Suggest university based on email pattern (for non-recognized universities)
   */
  async suggestUniversity(email: string): Promise<{
    suggestions: Array<{
      universityId: number;
      universityName: string;
      confidence: number;
      reason: string;
    }>;
  }> {
    const suggestions: any[] = [];

    // Extract potential university name from email
    const domain = this.extractDomain(email);
    const domainWithoutAt = domain.substring(1);

    // Look for similar universities
    const universities = await this.prisma.university.findMany({
      where: {
        OR: [
          {
            nameUz: {
              contains: domainWithoutAt.replace(/\.(edu|ac|univ)\.uz$/, '')
            }
          },
          {
            nameEn: {
              contains: domainWithoutAt.replace(/\.(edu|ac|univ)\.uz$/, '')
            }
          }
        ]
      }
    });

    for (const uni of universities) {
      suggestions.push({
        universityId: uni.id,
        universityName: uni.nameUz,
        confidence: 0.6,
        reason: 'Similar name pattern'
      });
    }

    return { suggestions };
  }
}