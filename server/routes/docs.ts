import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

export const docsRouter = Router();

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'DRISHTI Autonomous Mining Telemetry & Predictive Safety API',
    version: '1.0.0',
    description: 'Enterprise REST & Real-time Telemetry API for Autonomous Mining Digital Twin with Trajectory-Based Anticipatory Safety Scoring',
    contact: {
      name: 'DRISHTI Core Safety Systems',
      url: 'https://drishti-mining.ai'
    }
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Primary Regional Gateway'
    }
  ],
  paths: {
    '/sites': {
      get: {
        summary: 'List available mining sites (Multi-Tenancy)',
        responses: {
          200: { description: 'Array of site metadata and safety indexes' }
        }
      }
    },
    '/vehicles': {
      get: {
        summary: 'Get real-time digital twin fleet state for a site',
        parameters: [
          { name: 'siteId', in: 'query', required: false, schema: { type: 'string', default: 'site-pit-alpha' } }
        ],
        responses: {
          200: { description: 'Active fleet list with telemetry and predictive risk scores' }
        }
      }
    },
    '/zones': {
      get: {
        summary: 'Get geofenced zones and active blasting polygons',
        parameters: [
          { name: 'siteId', in: 'query', required: false, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Mine hazard zones and haulage corridors' }
        }
      }
    },
    '/alerts': {
      get: {
        summary: 'Get live safety alert stream',
        responses: {
          200: { description: 'Active alerts list with severity and TTZE countdowns' }
        }
      }
    },
    '/alerts/{id}/acknowledge': {
      post: {
        summary: 'Acknowledge a critical/warning safety alert',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  acknowledgedBy: { type: 'string', example: 'Chief Safety Controller' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Alert acknowledged successfully' }
        }
      }
    },
    '/vehicles/{id}/command': {
      post: {
        summary: 'Dispatch safety intervention command to vehicle',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  siteId: { type: 'string', default: 'site-pit-alpha' },
                  command: {
                    type: 'string',
                    enum: ['emergency_halt', 'speed_limit_20', 'divert_corridor_b', 'resume_nominal']
                  }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Command acknowledged by vehicle ECU' }
        }
      }
    },
    '/scenarios/trigger': {
      post: {
        summary: 'Trigger scripted demo scenario for live pitch presentation',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  scenarioType: {
                    type: 'string',
                    enum: ['blast_breach', 'collision_course'],
                    default: 'blast_breach'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Scenario initialized' }
        }
      }
    }
  }
};

docsRouter.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
docsRouter.get('/docs.json', (req, res) => res.json(openApiSpec));
