import { PaginationDto, PaginatedResult, PaginationMeta } from '../dto/pagination.dto';

/**
 * Helper function to create paginated results
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  pagination: PaginationDto,
): PaginatedResult<T> {
  const { page = 1, limit = 20 } = pagination;
  const meta = new PaginationMeta(total, page, limit);

  return {
    data,
    meta,
  };
}

/**
 * Calculate skip and take for Prisma pagination
 */
export function getPaginationParams(pagination: PaginationDto) {
  const { page = 1, limit = 20 } = pagination;
  const skip = (page - 1) * limit;
  const take = limit;

  return { skip, take };
}

/**
 * Paginate any Prisma query
 *
 * Usage:
 * const result = await paginate(
 *   prisma.user,
 *   { page: 1, limit: 20 },
 *   { where: { isActive: true }, orderBy: { createdAt: 'desc' } }
 * );
 */
export async function paginate<T>(
  model: any,
  pagination: PaginationDto,
  query?: any,
): Promise<PaginatedResult<T>> {
  const { skip, take } = getPaginationParams(pagination);

  const [data, total] = await Promise.all([
    model.findMany({
      ...query,
      skip,
      take,
    }),
    model.count({
      where: query?.where,
    }),
  ]);

  return createPaginatedResponse(data, total, pagination);
}
