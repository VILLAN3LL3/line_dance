export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Line Dance API',
    version: '1.0.0',
    description: 'API for choreography search and dance group administration',
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Local development server',
    },
  ],
  tags: [
    { name: 'Health' },
    { name: 'Choreographies' },
    { name: 'Metadata' },
    { name: 'Saved Filters' },
    { name: 'Dance Groups' },
    { name: 'Trainers' },
    { name: 'Dance Courses' },
    { name: 'Sessions' },
    { name: 'Session Choreographies' },
    { name: 'Learned Choreographies' },
    { name: 'Group Levels' },
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { status: { type: 'string', example: 'ok' } },
                  required: ['status'],
                },
              },
            },
          },
        },
      },
    },
    '/api/choreographies': {
      get: {
        tags: ['Choreographies'],
        summary: 'List choreographies',
        parameters: [
          { $ref: '#/components/parameters/Page' },
          { $ref: '#/components/parameters/Limit' },
        ],
        responses: {
          200: {
            description: 'Paginated choreographies',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PaginatedChoreographyResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Choreographies'],
        summary: 'Create choreography',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChoreographyCreateRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Created choreography',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MutationResponse' },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/api/choreographies/search': {
      get: {
        tags: ['Choreographies'],
        summary: 'Search choreographies',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'level', in: 'query', schema: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] } },
          { name: 'step_figures', in: 'query', schema: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] } },
          { name: 'step_figures_match_mode', in: 'query', schema: { type: 'string', enum: ['all', 'any', 'exact'] } },
          { name: 'without_step_figures', in: 'query', schema: { type: 'boolean' } },
          { name: 'tags', in: 'query', schema: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] } },
          { name: 'authors', in: 'query', schema: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] } },
          { name: 'max_count', in: 'query', schema: { type: 'integer', minimum: 0 } },
          { name: 'sort_field', in: 'query', schema: { type: 'string', enum: ['name', 'level', 'count', 'wall_count', 'creation_year'] } },
          { name: 'sort_direction', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
          { $ref: '#/components/parameters/Page' },
          { $ref: '#/components/parameters/Limit' },
        ],
        responses: {
          200: {
            description: 'Paginated search result',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PaginatedChoreographyResponse' },
              },
            },
          },
        },
      },
    },
    '/api/choreographies/max-count': {
      get: {
        tags: ['Metadata'],
        summary: 'Get max choreography count',
        responses: {
          200: {
            description: 'Maximum count',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { max_count: { type: 'integer' } },
                  required: ['max_count'],
                },
              },
            },
          },
        },
      },
    },
    '/api/choreographies/{id}': {
      get: {
        tags: ['Choreographies'],
        summary: 'Get choreography by id',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          200: {
            description: 'Choreography details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Choreography' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Choreographies'],
        summary: 'Update choreography',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChoreographyUpdateRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Update status',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MutationResponse' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Choreographies'],
        summary: 'Delete choreography',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          200: {
            description: 'Deletion status',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/levels': {
      get: {
        tags: ['Metadata'],
        summary: 'Get levels',
        responses: {
          200: {
            description: 'List of levels',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      name: { type: 'string' },
                    },
                    required: ['id', 'name'],
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Metadata'],
        summary: 'Create level',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { name: { type: 'string' } },
                required: ['name'],
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Created level',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/tags': {
      get: {
        tags: ['Metadata'],
        summary: 'Get all tags',
        responses: {
          200: {
            description: 'Tag names',
            content: {
              'application/json': {
                schema: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    },
    '/api/authors': {
      get: {
        tags: ['Metadata'],
        summary: 'Get all authors',
        responses: {
          200: {
            description: 'Author names',
            content: {
              'application/json': {
                schema: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    },
    '/api/step_figures': {
      get: {
        tags: ['Metadata'],
        summary: 'Get all step figures',
        responses: {
          200: {
            description: 'Step figure names',
            content: {
              'application/json': {
                schema: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    },
    '/api/saved-filters': {
      get: {
        tags: ['Saved Filters'],
        summary: 'List saved filter configurations',
        responses: {
          200: {
            description: 'Saved filters',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/SavedFilterConfiguration' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Saved Filters'],
        summary: 'Create or upsert saved filter configuration',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  filters: { $ref: '#/components/schemas/SearchFilters' },
                },
                required: ['name', 'filters'],
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Saved filter',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SavedFilterConfiguration' },
              },
            },
          },
        },
      },
    },
    '/api/saved-filters/{id}': {
      patch: {
        tags: ['Saved Filters'],
        summary: 'Update saved filter configuration',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  filters: { $ref: '#/components/schemas/SearchFilters' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated filter',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SavedFilterConfiguration' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Saved Filters'],
        summary: 'Delete saved filter configuration',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          200: {
            description: 'Deletion status',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/dance-groups': {
      get: {
        tags: ['Dance Groups'],
        summary: 'List dance groups',
        responses: {
          200: {
            description: 'Dance groups',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/DanceGroup' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Dance Groups'],
        summary: 'Create dance group',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { name: { type: 'string' } },
                required: ['name'],
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Created dance group',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DanceGroup' },
              },
            },
          },
        },
      },
    },
    '/api/dance-groups/{id}': {
      get: {
        tags: ['Dance Groups'],
        summary: 'Get dance group by id',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          200: {
            description: 'Dance group',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DanceGroup' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Dance Groups'],
        summary: 'Update dance group',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { name: { type: 'string' } },
                required: ['name'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated dance group',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DanceGroup' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Dance Groups'],
        summary: 'Delete dance group',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          200: {
            description: 'Deletion status',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/trainers': {
      get: {
        tags: ['Trainers'],
        summary: 'List trainers',
        responses: {
          200: {
            description: 'Trainers',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Trainer' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Trainers'],
        summary: 'Create trainer',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  phone: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                },
                required: ['name', 'phone', 'email'],
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Created trainer',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Trainer' },
              },
            },
          },
        },
      },
    },
    '/api/trainers/{id}': {
      put: {
        tags: ['Trainers'],
        summary: 'Update trainer',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  phone: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                },
                required: ['name', 'phone', 'email'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated trainer',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Trainer' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Trainers'],
        summary: 'Delete trainer',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          200: {
            description: 'Deletion status',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/dance-courses': {
      get: {
        tags: ['Dance Courses'],
        summary: 'List dance courses',
        parameters: [
          {
            name: 'dance_group_id',
            in: 'query',
            schema: { type: 'integer' },
            required: false,
          },
        ],
        responses: {
          200: {
            description: 'Dance courses',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/DanceCourse' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Dance Courses'],
        summary: 'Create dance course',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DanceCourseCreateRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Created dance course',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DanceCourse' },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/api/dance-courses/{id}': {
      put: {
        tags: ['Dance Courses'],
        summary: 'Update dance course',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DanceCourseUpdateRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated dance course',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DanceCourse' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Dance Courses'],
        summary: 'Delete dance course',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          200: {
            description: 'Deletion status',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/dance-courses/{id}/export-pdf': {
      get: {
        tags: ['Dance Courses'],
        summary: 'Export course PDF',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          200: {
            description: 'PDF binary',
            content: {
              'application/pdf': {
                schema: { type: 'string', format: 'binary' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/sessions': {
      get: {
        tags: ['Sessions'],
        summary: 'List sessions',
        parameters: [
          {
            name: 'dance_course_id',
            in: 'query',
            schema: { type: 'integer' },
            required: false,
          },
        ],
        responses: {
          200: {
            description: 'Sessions',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Session' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Sessions'],
        summary: 'Create session',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  dance_course_id: { type: 'integer' },
                  session_date: { type: 'string', format: 'date' },
                },
                required: ['dance_course_id', 'session_date'],
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Created session',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Session' },
              },
            },
          },
        },
      },
    },
    '/api/sessions/{id}': {
      put: {
        tags: ['Sessions'],
        summary: 'Update session date',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  session_date: { type: 'string', format: 'date' },
                },
                required: ['session_date'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated session',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Session' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Sessions'],
        summary: 'Delete session',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          200: {
            description: 'Deletion status',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/session-choreographies': {
      get: {
        tags: ['Session Choreographies'],
        summary: 'List choreographies in a session',
        parameters: [
          {
            name: 'session_id',
            in: 'query',
            schema: { type: 'integer' },
            required: true,
          },
        ],
        responses: {
          200: {
            description: 'Session choreographies',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/SessionChoreography' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Session Choreographies'],
        summary: 'Add choreography to session',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  session_id: { type: 'integer' },
                  choreography_id: { type: 'integer' },
                },
                required: ['session_id', 'choreography_id'],
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Created link',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SessionChoreography' },
              },
            },
          },
        },
      },
    },
    '/api/session-choreographies/{id}': {
      delete: {
        tags: ['Session Choreographies'],
        summary: 'Remove choreography from session',
        parameters: [{ $ref: '#/components/parameters/IdPath' }],
        responses: {
          200: {
            description: 'Deletion status',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/learned-choreographies': {
      get: {
        tags: ['Learned Choreographies'],
        summary: 'List learned choreographies',
        parameters: [
          {
            name: 'dance_group_id',
            in: 'query',
            schema: { type: 'integer' },
            required: false,
          },
        ],
        responses: {
          200: {
            description: 'Learned choreographies view rows',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/LearnedChoreography' } },
              },
            },
          },
        },
      },
    },
    '/api/dance-groups/{groupId}/levels': {
      get: {
        tags: ['Group Levels'],
        summary: 'List levels for dance group',
        parameters: [
          {
            name: 'groupId',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          200: {
            description: 'Level names',
            content: {
              'application/json': {
                schema: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Group Levels'],
        summary: 'Add level to dance group',
        parameters: [
          {
            name: 'groupId',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { level: { type: 'string' } },
                required: ['level'],
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Added level',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { level: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
    '/api/dance-groups/{groupId}/levels/{level}': {
      delete: {
        tags: ['Group Levels'],
        summary: 'Remove level from dance group',
        parameters: [
          {
            name: 'groupId',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
          {
            name: 'level',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Removal status',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    parameters: {
      IdPath: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
      },
      Page: {
        name: 'page',
        in: 'query',
        required: false,
        schema: { type: 'integer', minimum: 1, default: 1 },
      },
      Limit: {
        name: 'limit',
        in: 'query',
        required: false,
        schema: { type: 'integer', minimum: 1, default: 20 },
      },
    },
    responses: {
      BadRequest: {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
        required: ['error'],
      },
      MessageResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
        required: ['message'],
      },
      MutationResponse: {
        type: 'object',
        properties: {
          id: { oneOf: [{ type: 'integer' }, { type: 'string' }] },
          message: { type: 'string' },
        },
        required: ['id', 'message'],
      },
      Choreography: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          step_sheet_link: { type: 'string', nullable: true },
          demo_video_url: { type: 'string', nullable: true },
          tutorial_video_url: { type: 'string', nullable: true },
          count: { type: 'integer', nullable: true },
          wall_count: { type: 'integer', nullable: true },
          level: { type: 'string' },
          creation_year: { type: 'integer', nullable: true },
          tag_information: { type: 'string', nullable: true },
          restart_information: { type: 'string', nullable: true },
          authors: { type: 'array', items: { type: 'string' } },
          tags: { type: 'array', items: { type: 'string' } },
          step_figures: { type: 'array', items: { type: 'string' } },
          created_at: { type: 'string', nullable: true },
          updated_at: { type: 'string', nullable: true },
        },
      },
      ChoreographyCreateRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          step_sheet_link: { type: 'string' },
          demo_video_url: { type: 'string' },
          tutorial_video_url: { type: 'string' },
          count: { type: 'integer' },
          wall_count: { type: 'integer' },
          level: { type: 'string' },
          creation_year: { type: 'integer' },
          tag_information: { type: 'string' },
          restart_information: { type: 'string' },
          authors: { type: 'array', items: { type: 'string' } },
          tags: { type: 'array', items: { type: 'string' } },
          step_figures: { type: 'array', items: { type: 'string' } },
        },
        required: ['name', 'level'],
      },
      ChoreographyUpdateRequest: {
        allOf: [{ $ref: '#/components/schemas/ChoreographyCreateRequest' }],
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      PaginatedChoreographyResponse: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Choreography' } },
          pagination: { $ref: '#/components/schemas/Pagination' },
        },
        required: ['data', 'pagination'],
      },
      SearchFilters: {
        type: 'object',
        properties: {
          search: { type: 'string' },
          level: { type: 'array', items: { type: 'string' } },
          step_figures: { type: 'array', items: { type: 'string' } },
          step_figures_match_mode: { type: 'string', enum: ['all', 'any', 'exact'] },
          without_step_figures: { type: 'boolean' },
          tags: { type: 'array', items: { type: 'string' } },
          authors: { type: 'array', items: { type: 'string' } },
          max_count: { type: 'integer' },
        },
      },
      SavedFilterConfiguration: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          filters: { $ref: '#/components/schemas/SearchFilters' },
          created_at: { type: 'string' },
          updated_at: { type: 'string' },
          message: { type: 'string' },
        },
        required: ['id', 'name', 'filters'],
      },
      DanceGroup: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          created_at: { type: 'string' },
        },
        required: ['id', 'name'],
      },
      Trainer: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string', format: 'email' },
          created_at: { type: 'string' },
        },
        required: ['id', 'name', 'phone', 'email'],
      },
      DanceCourse: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          dance_group_id: { type: 'integer' },
          dance_group_name: { type: 'string', nullable: true },
          semester: { type: 'string' },
          start_date: { type: 'string', format: 'date', nullable: true },
          youtube_playlist_url: { type: 'string', nullable: true },
          copperknob_list_url: { type: 'string', nullable: true },
          spotify_playlist_url: { type: 'string', nullable: true },
          trainer_id: { type: 'integer', nullable: true },
          trainer_name: { type: 'string', nullable: true },
          trainer_phone: { type: 'string', nullable: true },
          trainer_email: { type: 'string', nullable: true },
          created_at: { type: 'string' },
        },
      },
      DanceCourseCreateRequest: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          dance_group_id: { type: 'integer' },
          semester: { type: 'string' },
          start_date: { type: 'string', format: 'date' },
          youtube_playlist_url: { type: 'string' },
          copperknob_list_url: { type: 'string' },
          spotify_playlist_url: { type: 'string' },
          trainer_id: { type: 'integer', nullable: true },
        },
        required: ['dance_group_id', 'semester'],
      },
      DanceCourseUpdateRequest: {
        type: 'object',
        properties: {
          semester: { type: 'string' },
          start_date: { type: 'string', format: 'date' },
          youtube_playlist_url: { type: 'string' },
          copperknob_list_url: { type: 'string' },
          spotify_playlist_url: { type: 'string' },
          trainer_id: { type: 'integer', nullable: true },
        },
        required: ['semester'],
      },
      Session: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          dance_course_id: { type: 'integer' },
          semester: { type: 'string', nullable: true },
          dance_group_name: { type: 'string', nullable: true },
          session_date: { type: 'string', format: 'date' },
          created_at: { type: 'string' },
        },
      },
      SessionChoreography: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          session_id: { type: 'integer' },
          choreography_id: { type: 'integer' },
          created_at: { type: 'string' },
        },
      },
      LearnedChoreography: {
        type: 'object',
        properties: {
          dance_group_id: { type: 'integer' },
          dance_group_name: { type: 'string' },
          dance_course_id: { type: 'integer' },
          semester: { type: 'string' },
          choreography_id: { type: 'integer' },
          choreography_name: { type: 'string' },
          first_learned_date: { type: 'string', format: 'date' },
          last_danced_date: { type: 'string', format: 'date' },
        },
      },
    },
  },
};
