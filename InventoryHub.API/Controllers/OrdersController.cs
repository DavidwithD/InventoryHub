using InventoryHub.API.DTOs;
using InventoryHub.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace InventoryHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly IMercariService _mercariService;

    public OrdersController(IOrderService orderService, IMercariService mercariService)
    {
        _orderService = orderService;
        _mercariService = mercariService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<OrderDto>>> GetAll([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        var orders = await _orderService.GetAllOrdersAsync(startDate, endDate);
        return Ok(orders);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<OrderDto>> GetById(int id)
    {
        var order = await _orderService.GetOrderByIdAsync(id);
        if (order == null)
        {
            return NotFound($"订单 ID {id} 不存在");
        }
        return Ok(order);
    }

    [HttpPost]
    public async Task<ActionResult<OrderDto>> Create(CreateOrderWithDetailsDto dto)
    {
        try
        {
            var order = await _orderService.CreateOrderWithDetailsAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = order.Id }, order);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<OrderDto>> Update(int id, UpdateOrderDto dto)
    {
        try
        {
            var order = await _orderService.UpdateOrderAsync(id, dto);
            if (order == null)
            {
                return NotFound($"订单 ID {id} 不存在");
            }
            return Ok(order);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var result = await _orderService.DeleteOrderAsync(id);
            if (!result)
            {
                return NotFound($"订单 ID {id} 不存在");
            }
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("{orderId}/details")]
    public async Task<ActionResult<IEnumerable<OrderDetailDto>>> GetOrderDetails(int orderId)
    {
        var details = await _orderService.GetOrderDetailsAsync(orderId);
        return Ok(details);
    }

    [HttpPost("details")]
    public async Task<ActionResult<OrderDetailDto>> CreateDetail(CreateOrderDetailDto dto)
    {
        try
        {
            var detail = await _orderService.CreateOrderDetailAsync(dto);
            return Ok(detail);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("details/{id}")]
    public async Task<ActionResult<OrderDetailDto>> UpdateDetail(int id, UpdateOrderDetailDto dto)
    {
        try
        {
            var detail = await _orderService.UpdateOrderDetailAsync(id, dto);
            if (detail == null)
            {
                return NotFound($"订单详细 ID {id} 不存在");
            }
            return Ok(detail);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("details/{id}")]
    public async Task<IActionResult> DeleteDetail(int id)
    {
        try
        {
            var result = await _orderService.DeleteOrderDetailAsync(id);
            if (!result)
            {
                return NotFound($"订单详细 ID {id} 不存在");
            }
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    // 批量导入订单
    [HttpPost("import-from-curl")]
    public async Task<ActionResult<ImportResultDto>> ImportFromCurl(ImportFromCurlDto dto)
    {
        try
        {
            var result = await _mercariService.ImportOrdersFromCurlAsync(dto.CurlCommand, dto.SkipExisting);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new ImportResultDto
            {
                Errors = new List<string> { ex.Message }
            });
        }
    }
}
