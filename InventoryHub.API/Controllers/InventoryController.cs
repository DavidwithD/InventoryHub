using InventoryHub.API.DTOs;
using InventoryHub.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace InventoryHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventoryService;

    public InventoryController(IInventoryService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<InventoryDto>>> GetAll([FromQuery] int? purchaseId = null)
    {
        var inventories = await _inventoryService.GetAllAsync(purchaseId);
        return Ok(inventories);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<InventoryDto>> GetById(int id)
    {
        var inventory = await _inventoryService.GetByIdAsync(id);
        if (inventory == null)
        {
            return NotFound($"库存记录 ID {id} 不存在");
        }
        return Ok(inventory);
    }

    [HttpGet("purchase/{purchaseId}/total")]
    public async Task<ActionResult<decimal>> GetPurchaseTotal(int purchaseId)
    {
        var total = await _inventoryService.GetPurchaseTotalAmountAsync(purchaseId);
        return Ok(total);
    }

    [HttpGet("purchase/{purchaseId}/expected-total-jpy")]
    public async Task<ActionResult<decimal>> GetPurchaseExpectedTotalJpy(int purchaseId)
    {
        var total = await _inventoryService.GetPurchaseExpectedTotalJpyAsync(purchaseId);
        return Ok(total);
    }

    [HttpPost]
    public async Task<ActionResult<InventoryDto>> Create(CreateInventoryDto dto)
    {
        try
        {
            var inventory = await _inventoryService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = inventory.Id }, inventory);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("batch")]
    public async Task<ActionResult<IEnumerable<InventoryDto>>> BatchCreate(BatchCreateInventoryDto dto)
    {
        try
        {
            var inventories = await _inventoryService.BatchCreateAsync(dto.Items);
            return Ok(inventories);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<InventoryDto>> Update(int id, UpdateInventoryDto dto)
    {
        try
        {
            var inventory = await _inventoryService.UpdateAsync(id, dto);
            if (inventory == null)
            {
                return NotFound($"库存记录 ID {id} 不存在");
            }
            return Ok(inventory);
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
            var result = await _inventoryService.DeleteAsync(id);
            if (!result)
            {
                return NotFound($"库存记录 ID {id} 不存在");
            }
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
