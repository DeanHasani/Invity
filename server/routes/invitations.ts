import { RequestHandler } from "express";
import { Invitation, CreateInvitationRequest } from "@shared/api";
import { nanoid } from "nanoid";

// Mock database in memory
const invitations: Map<string, Invitation> = new Map();

export const handleCreateInvitation: RequestHandler = (req, res) => {
  const body = req.body as CreateInvitationRequest;
  
  // Basic validation
  if (!body.title || !body.message) {
    res.status(400).json({ error: "Missing title or message" });
    return;
  }

  const id = nanoid(10); // Generate a nice short ID
  const invitation: Invitation = {
    ...body,
    id,
  };

  invitations.set(id, invitation);
  res.json({ invitation });
};

export const handleGetInvitation: RequestHandler = (req, res) => {
  const { id } = req.params;
  const invitation = invitations.get(id);

  if (!invitation) {
    res.status(404).json({ error: "Invitation not found" });
    return;
  }

  res.json({ invitation });
};
