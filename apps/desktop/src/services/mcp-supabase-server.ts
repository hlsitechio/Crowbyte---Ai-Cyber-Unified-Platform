/**
 * Supabase MCP Server
 * Exposes Supabase database operations as MCP tools
 * This server allows Venice.ai to interact with the Ghost AI Terminal's Supabase backend
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

class SupabaseMCPServer {
  private server: Server;
  private supabase: SupabaseClient;
  private supabaseAdmin: SupabaseClient;

  constructor() {
    // Initialize Supabase client (regular)
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Initialize Supabase Admin client (with service key for admin operations)
    this.supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Initialize MCP server
    this.server = new Server(
      {
        name: 'ghost-ai-supabase',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getTools(),
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_api_keys':
            return await this.getApiKeys();

          case 'get_api_key_by_service':
            return await this.getApiKeyByService(args as { serviceName: string });

          case 'create_api_key':
            return await this.createApiKey(args as {
              serviceName: string;
              keyName: string;
              keyValue: string;
              endpointUrl?: string;
            });

          case 'update_api_key':
            return await this.updateApiKey(args as {
              id: string;
              keyValue: string;
            });

          case 'delete_api_key':
            return await this.deleteApiKey(args as { id: string });

          case 'get_user_settings':
            return await this.getUserSettings(args as { userId: string });

          case 'update_user_settings':
            return await this.updateUserSettings(args as {
              userId: string;
              settings: Record<string, any>;
            });

          case 'get_api_usage':
            return await this.getApiUsage(args as { serviceName: string });

          case 'increment_api_usage':
            return await this.incrementApiUsage(args as {
              serviceName: string;
              dailyLimit?: number;
            });

          case 'create_storage_bucket':
            return await this.createStorageBucket(args as {
              bucketName: string;
              isPublic?: boolean;
              fileSizeLimit?: number;
              allowedMimeTypes?: string[];
            });

          case 'run_sql':
            return await this.runSql(args as { sql: string });

          case 'list_all_users':
            return await this.listAllUsers();

          case 'get_user_by_email':
            return await this.getUserByEmail(args as { email: string });

          case 'update_user_metadata':
            return await this.updateUserMetadata(args as {
              userId: string;
              metadata: Record<string, any>;
            });

          case 'list_all_buckets':
            return await this.listAllBuckets();

          case 'delete_storage_bucket':
            return await this.deleteStorageBucket(args as { bucketName: string });

          case 'list_bucket_files':
            return await this.listBucketFiles(args as {
              bucketName: string;
              path?: string;
            });

          case 'delete_file':
            return await this.deleteFile(args as {
              bucketName: string;
              filePath: string;
            });

          case 'generate_magic_link':
            return await this.generateMagicLink(args as {
              email: string;
              redirectTo?: string;
            });

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private getTools(): Tool[] {
    return [
      {
        name: 'get_api_keys',
        description: 'Get all active API keys from the database',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_api_key_by_service',
        description: 'Get API key for a specific service (e.g., venice, inoreader)',
        inputSchema: {
          type: 'object',
          properties: {
            serviceName: {
              type: 'string',
              description: 'Service name (e.g., venice, inoreader, openai)',
            },
          },
          required: ['serviceName'],
        },
      },
      {
        name: 'create_api_key',
        description: 'Create a new API key in the database',
        inputSchema: {
          type: 'object',
          properties: {
            serviceName: {
              type: 'string',
              description: 'Service name',
            },
            keyName: {
              type: 'string',
              description: 'UilKeySkeleton identifier (e.g., api_key, client_id)',
            },
            keyValue: {
              type: 'string',
              description: 'The actual API key value',
            },
            endpointUrl: {
              type: 'string',
              description: 'Optional API endpoint URL',
            },
          },
          required: ['serviceName', 'keyName', 'keyValue'],
        },
      },
      {
        name: 'update_api_key',
        description: 'Update an existing API key',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'API key UUID',
            },
            keyValue: {
              type: 'string',
              description: 'New API key value',
            },
          },
          required: ['id', 'keyValue'],
        },
      },
      {
        name: 'delete_api_key',
        description: 'Delete (deactivate) an API key',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'API key UUID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_user_settings',
        description: 'Get user-specific settings and preferences',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User UUID',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'update_user_settings',
        description: 'Update user settings',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User UUID',
            },
            settings: {
              type: 'object',
              description: 'Settings object to update',
            },
          },
          required: ['userId', 'settings'],
        },
      },
      {
        name: 'get_api_usage',
        description: 'Get current API usage statistics for a service',
        inputSchema: {
          type: 'object',
          properties: {
            serviceName: {
              type: 'string',
              description: 'Service name (e.g., venice, openai)',
            },
          },
          required: ['serviceName'],
        },
      },
      {
        name: 'increment_api_usage',
        description: 'Increment API usage counter and get updated statistics',
        inputSchema: {
          type: 'object',
          properties: {
            serviceName: {
              type: 'string',
              description: 'Service name',
            },
            dailyLimit: {
              type: 'number',
              description: 'Daily API call limit (default: 5000)',
            },
          },
          required: ['serviceName'],
        },
      },
      {
        name: 'create_storage_bucket',
        description: 'Create a new Supabase storage bucket',
        inputSchema: {
          type: 'object',
          properties: {
            bucketName: {
              type: 'string',
              description: 'Name of the storage bucket',
            },
            isPublic: {
              type: 'boolean',
              description: 'Whether the bucket is publicly accessible (default: true)',
            },
            fileSizeLimit: {
              type: 'number',
              description: 'File size limit in bytes (default: 5242880 = 5MB)',
            },
            allowedMimeTypes: {
              type: 'array',
              description: 'Array of allowed MIME types',
              items: {
                type: 'string',
              },
            },
          },
          required: ['bucketName'],
        },
      },
      {
        name: 'run_sql',
        description: 'Execute SQL query on Supabase database',
        inputSchema: {
          type: 'object',
          properties: {
            sql: {
              type: 'string',
              description: 'SQL query to execute',
            },
          },
          required: ['sql'],
        },
      },
      {
        name: 'list_all_users',
        description: 'List all users from auth.users table (ADMIN ONLY - requires service key)',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_user_by_email',
        description: 'Get user details by email from auth.users (ADMIN ONLY)',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'User email address',
            },
          },
          required: ['email'],
        },
      },
      {
        name: 'update_user_metadata',
        description: 'Update user metadata directly (ADMIN ONLY - can modify any user)',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'User UUID',
            },
            metadata: {
              type: 'object',
              description: 'Metadata object to merge with existing user_metadata',
            },
          },
          required: ['userId', 'metadata'],
        },
      },
      {
        name: 'list_all_buckets',
        description: 'List ALL storage buckets including private ones (ADMIN ONLY)',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'delete_storage_bucket',
        description: 'Delete a storage bucket (ADMIN ONLY)',
        inputSchema: {
          type: 'object',
          properties: {
            bucketName: {
              type: 'string',
              description: 'Name of the bucket to delete',
            },
          },
          required: ['bucketName'],
        },
      },
      {
        name: 'list_bucket_files',
        description: 'List all files in a storage bucket (ADMIN ONLY - bypasses RLS)',
        inputSchema: {
          type: 'object',
          properties: {
            bucketName: {
              type: 'string',
              description: 'Bucket name',
            },
            path: {
              type: 'string',
              description: 'Optional folder path within bucket (default: root)',
            },
          },
          required: ['bucketName'],
        },
      },
      {
        name: 'delete_file',
        description: 'Delete any file from storage (ADMIN ONLY - can delete any user files)',
        inputSchema: {
          type: 'object',
          properties: {
            bucketName: {
              type: 'string',
              description: 'Bucket name',
            },
            filePath: {
              type: 'string',
              description: 'Full file path within bucket (e.g., "user-id/profile.png")',
            },
          },
          required: ['bucketName', 'filePath'],
        },
      },
      {
        name: 'generate_magic_link',
        description: 'Generate a magic link for user login (ADMIN ONLY)',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'User email address',
            },
            redirectTo: {
              type: 'string',
              description: 'Optional redirect URL after login',
            },
          },
          required: ['email'],
        },
      },
    ];
  }

  // API Keys operations
  private async getApiKeys() {
    const { data, error } = await this.supabase
      .from('api_keys')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  private async getApiKeyByService(args: { serviceName: string }) {
    const { data, error } = await this.supabase
      .from('api_keys')
      .select('*')
      .eq('service_name', args.serviceName)
      .eq('is_active', true)
      .single();

    if (error) throw error;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  private async createApiKey(args: {
    serviceName: string;
    keyName: string;
    keyValue: string;
    endpointUrl?: string;
  }) {
    const { data, error } = await this.supabase
      .from('api_keys')
      .insert([
        {
          service_name: args.serviceName,
          key_name: args.keyName,
          key_value: args.keyValue,
          endpoint_url: args.endpointUrl,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return {
      content: [
        {
          type: 'text',
          text: `API key created successfully: ${JSON.stringify(data, null, 2)}`,
        },
      ],
    };
  }

  private async updateApiKey(args: { id: string; keyValue: string }) {
    const { data, error } = await this.supabase
      .from('api_keys')
      .update({ key_value: args.keyValue })
      .eq('id', args.id)
      .select()
      .single();

    if (error) throw error;

    return {
      content: [
        {
          type: 'text',
          text: `API key updated successfully: ${JSON.stringify(data, null, 2)}`,
        },
      ],
    };
  }

  private async deleteApiKey(args: { id: string }) {
    const { data, error } = await this.supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', args.id)
      .select()
      .single();

    if (error) throw error;

    return {
      content: [
        {
          type: 'text',
          text: `API key deactivated successfully: ${JSON.stringify(data, null, 2)}`,
        },
      ],
    };
  }

  // User Settings operations
  private async getUserSettings(args: { userId: string }) {
    const { data, error } = await this.supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', args.userId)
      .single();

    if (error) throw error;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  private async updateUserSettings(args: {
    userId: string;
    settings: Record<string, any>;
  }) {
    const { data, error } = await this.supabase
      .from('user_settings')
      .upsert({
        user_id: args.userId,
        ...args.settings,
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;

    return {
      content: [
        {
          type: 'text',
          text: `User settings updated: ${JSON.stringify(data, null, 2)}`,
        },
      ],
    };
  }

  // API Usage Tracking operations
  private async getApiUsage(args: { serviceName: string }) {
    const { data, error } = await this.supabase.rpc('get_api_usage', {
      p_service_name: args.serviceName,
    });

    if (error) throw error;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  private async incrementApiUsage(args: {
    serviceName: string;
    dailyLimit?: number;
  }) {
    const { data, error } = await this.supabase.rpc('increment_api_usage', {
      p_service_name: args.serviceName,
      p_daily_limit: args.dailyLimit || 5000,
    });

    if (error) throw error;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  // Storage Bucket operations
  private async createStorageBucket(args: {
    bucketName: string;
    isPublic?: boolean;
    fileSizeLimit?: number;
    allowedMimeTypes?: string[];
  }) {
    const { data, error } = await this.supabaseAdmin.storage.createBucket(args.bucketName, {
      public: args.isPublic ?? true,
      fileSizeLimit: args.fileSizeLimit ?? 5242880, // 5MB default
      allowedMimeTypes: args.allowedMimeTypes ?? [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
      ],
    });

    if (error) throw error;

    return {
      content: [
        {
          type: 'text',
          text: `Storage bucket created successfully: ${JSON.stringify(data, null, 2)}`,
        },
      ],
    };
  }

  // SQL execution
  private async runSql(args: { sql: string }) {
    const { data, error } = await this.supabase.rpc('exec_sql', {
      sql: args.sql,
    });

    if (error) throw error;

    return {
      content: [
        {
          type: 'text',
          text: `SQL executed successfully: ${JSON.stringify(data, null, 2)}`,
        },
      ],
    };
  }

  // Admin-only Auth operations
  private async listAllUsers() {
    const { data, error } = await this.supabaseAdmin.auth.admin.listUsers();

    if (error) throw error;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              total: data.users.length,
              users: data.users.map((user) => ({
                id: user.id,
                email: user.email,
                created_at: user.created_at,
                email_confirmed_at: user.email_confirmed_at,
                last_sign_in_at: user.last_sign_in_at,
                user_metadata: user.user_metadata,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getUserByEmail(args: { email: string }) {
    const { data, error } = await this.supabaseAdmin.auth.admin.listUsers();

    if (error) throw error;

    const user = data.users.find((u) => u.email === args.email);

    if (!user) {
      throw new Error(`User not found: ${args.email}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(user, null, 2),
        },
      ],
    };
  }

  private async updateUserMetadata(args: {
    userId: string;
    metadata: Record<string, any>;
  }) {
    const { data, error } = await this.supabaseAdmin.auth.admin.updateUserById(
      args.userId,
      {
        user_metadata: args.metadata,
      }
    );

    if (error) throw error;

    return {
      content: [
        {
          type: 'text',
          text: `User metadata updated successfully:\n${JSON.stringify(
            data.user.user_metadata,
            null,
            2
          )}`,
        },
      ],
    };
  }

  // Admin-only Storage operations
  private async listAllBuckets() {
    const { data, error } = await this.supabaseAdmin.storage.listBuckets();

    if (error) throw error;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              total: data.length,
              buckets: data.map((bucket) => ({
                id: bucket.id,
                name: bucket.name,
                public: bucket.public,
                file_size_limit: bucket.file_size_limit,
                allowed_mime_types: bucket.allowed_mime_types,
                created_at: bucket.created_at,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async deleteStorageBucket(args: { bucketName: string }) {
    const { data, error } = await this.supabaseAdmin.storage.deleteBucket(
      args.bucketName
    );

    if (error) throw error;

    return {
      content: [
        {
          type: 'text',
          text: `Storage bucket "${args.bucketName}" deleted successfully: ${JSON.stringify(
            data,
            null,
            2
          )}`,
        },
      ],
    };
  }

  private async listBucketFiles(args: { bucketName: string; path?: string }) {
    const { data, error } = await this.supabaseAdmin.storage
      .from(args.bucketName)
      .list(args.path || '', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) throw error;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              bucket: args.bucketName,
              path: args.path || '/',
              total: data.length,
              files: data.map((file) => ({
                name: file.name,
                id: file.id,
                created_at: file.created_at,
                updated_at: file.updated_at,
                size: file.metadata?.size,
                mimetype: file.metadata?.mimetype,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async deleteFile(args: { bucketName: string; filePath: string }) {
    const { data, error } = await this.supabaseAdmin.storage
      .from(args.bucketName)
      .remove([args.filePath]);

    if (error) throw error;

    return {
      content: [
        {
          type: 'text',
          text: `File deleted successfully: ${args.bucketName}/${args.filePath}\n${JSON.stringify(
            data,
            null,
            2
          )}`,
        },
      ],
    };
  }

  private async generateMagicLink(args: {
    email: string;
    redirectTo?: string;
  }) {
    const { data, error } = await this.supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: args.email,
      options: {
        redirectTo: args.redirectTo,
      },
    });

    if (error) throw error;

    return {
      content: [
        {
          type: 'text',
          text: `Magic link generated for ${args.email}:\n\n${JSON.stringify(
            data,
            null,
            2
          )}`,
        },
      ],
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🗄️  Supabase MCP Server started');
  }
}

// Start the server
const server = new SupabaseMCPServer();
server.start().catch((error) => {
  console.error('Failed to start Supabase MCP server:', error);
  process.exit(1);
});
