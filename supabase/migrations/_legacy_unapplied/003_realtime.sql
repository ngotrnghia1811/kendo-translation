-- Migration 003: Enable Supabase Realtime on segments table

-- Enable realtime for the segments table so clients receive live updates
ALTER PUBLICATION supabase_realtime ADD TABLE segments;

-- updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for segments table
CREATE TRIGGER segments_updated_at
    BEFORE UPDATE ON segments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for document_settings table
CREATE TRIGGER document_settings_updated_at
    BEFORE UPDATE ON document_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
