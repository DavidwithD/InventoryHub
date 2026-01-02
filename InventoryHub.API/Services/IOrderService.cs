using InventoryHub.API.DTOs;

namespace InventoryHub.API.Services;

public interface IOrderService
{
    // 订单 CRUD
    Task<IEnumerable<OrderDto>> GetAllOrdersAsync(DateTime? startDate = null, DateTime? endDate = null);
    Task<OrderDto?> GetOrderByIdAsync(int id);
    Task<OrderDto> CreateOrderWithDetailsAsync(CreateOrderWithDetailsDto dto);
    Task<OrderDto?> UpdateOrderAsync(int id, UpdateOrderDto dto);
    Task<bool> DeleteOrderAsync(int id);

    // 订单详细 CRUD
    Task<IEnumerable<OrderDetailDto>> GetOrderDetailsAsync(int orderId);
    Task<OrderDetailDto?> GetOrderDetailByIdAsync(int id);
    Task<OrderDetailDto> CreateOrderDetailAsync(CreateOrderDetailDto dto);
    Task<OrderDetailDto?> UpdateOrderDetailAsync(int id, UpdateOrderDetailDto dto);
    Task<bool> DeleteOrderDetailAsync(int id);
}
