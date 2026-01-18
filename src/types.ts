// ============================================
// ENVIRONMENT
// ============================================

export interface Env {
  DB: D1Database;
  MEMORY: R2Bucket;
  BACKUP: R2Bucket;
  ANTHROPIC_API_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  SENDBLUE_API_KEY: string;
  SENDBLUE_API_SECRET: string;
  RESEND_API_KEY: string;
  ADMIN_API_KEY: string;
  BASE_URL: string;
  PRICE_ID: string;
}

// ============================================
// DATABASE MODELS
// ============================================

export interface Persona {
  id: string;
  name: string;
  slug: string;
  phone_number: string | null;
  sendblue_number_id: string | null;
  tagline: string | null;
  bio: string | null;
  photo_url: string | null;
  age_display: string | null;
  location_display: string | null;
  personality_prompt: string;
  voice_notes: string | null;
  active: boolean;
  max_free_messages: number;
  total_users: number;
  total_conversations: number;
  conversion_rate: number;
  created_at: string;
  updated_at: string;
}

export type UserStatus = 'free' | 'hooked' | 'converting' | 'active' | 'paused' | 'churned';
export type SubscriptionStatus = 'none' | 'trialing' | 'active' | 'past_due' | 'canceled';

export interface User {
  id: string;
  phone_number: string;
  persona_id: string;
  email: string | null;
  verified_name: string | null;
  verified_age: number | null;
  birthdate: string | null;
  verified_at: string | null;
  verification_session_id: string | null;
  status: UserStatus;
  free_messages: number;
  engagement_score: number;
  hook_sent_at: string | null;
  hook_message_id: string | null;
  hook_followup_1_at: string | null;
  hook_followup_2_at: string | null;
  converted_at: string | null;
  churned_at: string | null;
  churn_reason: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_started_at: string | null;
  subscription_current_period_end: string | null;
  subscription_canceled_at: string | null;
  messages_this_month: number;
  messages_total: number;
  last_message_at: string | null;
  last_message_from: 'user' | 'persona' | null;
  memory_initialized: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  persona_id: string;
  role: 'user' | 'assistant';
  content: string;
  tokens_in: number | null;
  tokens_out: number | null;
  model_used: string | null;
  processed_for_memory: boolean;
  created_at: string;
}

export interface UsageLog {
  id: string;
  user_id: string;
  persona_id: string;
  date: string;
  messages_sent: number;
  messages_received: number;
  tokens_in: number;
  tokens_out: number;
  cost_claude_cents: number;
  cost_sendblue_cents: number;
  cost_total_cents: number;
  memory_reads: number;
  memory_writes: number;
  created_at: string;
}

export interface BlockedNumber {
  id: string;
  phone_number: string;
  reason: string | null;
  blocked_at: string;
  blocked_by: string | null;
}

export type ConversionEventType = 
  | 'first_message'
  | 'engaged'
  | 'hook_sent'
  | 'hook_clicked'
  | 'verification_started'
  | 'verification_completed'
  | 'verification_underage'
  | 'payment_started'
  | 'payment_completed'
  | 'churned'
  | 'subscription_canceled'
  | 'payment_failed';

export interface ConversionEvent {
  id: string;
  user_id: string;
  persona_id: string;
  event_type: ConversionEventType;
  metadata: string | null;
  created_at: string;
}

// ============================================
// MEMORY TYPES (R2)
// ============================================

export interface CoreMemory {
  name: string | null;
  age: string | null;
  location: string | null;
  job: {
    title: string | null;
    company: string | null;
    industry: string | null;
    notes: string | null;
  };
  relationship_status: string | null;
  living_situation: string | null;
  interests: string[];
  values: string[];
  communication_style: {
    humor: string | null;
    depth: string | null;
    pace: string | null;
    notes: string | null;
  };
  preferences: {
    likes: string[];
    dislikes: string[];
    pet_peeves: string[];
  };
  goals: string[];
  fears: string[];
  quirks: string[];
  last_updated: string;
}

export type Vibe = 'new' | 'friendly' | 'close' | 'intimate' | 'distant' | 'tense';
export type TrustLevel = 'new' | 'building' | 'established' | 'deep' | 'broken';
export type FlirtLevel = 'none' | 'light' | 'playful' | 'flirty' | 'spicy';

export interface RelationshipMemory {
  first_contact: string;
  vibe: Vibe;
  trust_level: TrustLevel;
  flirt_level: FlirtLevel;
  inside_jokes: string[];
  boundaries_set: string[];
  highlights: string[];
  patterns_noticed: string[];
  last_updated: string;
}

export interface PersonMemory {
  slug: string;
  name: string;
  relationship_to_user: string;
  key_facts: string[];
  sentiment: 'positive' | 'negative' | 'neutral' | 'complicated';
  first_mentioned: string;
  last_mentioned: string;
  mention_count: number;
}

export interface ConversationSummary {
  id: string;
  date: string;
  summary: string;
  topics: string[];
  people: string[];
  vibe: string;
  emotion: string;
  memorable_quote: string | null;
}

export interface ExpansionMonth {
  month: string;
  conversations: ConversationSummary[];
}

export interface ActiveThread {
  id: string;
  topic: string;
  prompt: string;
  created_at: string;
  last_referenced: string | null;
  resolved: boolean;
}

export interface ThreadsFile {
  active_threads: ActiveThread[];
}

// ============================================
// CONTEXT TYPES
// ============================================

export interface HotMemory {
  core: CoreMemory;
  relationship: RelationshipMemory;
  threads: ActiveThread[];
}

export interface RelevantMemory {
  people: PersonMemory[];
  conversations: ConversationSummary[];
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerateContext {
  systemPrompt: string;
  hotMemory: HotMemory;
  relevantMemory: RelevantMemory;
  recentMessages: Message[];
  userMessage: string;
  userStatus: UserStatus;
}

// ============================================
// SENDBLUE
// ============================================

export interface SendBlueIncoming {
  from_number: string;
  to_number: string;
  content: string;
  media_url?: string;
  message_type: 'message' | 'group_message';
  date_sent: string;
}

export interface SendBlueOutgoing {
  number: string;
  content: string;
  send_style?: 'celebration' | 'shooting_star' | 'fireworks' | 'lasers' | 'love' | 'confetti' | 'balloons' | 'spotlight' | 'echo' | 'invisible' | 'gentle' | 'loud' | 'slam';
  media_url?: string;
  status_callback?: string;
}
