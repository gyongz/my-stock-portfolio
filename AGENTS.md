# 个人持仓管理 Web 应用

## 项目概览
基于 KLineChart 的个人持仓 Web 应用，提供股票 K 线图表展示、持仓管理、盈亏计算等功能。

## 技术栈
- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **图表库**: KLineChart 10

## 目录结构
```
src/
├── app/
│   ├── layout.tsx          # 根布局
│   ├── page.tsx            # 主页面（仪表盘）
│   ├── globals.css         # 全局样式
│   └── api/
│       └── data-source/    # 多数据源代理路由（行情/K线/股票列表）
│           └── route.ts
├── components/
│   ├── kline-chart.tsx     # KLineChart 图表组件
│   ├── holdings-table.tsx  # 持仓列表表格（支持收起紧凑视图）
│   ├── holdings-dialog.tsx # 添加/编辑持仓弹窗
│   ├── watchlist-table.tsx # 自选股票表格
│   ├── watchlist-dialog.tsx # 添加自选弹窗
│   ├── portfolio-summary.tsx # 持仓统计摘要
│   ├── import-export.tsx   # CSV 导入导出
│   ├── stock-search.tsx    # 股票搜索下拉组件（代码/名称模糊搜索）
│   └── data-source-selector.tsx # 数据源切换组件
├── hooks/
│   ├── use-portfolio.ts    # 持仓状态管理 Hook
│   └── use-watchlist.ts    # 自选状态管理 Hook
└── lib/
    ├── types.ts            # 类型定义
    ├── kline-data.ts       # K线模拟数据 & 内置股票池
    └── data-source/        # 多数据源系统
        ├── types.ts        # 数据源类型定义
        ├── parsers.ts      # 各数据源响应解析器
        ├── index.ts        # DataSourceManager & useDataSource hook
        ├── context.tsx     # DataSourceProvider 上下文
        ├── storage.ts      # 行情缓存
        └── adapters/       # 数据源适配器
            ├── sina.ts     # 新浪财经
            ├── tencent.ts  # 腾讯财经
            └── yahoo.ts    # Yahoo Finance
```

## 数据流
- 持仓数据存储在 localStorage，通过 `usePortfolio` hook 管理
- 自选数据存储在 localStorage，通过 `useWatchlist` hook 管理
- 模拟行情数据通过 `generateMockKLineDataForStock` 生成
- 持仓盈亏实时计算（成本价 vs 当前价）

## 开发命令
- `pnpm dev` - 启动开发服务器
- `pnpm ts-check` - TypeScript 类型检查
- `pnpm lint` - ESLint 检查
- `pnpm build` - 生产构建

## 功能清单
- [x] KLine 图表展示（日/周/月线 + 60min/30min）
- [x] 技术指标叠加（MA/MACD/KDJ/RSI/布林带）
- [x] 持仓 CRUD（添加/编辑/删除）
- [x] 实时盈亏计算（单只 + 总体）
- [x] 总资产统计面板
- [x] CSV 导入/导出
- [x] 模拟行情刷新
- [x] 响应式设计
- [x] 多数据源切换（新浪/腾讯/Yahoo/模拟）
- [x] 全量 A 股股票搜索（代码/名称模糊匹配）
- [x] 自选股票表（实时行情、K线联动、添加/删除）

## 注意事项
- 图表和行情数据支持多数据源（新浪/腾讯/Yahoo/模拟），通过 `src/components/data-source-selector.tsx` 切换
- 添加持仓时的股票选择已改为搜索下拉模式，从数据源拉取全量 A 股列表（~5500 只），支持代码或名称模糊搜索
- 内置 `STOCK_LIST` 在 `src/lib/kline-data.ts` 作为降级备用列表
- 图表样式配置在 `src/components/kline-chart.tsx` 的 `init()` 调用中
- Apple 暗色风格：背景 `#1c1c1e`，毛玻璃卡片，红涨绿跌
