-- ======================================
-- 迁移脚本：修改 purchase_amount_cny 为可空
-- 日期：2026-01-08
-- 说明：支持日元直接进货场景，purchase_amount_cny 可为 NULL
-- ======================================

USE inventory_hub;

-- 将 purchase_amount_cny 字段改为可空
ALTER TABLE inventory 
MODIFY COLUMN purchase_amount_cny DECIMAL(15,2) not NULL COMMENT '进货金额(人民币)' DEFAULT 0;

-- 验证字段已修改
DESCRIBE inventory;
