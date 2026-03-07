-- Drop tables if they exist (para re-crear)
DROP TABLE IF EXISTS fraud_alerts CASCADE;
DROP TABLE IF EXISTS vouchers CASCADE;

-- ============================================================
-- TABLA: vouchers
-- ============================================================
CREATE TABLE vouchers (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Datos extraidos del voucher
  reference_number VARCHAR(100),
  transaction_id VARCHAR(100),
  bank_serial VARCHAR(100),
  bank_origin VARCHAR(100),
  bank_destination VARCHAR(100),
  transfer_type VARCHAR(100),
  
  amount DECIMAL(15, 2),
  currency VARCHAR(3) DEFAULT 'COP',
  issue_date DATE,
  
  beneficiary VARCHAR(255),
  sender_name VARCHAR(255),
  payment_concept TEXT,
  
  -- Deteccion de fraude
  fraud_status VARCHAR(20),
  fraud_score INT DEFAULT 0,
  fraud_flags JSONB,
  
  -- OCR
  raw_ocr_text TEXT
);

-- ============================================================
-- TABLA: fraud_alerts
-- ============================================================
CREATE TABLE fraud_alerts (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  duplicate_voucher_id INT REFERENCES vouchers(id) ON DELETE CASCADE,
  original_voucher_id INT REFERENCES vouchers(id) ON DELETE CASCADE,
  
  alert_type VARCHAR(50),
  alert_message TEXT,
  alert_severity VARCHAR(20)
);

-- ============================================================
-- INDICES
-- ============================================================
CREATE INDEX idx_vouchers_reference ON vouchers(reference_number, bank_origin);
CREATE INDEX idx_vouchers_transaction ON vouchers(transaction_id);
CREATE INDEX idx_vouchers_amount_date ON vouchers(amount, issue_date);
CREATE INDEX idx_vouchers_beneficiary_date ON vouchers(beneficiary, issue_date);
CREATE INDEX idx_vouchers_fraud_status ON vouchers(fraud_status);
CREATE INDEX idx_vouchers_created_at ON vouchers(created_at DESC);

CREATE INDEX idx_alerts_type ON fraud_alerts(alert_type);
CREATE INDEX idx_alerts_severity ON fraud_alerts(alert_severity);
CREATE INDEX idx_alerts_created_at ON fraud_alerts(created_at DESC);

-- ============================================================
-- SAMPLE DATA (OPCIONAL)
-- ============================================================
-- Insertar un voucher de ejemplo para testing
INSERT INTO vouchers (
  reference_number,
  transaction_id,
  bank_origin,
  amount,
  currency,
  issue_date,
  beneficiary,
  transfer_type,
  fraud_status,
  fraud_score,
  fraud_flags
) VALUES (
  'M14046333',
  'TXN123456',
  'Nequi',
  58857.00,
  'COP',
  '2026-03-06',
  'Yonatan Aristizabal',
  'Envio Nequi',
  'CLEAN',
  0,
  '[]'::jsonb
);

INSERT INTO vouchers (
  reference_number,
  transaction_id,
  bank_origin,
  amount,
  currency,
  issue_date,
  beneficiary,
  transfer_type,
  fraud_status,
  fraud_score,
  fraud_flags
) VALUES (
  '0000048000',
  'TXN654321',
  'Bancolombia',
  247900.00,
  'COP',
  '2026-03-06',
  'DRISTRISANTY',
  'Transferencia Bancolombia',
  'CLEAN',
  0,
  '[]'::jsonb
);
