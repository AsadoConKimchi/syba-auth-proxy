CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('서버/인프라', '도메인/SSL', '개발비', '마케팅', '기타')),
  description TEXT NOT NULL DEFAULT '',
  amount_sats BIGINT NOT NULL CHECK (amount_sats > 0),
  btc_krw_rate NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (date DESC);
