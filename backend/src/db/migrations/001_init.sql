CREATE TABLE IF NOT EXISTS user_savings (
  id          SERIAL PRIMARY KEY,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency    VARCHAR(3)    NOT NULL DEFAULT 'USD',
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255)  NOT NULL,
  billing_date    SMALLINT      CHECK (billing_date BETWEEN 1 AND 31),
  due_date        SMALLINT      CHECK (due_date BETWEEN 1 AND 31),
  monthly_payment DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_debt      DECIMAL(12,2) NOT NULL DEFAULT 0,
  category        VARCHAR(100),
  is_paid         BOOLEAN       NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Seed one user_savings row so dashboard always has data
INSERT INTO user_savings (id, total_amount, currency) 
VALUES (1, 0, 'USD') 
ON CONFLICT (id) DO NOTHING;
