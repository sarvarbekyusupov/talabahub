import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  getSchemaPath,
} from '@nestjs/swagger';
import { PaginatedResult } from '../dto/pagination.dto';

/**
 * Common API response decorators for consistent documentation
 */
export const ApiResponseSuccess = (options: {
  description: string;
  type?: Type<any>;
  isArray?: boolean;
}) => {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description: options.description,
      type: options.type,
      isArray: options.isArray,
    }),
  );
};

export const ApiResponseCreated = (options: {
  description: string;
  type?: Type<any>;
}) => {
  return applyDecorators(
    ApiResponse({
      status: 201,
      description: options.description,
      type: options.type,
    }),
  );
};

export const ApiResponseNoContent = (description: string) => {
  return applyDecorators(
    ApiResponse({
      status: 204,
      description,
    }),
  );
};

export const ApiResponseBadRequest = (description: string = 'Invalid input') => {
  return applyDecorators(
    ApiResponse({
      status: 400,
      description,
      schema: {
        example: {
          statusCode: 400,
          message: 'Validation failed',
          error: 'Bad Request',
        },
      },
    }),
  );
};

export const ApiResponseUnauthorized = (
  description: string = 'Unauthorized access',
) => {
  return applyDecorators(
    ApiResponse({
      status: 401,
      description,
      schema: {
        example: {
          statusCode: 401,
          message: 'Unauthorized',
        },
      },
    }),
  );
};

export const ApiResponseForbidden = (
  description: string = 'Forbidden resource',
) => {
  return applyDecorators(
    ApiResponse({
      status: 403,
      description,
      schema: {
        example: {
          statusCode: 403,
          message: 'Forbidden',
        },
      },
    }),
  );
};

export const ApiResponseNotFound = (
  description: string = 'Resource not found',
) => {
  return applyDecorators(
    ApiResponse({
      status: 404,
      description,
      schema: {
        example: {
          statusCode: 404,
          message: 'Not found',
        },
      },
    }),
  );
};

export const ApiResponseConflict = (description: string = 'Conflict error') => {
  return applyDecorators(
    ApiResponse({
      status: 409,
      description,
      schema: {
        example: {
          statusCode: 409,
          message: 'Resource already exists',
          error: 'Conflict',
        },
      },
    }),
  );
};

export const ApiResponseTooManyRequests = (
  description: string = 'Too many requests',
) => {
  return applyDecorators(
    ApiResponse({
      status: 429,
      description,
      schema: {
        example: {
          statusCode: 429,
          message: 'ThrottlerException: Too Many Requests',
        },
      },
    }),
  );
};

export const ApiResponseInternalError = (
  description: string = 'Internal server error',
) => {
  return applyDecorators(
    ApiResponse({
      status: 500,
      description,
      schema: {
        example: {
          statusCode: 500,
          message: 'Internal server error',
        },
      },
    }),
  );
};

/**
 * Paginated response decorator
 */
export const ApiPaginatedResponse = <TModel extends Type<any>>(
  model: TModel,
  description: string = 'Paginated list retrieved successfully',
) => {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description,
      schema: {
        allOf: [
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              meta: {
                type: 'object',
                properties: {
                  total: { type: 'number', example: 100 },
                  page: { type: 'number', example: 1 },
                  limit: { type: 'number', example: 20 },
                  totalPages: { type: 'number', example: 5 },
                  hasNextPage: { type: 'boolean', example: true },
                  hasPrevPage: { type: 'boolean', example: false },
                },
              },
            },
          },
        ],
      },
    }),
  );
};

/**
 * Complete CRUD endpoint documentation decorator
 */
export const ApiCrudOperation = (options: {
  operation: 'create' | 'read' | 'readAll' | 'update' | 'delete';
  resourceName: string;
  auth?: boolean;
  responseType?: Type<any>;
  bodyType?: Type<any>;
  isArray?: boolean;
  isPaginated?: boolean;
}) => {
  const decorators: Array<ClassDecorator | MethodDecorator | PropertyDecorator> =
    [];

  // Add authentication if required
  if (options.auth !== false) {
    decorators.push(ApiBearerAuth('JWT-auth'));
  }

  // Add operation-specific documentation
  switch (options.operation) {
    case 'create':
      decorators.push(
        ApiOperation({
          summary: `Create a new ${options.resourceName}`,
          description: `Creates a new ${options.resourceName} resource`,
        }),
      );
      if (options.bodyType) {
        decorators.push(ApiBody({ type: options.bodyType }));
      }
      decorators.push(
        ApiResponseCreated({
          description: `${options.resourceName} created successfully`,
          type: options.responseType,
        }),
      );
      decorators.push(ApiResponseBadRequest('Invalid input data'));
      decorators.push(ApiResponseUnauthorized());
      decorators.push(
        ApiResponseConflict(`${options.resourceName} already exists`),
      );
      break;

    case 'readAll':
      decorators.push(
        ApiOperation({
          summary: `Get all ${options.resourceName}s`,
          description: `Retrieves a list of ${options.resourceName}s${options.isPaginated ? ' with pagination' : ''}`,
        }),
      );
      if (options.isPaginated && options.responseType) {
        decorators.push(
          ApiPaginatedResponse(
            options.responseType,
            `${options.resourceName}s retrieved successfully`,
          ),
        );
      } else {
        decorators.push(
          ApiResponseSuccess({
            description: `${options.resourceName}s retrieved successfully`,
            type: options.responseType,
            isArray: options.isArray,
          }),
        );
      }
      break;

    case 'read':
      decorators.push(
        ApiOperation({
          summary: `Get ${options.resourceName} by ID`,
          description: `Retrieves a single ${options.resourceName} by ID`,
        }),
      );
      decorators.push(
        ApiParam({
          name: 'id',
          type: 'string',
          description: `${options.resourceName} ID`,
          example: 'clp123abc456def789',
        }),
      );
      decorators.push(
        ApiResponseSuccess({
          description: `${options.resourceName} retrieved successfully`,
          type: options.responseType,
        }),
      );
      decorators.push(
        ApiResponseNotFound(`${options.resourceName} not found`),
      );
      break;

    case 'update':
      decorators.push(
        ApiOperation({
          summary: `Update ${options.resourceName}`,
          description: `Updates an existing ${options.resourceName}`,
        }),
      );
      decorators.push(
        ApiParam({
          name: 'id',
          type: 'string',
          description: `${options.resourceName} ID`,
        }),
      );
      if (options.bodyType) {
        decorators.push(ApiBody({ type: options.bodyType }));
      }
      decorators.push(
        ApiResponseSuccess({
          description: `${options.resourceName} updated successfully`,
          type: options.responseType,
        }),
      );
      decorators.push(ApiResponseBadRequest('Invalid input data'));
      decorators.push(ApiResponseUnauthorized());
      decorators.push(
        ApiResponseNotFound(`${options.resourceName} not found`),
      );
      break;

    case 'delete':
      decorators.push(
        ApiOperation({
          summary: `Delete ${options.resourceName}`,
          description: `Deletes a ${options.resourceName} by ID`,
        }),
      );
      decorators.push(
        ApiParam({
          name: 'id',
          type: 'string',
          description: `${options.resourceName} ID`,
        }),
      );
      decorators.push(
        ApiResponseNoContent(`${options.resourceName} deleted successfully`),
      );
      decorators.push(ApiResponseUnauthorized());
      decorators.push(
        ApiResponseNotFound(`${options.resourceName} not found`),
      );
      break;
  }

  // Add common error responses
  decorators.push(ApiResponseTooManyRequests());
  decorators.push(ApiResponseInternalError());

  return applyDecorators(...decorators);
};

/**
 * File upload documentation decorator
 */
export const ApiFileUpload = (options: {
  fieldName?: string;
  description?: string;
  maxSize?: number;
  fileTypes?: string[];
}) => {
  return applyDecorators(
    ApiOperation({
      summary: 'Upload file',
      description:
        options.description ||
        `Upload a file. Max size: ${options.maxSize || 5}MB. Allowed types: ${options.fileTypes?.join(', ') || 'image/*'}`,
    }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          [options.fieldName || 'file']: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    }),
    ApiBearerAuth('JWT-auth'),
    ApiResponseCreated({
      description: 'File uploaded successfully',
    }),
    ApiResponseBadRequest('Invalid file type or size'),
    ApiResponseUnauthorized(),
  );
};
