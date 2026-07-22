-- Default system categories (user_id null, is_default true).
-- Keep in sync with packages/constants/src/default-categories.ts.
insert into public.categories (name, icon, type, is_default) values
  ('Alimentación', 'restaurant', 'expense', true),
  ('Transporte', 'car', 'expense', true),
  ('Vivienda', 'home', 'expense', true),
  ('Servicios', 'flash', 'expense', true),
  ('Salud', 'medkit', 'expense', true),
  ('Entretenimiento', 'film', 'expense', true),
  ('Educación', 'school', 'expense', true),
  ('Compras', 'bag', 'expense', true),
  ('Suscripciones', 'repeat', 'expense', true),
  ('Otros gastos', 'ellipsis-horizontal', 'expense', true),
  ('Salario', 'cash', 'income', true),
  ('Freelance', 'briefcase', 'income', true),
  ('Inversiones', 'trending-up', 'income', true),
  ('Regalos', 'gift', 'income', true),
  ('Otros ingresos', 'ellipsis-horizontal', 'income', true);
