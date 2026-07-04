import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { store } from "../repositories/store.js";

const router = Router();

const messageSchema = z.object({
  body: z.string().min(1).max(1000),
  conversationId: z.string().uuid().optional()
});

const tradeRequestSchema = z.object({
  note: z.string().max(1000).optional().default("")
});

const tradeActionSchema = z.object({
  action: z.enum(["accept", "reject", "cancel", "complete"])
});

const actionToStatus = {
  accept: "accepted",
  reject: "rejected",
  cancel: "cancelled",
  complete: "completed"
};

function emitToListing(req, listingId, event, payload) {
  req.app.get("io")?.to(listingId).emit(event, payload);
}

function isParticipant(conversation, userId) {
  return conversation?.buyerId === userId || conversation?.sellerId === userId;
}

async function conversationForRequest({ listing, user, conversationId, createForBuyer = false }) {
  if (listing.sellerId === user.id) {
    const conversations = await store.listConversationsForListing(listing.id, user.id);
    if (conversationId) {
      const selected = await store.getConversationById(conversationId);
      if (!selected || selected.listingId !== listing.id || selected.sellerId !== user.id) {
        return { error: "Conversation not found", status: 404 };
      }
      return { conversation: selected, conversations };
    }
    if (conversations.length === 1) return { conversation: conversations[0], conversations };
    if (conversations.length > 1) return { error: "Choose a buyer conversation", status: 409, conversations };
    return { error: "No buyer conversation for this listing yet", status: 409, conversations };
  }

  const conversations = await store.listConversationsForListing(listing.id, user.id);
  const existing = conversations[0];
  if (existing) return { conversation: existing, conversations };
  if (!createForBuyer) return { conversation: null, conversations };
  const conversation = await store.ensureConversation({
    listingId: listing.id,
    buyerId: user.id,
    sellerId: listing.sellerId
  });
  return { conversation, conversations: [conversation] };
}

router.get("/:listingId", requireAuth, async (req, res) => {
  const listing = await store.getListingById(req.params.listingId);
  if (!listing) return res.status(404).json({ error: "Listing not found" });

  const context = await conversationForRequest({
    listing,
    user: req.user,
    conversationId: req.query.conversationId,
    createForBuyer: false
  });
  if (context.error && context.status !== 409) return res.status(context.status).json({ error: context.error });
  if (!context.conversation) {
    return res.json({ conversation: null, conversations: context.conversations ?? [], items: [] });
  }
  if (!isParticipant(context.conversation, req.user.id)) return res.status(403).json({ error: "Forbidden" });

  res.json({
    conversation: context.conversation,
    conversations: context.conversations ?? [context.conversation],
    items: await store.listMessages(listing.id, { conversationId: context.conversation.id })
  });
});

router.post("/:listingId", requireAuth, async (req, res) => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid message" });
  const listing = await store.getListingById(req.params.listingId);
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  if (listing.status === "removed") return res.status(409).json({ error: "Listing is no longer available" });

  const context = await conversationForRequest({
    listing,
    user: req.user,
    conversationId: parsed.data.conversationId,
    createForBuyer: true
  });
  if (context.error) return res.status(context.status).json({ error: context.error, conversations: context.conversations ?? [] });
  if (!isParticipant(context.conversation, req.user.id)) return res.status(403).json({ error: "Forbidden" });

  const recipientId = req.user.id === context.conversation.sellerId ? context.conversation.buyerId : context.conversation.sellerId;
  const message = await store.createMessage({
    conversationId: context.conversation.id,
    listingId: listing.id,
    senderId: req.user.id,
    recipientId,
    body: parsed.data.body
  });
  emitToListing(req, listing.id, "chat:message", message);
  res.status(201).json({ conversation: context.conversation, item: message });
});

router.get("/:listingId/trades", requireAuth, async (req, res) => {
  const listing = await store.getListingById(req.params.listingId);
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  const trades = (await store.listTrades()).filter((trade) => (
    trade.listingId === listing.id
    && (listing.sellerId === req.user.id || trade.buyerId === req.user.id)
  ));
  res.json({ items: trades });
});

router.post("/:listingId/buy", requireAuth, async (req, res) => {
  const parsed = tradeRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid trade request" });
  const listing = await store.getListingById(req.params.listingId);
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  if (listing.sellerId === req.user.id) return res.status(403).json({ error: "Sellers cannot buy their own listing" });
  if (listing.status === "sold" || listing.status === "removed" || listing.status === "reserved") {
    return res.status(409).json({ error: "Listing is no longer available" });
  }

  try {
    const conversation = await store.ensureConversation({
      listingId: listing.id,
      buyerId: req.user.id,
      sellerId: listing.sellerId
    });
    const trade = await store.createTrade({
      listingId: listing.id,
      buyerId: req.user.id,
      sellerId: listing.sellerId,
      price: listing.price,
      status: "requested",
      note: parsed.data.note
    });
    const message = await store.createMessage({
      conversationId: conversation.id,
      listingId: listing.id,
      senderId: req.user.id,
      recipientId: listing.sellerId,
      body: `Buyer requested this item for ৳${Number(listing.price).toLocaleString()}.${parsed.data.note ? ` ${parsed.data.note}` : ""}`
    });
    emitToListing(req, listing.id, "chat:message", message);
    emitToListing(req, listing.id, "trade:requested", { listingId: listing.id, tradeId: trade.id });
    res.status(201).json({ trade, item: listing, message, conversation });
  } catch (err) {
    res.status(409).json({ error: err.message });
  }
});

router.post("/:listingId/trades/:tradeId/:action", requireAuth, async (req, res) => {
  const parsed = tradeActionSchema.safeParse({ action: req.params.action });
  if (!parsed.success) return res.status(400).json({ error: "Invalid trade action" });
  const listing = await store.getListingById(req.params.listingId);
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  const trade = await store.getTradeById(req.params.tradeId);
  if (!trade || trade.listingId !== listing.id) return res.status(404).json({ error: "Trade not found" });
  const action = parsed.data.action;

  if (["accept", "reject"].includes(action) && listing.sellerId !== req.user.id) {
    return res.status(403).json({ error: "Only the seller can perform this trade action" });
  }
  if (["cancel", "complete"].includes(action) && ![trade.buyerId, trade.sellerId].includes(req.user.id)) {
    return res.status(403).json({ error: "Only trade participants can perform this action" });
  }

  try {
    const result = await store.updateTradeStatus(trade.id, actionToStatus[action]);
    const conversation = await store.ensureConversation({
      listingId: listing.id,
      buyerId: trade.buyerId,
      sellerId: trade.sellerId
    });
    const message = await store.createMessage({
      conversationId: conversation.id,
      listingId: listing.id,
      senderId: req.user.id,
      recipientId: req.user.id === trade.sellerId ? trade.buyerId : trade.sellerId,
      body: `Trade ${result.trade.status}.`
    });
    emitToListing(req, listing.id, "chat:message", message);
    emitToListing(req, listing.id, "trade:updated", { listingId: listing.id, tradeId: trade.id, status: result.trade.status });
    res.json({ ...result, message, conversation });
  } catch (err) {
    res.status(409).json({ error: err.message });
  }
});

export default router;
