-- ======================================
-- 迁移脚本：添加 purchase_amount_cny 字段
-- 日期：2026-01-05
-- 说明：在 inventory 表中添加人民币金额字段
-- ======================================

USE inventory_hub;

-- 添加 purchase_amount_cny 字段
ALTER TABLE inventory 
ADD COLUMN purchase_amount_cny DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT '进货金额(人民币)' 
AFTER purchase_amount;

-- 为 purchase_amount 字段添加注释
ALTER TABLE inventory 
MODIFY COLUMN purchase_amount DECIMAL(15,2) NOT NULL COMMENT '进货金额(日元)';

-- 验证字段已添加
DESCRIBE inventory;

-- 查看表结构
SHOW CREATE TABLE inventory;
