-- Crear tabla para los tipos de clases de Breathe & Move
CREATE TABLE IF NOT EXISTS breathe_move_classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 50,
  icon VARCHAR(50),
  color VARCHAR(7),
  intensity VARCHAR(10) CHECK (intensity IN ('low', 'medium', 'high')),
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla para los paquetes de precios
CREATE TABLE IF NOT EXISTS breathe_move_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2),
  classes_count INTEGER, -- NULL significa ilimitado
  validity_amount INTEGER NOT NULL,
  validity_unit VARCHAR(10) CHECK (validity_unit IN ('days', 'months', 'year')),
  is_popular BOOLEAN DEFAULT false,
  is_special BOOLEAN DEFAULT false,
  valid_until DATE,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla para las clases programadas (horarios)
CREATE TABLE IF NOT EXISTS breathe_move_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES breathe_move_classes(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES instructors(id),
  class_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_capacity INTEGER DEFAULT 12,
  current_capacity INTEGER DEFAULT 0,
  location VARCHAR(200),
  status VARCHAR(20) CHECK (status IN ('scheduled', 'cancelled', 'completed')) DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla para las inscripciones de usuarios
CREATE TABLE IF NOT EXISTS user_breathe_move_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES breathe_move_schedule(id) ON DELETE CASCADE,
  package_id UUID REFERENCES breathe_move_packages(id),
  status VARCHAR(20) CHECK (status IN ('enrolled', 'cancelled', 'completed', 'no_show')) DEFAULT 'enrolled',
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, schedule_id)
);

-- Crear tabla para las compras de paquetes
CREATE TABLE IF NOT EXISTS user_package_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID REFERENCES breathe_move_packages(id),
  price_paid DECIMAL(10, 2) NOT NULL,
  classes_remaining INTEGER, -- NULL para paquetes ilimitados
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) CHECK (status IN ('active', 'expired', 'cancelled')) DEFAULT 'active',
  payment_method VARCHAR(50),
  transaction_id VARCHAR(200)
);

-- Insertar los tipos de clases
INSERT INTO breathe_move_classes (name, description, icon, color, intensity, sort_order) VALUES
('WildPower', 'Pilates + funcional + pesas ligeras. Fuerza y resistencia sin impacto.', 'dumbbell', '#E67E50', 'high', 1),
('GutReboot', 'Pilates suave + técnicas somáticas. Activa el core, mejora digestión y calma.', 'stomach', '#85C1E9', 'low', 2),
('FireRush', 'Intervalos de cardio Pilates sin impacto. Resistencia y energía con control.', 'fire', '#E74C3C', 'high', 3),
('BloomBeat', 'Flujos creativos con música. Presencia, fuerza y suavidad en movimiento.', 'flower', '#F5B7B1', 'medium', 4),
('WindMove', 'Yoga + movilidad. Libera tensión y amplía rango de movimiento.', 'weather-windy', '#AED6F1', 'low', 5),
('ForestFire', 'La base del método. Estabilidad, control y postura desde el centro.', 'pine-tree', '#52BE80', 'medium', 6),
('StoneBarre', 'Fusión Barre + Pilates. Esculpe, alarga y fortalece con precisión.', 'human-handsup', '#A9A9A9', 'medium', 7),
('OmRoot', 'Posturas esenciales y respiración. Alinea, fortalece y calma.', 'spa', '#A9DFBF', 'low', 8),
('HazeRocket', 'Ashtanga moderno. Agilidad, fuerza y libertad en transiciones.', 'rocket-launch', '#BB8FCE', 'high', 9),
('MoonRelief', 'Respiración guiada. Regula estrés y restaura energía vital.', 'moon-waning-crescent', '#5D6D7E', 'low', 10),
('WindFlow', 'Secuencias dinámicas. Fluidez, energía y conexión en movimiento constante.', 'air', '#85C1E2', 'medium', 11);

-- Insertar los paquetes de precios
INSERT INTO breathe_move_packages (name, description, price, classes_count, validity_amount, validity_unit, sort_order) VALUES
('1 Clase', 'Clase individual o clase de prueba', 65000, 1, 1, 'days', 1),
('Semana', 'Acceso ilimitado por 1 semana', 170000, NULL, 7, 'days', 2),
('4 Clases', 'Paquete de 4 clases', 190000, 4, 1, 'months', 3);

INSERT INTO breathe_move_packages (name, description, price, classes_count, validity_amount, validity_unit, is_popular, sort_order) VALUES
('8 Clases', 'Nuestro paquete más popular', 350000, 8, 2, 'months', true, 4);

INSERT INTO breathe_move_packages (name, description, price, classes_count, validity_amount, validity_unit, sort_order) VALUES
('12 Clases', 'Paquete trimestral', 480000, 12, 3, 'months', 5),
('24 Clases', 'Paquete semestral', 720000, 24, 6, 'months', 6),
('Mensualidad', 'Clases ilimitadas por mes', 450000, NULL, 1, 'months', 7),
('Bimestral', 'Clases ilimitadas por 2 meses', 800000, NULL, 2, 'months', 8),
('Trimestre', 'Clases ilimitadas por 3 meses', 1100000, NULL, 3, 'months', 9),
('Semestral', 'Clases ilimitadas por 6 meses', 1800000, NULL, 6, 'months', 10);

INSERT INTO breathe_move_packages (name, description, price, original_price, classes_count, validity_amount, validity_unit, is_special, valid_until, sort_order) VALUES
('Anual', 'Descuento especial hasta marzo 31', 2290000, 3200000, NULL, 1, 'year', true, '2025-03-31', 11);

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_breathe_move_schedule_date ON breathe_move_schedule(class_date);
CREATE INDEX idx_breathe_move_schedule_class ON breathe_move_schedule(class_id);
CREATE INDEX idx_user_enrollments_user ON user_breathe_move_enrollments(user_id);
CREATE INDEX idx_user_enrollments_schedule ON user_breathe_move_enrollments(schedule_id);
CREATE INDEX idx_user_purchases_user ON user_package_purchases(user_id);
CREATE INDEX idx_user_purchases_status ON user_package_purchases(status);

-- Crear funciones para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear triggers para actualizar updated_at
CREATE TRIGGER update_breathe_move_classes_updated_at BEFORE UPDATE ON breathe_move_classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_breathe_move_packages_updated_at BEFORE UPDATE ON breathe_move_packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_breathe_move_schedule_updated_at BEFORE UPDATE ON breathe_move_schedule
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();