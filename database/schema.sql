-- Reminders table
CREATE TABLE IF NOT EXISTS reminders (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE
);

-- Interviews table for LINE bot
CREATE TABLE IF NOT EXISTS interviews (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    interviewee_name VARCHAR(255) NOT NULL,
    interview_date DATE NOT NULL,
    interview_time TIME NOT NULL,
    reason TEXT,
    reminder_24h_sent BOOLEAN DEFAULT FALSE,
    reminder_3h_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_interviews_user_date_time 
ON interviews(user_id, interview_date, interview_time);

-- Create index for reminder queries
CREATE INDEX IF NOT EXISTS idx_interviews_reminder_check 
ON interviews(interview_date, interview_time, reminder_24h_sent, reminder_3h_sent);

-- Updated_at trigger (optional but recommended)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reminders_updated_at 
BEFORE UPDATE ON reminders 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interviews_updated_at 
BEFORE UPDATE ON interviews 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Get due reminders
CREATE OR REPLACE FUNCTION get_due_reminders()
RETURNS TABLE (
    id BIGINT,
    user_id VARCHAR(255),
    message TEXT,
    reminder_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT id, user_id, message, reminder_time, status, created_at
    FROM reminders
    WHERE status = 'pending'
      AND reminder_time <= NOW()
    ORDER BY reminder_time ASC;
END;
$$ LANGUAGE plpgsql;

-- Mark reminder as sent
CREATE OR REPLACE FUNCTION mark_reminder_sent(reminder_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE reminders
    SET status = 'sent', sent_at = NOW(), updated_at = NOW()
    WHERE id = reminder_id AND status = 'pending';
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Get interviews for a user
CREATE OR REPLACE FUNCTION get_user_interviews(user_id_param VARCHAR(255))
RETURNS TABLE (
    id BIGINT,
    interviewee_name VARCHAR(255),
    interview_date DATE,
    interview_time TIME,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT i.id, i.interviewee_name, i.interview_date, i.interview_time, i.reason, i.created_at
    FROM interviews i
    WHERE i.user_id = user_id_param
    ORDER BY i.interview_date ASC, i.interview_time ASC;
END;
$$ LANGUAGE plpgsql;
