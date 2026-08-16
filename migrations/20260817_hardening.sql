USE radius;

-- One-time migration for installations created before 2026-08-17.
ALTER TABLE listings
  ADD COLUMN availability_status ENUM('available','reserved','sold','withdrawn')
  NOT NULL DEFAULT 'available' AFTER status;

-- Preserve completed-sale history: old code used moderation status=removed for sold items.
UPDATE listings l
JOIN (
  SELECT DISTINCT listing_id
  FROM trade_requests
  WHERE status='completed'
) t ON t.listing_id=l.id
SET l.availability_status='sold',
    l.status=CASE WHEN l.status='removed' THEN 'approved' ELSE l.status END;

CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_listing_public ON listings(status,availability_status,created_at);
CREATE INDEX idx_listing_user_state ON listings(user_id,status,availability_status);
CREATE INDEX idx_message_conv_id ON messages(conversation_id,id);
CREATE INDEX idx_message_unread ON messages(conversation_id,is_read,sender_id);
CREATE INDEX idx_trade_listing_status ON trade_requests(listing_id,status);
CREATE INDEX idx_prediction_listing_created ON fraud_predictions(listing_id,created_at);
