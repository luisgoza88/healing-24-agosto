-- Enable realtime for credits tables
ALTER PUBLICATION supabase_realtime ADD TABLE patient_credits;
ALTER PUBLICATION supabase_realtime ADD TABLE credit_transactions;

-- Create a function to notify on credits changes
CREATE OR REPLACE FUNCTION notify_credits_change()
RETURNS trigger AS $$
BEGIN
  -- Log for debugging
  RAISE LOG 'Credits change detected for patient_id: %', COALESCE(NEW.patient_id, OLD.patient_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for debugging
CREATE TRIGGER patient_credits_change_trigger
  AFTER INSERT OR UPDATE OR DELETE ON patient_credits
  FOR EACH ROW
  EXECUTE FUNCTION notify_credits_change();

CREATE TRIGGER credit_transactions_change_trigger
  AFTER INSERT OR UPDATE OR DELETE ON credit_transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_credits_change();

-- Add indexes to improve real-time performance
CREATE INDEX IF NOT EXISTS idx_patient_credits_patient_id ON patient_credits(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_credits_updated_at ON patient_credits(updated_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_patient_id ON credit_transactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);