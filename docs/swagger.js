const swaggerJsdoc = require('swagger-jsdoc');

const apiVersion = process.env.npm_package_version || '1.0.0';

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'Asksuite Reservation API',
    version: apiVersion,
    description: 'API for searching hotel accommodations and availability.'
  },
  servers: [
    {
      url: 'http://0.0.0.0:' + (process.env.PORT || '8080'),
      description: 'Local server'
    }
  ],
  components: {
    schemas: {
      Accommodation: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Suíte Master' },
          description: { type: 'string', example: 'Quarto amplo com vista para o mar.' },
          price: { type: 'string', example: 'R$ 450,00' },
          image: { type: 'string', example: 'https://example.com/imagem.jpg' }
        }
      },
      ValidationIssue: {
        type: 'object',
        properties: {
          path: { type: 'string', example: 'checkin' },
          message: { type: 'string', example: 'Checkin cannot be in the past' },
          code: { type: 'string', example: 'custom' },
          received: { type: 'string', nullable: true },
          expected: { type: 'string', nullable: true }
        }
      },
      ValidationErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'VALIDATION_ERROR' },
          message: { type: 'string', example: 'Request validation failed' },
          issues: {
            type: 'array',
            items: { $ref: '#/components/schemas/ValidationIssue' }
          }
        }
      },
      ReservationError: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          statusCode: { type: 'integer' },
          payload: { type: 'object' },
          url: { type: 'string' }
        },
        example: {
          message: 'Em 19/12/2025 é necessária estadia mínima de 4 dias',
          statusCode: 400,
          payload: {
            status: 'error',
            codigo: 'todasTarifasComRestricao'
          },
          url: 'https://reservations3.fasthotel.com.br/reservaMotorCotar/214'
        }
      },
      TimeoutErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'NAVIGATION_TIMEOUT' },
          message: {
            type: 'string',
            example: 'The website took too long to respond. Please try again later.'
          },
          details: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Navigation timeout of 30000 ms exceeded' }
            }
          }
        }
      },
      InternalServerErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'INTERNAL_SERVER_ERROR' },
          message: {
            type: 'string',
            example: 'An unexpected error occurred. Please try again later.'
          }
        }
      }
    }
  }
};

const options = {
  swaggerDefinition,
  apis: ['routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
