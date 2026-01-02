namespace InventoryHub.API.DTOs;

// Mercari API 响应结构
public class MercariResponseDto
{
    public string Result { get; set; } = string.Empty;
    public MercariDataDto? Data { get; set; }
}

public class MercariDataDto
{
    public List<SoldHistoryDto> Sold_Histories { get; set; } = new();
    public int Total_Count { get; set; }
}

public class SoldHistoryDto
{
    public MercariItemDto? Item { get; set; }
    public int Price { get; set; }
    public int Sales_Fee { get; set; }
    public int Seller_Shipping_Fee { get; set; }
    public int Seller_Additional_Fee { get; set; }
    public int Tax_Rate { get; set; }
    public int Sales_Profit { get; set; }
    public long Transaction_Finished_At { get; set; }
    public int Donation_Amount { get; set; }
}

public class MercariItemDto
{
    public string Item_Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Photo_Thumbnail_Url { get; set; } = string.Empty;
}

// 批量导入请求
public class ImportFromCurlDto
{
    public string CurlCommand { get; set; } = string.Empty;
    public bool SkipExisting { get; set; } = true;
}

// 批量导入结果
public class ImportResultDto
{
    public int Total { get; set; }
    public int Success { get; set; }
    public int Skipped { get; set; }
    public int Failed { get; set; }
    public List<string> Errors { get; set; } = new();
}
