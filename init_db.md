mysql -u root -p

# 在 MySQL 命令行中执行

CREATE DATABASE IF NOT EXISTS inventory_hub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 使用数据库

USE inventory_hub;

# 创建表
-- 1. 商品分类表
CREATE TABLE categories (
id INT AUTO_INCREMENT PRIMARY KEY,
name VARCHAR(100) NOT NULL,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
is_deleted BOOLEAN DEFAULT FALSE,
UNIQUE KEY unique_category_name (name, is_deleted)
);

-- 2. 进货渠道表
CREATE TABLE suppliers (
id INT AUTO_INCREMENT PRIMARY KEY,
name VARCHAR(100) NOT NULL,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
is_deleted BOOLEAN DEFAULT FALSE,
UNIQUE KEY unique_supplier_name (name, is_deleted)
);

-- 3. 商品表（商品不需要图片）
CREATE TABLE products (
id INT AUTO_INCREMENT PRIMARY KEY,
category_id INT NOT NULL,
name VARCHAR(200) NOT NULL,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
is_deleted BOOLEAN DEFAULT FALSE,
FOREIGN KEY (category_id) REFERENCES categories(id),
INDEX idx_category_id (category_id)
);

-- 4. 进货表
CREATE TABLE purchases (
id INT AUTO_INCREMENT PRIMARY KEY,
supplier_id INT NOT NULL,
purchase_date DATE NOT NULL,
purchase_no VARCHAR(100) NOT NULL,
total_amount DECIMAL(15,2) NOT NULL,
currency_type VARCHAR(10) NOT NULL DEFAULT 'JPY',
exchange_rate DECIMAL(10,4) NOT NULL,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
is_deleted BOOLEAN DEFAULT FALSE,
FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
UNIQUE KEY unique_purchase_no (purchase_no),
INDEX idx_supplier_id (supplier_id),
INDEX idx_purchase_date (purchase_date)
);

-- 5. 在库表
CREATE TABLE inventory (
id INT AUTO_INCREMENT PRIMARY KEY,
product_id INT NOT NULL,
purchase_id INT NOT NULL,
purchase_amount DECIMAL(15,2) NOT NULL,
purchase_quantity INT NOT NULL CHECK (purchase_quantity > 0),
unit_cost DECIMAL(15,2) NOT NULL,
stock_quantity INT NOT NULL CHECK (stock_quantity >= 0),
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
is_deleted BOOLEAN DEFAULT FALSE,
FOREIGN KEY (product_id) REFERENCES products(id),
FOREIGN KEY (purchase_id) REFERENCES purchases(id),
INDEX idx_product_id (product_id),
INDEX idx_purchase_id (purchase_id)
);

-- 6. 订单表
CREATE TABLE orders (
id INT AUTO_INCREMENT PRIMARY KEY,
order_no VARCHAR(100) NOT NULL,
image_url VARCHAR(500) NULL,
name VARCHAR(200) NOT NULL,
revenue DECIMAL(15,2) NOT NULL,
total_cost DECIMAL(15,2) NULL,
transaction_time DATETIME NOT NULL,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
is_deleted BOOLEAN DEFAULT FALSE,
UNIQUE KEY unique_order_no (order_no),
INDEX idx_transaction_time (transaction_time),
INDEX idx_orders_cost_time (total_cost, transaction_time)
);

-- 7. 订单详细表
CREATE TABLE order_details (
id INT AUTO_INCREMENT PRIMARY KEY,
order_id INT NOT NULL,
inventory_id INT NOT NULL,
product_id INT NOT NULL,
unit_price DECIMAL(15,2) NOT NULL,
quantity INT NOT NULL CHECK (quantity > 0),
packaging_cost DECIMAL(15,2) DEFAULT 0,
other_cost DECIMAL(15,2) DEFAULT 0,
subtotal_cost DECIMAL(15,2) NOT NULL,
notes TEXT NULL,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
is_deleted BOOLEAN DEFAULT FALSE,
FOREIGN KEY (order_id) REFERENCES orders(id),
FOREIGN KEY (inventory_id) REFERENCES inventory(id),
FOREIGN KEY (product_id) REFERENCES products(id),
INDEX idx_order_id (order_id),
INDEX idx_inventory_id (inventory_id),
INDEX idx_product_id (product_id),
INDEX idx_order_details_order_inventory (order_id, inventory_id)
);

# 创建用户
CREATE USER 'inventory_user'@'localhost' IDENTIFIED BY 'inventory_pass';
GRANT ALL PRIVILEGES ON inventory_hub.* TO 'inventory_user'@'localhost';
FLUSH PRIVILEGES;