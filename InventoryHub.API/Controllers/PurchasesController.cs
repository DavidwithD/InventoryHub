using InventoryHub.API.DTOs;
using InventoryHub.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace InventoryHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PurchasesController : ControllerBase
{
    private readonly IPurchaseService _purchaseService;

    public PurchasesController(IPurchaseService purchaseService)
    {
        _purchaseService = purchaseService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PurchaseDto>>> GetAll(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        var purchases = await _purchaseService.GetAllAsync(startDate, endDate);
        return Ok(purchases);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PurchaseDto>> GetById(int id)
    {
        var purchase = await _purchaseService.GetByIdAsync(id);
        if (purchase == null)
        {
            return NotFound($"进货记录 ID {id} 不存在");
        }
        return Ok(purchase);
    }

    [HttpPost]
    public async Task<ActionResult<PurchaseDto>> Create(CreatePurchaseDto dto)
    {
        try
        {
            var purchase = await _purchaseService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = purchase.Id }, purchase);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<PurchaseDto>> Update(int id, UpdatePurchaseDto dto)
    {
        try
        {
            var purchase = await _purchaseService.UpdateAsync(id, dto);
            if (purchase == null)
            {
                return NotFound($"进货记录 ID {id} 不存在");
            }
            return Ok(purchase);
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
            var result = await _purchaseService.DeleteAsync(id);
            if (!result)
            {
                return NotFound($"进货记录 ID {id} 不存在");
            }
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
