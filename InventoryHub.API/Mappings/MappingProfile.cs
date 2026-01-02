using AutoMapper;
using InventoryHub.API.DTOs;
using InventoryHub.API.Models;

namespace InventoryHub.API.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        // Category mappings
        CreateMap<Category, CategoryDto>();
        CreateMap<CreateCategoryDto, Category>();
        CreateMap<UpdateCategoryDto, Category>();

        // Supplier mappings
        CreateMap<Supplier, SupplierDto>();
        CreateMap<CreateSupplierDto, Supplier>();
        CreateMap<UpdateSupplierDto, Supplier>();

        // Product mappings
        CreateMap<CreateProductDto, Product>();
        CreateMap<UpdateProductDto, Product>();

        // Purchase mappings
        CreateMap<CreatePurchaseDto, Purchase>();
        CreateMap<UpdatePurchaseDto, Purchase>();

        // Inventory mappings
        CreateMap<CreateInventoryDto, Inventory>();
        CreateMap<UpdateInventoryDto, Inventory>();

        // Order mappings
        CreateMap<Order, OrderDto>();
        CreateMap<CreateOrderDto, Order>();
        CreateMap<UpdateOrderDto, Order>();

        // OrderDetail mappings
        CreateMap<OrderDetail, OrderDetailDto>();
        CreateMap<CreateOrderDetailDto, OrderDetail>();
        CreateMap<UpdateOrderDetailDto, OrderDetail>();
    }
}
