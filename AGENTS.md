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
├── app/                    # 页面路由
│   ├── layout.tsx          # 根布局
│   ├── page.tsx            # 主页面（仪表盘）
│   └── globals.css         # 全局样式
├── components/
│   ├── kline-chart.tsx     # KLineChart 图表组件
│   ├── holdings-table.tsx  # 持仓列表表格
│   ├── holdings-dialog.tsx # 添加/编辑持仓弹窗
│   ├── portfolio-summary.tsx # 持仓统计摘要
│   └── import-export.tsx   # CSV 导入导出
├── hooks/
│   └── use-portfolio.ts    # 持仓状态管理 Hook
└── lib/
    ├── types.ts            # 类型定义
    └── kline-data.ts       # K线模拟数据 & 股票列表
```

## 数据流
- 持仓数据存储在 localStorage，通过 `usePortfolio` hook 管理
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

## 注意事项
- 图表和行情数据均为模拟生成，仅用于演示
- 修改 `STOCK_LIST` 在 `src/lib/kline-data.ts` 可调整可选股票池
- 图表样式配置在 `src/components/kline-chart.tsx` 的 `init()` 调用中