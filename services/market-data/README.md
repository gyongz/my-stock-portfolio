# Python 行情桥接服务

为 Next.js 数据源层提供 AKShare 与 BaoStock 的统一 HTTP 接口。服务默认仅监听 `127.0.0.1:8001`，浏览器不会直接访问。

```bash
pnpm market-data:setup
pnpm market-data:start
```

主应用默认请求 `http://127.0.0.1:8001`。远程部署时配置：

```env
MARKET_DATA_SERVICE_URL=http://market-data:8001
MARKET_DATA_SERVICE_TOKEN=请设置随机长字符串
```

BaoStock 没有真正实时行情，报价接口返回最新交易日数据并带 `delayed: true`。

## 容器部署

```bash
docker build -t portfolio-market-data services/market-data
docker run --rm -p 8001:8001 \
  -e MARKET_DATA_SERVICE_TOKEN=your-secret \
  portfolio-market-data
```

主应用部署时，将 `MARKET_DATA_SERVICE_URL` 指向该容器的内网地址，并配置相同的 `MARKET_DATA_SERVICE_TOKEN`。不要把服务令牌放入 `NEXT_PUBLIC_*` 环境变量。
