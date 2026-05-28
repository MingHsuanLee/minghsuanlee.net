---
title: "Production 用 embedding 怎麼選:什麼時候 bge-m3 比 OpenAI 強"
date: 2026-05-30
author: ming
tags: [embeddings, rag, production, llm-ops]
lang: zh-tw
series: "Context Engineering"
description: "為什麼我每天的 production workload 還是用本地 bge-m3,儘管 OpenAI 的 text-embedding-3-small 在大量處理上更快更便宜 — 一個 production 決策框架。"
---

AI infrastructure 圈有個預設動作大概長這樣:

> 「用 OpenAI 的 `text-embedding-3-small`。便宜。快。下一個。」

不能說錯。但這也不是你跑真正 production 系統時該先伸手拿的答案。我跑了兩年 AI agent 產品的 embedding 之後,現在用另一套框架在做這個選擇 — 這套框架讓我把日常 workload 留在本地模型,只有特定情境才往 API 走。

這篇就是那套框架。

## 隱藏的預設假設

大多數「用 OpenAI embedding 就對了」的建議,其實是寫給兩種情境的:

1. **一次性大批 backfill:** 你手上有 5 萬–50 萬份文件,要 embed 一次給 RAG demo 或研究 prototype。
2. **Greenfield startup:** 你在優化「上線速度」勝於「營運成本」。

兩個都合理。但兩個都不是大多數 production AI agent 的真實情境。

真正的 production case 長這樣:

- 每天有 **新內容進來**(新聞、逐字稿、文件、user 產生的文字)
- 量**不大** — 每天 100 到 1000 條,不是 10 萬條
- 你跑了**好幾個 agent** 共用同一個 vector store
- 你在意的是「**寫入到可查詢之間的 latency**」勝於 throughput
- 在這個量級下,成本本來就「小到可以忽略」
- 你**重視「不要每天都要靠 cloud」**做這件事

在這個 regime 裡,計算邏輯整個翻轉。讓我說明為什麼。

## 三角:速度、成本、品質

Embedding 選型坐在三個 constraint 的交叉點:

```
            速度
              /\
             /  \
            /    \
           /      \
          /        \
         /          \
        /____________\
     成本          品質
```

大家**以為**:

- **OpenAI** 速度跟成本贏,品質持平
- **本地端**(bge-m3 / e5 等)沒什麼特別贏的

**小規模實際上的情況**:

- **本地端**贏在「**trigger 到結果的 latency**」(沒網路 roundtrip,沒 cloud rate limit)
- **本地端**贏在「**成本可預期性**」(你本來就在付的 CPU time vs 按用量計費的 API)
- **本地端**在「**非英文內容**」上持平或更好 — 特別是 bge-m3 對中文
- **OpenAI** 在「**raw throughput**」上大勝(我跑過的一次 benchmark 是 1400 倍差距)
- **OpenAI** 在「**突發大批 workload**」上贏

陷阱在於:你看到 OpenAI 數字 — 每百萬 token $0.02 美金、每 call ~10ms — 然後得出「當然用 OpenAI」這個結論。**這個算式只在某個量級之上才成立。**

## 我實際做過的 production 決策

我有個 backfill 問題。~415,000 篇學術論文要做一次性 embedding,給一個 discovery 系統用。我有兩個選項:

**A — 既有 CPU VPS 上跑 bge-m3:**
- 每篇 ~1.5 秒,sequential
- 這台 VPS 沒 GPU
- Batch / parallelism 都沒帶來可量測的加速(ollama runtime 限制)
- 總時間:**7+ 天**

**B — OpenAI `text-embedding-3-small`:**
- 105 分鐘跑完整個 corpus
- 成本:1.61 USD,一次性
- 品質:這個純英文 corpus 上相當

我切去用 OpenAI。當然啊。

但故事後面這段讓我跟人講起來,他們都會愣一下:**我沒把其他東西一起遷移過去。**

我的日常 ingestion — 新聞文章、逐字稿、每日 corpus 更新 — 繼續跑 bge-m3。原因是當初讓我為了 backfill 切過去的成本計算,**對日常 workload 不成立**:

| | Backfill(一次性)| 日常 ingest(經常性)|
|---|---|---|
| 量 | 415,000 條 | 每天 100–500 條 |
| CPU bge-m3 時間 | 7 天(不可接受)| 5–15 分鐘(沒差)|
| OpenAI 時間 | 105 分鐘 | ~30 秒 |
| OpenAI 成本 | $1.61 一次 | 約 $0.10/月 |
| **vs 現狀的淨差異** | 「省 7 天換 $1.61」| 「省 14 分鐘換 $0.10/月 + 多一個 cloud 依賴」|

對日常 workload 而言,切換不會帶來任何 operational 上有意義的好處(agent 不在乎晚上 batch 是 14 分鐘還 30 秒),但會多出來:

- 多一個外部依賴
- 不同的 failure mode(API 出包 vs 自家 infra)
- 「我 dev 看到的 embedding」跟「我 prod 看到的 embedding」開始 drift
- 一筆每個月的小帳單,再小也是帳單

對的決策是 hybrid:**OpenAI 給那個突發 workload,bge-m3 給其他所有。**

## 框架

做過這個跟幾個類似的決策後,我現在用這個框架:

**預設用 self-hosted。** 理由是 operational 的,不是技術的:

- 你的 stack 少一個外部依賴
- Embedding 在 dev → staging → prod 之間保持一致
- 成本有上界,可預期
- 你會學會自家模型的 failure mode

**切去用 API 的時機(任一條成立)**:

1. **你有突發 workload** 在自家硬體 CPU/GPU 預算內塞不下。(我的 415k backfill 就是這個案例。)
2. **你在處理純英文 corpus**,且 OpenAI 的品質優勢對你來說 matter。多語內容 — 特別是中文 — 本地模型像 bge-m3 通常持平或更好,因為它們訓練時就針對這個情境優化。
3. **trigger 到結果的 latency 是 critical 的**,**且**你 query 量低。對於 real-time user-facing query 嵌入 search term,OpenAI ~10ms 回應 vs 本地 100–500ms 可能 matter。
4. **你沒有 / 不想有跑模型的 infra**。有時候對的答案就是「我不要再多一個 process 在這台 server 上」。

**留在 self-hosted 的時機**:

1. **每日 ingestion < 1000 條**。API 在成本上的勝利轉換不出 operational 上明顯的勝利。
2. **多語內容**。bge-m3 是被一個明確優化中文 / 日文 / 多語場景的團隊訓練的。
3. **跨專案一致性重要**。跑一個 knowledge engine service 讓所有 agent 共用,等於 embedding 有單一 source of truth。把其中一部分切到 cloud API 會造成 dialect drift。
4. **你本來就有 compute**。如果你的 VPS 90% 時間 idle,在它上面跑 embedding 的邊際成本約等於零。

## 該避免的錯誤

我最常看到的錯誤:一個團隊很早就選「全部用 OpenAI」,半年後 embedding 月帳單 $200,production 路徑因為被哪個 service 呼叫而分成三套,然後對「OpenAI 哪天 deprecate 這個模型怎麼辦」沒計畫。

或是反過來的錯誤:選了本地模型,撞上一個突發 workload 跑 7 天,得出「self-hosted 不 scale」的結論,把整個東西拔掉。

兩個都是對「一個 data point」的反應。實際答案是:**量你的 workload 分布,不是它的平均值。** 如果你 95% 的工作是小量日常 batch、5% 是偶爾的 backfill,你的 infra 應該反映這個分布,而不是 collapse 到其中一邊。

## 重點

「直接用 OpenAI 就對了」這個預設建議,在你真正的 workload 是「小量日常」而非「one-shot 大批」時,優化的是錯的 constraint。本地 embedding 讓你的 stack 更簡單、dev/prod 一致、成本有上界。

哪個 workload 值得切去 API,就為那個 workload 切。其他留本地。

這是一種你早期看起來無聊一點、後面省掉很多 operational 複雜度的決策。

---

*Context Engineering 系列下一篇:hybrid retrieval(vector + lexical + rerank)以及為什麼大多數團隊跳過 rerank 這步是錯的。*
