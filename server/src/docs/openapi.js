function jsonContent(schema, example) {
  const media = { schema };
  if (example !== undefined) media.example = example;
  return { content: { 'application/json': media } };
}

function errorResponse(description, example = 'Request failed') {
  return {
    description,
    ...jsonContent({ $ref: '#/components/schemas/Error' }, { error: example }),
  };
}

const bearer = [{ bearerAuth: [] }];

const trustedOriginParams = [
  { $ref: '#/components/parameters/RequestedWith' },
  { $ref: '#/components/parameters/OriginHeader' },
];

const authErrors = {
  401: errorResponse('Missing, expired, or invalid access token', 'Access token required'),
  403: errorResponse('Forbidden', 'Insufficient permissions'),
};

function buildOpenApiSpec({ serverUrl } = {}) {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Petrolenz QA/QC API',
      version: '1.0.0',
      description: [
        'Engineering document quality-assurance API.',
        '',
        '**Auth:** send `Authorization: Bearer <accessToken>` on protected routes.',
        'Login and refresh set an httpOnly `refreshToken` cookie (path `/api/auth`).',
        '',
        '**CSRF:** mutating requests need a trusted `Origin` or `X-Requested-With: Petrolenz`.',
        'This UI adds that header automatically.',
        '',
        '**Roles:** `role_id` 1 = Master, 2 = Engineer. Admin routes are Master-only.',
        'QA/QC generate/history/stats are authenticated; non-Master users only see their own reports.',
        '',
        'The same QA/QC routes are also mounted at `/api/qc`.',
      ].join('\n'),
    },
    servers: [{ url: serverUrl || '/', description: 'Petrolenz QA/QC API' }],
    tags: [
      { name: 'Health', description: 'Liveness' },
      { name: 'Auth', description: 'Session, password reset, profile' },
      { name: 'QA/QC', description: 'Report generate, history, PDF' },
      { name: 'Sidebar', description: 'Dashboard navigation' },
      { name: 'Users', description: 'Master-only user administration' },
      { name: 'Roles', description: 'Master-only role administration' },
      { name: 'Permissions', description: 'Master-only permission catalog' },
    ],
    paths: {
      '/api/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          operationId: 'getHealth',
          security: [],
          responses: {
            200: {
              description: 'API is running',
              ...jsonContent(
                { $ref: '#/components/schemas/Health' },
                { ok: true, product: 'Petrolenz QA/QC' },
              ),
            },
          },
        },
      },

      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a user',
          description:
            'Master-only unless `AUTH_ALLOW_PUBLIC_REGISTER=true` (blocked in production). Public register cannot create Master. Password: 12+ chars with upper, lower, digit, and symbol.',
          operationId: 'registerUser',
          security: bearer,
          parameters: trustedOriginParams,
          requestBody: {
            required: true,
            ...jsonContent(
              { $ref: '#/components/schemas/RegisterRequest' },
              {
                username: 'engineer.one',
                email: 'engineer@petrolenz.local',
                password: 'ChangeMe123!x',
                role_id: 2,
              },
            ),
          },
          responses: {
            201: {
              description: 'User created',
              ...jsonContent({ $ref: '#/components/schemas/RegisterResponse' }),
            },
            400: errorResponse('Validation failed', 'username, email, and password are required.'),
            403: errorResponse('Not allowed to register', 'Insufficient permissions'),
            409: errorResponse('Email already registered', 'Email already registered.'),
            500: errorResponse('Server error', 'Registration failed'),
          },
        },
      },

      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login',
          description:
            'Returns an access JWT and sets a rotated httpOnly refresh cookie. Five failed attempts lock the account for 15 minutes (`423`). Rate limit: 8 / 15 min / IP.',
          operationId: 'login',
          security: [],
          parameters: trustedOriginParams,
          requestBody: {
            required: true,
            ...jsonContent(
              { $ref: '#/components/schemas/LoginRequest' },
              { email: 'admin@petrolenz.local', password: 'your-password' },
            ),
          },
          responses: {
            200: {
              description: 'Login successful. Copy `accessToken` into Authorize.',
              headers: {
                'Set-Cookie': {
                  schema: { type: 'string' },
                  description: 'httpOnly `refreshToken` cookie, path `/api/auth`',
                },
              },
              ...jsonContent(
                { $ref: '#/components/schemas/LoginResponse' },
                { message: 'Login successful', accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
              ),
            },
            400: errorResponse('Missing credentials', 'Email and password are required.'),
            401: errorResponse('Invalid credentials', 'Invalid email or password.'),
            423: errorResponse('Account locked', 'Account temporarily locked. Try again later.'),
            429: errorResponse('Rate limited', 'Too many login attempts. Try again after 15 minutes.'),
          },
        },
      },

      '/api/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Logout',
          description: 'Clears the hashed refresh token and the refresh cookie. Cookie path is `/api/auth`.',
          operationId: 'logout',
          security: [],
          parameters: trustedOriginParams,
          responses: {
            200: {
              description: 'Logged out',
              ...jsonContent({ $ref: '#/components/schemas/Message' }, { message: 'Logout successful' }),
            },
            500: errorResponse('Server error', 'Logout failed'),
          },
        },
      },

      '/api/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Refresh access token',
          description:
            'Reads the httpOnly `refreshToken` cookie, rotates it, and returns a new access JWT. Rate limit: 40 / 15 min / IP.',
          operationId: 'refreshSession',
          security: [{ cookieAuth: [] }],
          parameters: trustedOriginParams,
          responses: {
            200: {
              description: 'New access token',
              ...jsonContent(
                { $ref: '#/components/schemas/AccessTokenResponse' },
                { accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
              ),
            },
            401: errorResponse('Cookie missing', 'Refresh token missing'),
            403: errorResponse('Invalid refresh token', 'Invalid or expired refresh token'),
            429: errorResponse('Rate limited', 'Too many session refresh attempts.'),
          },
        },
      },

      '/api/auth/forgot-password': {
        post: {
          tags: ['Auth'],
          summary: 'Request password reset',
          description:
            'Always returns the same message (no email enumeration). Rate limit: 5 / 15 min / IP. Reset link is emailed when the address exists.',
          operationId: 'forgotPassword',
          security: [],
          parameters: trustedOriginParams,
          requestBody: {
            required: true,
            ...jsonContent({ $ref: '#/components/schemas/ForgotPasswordRequest' }, { email: 'user@petrolenz.local' }),
          },
          responses: {
            200: {
              description: 'Accepted',
              ...jsonContent(
                { $ref: '#/components/schemas/Message' },
                { message: 'If that email is registered, a reset link was sent.' },
              ),
            },
            400: errorResponse('Email required', 'Email is required.'),
            429: errorResponse('Rate limited', 'Too many password requests. Try again later.'),
          },
        },
      },

      '/api/auth/reset-password': {
        post: {
          tags: ['Auth'],
          summary: 'Reset password',
          description: 'Consumes a 30-minute reset token and invalidates the existing session.',
          operationId: 'resetPassword',
          security: [],
          parameters: trustedOriginParams,
          requestBody: {
            required: true,
            ...jsonContent(
              { $ref: '#/components/schemas/ResetPasswordRequest' },
              { token: 'hex-token-from-email', password: 'NewPassword123!' },
            ),
          },
          responses: {
            200: {
              description: 'Password updated',
              ...jsonContent({ $ref: '#/components/schemas/Message' }, { message: 'Password updated.' }),
            },
            400: errorResponse('Invalid token or password policy', 'Invalid or expired reset token.'),
            429: errorResponse('Rate limited', 'Too many password requests. Try again later.'),
          },
        },
      },

      '/api/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Current user',
          operationId: 'getMe',
          security: bearer,
          responses: {
            200: {
              description: 'Profile',
              ...jsonContent({ $ref: '#/components/schemas/MeResponse' }),
            },
            ...authErrors,
            404: errorResponse('User not found', 'User not found'),
          },
        },
      },

      '/api/qaqc/process-report': {
        post: {
          tags: ['QA/QC'],
          summary: 'Generate QA/QC report',
          description:
            'Upload 1–3 main documents and up to 5 support files. Allowed: pdf, docx, txt, csv, md, png, jpg, jpeg, webp, tif, tiff. Max 25 MB per file. Rate limit: 12 / hour / IP.',
          operationId: 'generateProcessReport',
          security: bearer,
          parameters: trustedOriginParams,
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: { $ref: '#/components/schemas/GenerateReportForm' },
              },
            },
          },
          responses: {
            200: {
              description: 'Report generated',
              ...jsonContent({ $ref: '#/components/schemas/ReportEnvelope' }),
            },
            400: errorResponse('Invalid upload', 'Main project document is required.'),
            ...authErrors,
            429: errorResponse('Rate limited', 'QA/QC generation rate limit reached. Try again later.'),
            500: errorResponse('Generation failed', 'Failed to generate QA/QC report.'),
          },
        },
      },

      '/api/qaqc/process-report/stream': {
        post: {
          tags: ['QA/QC'],
          summary: 'Generate report with live log (SSE)',
          description:
            'Same upload contract as generate, but the response is `text/event-stream`. Events: `log`, `report`, `error`, `done`.',
          operationId: 'generateProcessReportStream',
          security: bearer,
          parameters: trustedOriginParams,
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: { $ref: '#/components/schemas/GenerateReportForm' },
              },
            },
          },
          responses: {
            200: {
              description: 'Server-sent events stream',
              content: {
                'text/event-stream': {
                  schema: { type: 'string' },
                  example: 'event: log\ndata: {"line":"Initializing generation request..."}\n\n',
                },
              },
            },
            400: errorResponse('Invalid upload', 'File upload failed.'),
            ...authErrors,
            429: errorResponse('Rate limited', 'QA/QC generation rate limit reached. Try again later.'),
          },
        },
      },

      '/api/qaqc/reports': {
        get: {
          tags: ['QA/QC'],
          summary: 'Report history',
          description: 'Master sees all reports. Other roles see only their own.',
          operationId: 'listProcessReports',
          security: bearer,
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', minimum: 1, default: 1 },
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', minimum: 5, maximum: 500, default: 50 },
            },
          ],
          responses: {
            200: {
              description: 'Paged history',
              ...jsonContent({ $ref: '#/components/schemas/HistoryResponse' }),
            },
            ...authErrors,
            500: errorResponse('Server error', 'Failed to fetch report history.'),
          },
        },
      },

      '/api/qaqc/reports/{id}': {
        get: {
          tags: ['QA/QC'],
          summary: 'Get one report',
          description: 'Owner or Master. Missing or unauthorized reports return 404.',
          operationId: 'getProcessReport',
          security: bearer,
          parameters: [{ $ref: '#/components/parameters/ReportId' }],
          responses: {
            200: {
              description: 'Report',
              ...jsonContent({ $ref: '#/components/schemas/ReportEnvelope' }),
            },
            400: errorResponse('Invalid id', 'Invalid report id'),
            ...authErrors,
            404: errorResponse('Not found', 'Report not found'),
          },
        },
        patch: {
          tags: ['QA/QC'],
          summary: 'Update report title or markdown',
          operationId: 'updateProcessReport',
          security: bearer,
          parameters: [{ $ref: '#/components/parameters/ReportId' }, ...trustedOriginParams],
          requestBody: {
            required: true,
            ...jsonContent(
              { $ref: '#/components/schemas/UpdateReportRequest' },
              { report_title: 'Process QA/QC Report', report_markdown: '# Updated markdown' },
            ),
          },
          responses: {
            200: {
              description: 'Updated report',
              ...jsonContent({ $ref: '#/components/schemas/ReportEnvelope' }),
            },
            400: errorResponse('Invalid id', 'Invalid report id'),
            ...authErrors,
            404: errorResponse('Not found', 'Report not found'),
          },
        },
        delete: {
          tags: ['QA/QC'],
          summary: 'Delete report',
          operationId: 'deleteProcessReport',
          security: bearer,
          parameters: [{ $ref: '#/components/parameters/ReportId' }, ...trustedOriginParams],
          responses: {
            200: {
              description: 'Deleted',
              ...jsonContent({ $ref: '#/components/schemas/DeleteReportResponse' }, { message: 'Report deleted', id: 'a1b2c3d4e5f6a7b8' }),
            },
            400: errorResponse('Invalid id', 'Invalid report id'),
            ...authErrors,
            404: errorResponse('Not found', 'Report not found'),
          },
        },
      },

      '/api/qaqc/reports/{id}/download': {
        get: {
          tags: ['QA/QC'],
          summary: 'Download report PDF',
          operationId: 'downloadProcessReport',
          security: bearer,
          parameters: [{ $ref: '#/components/parameters/ReportId' }],
          responses: {
            200: {
              description: 'PDF file',
              content: {
                'application/pdf': {
                  schema: { type: 'string', format: 'binary' },
                },
              },
            },
            400: errorResponse('Invalid id', 'Invalid report id'),
            ...authErrors,
            404: errorResponse('Not found', 'Report not found'),
          },
        },
      },

      '/api/qaqc/dashboard-stats': {
        get: {
          tags: ['QA/QC'],
          summary: 'Dashboard report counts',
          operationId: 'getReportDashboardStats',
          security: bearer,
          responses: {
            200: {
              description: 'Counts scoped to the caller (Master sees all)',
              ...jsonContent({ $ref: '#/components/schemas/DashboardStats' }, { qaqcTotal: 12 }),
            },
            ...authErrors,
          },
        },
      },

      '/api/sidebar': {
        get: {
          tags: ['Sidebar'],
          summary: 'Dashboard menu',
          description: 'Administration and environment items are hidden for non-Master users.',
          operationId: 'getSidebar',
          security: bearer,
          responses: {
            200: {
              description: 'Sections with items',
              ...jsonContent({
                type: 'array',
                items: { $ref: '#/components/schemas/SidebarSection' },
              }),
            },
            ...authErrors,
          },
        },
      },

      '/api/users': {
        get: {
          tags: ['Users'],
          summary: 'List users',
          operationId: 'listUsers',
          security: bearer,
          responses: {
            200: {
              description: 'All users',
              ...jsonContent({ $ref: '#/components/schemas/UsersResponse' }),
            },
            ...authErrors,
          },
        },
      },

      '/api/users/{userId}': {
        delete: {
          tags: ['Users'],
          summary: 'Delete user',
          description: 'Cannot delete yourself or the last Master.',
          operationId: 'deleteUser',
          security: bearer,
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Public user id (`user_id`)',
            },
            ...trustedOriginParams,
          ],
          responses: {
            200: {
              description: 'Deleted',
              ...jsonContent({ $ref: '#/components/schemas/Message' }, { message: 'User deleted' }),
            },
            400: errorResponse('Not allowed', 'You cannot delete your own account.'),
            ...authErrors,
            404: errorResponse('Not found', 'User not found'),
          },
        },
      },

      '/api/roles': {
        get: {
          tags: ['Roles'],
          summary: 'List roles',
          operationId: 'listRoles',
          security: bearer,
          responses: {
            200: {
              description: 'Roles',
              ...jsonContent({ $ref: '#/components/schemas/RolesResponse' }),
            },
            ...authErrors,
          },
        },
        post: {
          tags: ['Roles'],
          summary: 'Create role',
          operationId: 'createRole',
          security: bearer,
          parameters: trustedOriginParams,
          requestBody: {
            required: true,
            ...jsonContent({ $ref: '#/components/schemas/RoleNameRequest' }, { name: 'Reviewer' }),
          },
          responses: {
            201: {
              description: 'Created',
              ...jsonContent({ $ref: '#/components/schemas/RoleEnvelope' }),
            },
            400: errorResponse('Name required', 'Role name is required'),
            ...authErrors,
          },
        },
      },

      '/api/roles/{id}': {
        patch: {
          tags: ['Roles'],
          summary: 'Rename role',
          operationId: 'updateRole',
          security: bearer,
          parameters: [{ $ref: '#/components/parameters/RoleId' }, ...trustedOriginParams],
          requestBody: {
            required: true,
            ...jsonContent({ $ref: '#/components/schemas/RoleNameRequest' }, { name: 'Engineer' }),
          },
          responses: {
            200: {
              description: 'Updated',
              ...jsonContent({ $ref: '#/components/schemas/RoleEnvelope' }),
            },
            400: errorResponse('Name required', 'Role name is required'),
            ...authErrors,
            404: errorResponse('Not found', 'Role not found'),
          },
        },
      },

      '/api/roles/{id}/permissions': {
        get: {
          tags: ['Roles'],
          summary: 'Role permission ids',
          operationId: 'getRolePermissions',
          security: bearer,
          parameters: [{ $ref: '#/components/parameters/RoleId' }],
          responses: {
            200: {
              description: 'Assigned permission ids',
              ...jsonContent(
                { $ref: '#/components/schemas/RolePermissionsResponse' },
                { permission_ids: [1, 2, 3] },
              ),
            },
            ...authErrors,
          },
        },
        put: {
          tags: ['Roles'],
          summary: 'Replace role permissions',
          operationId: 'setRolePermissions',
          security: bearer,
          parameters: [{ $ref: '#/components/parameters/RoleId' }, ...trustedOriginParams],
          requestBody: {
            required: true,
            ...jsonContent(
              { $ref: '#/components/schemas/SetRolePermissionsRequest' },
              { permission_ids: [1, 2] },
            ),
          },
          responses: {
            200: {
              description: 'Updated',
              ...jsonContent({ $ref: '#/components/schemas/Message' }, { message: 'Permissions updated' }),
            },
            ...authErrors,
          },
        },
      },

      '/api/permissions': {
        get: {
          tags: ['Permissions'],
          summary: 'List permissions',
          operationId: 'listPermissions',
          security: bearer,
          responses: {
            200: {
              description: 'Permission catalog',
              ...jsonContent({ $ref: '#/components/schemas/PermissionsResponse' }),
            },
            ...authErrors,
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access JWT from login or refresh. Expires in 15 minutes.',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'refreshToken',
          description: 'httpOnly refresh cookie set on login. Path `/api/auth`.',
        },
      },
      parameters: {
        ReportId: {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', pattern: '^[a-f0-9]{16}$' },
          description: '16-character hex report id',
          example: 'a1b2c3d4e5f6a7b8',
        },
        RoleId: {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'integer' },
          example: 2,
        },
        RequestedWith: {
          name: 'X-Requested-With',
          in: 'header',
          required: false,
          schema: { type: 'string', enum: ['Petrolenz'] },
          description: 'Required on mutating requests when `Origin` is absent.',
        },
        OriginHeader: {
          name: 'Origin',
          in: 'header',
          required: false,
          schema: { type: 'string' },
          description: 'Must match `FRONTEND_URL` (localhost is allowed in non-production).',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          required: ['error'],
          properties: {
            error: { type: 'string' },
            details: { type: 'string', description: 'Present only outside production' },
          },
        },
        Message: {
          type: 'object',
          properties: { message: { type: 'string' } },
        },
        Health: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            product: { type: 'string' },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: { type: 'string', maxLength: 255 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 12 },
            role_id: { type: 'integer', description: 'Master may set `1`. Others are created as Engineer (`2`).' },
          },
        },
        RegisterResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            accessToken: { type: 'string' },
          },
        },
        AccessTokenResponse: {
          type: 'object',
          properties: { accessToken: { type: 'string' } },
        },
        ForgotPasswordRequest: {
          type: 'object',
          required: ['email'],
          properties: { email: { type: 'string', format: 'email' } },
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['token', 'password'],
          properties: {
            token: { type: 'string' },
            password: { type: 'string', minLength: 12 },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            user_id: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string' },
            role_id: { type: 'integer' },
            last_login_at: { type: 'string', format: 'date-time', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        MeResponse: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/User' },
          },
        },
        UsersResponse: {
          type: 'object',
          properties: {
            users: { type: 'array', items: { $ref: '#/components/schemas/User' } },
          },
        },
        GenerateReportForm: {
          type: 'object',
          required: ['mainDocument'],
          properties: {
            documentType: { type: 'string', example: 'P&ID' },
            reportCategory: {
              type: 'string',
              example: 'process',
              description: 'Optional override: process, piping, pipeline, instrumentation, telecom, hvac, hse, electrical, mechanical, mechanical-rotating, mechanical-static, civil, general',
            },
            mainDocument: {
              type: 'array',
              minItems: 1,
              maxItems: 3,
              items: { type: 'string', format: 'binary' },
            },
            supportDocument: {
              type: 'array',
              maxItems: 5,
              items: { type: 'string', format: 'binary' },
            },
          },
        },
        Report: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            document_type: { type: 'string' },
            main_document_name: { type: 'string' },
            support_document_name: { type: 'string' },
            report_markdown: { type: 'string' },
            report_structured: { nullable: true },
            workflow: { type: 'string', example: 'qaqc' },
            report_title: { type: 'string' },
            checked_by_user_id: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        ReportEnvelope: {
          type: 'object',
          properties: { report: { $ref: '#/components/schemas/Report' } },
        },
        UpdateReportRequest: {
          type: 'object',
          properties: {
            report_title: { type: 'string', maxLength: 500 },
            report_markdown: { type: 'string' },
            report_structured: { description: 'Optional JSON payload' },
          },
        },
        DeleteReportResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            id: { type: 'string' },
          },
        },
        HistoryItem: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            document_type: { type: 'string' },
            file_name: { type: 'string' },
            report_title: { type: 'string' },
            checked_by: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time', nullable: true },
            status: { type: 'string', example: 'Completed' },
            score: { type: 'integer', nullable: true, minimum: 0, maximum: 100 },
            workflow: { type: 'string' },
          },
        },
        HistoryResponse: {
          type: 'object',
          properties: {
            history: { type: 'array', items: { $ref: '#/components/schemas/HistoryItem' } },
            pagination: { $ref: '#/components/schemas/Pagination' },
          },
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
        DashboardStats: {
          type: 'object',
          properties: { qaqcTotal: { type: 'integer' } },
        },
        SidebarSection: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/SidebarItem' },
            },
          },
        },
        SidebarItem: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            label: { type: 'string' },
            path: { type: 'string' },
            icon_key: { type: 'string' },
          },
        },
        Role: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        RoleNameRequest: {
          type: 'object',
          required: ['name'],
          properties: { name: { type: 'string', maxLength: 64 } },
        },
        RoleEnvelope: {
          type: 'object',
          properties: { role: { $ref: '#/components/schemas/Role' } },
        },
        RolesResponse: {
          type: 'object',
          properties: {
            roles: { type: 'array', items: { $ref: '#/components/schemas/Role' } },
          },
        },
        RolePermissionsResponse: {
          type: 'object',
          properties: {
            permission_ids: { type: 'array', items: { type: 'integer' } },
          },
        },
        SetRolePermissionsRequest: {
          type: 'object',
          properties: {
            permission_ids: { type: 'array', items: { type: 'integer' } },
          },
        },
        Permission: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            key: { type: 'string' },
            name: { type: 'string' },
          },
        },
        PermissionsResponse: {
          type: 'object',
          properties: {
            permissions: { type: 'array', items: { $ref: '#/components/schemas/Permission' } },
          },
        },
      },
    },
  };
}

module.exports = { buildOpenApiSpec };
