# 模型价目核验 · 2026-09-18

公式：**平台价（元/百万 tokens）= 官方 USD × 7.2 ×（1 + 分档加价）**

| 档位 | 加价 |
|------|------|
| 经济 | 15% |
| 标准 | 20% |
| 旗舰 | 18% |
| 图像/视频 | 30%（按次） |

## 核验结论

**本次更新涉及的主力对话模型：官价录入与平台价计算均正确，无差错。**

| 模型 | 官方 USD（入/出） | 档位 | 平台价 ¥（入/出） | 结果 |
|------|-------------------|------|-------------------|------|
| gpt-6-astra | $10 / $50 | 旗舰 18% | 84.96 / 424.80 | ✅ |
| gpt-5.6-sol | $4 / $20 | 旗舰 18% | 33.98 / 169.92 | ✅ |
| gpt-5.6-terra | $2 / $12 | 标准 20% | 17.28 / 103.68 | ✅ |
| gpt-5.6-luna | $0.20 / $1.20 | 经济 15% | 1.66 / 9.94 | ✅ |
| gemini-3.8-flash | $0.75 / $3.75 | 旗舰 18% | 6.37 / 31.86 | ✅ |
| gemini-3.7-flash | $0.75 / $3.75 | 标准 20% | 6.48 / 32.40 | ✅ |
| gemini-3.6-flash | $0.75 / $3.75 | 标准 20% | 6.48 / 32.40 | ✅ |
| gemini-3.5-flash | $1.50 / $9.00 | 标准 20% | 12.96 / 77.76 | ✅ |
| deepseek-flash | $0.30 / $1.20 | 经济 15% | 2.48 / 9.94 | ✅ |
| deepseek-v4-pro | $1.32 / $3.96 | 旗舰 18% | 11.21 / 33.64 | ✅ |

## 数据来源（核验日）

- OpenAI：[API Pricing](https://developers.openai.com/api/docs/pricing) / [Models](https://developers.openai.com/api/docs/models)（短上下文 Standard）
- Google：[Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)（3.6/3.7/3.8 Flash 引入价至 2026-12-31）
- DeepSeek：[Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing)（**高峰** cache-miss；非峰时为半价）

## 说明与注意

1. **Gemini 引入价**：3.6/3.7/3.8 Flash 在 2027-01-01 起官价将升至 $1.50 / $7.50，届时需再同步。
2. **DeepSeek 峰时计价**：平台按高峰档录入，避免峰时成本倒挂；用户在非峰时上游更便宜，平台仍按统一价结算。
3. **长上下文 / Fast mode**：OpenAI 另有加价档，当前平台价按短上下文 Standard 计；若开放 Fast 档需单独加价项。
4. **DB 价格覆盖**：若管理后台曾导入旧 CSV，可能覆盖代码默认价；请重新导入 `docs/yuhao-model-pricing.csv`。
5. **图像模型**：本次未重核 gpt-image / Imagen / Veo；OpenAI 官网已出现 `gpt-image-2.5-*`，可另排期同步。

## 公告

系统公告 id：`ann-model-catalog-2026-09-18`（见 `SYSTEM_ANNOUNCEMENTS`），部署后用户登录弹窗与「公告通知」页可见。
