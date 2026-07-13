/**
 * Shared code between client and server
 */

export interface DemoResponse {
  message: string;
}

export interface Invitation {
  id: string;
  title: string;
  message: string;
  designId:
    | "minimal"
    | "playful"
    | "elegant"
    | "modernist"
    | "love"
    | "natural"
    | "scary"
    | "futuristic"
    | "cyberpunk"
    | "hacked"
    | "birthday"
    | "space";
  effectId:
    | "static"
    | "glowing"
    | "glitching"
    | "smoke"
    | "decrypted"
    | "assemble"
    | "bouncing";
  date?: string;
  location?: string;
  fontId?: string;
  fontColor?: string;
}

export type CreateInvitationRequest = Omit<Invitation, "id">;

export interface InvitationResponse {
  invitation: Invitation;
}

export interface ListInvitationsResponse {
  invitations: Invitation[];
}

/** Returned by the create-invitation edge function */
export interface CreateInvitationResponse {
  invitation: Invitation;
  expiresAt: string;
  plan: "free" | "pro";
}

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "paused"
  | "canceled";

/** Row shape of public.subscriptions (written only by the paddle-webhook edge function) */
export interface Subscription {
  user_id: string;
  user_email: string;
  paddle_subscription_id: string;
  paddle_customer_id: string;
  status: SubscriptionStatus;
  price_id: string | null;
  billing_cycle: "month" | "year" | null;
  current_period_end: string | null;
  scheduled_change: unknown | null;
  last_event_at: string | null;
  created_at: string;
  updated_at: string;
}