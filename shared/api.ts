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
    | "hacked";           // NEW — LetterGlitch terminal background
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