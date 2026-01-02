using InventoryHub.API.DTOs;
using InventoryHub.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace InventoryHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SuppliersController : ControllerBase
{
    private readonly ISupplierService _supplierService;

    public SuppliersController(ISupplierService supplierService)
    {
        _supplierService = supplierService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SupplierDto>>> GetAll()
    {
        var suppliers = await _supplierService.GetAllAsync();
        return Ok(suppliers);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SupplierDto>> GetById(int id)
    {
        var supplier = await _supplierService.GetByIdAsync(id);
        if (supplier == null)
        {
            return NotFound($"供应商 ID {id} 不存在");
        }
        return Ok(supplier);
    }

    [HttpPost]
    public async Task<ActionResult<SupplierDto>> Create(CreateSupplierDto dto)
    {
        try
        {
            var supplier = await _supplierService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = supplier.Id }, supplier);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<SupplierDto>> Update(int id, UpdateSupplierDto dto)
    {
        try
        {
            var supplier = await _supplierService.UpdateAsync(id, dto);
            if (supplier == null)
            {
                return NotFound($"供应商 ID {id} 不存在");
            }
            return Ok(supplier);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }
// 不需要删除操作
//     [HttpDelete("{id}")]
//     public async Task<IActionResult> Delete(int id)
//     {
//         try
//         {
//             var result = await _supplierService.DeleteAsync(id);
//             if (!result)
//             {
//                 return NotFound($"供应商 ID {id} 不存在");
//             }
//             return NoContent();
//         }
//         catch (InvalidOperationException ex)
//         {
//             return BadRequest(ex.Message);
//         }
//     }
}
