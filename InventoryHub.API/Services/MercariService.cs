using System.Text.Json;
using System.Text.RegularExpressions;
using InventoryHub.API.Data;
using InventoryHub.API.DTOs;
using InventoryHub.API.Models;
using Microsoft.EntityFrameworkCore;

namespace InventoryHub.API.Services;

public class MercariService : IMercariService
{
    private readonly AppDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<MercariService> _logger;

    public MercariService(
        AppDbContext context,
        IHttpClientFactory httpClientFactory,
        ILogger<MercariService> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<ImportResultDto> ImportOrdersFromCurlAsync(string curlCommand, bool skipExisting)
    {
        var result = new ImportResultDto();

        try
        {
            // 1. 解析 cURL 命令
            var (url, headers) = ParseCurlCommand(curlCommand);
            if (string.IsNullOrEmpty(url))
            {
                result.Errors.Add("无法解析 cURL 命令中的 URL");
                return result;
            }

            // 2. 修改 URL 参数为 limit=100
            url = ModifyUrlParameter(url, "limit", "100");

            // 3. 第一次请求，获取 total_count
            var firstResponse = await CallMercariApiAsync(url, headers, 0);
            if (firstResponse?.Data == null)
            {
                result.Errors.Add("无法获取 Mercari API 响应");
                return result;
            }

            result.Total = firstResponse.Data.Total_Count;
            _logger.LogInformation($"总共需要导入 {result.Total} 条订单");

            // 4. 循环调用，直到获取所有数据
            var allHistories = new List<SoldHistoryDto>();
            allHistories.AddRange(firstResponse.Data.Sold_Histories);

            int offset = 100;
            while (allHistories.Count < result.Total)
            {
                _logger.LogInformation($"正在获取 offset={offset} 的数据...");
                var response = await CallMercariApiAsync(url, headers, offset);
                if (response?.Data?.Sold_Histories != null && response.Data.Sold_Histories.Any())
                {
                    allHistories.AddRange(response.Data.Sold_Histories);
                }
                offset += 100;

                // 安全检查，避免无限循环
                if (offset > result.Total + 100)
                {
                    break;
                }
            }

            _logger.LogInformation($"共获取到 {allHistories.Count} 条销售记录");

            // 5. 批量创建订单
            foreach (var history in allHistories)
            {
                try
                {
                    if (history.Item == null)
                    {
                        result.Failed++;
                        result.Errors.Add("销售记录缺少商品信息");
                        continue;
                    }

                    var orderNo = history.Item.Item_Id;

                    // 检查是否已存在
                    var exists = await _context.Orders.AnyAsync(o => o.OrderNo == orderNo && !o.IsDeleted);
                    if (exists)
                    {
                        if (skipExisting)
                        {
                            result.Skipped++;
                            continue;
                        }
                    }

                    // 创建订单
                    var order = new Order
                    {
                        OrderNo = orderNo,
                        Name = history.Item.Name,
                        ImageUrl = history.Item.Photo_Thumbnail_Url,
                        Revenue = history.Sales_Profit,
                        ShippingFee = history.Seller_Shipping_Fee,
                        TransactionTime = DateTimeOffset.FromUnixTimeSeconds(history.Transaction_Finished_At).DateTime,
                        TotalCost = null // 初始没有成本
                    };

                    _context.Orders.Add(order);
                    await _context.SaveChangesAsync();
                    result.Success++;
                }
                catch (Exception ex)
                {
                    result.Failed++;
                    result.Errors.Add($"订单 {history.Item?.Item_Id}: {ex.Message}");
                    _logger.LogError(ex, $"导入订单失败: {history.Item?.Item_Id}");
                }
            }
        }
        catch (Exception ex)
        {
            result.Errors.Add($"批量导入失败: {ex.Message}");
            _logger.LogError(ex, "批量导入订单时发生错误");
        }

        return result;
    }

    private (string url, Dictionary<string, string> headers) ParseCurlCommand(string curlCommand)
    {
        var url = string.Empty;
        var headers = new Dictionary<string, string>();

        try
        {
            // 提取 URL
            var urlMatch = Regex.Match(curlCommand, @"curl\s+'([^']+)'");
            if (urlMatch.Success)
            {
                url = urlMatch.Groups[1].Value;
            }

            // 提取所有 headers
            var headerMatches = Regex.Matches(curlCommand, @"-H\s+'([^:]+):\s*([^']+)'");
            foreach (Match match in headerMatches)
            {
                if (match.Groups.Count == 3)
                {
                    var key = match.Groups[1].Value.Trim();
                    var value = match.Groups[2].Value.Trim();
                    headers[key] = value;
                }
            }

            _logger.LogInformation($"解析到 URL: {url}");
            _logger.LogInformation($"解析到 {headers.Count} 个 headers");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "解析 cURL 命令失败");
        }

        return (url, headers);
    }

    private string ModifyUrlParameter(string url, string paramName, string paramValue)
    {
        var uri = new Uri(url);
        var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
        query[paramName] = paramValue;

        var builder = new UriBuilder(uri)
        {
            Query = query.ToString()
        };

        return builder.ToString();
    }

    private async Task<MercariResponseDto?> CallMercariApiAsync(
        string baseUrl,
        Dictionary<string, string> headers,
        int offset)
    {
        try
        {
            var url = ModifyUrlParameter(baseUrl, "offset", offset.ToString());

            var httpClient = _httpClientFactory.CreateClient();

            // 添加所有 headers
            foreach (var header in headers)
            {
                // 跳过一些特殊的 headers，HttpClient 会自动处理
                if (header.Key.Equals("content-length", StringComparison.OrdinalIgnoreCase) ||
                    header.Key.Equals("host", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                try
                {
                    httpClient.DefaultRequestHeaders.TryAddWithoutValidation(header.Key, header.Value);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning($"无法添加 header {header.Key}: {ex.Message}");
                }
            }

            var response = await httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };

            return JsonSerializer.Deserialize<MercariResponseDto>(content, options);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"调用 Mercari API 失败 (offset={offset})");
            return null;
        }
    }
}
