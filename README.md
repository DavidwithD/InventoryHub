# 库存管理系统

一个用于管理商品库存、进货、订单的综合管理系统。

## 技术栈

### 前端

- **框架**: Next.js + React
- **样式**: Tailwind CSS
- **表单管理**: React Hook Form + Zod
- **状态管理**: Zustand / React Context
- **特性**: 乐观 UI 更新（保存前预览效果）

### 后端

- **框架**: ASP.NET Core (C#)
- **数据库**: MySQL
- **API 设计**: RESTful 规范
- **并发控制**: 数据库事务 + 行锁（防止库存超卖）

---

## 数据库设计

### 1. 商品分类表 (categories)

| 字段名 (中文) | 字段名 (英文) | 类型         | 说明       | 约束                        |
| ------------- | ------------- | ------------ | ---------- | --------------------------- |
| id            | id            | INT          | 主键       | AUTO_INCREMENT, PRIMARY KEY |
| 分类名        | name          | VARCHAR(100) | 分类名称   | NOT NULL                    |
| 创建时间      | created_at    | DATETIME     | 创建时间   | DEFAULT CURRENT_TIMESTAMP   |
| 更新时间      | updated_at    | DATETIME     | 更新时间   | ON UPDATE CURRENT_TIMESTAMP |
| 软删除标记    | is_deleted    | BOOLEAN      | 软删除标记 | DEFAULT FALSE               |

### 2. 进货渠道表 (suppliers)

| 字段名 (中文) | 字段名 (英文) | 类型         | 说明       | 约束                        |
| ------------- | ------------- | ------------ | ---------- | --------------------------- |
| id            | id            | INT          | 主键       | AUTO_INCREMENT, PRIMARY KEY |
| 渠道名        | name          | VARCHAR(100) | 渠道名称   | NOT NULL                    |
| 创建时间      | created_at    | DATETIME     | 创建时间   | DEFAULT CURRENT_TIMESTAMP   |
| 更新时间      | updated_at    | DATETIME     | 更新时间   | ON UPDATE CURRENT_TIMESTAMP |
| 软删除标记    | is_deleted    | BOOLEAN      | 软删除标记 | DEFAULT FALSE               |

### 3. 商品表 (products)

| 字段名 (中文) | 字段名 (英文) | 类型         | 说明           | 约束                        |
| ------------- | ------------- | ------------ | -------------- | --------------------------- |
| id            | id            | INT          | 主键           | AUTO_INCREMENT, PRIMARY KEY |
| 分类 id       | category_id   | INT          | 外键关联分类表 | NOT NULL, FOREIGN KEY       |
| 品名          | name          | VARCHAR(200) | 商品名称       | NOT NULL                    |
| 照片          | image_url     | VARCHAR(500) | 图片 URL/路径  | NULL                        |
| 创建时间      | created_at    | DATETIME     | 创建时间       | DEFAULT CURRENT_TIMESTAMP   |
| 更新时间      | updated_at    | DATETIME     | 更新时间       | ON UPDATE CURRENT_TIMESTAMP |
| 软删除标记    | is_deleted    | BOOLEAN      | 软删除标记     | DEFAULT FALSE               |

**索引**:

- `idx_category_id` ON (category_id)

### 4. 进货表 (purchases)

| 字段名 (中文) | 字段名 (英文) | 类型          | 说明                      | 约束                        |
| ------------- | ------------- | ------------- | ------------------------- | --------------------------- |
| id            | id            | INT           | 主键                      | AUTO_INCREMENT, PRIMARY KEY |
| 进货渠道 id   | supplier_id   | INT           | 外键关联渠道表            | NOT NULL, FOREIGN KEY       |
| 进货日期      | purchase_date | DATE          | 进货日期                  | NOT NULL                    |
| 进货单号      | purchase_no   | VARCHAR(100)  | 进货单号                  | NOT NULL, UNIQUE            |
| 支出          | total_amount  | DECIMAL(15,2) | 总支出金额                | NOT NULL                    |
| 货币类型      | currency_type | VARCHAR(10)   | 货币代码 (CNY/USD/JPY 等) | NOT NULL                    |
| 汇率          | exchange_rate | DECIMAL(10,4) | 相对于基准货币的汇率      | NOT NULL                    |
| 创建时间      | created_at    | DATETIME      | 创建时间                  | DEFAULT CURRENT_TIMESTAMP   |
| 更新时间      | updated_at    | DATETIME      | 更新时间                  | ON UPDATE CURRENT_TIMESTAMP |
| 软删除标记    | is_deleted    | BOOLEAN       | 软删除标记                | DEFAULT FALSE               |

**说明**:

- 一批进货对应多个在库商品
- 货币类型和汇率存储在进货级别，确保同批次商品使用相同汇率
- 进货表的支出 = 该批次所有在库商品的进货支出总和

**索引**:

- `idx_supplier_id` ON (supplier_id)
- `idx_purchase_date` ON (purchase_date)
- `unique_purchase_no` ON (purchase_no)

### 5. 在库表 (inventory)

| 字段名 (中文) | 字段名 (英文)     | 类型          | 说明                   | 约束                        |
| ------------- | ----------------- | ------------- | ---------------------- | --------------------------- |
| id            | id                | INT           | 主键                   | AUTO_INCREMENT, PRIMARY KEY |
| 商品 id       | product_id        | INT           | 外键关联商品表         | NOT NULL, FOREIGN KEY       |
| 进货 id       | purchase_id       | INT           | 外键关联进货表         | NOT NULL, FOREIGN KEY       |
| 进货支出      | purchase_amount   | DECIMAL(15,2) | 该商品分摊的支出金额   | NOT NULL                    |
| 进货数量      | purchase_quantity | INT           | 进货数量               | NOT NULL, CHECK > 0         |
| 单件成本      | unit_cost         | DECIMAL(15,2) | 单件成本（含汇率转换） | NOT NULL                    |
| 在库数量      | stock_quantity    | INT           | 当前库存数量           | NOT NULL, CHECK >= 0        |
| 创建时间      | created_at        | DATETIME      | 创建时间               | DEFAULT CURRENT_TIMESTAMP   |
| 更新时间      | updated_at        | DATETIME      | 更新时间               | ON UPDATE CURRENT_TIMESTAMP |
| 软删除标记    | is_deleted        | BOOLEAN       | 软删除标记             | DEFAULT FALSE               |

**计算公式**:

```
unit_cost = (purchase_amount * purchases.exchange_rate) / purchase_quantity
```

**业务规则**:

- 同一 purchase_id 下所有在库记录的 purchase_amount 总和 = purchases.total_amount
- unit_cost 在保存时计算并固化，不随汇率变化而变化
- stock_quantity 不能为负数（数据库约束 + 应用层验证）

**索引**:

- `idx_product_id` ON (product_id)
- `idx_purchase_id` ON (purchase_id)

### 6. 订单表 (orders)

| 字段名 (中文) | 字段名 (英文)    | 类型          | 说明       | 约束                        |
| ------------- | ---------------- | ------------- | ---------- | --------------------------- |
| id            | id               | INT           | 主键       | AUTO_INCREMENT, PRIMARY KEY |
| 订单编号      | order_no         | VARCHAR(100)  | 订单编号   | NOT NULL, UNIQUE            |
| 图片 url      | image_url        | VARCHAR(500)  | 订单图片   | NULL                        |
| 收入金额      | revenue          | DECIMAL(15,2) | 订单收入   | NOT NULL                    |
| 成本          | total_cost       | DECIMAL(15,2) | 订单总成本 | NULL                        |
| 交易时间      | transaction_time | DATETIME      | 交易时间   | NOT NULL                    |
| 创建时间      | created_at       | DATETIME      | 创建时间   | DEFAULT CURRENT_TIMESTAMP   |
| 更新时间      | updated_at       | DATETIME      | 更新时间   | ON UPDATE CURRENT_TIMESTAMP |
| 软删除标记    | is_deleted       | BOOLEAN       | 软删除标记 | DEFAULT FALSE               |

**说明**:

- total_cost 初始值为 NULL（表示订单详细表中无记录）
- 保存订单详细时自动计算并更新 total_cost
- 订单不可删除（仅软删除）

**索引**:

- `unique_order_no` ON (order_no)
- `idx_transaction_time` ON (transaction_time)

### 7. 订单详细表 (order_details)

| 字段名 (中文) | 字段名 (英文)  | 类型          | 说明                         | 约束                        |
| ------------- | -------------- | ------------- | ---------------------------- | --------------------------- |
| id            | id             | INT           | 主键                         | AUTO_INCREMENT, PRIMARY KEY |
| 订单 id       | order_id       | INT           | 外键关联订单表               | NOT NULL, FOREIGN KEY       |
| 在库 id       | inventory_id   | INT           | 外键关联在库表               | NOT NULL, FOREIGN KEY       |
| 商品 id       | product_id     | INT           | 外键关联商品表               | NOT NULL, FOREIGN KEY       |
| 出库单价      | unit_price     | DECIMAL(15,2) | 快照字段，保存时从在库表复制 | NOT NULL                    |
| 数量          | quantity       | INT           | 出库数量                     | NOT NULL, CHECK > 0         |
| 包装成本      | packaging_cost | DECIMAL(15,2) | 包装成本                     | DEFAULT 0                   |
| 其他成本      | other_cost     | DECIMAL(15,2) | 其他成本                     | DEFAULT 0                   |
| 小计成本      | subtotal_cost  | DECIMAL(15,2) | 该行总成本                   | NOT NULL                    |
| 备注          | notes          | TEXT          | 备注信息                     | NULL                        |
| 创建时间      | created_at     | DATETIME      | 创建时间                     | DEFAULT CURRENT_TIMESTAMP   |
| 更新时间      | updated_at     | DATETIME      | 更新时间                     | ON UPDATE CURRENT_TIMESTAMP |
| 软删除标记    | is_deleted     | BOOLEAN       | 软删除标记                   | DEFAULT FALSE               |

**计算公式**:

```
subtotal_cost = unit_price * quantity + packaging_cost + other_cost
orders.total_cost = SUM(subtotal_cost) WHERE order_id = ?
```

**业务规则**:

- unit_price 为快照数据，保存时从在库表的 unit_cost 复制，确保历史数据不变
- 保存时验证 quantity 不超过在库表的 stock_quantity
- 数据更新需要同步更新在库表的 stock_quantity

**索引**:

- `idx_order_id` ON (order_id)
- `idx_inventory_id` ON (inventory_id)
- `idx_product_id` ON (product_id)

---

## 功能页面

### 1. 订单列表页

**功能**:

- 显示所有订单概览
- 显示列：订单编号、收入金额、成本、利润、交易时间
- 成本为 NULL 时显示"未输入"
- 利润计算：收入金额 - 成本

**交互**:

- ✅ 排序：支持按编号、金额、成本、交易时间排序
- ✅ 筛选：按订单编号搜索、按交易时间范围筛选
- ✅ 导出：批量导出为 Excel/CSV
- ✅ 默认排序：成本为 NULL 的订单排在最前面
- ✅ 点击成本列（数字或"未输入"）跳转到订单详细编辑页

**权限**:

- 订单不可删除（仅支持软删除）

---

### 2.a 订单详细页（可编辑）

**路由**: `/orders/:orderId/edit`

**页面结构**:

#### 订单信息卡片（只读）

显示当前订单的基本信息：

- 订单编号、收入金额、交易时间、订单图片

#### 订单详细列表（可编辑）

**列结构**:
| 商品名 | 进货单价 | 数量 | 包装成本 | 其他成本 | 小计成本 | 备注 | 操作 |
|--------|----------|------|----------|----------|----------|------|------|

**字段说明**:

- **商品名**: 下拉菜单选择（二级菜单结构）
- **进货单价**: 只读，选择商品后自动填充
- **数量**: 手动输入，超过库存时标红
- **包装成本**: 可选，默认 0
- **其他成本**: 可选，默认 0
- **小计成本**: 自动计算 = 进货单价 × 数量 + 包装成本 + 其他成本
- **备注**: 可选
- **操作**: 删除按钮（×）

#### 商品选择下拉菜单（二级菜单）

**第一级**: 商品分类（来自分类表）

```
├─ 电子产品
├─ 服装
└─ 食品
```

**第二级**: 商品名 + 在库数量（仅显示在库数量 > 0 的记录）

```
电子产品
  ├─ iPhone 14 (库存: 50)
  ├─ iPad Pro (库存: 30)
  └─ MacBook Air (库存: 20)
```

**交互流程**:

1. 点击商品名下拉框 → 展开分类列表
2. 选择分类 → 展开该分类下的商品列表
3. 选择商品 → 进货单价自动填充，焦点跳转到"数量"输入框
4. 输入数量 → 实时校验是否超过库存，超过则标红

#### 实时计算区域

显示：

- **订单总成本**: SUM(所有行的小计成本)
- **订单总利润**: 收入金额 - 订单总成本

#### 操作按钮

- **追加**: 新增一行空白记录
- **保存**: 提交所有修改（包括新增、编辑、删除）
- **取消**: 放弃所有修改，弹出确认对话框后重新加载数据库数据

**保存按钮激活条件**:

- ✅ 所有行的"商品名"、"进货单价"、"数量"必须填写
- ✅ 不存在标红的"数量"字段（即不超过库存）
- ❌ 否则保存按钮非活性（disabled）

**保存操作逻辑**:

1. **新增订单详细行**:

   ```
   在库表.在库数量 -= 订单详细.数量
   ```

2. **修改订单详细行**:

   - 如果更换了商品/在库批次:
     ```
     原在库表.在库数量 += 原数量
     新在库表.在库数量 -= 新数量
     ```
   - 如果只修改数量:
     ```
     在库表.在库数量 += (原数量 - 新数量)
     ```

3. **删除订单详细行**:

   ```
   在库表.在库数量 += 原数量
   ```

4. **更新订单总成本**:

   ```
   订单表.成本 = SUM(订单详细表.小计成本) WHERE 订单id = ?
   ```

5. **事务处理**:
   - 所有操作在数据库事务中完成
   - 任一步骤失败则全部回滚

**前端行为**:

- 点击保存前，所有修改仅在前端状态中，未提交到数据库
- 支持乐观 UI 更新，保存前预览最终效果
- 点击取消时，弹出确认对话框避免误操作

---

### 2.b 订单详细页（只读）

**路由**: `/orders/details`

**功能**:

- 查询和浏览所有订单的详细记录
- 用于统计分析和历史查询

**显示列**:

- 订单编号、订单日期、商品名、商品分类、在库 ID、进货日期、进货 ID、出库单价、数量、小计成本、备注

**交互**:

- ✅ 筛选：订单号、订单日期、库存 ID、进货日期、进货 ID、商品名、商品分类
- ✅ 分页：20-50 条/页
- ✅ 导出：Excel/CSV

**入口**:

- 主页面导航菜单："订单详细查询"

---

### 3. 进货列表页

**功能**:

- 管理所有进货记录
- 显示列：进货单号、进货日期、进货渠道、支出、货币类型、汇率

**交互**:

- ✅ CRUD：新增、编辑、删除（单行操作）
- ✅ 筛选：按进货日期范围筛选
- ✅ 跳转：点击任意行 → 跳转到在库列表页 + 自动筛选该进货 ID + 进入编辑模式

**业务规则**:

- 无需分页功能（预计数据量不大）
- 删除进货记录前需验证是否有关联的在库记录

---

### 4. 在库列表页

**功能**:

- 管理商品库存明细
- 显示列：商品名、进货单号、进货日期、进货支出、进货数量、单件成本、在库数量

**页面结构**:

#### 顶部工具栏

```
┌─────────────────────────────────────────────────────┐
│ 进货单号: [下拉选择] 货币类型: CNY  汇率: 6.8500      │
│ [进货表支出: ¥10,000] [当前分配总和: ¥8,500] [差额: -¥1,500] │
└─────────────────────────────────────────────────────┘
```

**说明**:

- 从进货表下拉选择进货单号后，自动显示该进货的货币类型和汇率（只读）
- 显示进货表的总支出
- 实时计算当前所有在库行的进货支出总和
- 显示差额，差额为 0 时才能保存

#### 在库列表（可编辑）

**新增行操作**:

1. 选择进货单号 → 自动填充货币类型和汇率
2. 选择商品 → 手动输入进货支出和进货数量
3. 系统自动计算单件成本 = (进货支出 × 汇率) / 进货数量
4. 在库数量默认 = 进货数量

**多行编辑规则**:

- 可同时添加多个商品（同一批进货）
- 所有商品的进货支出总和必须等于进货表的支出
- 保存按钮激活条件：差额 = 0

**交互**:

- ✅ CRUD：支持多行批量操作
- ✅ 筛选：按商品名、进货日期、进货单号筛选
- ✅ 无需分页

**LocalStorage 使用**:

- 保存最近使用的汇率到 LocalStorage
- 下次新增进货时作为默认值预填充

**业务规则**:

- 保存后单件成本不可修改（确保历史成本准确）
- 在库数量可能被订单详细更新，需实时同步

---

### 5. 商品列表页

**功能**:

- 管理商品基础信息
- 显示列：商品名、分类、图片

**交互**:

- ✅ CRUD：单行操作
- ✅ 筛选：按分类筛选
- ✅ 图片上传：支持上传商品图片
- ✅ 无需分页

**业务规则**:

- 删除商品前需检查是否有关联的在库记录
- 商品名建议唯一但不强制（同名不同规格的情况）

---

### 6. 分类编辑页

**功能**:

- 管理商品分类

**交互**:

- ✅ CRUD：单行操作
- ✅ 无需分页、筛选

**业务规则**:

- 删除分类前需检查是否有关联的商品
- 分类名唯一

---

### 7. 进货渠道页

**功能**:

- 管理进货渠道信息

**交互**:

- ✅ CRUD：单行操作
- ✅ 无需分页、筛选

**业务规则**:

- 删除渠道前需检查是否有关联的进货记录
- 渠道名唯一

---

### 8. 主页面（Dashboard）

**功能**:

- 系统总览和快速导航

#### 导航菜单

- 订单列表
- 订单详细查询
- 进货列表
- 在库列表
- 商品列表
- 分类编辑
- 进货渠道

#### 数据统计面板

**总库存价值**

```
计算公式: SUM(在库数量 × 单件成本) WHERE is_deleted = FALSE
显示: ¥XXX,XXX.XX
```

**月度利润**

```
计算公式:
  当月订单收入总和 - 当月订单成本总和
  WHERE MONTH(交易时间) = 当前月份
显示: 简单柱状图（月度对比）
```

**其他统计（可选）**:

- 低库存预警：在库数量 < 阈值的商品列表
- 热销商品 Top 10
- 本月订单数量

---

## 技术实现要点

### 前端

#### 状态管理

```typescript
// 使用Zustand管理订单详细页的复杂表单状态
interface OrderDetailStore {
  details: OrderDetail[];
  addDetail: () => void;
  updateDetail: (id: number, data: Partial<OrderDetail>) => void;
  deleteDetail: (id: number) => void;
  calculateTotalCost: () => number;
  validateStock: (detailId: number) => boolean;
}
```

#### 表单验证

```typescript
// 使用Zod定义验证规则
const orderDetailSchema = z
  .object({
    商品id: z.number().min(1, "请选择商品"),
    数量: z.number().min(1, "数量必须大于0"),
    包装成本: z.number().min(0).optional(),
    其他成本: z.number().min(0).optional(),
  })
  .refine(
    (data) => {
      // 自定义验证：数量不超过库存
      return data.数量 <= getStockQuantity(data.在库id);
    },
    {
      message: "数量超过库存",
      path: ["数量"],
    }
  );
```

#### 乐观 UI 更新

- 用户操作立即反映在 UI 上
- 保存前显示"未保存"状态指示器
- 保存失败时回滚 UI 状态

### 后端

#### API 设计示例

```
POST   /api/orders                  创建订单
GET    /api/orders                  获取订单列表
GET    /api/orders/:id              获取订单详情
PUT    /api/orders/:id              更新订单
DELETE /api/orders/:id              软删除订单

POST   /api/orders/:id/details      批量保存订单详细
GET    /api/orders/:id/details      获取订单详细列表

GET    /api/inventory               获取在库列表
POST   /api/inventory/batch         批量创建在库记录
PUT    /api/inventory/:id           更新在库记录

GET    /api/products                获取商品列表
POST   /api/products                创建商品
...
```

#### 事务处理示例

```csharp
public async Task<bool> SaveOrderDetails(int orderId, List<OrderDetailDto> details)
{
    using var transaction = await _context.Database.BeginTransactionAsync();
    try
    {
        // 1. 获取原订单详细（用于库存回滚）
        var originalDetails = await _context.OrderDetails
            .Where(d => d.订单id == orderId)
            .ToListAsync();

        // 2. 回滚原库存
        foreach (var original in originalDetails)
        {
            var inventory = await _context.Inventory.FindAsync(original.在库id);
            inventory.在库数量 += original.数量;
        }

        // 3. 删除原订单详细
        _context.OrderDetails.RemoveRange(originalDetails);

        // 4. 添加新订单详细并扣减库存
        foreach (var detail in details)
        {
            var inventory = await _context.Inventory.FindAsync(detail.在库id);

            // 验证库存充足
            if (inventory.在库数量 < detail.数量)
            {
                throw new InsufficientStockException();
            }

            // 扣减库存
            inventory.在库数量 -= detail.数量;

            // 添加订单详细
            _context.OrderDetails.Add(new OrderDetail
            {
                订单id = orderId,
                在库id = detail.在库id,
                商品id = detail.商品id,
                出库单价 = inventory.单件成本, // 快照
                数量 = detail.数量,
                包装成本 = detail.包装成本,
                其他成本 = detail.其他成本,
                小计成本 = inventory.单件成本 * detail.数量 + detail.包装成本 + detail.其他成本
            });
        }

        // 5. 更新订单总成本
        var totalCost = details.Sum(d => d.小计成本);
        var order = await _context.Orders.FindAsync(orderId);
        order.成本 = totalCost;

        // 6. 提交事务
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
        return true;
    }
    catch
    {
        await transaction.RollbackAsync();
        throw;
    }
}
```

#### 并发控制

```csharp
// 使用行锁防止库存超卖
var inventory = await _context.Inventory
    .FromSqlRaw("SELECT * FROM inventory WHERE id = {0} FOR UPDATE", inventoryId)
    .FirstOrDefaultAsync();
```

### 数据库

#### 索引优化

```sql
-- 订单列表查询优化
CREATE INDEX idx_orders_cost_time ON orders(成本, 交易时间);

-- 订单详细关联查询优化
CREATE INDEX idx_order_details_order_inventory ON order_details(订单id, 在库id);

-- 在库筛选优化
CREATE INDEX idx_inventory_purchase_product ON inventory(进货id, 商品id);
```

#### 约束

```sql
-- 在库数量非负约束
ALTER TABLE inventory ADD CONSTRAINT chk_stock_quantity CHECK (在库数量 >= 0);

-- 订单详细数量大于0约束
ALTER TABLE order_details ADD CONSTRAINT chk_detail_quantity CHECK (数量 > 0);
```

---

## 开发计划建议

### Phase 1: 基础数据管理

- ✅ 商品分类 CRUD
- ✅ 进货渠道 CRUD
- ✅ 商品 CRUD

### Phase 2: 进货和库存

- ✅ 进货表 CRUD
- ✅ 在库表 CRUD
- ✅ 进货到在库的关联流程

### Phase 3: 订单核心功能

- ✅ 订单列表
- ✅ 订单详细编辑（含库存扣减）
- ✅ 库存回滚机制

### Phase 4: 查询和统计

- ✅ 订单详细只读查询
- ✅ Dashboard 统计
- ✅ 数据导出

### Phase 5: 优化和完善

- ✅ 性能优化
- ✅ 权限管理
- ✅ 日志审计

---

## 注意事项

1. **数据一致性**: 所有涉及库存变动的操作必须使用事务
2. **并发安全**: 使用行锁防止库存超卖
3. **历史数据**: 出库单价、单件成本等财务数据需快照存储
4. **软删除**: 所有删除操作使用软删除，保留历史记录
5. **汇率管理**: 汇率在进货级别存储，确保同批次商品汇率一致
6. **用户体验**: 订单详细页的复杂交互需要充分的前端验证和实时反馈

---

## 待明确事项

- [ ] 图片上传的具体实现方案（本地存储/OSS/CDN）
- [ ] 用户权限和角色管理（如果是多用户系统）
- [ ] 汇率数据来源（手动输入/API 自动获取）
- [ ] 数据备份策略
- [ ] 报表和导出的具体格式要求
