-- Crear tabla para las clases de Breathe & Move
CREATE TABLE breathe_move_classes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    class_name VARCHAR(100) NOT NULL,
    instructor VARCHAR(100) NOT NULL,
    class_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_capacity INTEGER DEFAULT 12,
    current_capacity INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'scheduled',
    intensity VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT check_capacity CHECK (current_capacity <= max_capacity),
    CONSTRAINT check_status CHECK (status IN ('scheduled', 'cancelled', 'completed'))
);

-- Crear tabla para inscripciones a clases
CREATE TABLE breathe_move_enrollments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    class_id UUID REFERENCES breathe_move_classes(id) ON DELETE CASCADE,
    package_id UUID REFERENCES breathe_move_packages(id),
    status VARCHAR(50) DEFAULT 'confirmed',
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, class_id),
    CONSTRAINT check_enrollment_status CHECK (status IN ('confirmed', 'cancelled', 'attended', 'no_show'))
);

-- Crear tabla para paquetes de clases
CREATE TABLE breathe_move_packages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    package_type VARCHAR(50) NOT NULL,
    classes_included INTEGER NOT NULL,
    classes_remaining INTEGER NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    expires_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'active',
    CONSTRAINT check_package_status CHECK (status IN ('active', 'expired', 'used'))
);

-- Crear índices para mejor rendimiento
CREATE INDEX idx_breathe_move_classes_date ON breathe_move_classes(class_date);
CREATE INDEX idx_breathe_move_classes_name ON breathe_move_classes(class_name);
CREATE INDEX idx_breathe_move_enrollments_user ON breathe_move_enrollments(user_id);
CREATE INDEX idx_breathe_move_enrollments_class ON breathe_move_enrollments(class_id);
CREATE INDEX idx_breathe_move_packages_user ON breathe_move_packages(user_id);

-- Trigger para actualizar current_capacity
CREATE OR REPLACE FUNCTION update_class_capacity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE breathe_move_classes 
        SET current_capacity = current_capacity + 1
        WHERE id = NEW.class_id;
    ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.status = 'cancelled') THEN
        UPDATE breathe_move_classes 
        SET current_capacity = current_capacity - 1
        WHERE id = COALESCE(NEW.class_id, OLD.class_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_class_capacity_trigger
AFTER INSERT OR UPDATE OR DELETE ON breathe_move_enrollments
FOR EACH ROW
WHEN (NEW.status = 'confirmed' OR OLD.status = 'confirmed')
EXECUTE FUNCTION update_class_capacity();

-- RLS policies
ALTER TABLE breathe_move_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE breathe_move_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE breathe_move_packages ENABLE ROW LEVEL SECURITY;

-- Políticas para clases (todos pueden ver)
CREATE POLICY "Anyone can view classes" ON breathe_move_classes
    FOR SELECT USING (true);

-- Políticas para inscripciones
CREATE POLICY "Users can view their own enrollments" ON breathe_move_enrollments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own enrollments" ON breathe_move_enrollments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enrollments" ON breathe_move_enrollments
    FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para paquetes
CREATE POLICY "Users can view their own packages" ON breathe_move_packages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own packages" ON breathe_move_packages
    FOR INSERT WITH CHECK (auth.uid() = user_id);