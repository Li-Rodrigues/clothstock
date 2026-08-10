-- database/seeds.sql

-- 1. Usuário Administrador
INSERT INTO users (name, email, password_hash, role) 
VALUES (
    'Administrador ClothStock', 
    'admin@clothstock.com', 
    '$2a$10$e88yv/2lPZptW1Y.N0r0g.N79X2IThY.m/0Pdt8zOsnkE5XInuBym', 
    'ADMIN'
) ON CONFLICT (email) DO NOTHING;

-- 2. Marcas
INSERT INTO brands (name, description) VALUES
    ('Nike', 'Moda esportiva e casual'),
    ('Adidas', 'Roupas e calçados esportivos'),
    ('Zara', 'Moda fast-fashion e alfaiataria'),
    ('Levis', 'Jeans e vestuário casual')
ON CONFLICT (name) DO NOTHING;

-- 3. Categorias
INSERT INTO categories (name, description) VALUES
    ('Camisetas', 'Camisetas de algodão, poliéster e estampadas'),
    ('Calças', 'Calças jeans, sarja e moletom'),
    ('Vestidos', 'Vestidos curtos, longos e casuais'),
    ('Jaquetas', 'Casacos, jaquetas e moletons')
ON CONFLICT (name) DO NOTHING;

-- 4. Fornecedores
INSERT INTO suppliers (name, trade_name, cnpj_cpf, email, phone) VALUES
    ('Confecções Silva LTDA', 'Silva Modas', '12.345.678/0001-90', 'contato@silvamodas.com', '(11) 98765-4321')
ON CONFLICT (cnpj_cpf) DO NOTHING;

-- 5. Produtos
INSERT INTO products (title, sku, description, size, color, cost_price, selling_price, quantity_in_stock, brand_id, category_id) VALUES
    ('Camiseta Oversized Preta', 'NIKE-TSHIRT-001', 'Camiseta 100% algodão', 'G', 'Preta', 35.00, 89.90, 15, 1, 1),
    ('Calça Jeans Straight', 'LEVIS-JEANS-002', 'Calça jeans tradicional', '42', 'Azul Escuro', 80.00, 199.90, 8, 4, 2)
ON CONFLICT (sku) DO NOTHING;