# 模型价目核验 · 2026-10-09

公式：**平台价（元/百万 tokens）= 官方 USD × 7.2 ×（1 + 分档加价）**

| 档位 | 加价 |
|------|------|
| 经济 | 15% |
| 标准 | 20% |
| 旗舰 | 18% |
| 图像/视频 | 30%（按次） |

## 本次目录变更

### 新增（OpenAI）

| 模型 | 官方 USD（入/出） | 档位 | 平台价 ¥（入/出） | 结果 |
|------|-------------------|------|-------------------|------|
| gpt-6-luna | $0.10 / $0.50 | 经济 15% | 0.83 / 4.14 | ✅ |
| gpt-6-sol | $2 / $10 | 旗舰 18% | 16.99 / 84.96 | ✅ |
| gpt-6.1-sol | $2 / $10 | 旗舰 18% | 16.99 / 84.96 | ✅ |

### 下架 / 排期下架

| 模型 | 状态 | 替代 |
|------|------|------|
| gemini-2.5-flash-image | 已下架（2026-10-02） | gemini-3.1-flash-image / lite-image |
| gpt-image-1 | 已下架上架（官网 2026-10-23 停用） | gpt-image-2.5-flare / sunburst |
| gpt-4.1-nano | 已下架上架（官网 2026-10-23 停用） | gpt-6-luna |
| gpt-image-1-mini / 1.5 | 仍可用；官网 2026-12-01 停用 | gpt-image-2.5-* |

### 价格校正（图像）

| 模型 | 官方 Token 价（文本入 / 图像出） | 平台按次 ¥ | 结果 |
|------|--------------------------------|------------|------|
| gpt-image-1-mini | $2 / $8 | 0.08 | ✅ |
| gpt-image-1.5 | $5 / $32 | 0.50 | ✅ |
| gpt-image-2 / 2.5-* | 不变 | 0.49 / 0.13 | ✅ |

### 未改动（已对齐）

- Google 对话：gemini-3.6/3.7/3.8-flash 仍为引入价 $0.75/$3.75
- DeepSeek：deepseek-flash / deepseek-v4-pro 按高峰档 $0.30/$1.20 与 $1.32/$3.96
- Veo 3.1 三档按秒价不变

## 数据来源

- OpenAI：[Models](https://developers.openai.com/api/docs/models) · [Pricing](https://developers.openai.com/api/docs/pricing) · [Deprecations](https://developers.openai.com/api/docs/deprecations)
- Google：[Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing) · [Deprecations](https://ai.google.dev/gemini-api/docs/deprecations)
- DeepSeek：[Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing)

## 公告

系统公告 id：`ann-model-catalog-2026-10-09`（仅【新增】 GPT-6 Luna / Sol / 6.1 Sol）。
