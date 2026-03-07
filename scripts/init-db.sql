-- Crear tabla de vouchers procesados
CREATE TABLE IF NOT EXISTS vouchers (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Datos extraidos del voucher
  reference_number VARCHAR(50),
  transaction_id VARCHAR(100),
  bank_serial VARCHAR(100),
  bank_origin VARCHAR(100),
  bank_destination VARCHAR(100),
  transfer_type VARCHAR(50),
  
  amount DECIMAL(15, 2),
  currency VARCHAR(3) DEFAULT 'COP',
  issue_date DATE,
  
  beneficiary VARCHAR(200),
  sender_name VARCHAR(200),
  payment_concept TEXT,
  
  -- Deteccion de fraude
  fraud_status VARCHAR(20),
  fraud_score INT,
  fraud_flags JSONB,
  
  -- OCR
  raw_ocr_text TEXT,
  
  -- Indices para busqueda rapida
  UNIQUE(reference_number, bank_origin),
  INDEX idx_amount_date (amount, issue_date),
  INDEX idx_beneficiary_date (beneficiary, issue_date),
  INDEX idx_fraud_status (fraud_status),
  INDEX idx_created_at (created_at DESC)
);

-- Crear tabla de alertas generadas
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  duplicate_voucher_id INT REFERENCES vouchers(id),
  original_voucher_id INT REFERENCES vouchers(id),
  
  alert_type VARCHAR(50), -- DUPLICATE, SUSPICIOUS, etc
  alert_message TEXT,
  alert_severity VARCHAR(20), -- CRITICAL, HIGH, MEDIUM, LOW
  
  INDEX idx_alert_type (alert_type),
  INDEX idx_severity (alert_severity),
  INDEX idx_created_at (created_at DESC)
);
