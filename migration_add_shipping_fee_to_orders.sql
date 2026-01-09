-- 在订单表中添加运费字段
-- 用途：存储从 Mercari API 获取的 seller_shipping_fee 信息

USE inventory_hub;

ALTER TABLE orders 
ADD COLUMN shipping_fee DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT '运费（日元）';

-- 验证字段是否添加成功
DESCRIBE orders;
