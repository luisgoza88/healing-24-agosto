-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    appointments_reminder BOOLEAN DEFAULT true,
    appointments_confirmation BOOLEAN DEFAULT true,
    promotions BOOLEAN DEFAULT true,
    hot_studio_updates BOOLEAN DEFAULT true,
    payment_notifications BOOLEAN DEFAULT true,
    reminder_hours_before INTEGER DEFAULT 24,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_user_preferences UNIQUE (user_id)
);

-- Create RLS policies for notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own preferences
CREATE POLICY "Users can view own notification preferences" ON public.notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

-- Policy for users to insert their own preferences
CREATE POLICY "Users can insert own notification preferences" ON public.notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own preferences
CREATE POLICY "Users can update own notification preferences" ON public.notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy for users to delete their own preferences
CREATE POLICY "Users can delete own notification preferences" ON public.notification_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Create breathe_move_classes table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.breathe_move_classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_name VARCHAR(255) NOT NULL,
    instructor VARCHAR(255) NOT NULL,
    class_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_capacity INTEGER DEFAULT 15,
    current_capacity INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'scheduled',
    intensity VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT valid_capacity CHECK (current_capacity >= 0 AND current_capacity <= max_capacity),
    CONSTRAINT valid_status CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'))
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_breathe_move_classes_date ON public.breathe_move_classes(class_date);
CREATE INDEX IF NOT EXISTS idx_breathe_move_classes_status ON public.breathe_move_classes(status);

-- Create RLS policies for breathe_move_classes
ALTER TABLE public.breathe_move_classes ENABLE ROW LEVEL SECURITY;

-- Policy for anyone to view classes
CREATE POLICY "Anyone can view breathe move classes" ON public.breathe_move_classes
    FOR SELECT USING (true);

-- Policy for authenticated users to insert classes (for testing)
CREATE POLICY "Authenticated users can insert classes" ON public.breathe_move_classes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy for authenticated users to update classes (for testing)
CREATE POLICY "Authenticated users can update classes" ON public.breathe_move_classes
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create updated_at trigger for notification_preferences
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE
    ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_breathe_move_classes_updated_at BEFORE UPDATE
    ON public.breathe_move_classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();