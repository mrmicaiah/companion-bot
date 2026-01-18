import { Env, User, Persona, SendBlueIncoming } from '../types';
import { getUserByPhone, createUser, updateUser, incrementFreeMessages } from '../db/users';
import { getPersonaByNumber, incrementPersonaStats } from '../db/personas';
import { trackEvent } from '../db/events';
import { isBlocked } from '../db/blocked';
import { logConversation, getRecentConversation } from '../db/conversations';
import { initializeUserMemory, loadHotMemory } from '../memory';
import { generateResponse } from '../services/claude';
import { sendMessage } from '../services/sendblue';

export async function handleIncomingMessage(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  let data: SendBlueIncoming;
  
  try {
    data = await request.json() as SendBlueIncoming;
  } catch (e) {
    console.error('Failed to parse incoming message:', e);
    return new Response('Invalid JSON', { status: 400 });
  }
  
  const fromNumber = data.from_number;
  const toNumber = data.to_number;
  const message = data.content;
  
  console.log(`Incoming: ${fromNumber} → ${toNumber}: ${message.substring(0, 50)}...`);
  
  // 1. Check if blocked
  if (await isBlocked(env, fromNumber)) {
    console.log(`Blocked number attempted contact: ${fromNumber}`);
    return new Response('OK');
  }
  
  // 2. Find persona by TO number
  const persona = await getPersonaByNumber(env, toNumber);
  if (!persona) {
    console.error('Unknown persona number:', toNumber);
    return new Response('OK');
  }
  
  // 3. Get or create user
  let user = await getUserByPhone(env, fromNumber);
  const isNewUser = !user;
  
  if (isNewUser) {
    user = await createUser(env, {
      phone_number: fromNumber,
      persona_id: persona.id,
    });
    
    await trackEvent(env, user.id, persona.id, 'first_message');
    await incrementPersonaStats(env, persona.id, 'total_users');
    
    // Initialize memory in R2
    await initializeUserMemory(env, persona.slug, user.id);
    await updateUser(env, user.id, { memory_initialized: true });
    
    console.log(`New user created: ${user.id} for persona ${persona.name}`);
  }
  
  // Safety check - should never happen but TypeScript wants it
  if (!user) {
    console.error('User is null after creation attempt');
    return new Response('Internal error', { status: 500 });
  }
  
  // 4. Log incoming message
  await logConversation(env, user.id, persona.id, 'user', message);
  
  // 5. Update last message timestamp
  await updateUser(env, user.id, {
    last_message_at: new Date().toISOString(),
    last_message_from: 'user',
  });
  
  // 6. Process message (non-blocking)
  ctx.waitUntil(processMessage(env, user, persona, message, isNewUser));
  
  return new Response('OK');
}

async function processMessage(
  env: Env,
  user: User,
  persona: Persona,
  message: string,
  isNewUser: boolean
): Promise<void> {
  try {
    // Route by user status
    switch (user.status) {
      case 'free':
        await handleFreeUser(env, user, persona, message, isNewUser);
        break;
        
      case 'hooked':
        await handleHookedUser(env, user, persona, message);
        break;
        
      case 'active':
        await handleActiveUser(env, user, persona, message);
        break;
        
      case 'paused':
      case 'churned':
        await handleInactiveUser(env, user, persona, message);
        break;
        
      default:
        await handleFreeUser(env, user, persona, message, isNewUser);
    }
  } catch (error) {
    console.error('Error processing message:', error);
    
    // Send a fallback message
    await sendMessage(env, persona, user.phone_number, 
      "Sorry, I got distracted for a second. What were you saying?");
  }
}

async function handleFreeUser(
  env: Env,
  user: User,
  persona: Persona,
  message: string,
  isNewUser: boolean
): Promise<void> {
  // Increment free message count
  await incrementFreeMessages(env, user.id);
  
  const updatedMessageCount = user.free_messages + 1;
  
  // Check if we should trigger the hook
  // For now: trigger at 50 messages (configurable per persona)
  const shouldHook = updatedMessageCount >= persona.max_free_messages;
  
  if (shouldHook) {
    // This would trigger the conversion flow
    // For Phase 1, we just continue with normal responses
    console.log(`User ${user.id} has hit hook threshold (${updatedMessageCount} messages)`);
  }
  
  // Generate and send response
  await generateAndSendResponse(env, user, persona, message, isNewUser);
}

async function handleHookedUser(
  env: Env,
  user: User,
  persona: Persona,
  message: string
): Promise<void> {
  // User has seen the hook but hasn't converted yet
  // Continue conversation but with limited features
  await generateAndSendResponse(env, user, persona, message, false);
}

async function handleActiveUser(
  env: Env,
  user: User,
  persona: Persona,
  message: string
): Promise<void> {
  // Verify subscription is still active
  if (user.subscription_status !== 'active') {
    await handleInactiveUser(env, user, persona, message);
    return;
  }
  
  // Full-featured response with complete memory access
  await generateAndSendResponse(env, user, persona, message, false);
}

async function handleInactiveUser(
  env: Env,
  user: User,
  persona: Persona,
  message: string
): Promise<void> {
  // User is paused or churned
  // Still respond but with limited engagement
  await generateAndSendResponse(env, user, persona, message, false);
}

async function generateAndSendResponse(
  env: Env,
  user: User,
  persona: Persona,
  message: string,
  isNewUser: boolean
): Promise<void> {
  // 1. Load hot memory from R2
  const hotMemory = await loadHotMemory(env, persona.slug, user.id);
  
  // 2. Get recent conversation from D1
  const recentMessages = await getRecentConversation(env, user.id, 10);
  
  // 3. Build context
  const context = {
    systemPrompt: persona.personality_prompt,
    hotMemory,
    relevantMemory: { people: [], conversations: [] }, // Phase 1: no warm/cold memory yet
    recentMessages,
    userMessage: message,
    userStatus: user.status,
  };
  
  // 4. Generate response
  const response = await generateResponse(env, context, isNewUser);
  
  // 5. Send via SendBlue
  await sendMessage(env, persona, user.phone_number, response);
  
  // 6. Log response
  await logConversation(env, user.id, persona.id, 'assistant', response);
  
  // 7. Update last message time
  await updateUser(env, user.id, {
    last_message_at: new Date().toISOString(),
    last_message_from: 'persona',
  });
  
  // 8. Increment conversation count
  await incrementPersonaStats(env, persona.id, 'total_conversations');
}
