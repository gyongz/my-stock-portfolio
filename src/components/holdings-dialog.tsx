'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Holding } from '@/lib/types';
import { STOCK_LIST } from '@/lib/kline-data';

interface HoldingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Pick<Holding, 'code' | 'name' | 'quantity' | 'buyPrice' | 'currentPrice'>) => void;
  editingHolding?: Holding | null;
}

export default function HoldingsDialog({
  open,
  onOpenChange,
  onSubmit,
  editingHolding,
}: HoldingsDialogProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 重置表单
  useEffect(() => {
    if (open) {
      if (editingHolding) {
        setCode(editingHolding.code);
        setName(editingHolding.name);
        setQuantity(String(editingHolding.quantity));
        setBuyPrice(String(editingHolding.buyPrice));
        setCurrentPrice(String(editingHolding.currentPrice));
      } else {
        setCode('');
        setName('');
        setQuantity('');
        setBuyPrice('');
        setCurrentPrice('');
      }
      setErrors({});
    }
  }, [open, editingHolding]);

  /** 选择股票时自动填充名称和当前价 */
  const handleCodeSelect = (value: string) => {
    setCode(value);
    const stock = STOCK_LIST.find((s) => s.code === value);
    if (stock) {
      setName(stock.name);
      if (!currentPrice) {
        setCurrentPrice(String(stock.basePrice));
      }
    }
  };

  /** 验证并提交 */
  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};

    if (!code) newErrors.code = '请选择或输入股票代码';
    if (!name) newErrors.name = '请输入股票名称';
    
    const qty = parseFloat(quantity);
    if (!quantity || isNaN(qty) || qty <= 0) {
      newErrors.quantity = '请输入有效的持仓数量';
    }
    
    const buy = parseFloat(buyPrice);
    if (!buyPrice || isNaN(buy) || buy <= 0) {
      newErrors.buyPrice = '请输入有效的买入价格';
    }
    
    const curr = parseFloat(currentPrice);
    if (!currentPrice || isNaN(curr) || curr <= 0) {
      newErrors.currentPrice = '请输入有效的当前价格';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      code,
      name,
      quantity: qty,
      buyPrice: buy,
      currentPrice: curr,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#2c2c2e] border-white/[0.06] text-white sm:max-w-md rounded-2xl shadow-none">
        <DialogHeader>
          <DialogTitle className="text-white text-[17px] font-semibold tracking-tight">
            {editingHolding ? '编辑持仓' : '添加持仓'}
          </DialogTitle>
          <DialogDescription className="text-[#98989d] text-sm">
            {editingHolding ? '修改持仓记录信息' : '输入新的持仓记录信息'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 股票选择 */}
          <div className="space-y-1.5">
            <Label htmlFor="stock-select" className="text-white/80 text-sm font-medium">
              股票代码
            </Label>
            <Select value={code} onValueChange={handleCodeSelect}>
              <SelectTrigger
                id="stock-select"
                className="bg-[#3a3a3c] border-0 text-white rounded-xl h-10 px-3"
              >
                <SelectValue placeholder="选择股票或手动输入代码" />
              </SelectTrigger>
              <SelectContent className="bg-[#2c2c2e] border-white/[0.08] text-white rounded-xl">
                {STOCK_LIST.map((stock) => (
                  <SelectItem key={stock.code} value={stock.code}>
                    {stock.code} - {stock.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.code && <p className="text-xs text-[#ff453a]">{errors.code}</p>}
          </div>

          {/* 股票名称 */}
          <div className="space-y-1.5">
            <Label htmlFor="stock-name" className="text-white/80 text-sm font-medium">
              股票名称
            </Label>
            <Input
              id="stock-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入股票名称"
              className="bg-[#3a3a3c] border-0 text-white placeholder:text-[#98989d] rounded-xl h-10"
            />
            {errors.name && <p className="text-xs text-[#ff453a]">{errors.name}</p>}
          </div>

          {/* 持仓数量 */}
          <div className="space-y-1.5">
            <Label htmlFor="quantity" className="text-white/80 text-sm font-medium">
              持仓数量
            </Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="例如: 1000"
              min="1"
              step="1"
              className="bg-[#3a3a3c] border-0 text-white placeholder:text-[#98989d] rounded-xl h-10"
            />
            {errors.quantity && <p className="text-xs text-[#ff453a]">{errors.quantity}</p>}
          </div>

          {/* 买入价格 */}
          <div className="space-y-1.5">
            <Label htmlFor="buy-price" className="text-white/80 text-sm font-medium">
              买入均价
            </Label>
            <Input
              id="buy-price"
              type="number"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              placeholder="例如: 58.50"
              min="0.01"
              step="0.01"
              className="bg-[#3a3a3c] border-0 text-white placeholder:text-[#98989d] rounded-xl h-10"
            />
            {errors.buyPrice && <p className="text-xs text-[#ff453a]">{errors.buyPrice}</p>}
          </div>

          {/* 当前价格 */}
          <div className="space-y-1.5">
            <Label htmlFor="current-price" className="text-white/80 text-sm font-medium">
              当前价格
            </Label>
            <Input
              id="current-price"
              type="number"
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
              placeholder="例如: 65.80"
              min="0.01"
              step="0.01"
              className="bg-[#3a3a3c] border-0 text-white placeholder:text-[#98989d] rounded-xl h-10"
            />
            {errors.currentPrice && <p className="text-xs text-[#ff453a]">{errors.currentPrice}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-[#98989d] hover:text-white hover:bg-white/[0.08] rounded-xl h-9 px-4"
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-[#30d158] hover:bg-[#30d158]/90 text-white rounded-xl h-9 px-5 shadow-none font-medium"
          >
            {editingHolding ? '保存修改' : '添加'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}