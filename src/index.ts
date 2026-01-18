import { Env } from './types';
import { handleIncomingMessage } from './handlers/sms';
import { handleStripeWebhook } from './handlers/stripe';
import { processScheduledJobs } from './handlers/scheduled';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    try {
      // CORS preflight
      if (request.method === 'OPTIONS') {
        return handleCors();
      }
      
      // SendBlue webhook - incoming SMS
      if (url.pathname === '/webhook/sms' && request.method === 'POST') {
        return handleIncomingMessage(request, env, ctx);
      }
      
      // Stripe webhook
      if (url.pathname === '/webhook/stripe' && request.method === 'POST') {
        return handleStripeWebhook(request, env);
      }
      
      // Health check
      if (url.pathname === '/health') {
        return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      // Debug: list personas
      if (url.pathname === '/debug/personas' && request.method === 'GET') {
        const apiKey = request.headers.get('x-api-key');
        if (apiKey !== env.ADMIN_API_KEY) {
          return new Response('Unauthorized', { status: 401 });
        }
        
        const personas = await env.DB.prepare('SELECT id, name, slug, phone_number, active FROM personas').all();
        return new Response(JSON.stringify(personas.results, null, 2), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      // Debug: list users
      if (url.pathname === '/debug/users' && request.method === 'GET') {
        const apiKey = request.headers.get('x-api-key');
        if (apiKey !== env.ADMIN_API_KEY) {
          return new Response('Unauthorized', { status: 401 });
        }
        
        const users = await env.DB.prepare(`
          SELECT u.id, u.phone_number, u.status, u.free_messages, u.subscription_status, p.name as persona_name
          FROM users u
          JOIN personas p ON u.persona_id = p.id
          ORDER BY u.created_at DESC
          LIMIT 50
        `).all();
        return new Response(JSON.stringify(users.results, null, 2), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      return new Response('Not found', { status: 404 });
      
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
  
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(processScheduledJobs(event, env));
  },
};

function handleCors(): Response {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    },
  });
}
