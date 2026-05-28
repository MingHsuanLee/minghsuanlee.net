---
title: "Embedding choice for production: when bge-m3 beats OpenAI"
date: 2026-05-30
author: ming
tags: [embeddings, rag, production, llm-ops]
lang: en
series: "Context Engineering"
description: "Why I run bge-m3 locally for daily workloads even though OpenAI's text-embedding-3-small is faster and cheaper at scale — a production decision framework."
---

There's a default move in the AI infrastructure playbook that goes something like this:

> "Use OpenAI's `text-embedding-3-small`. It's cheap. It's fast. Move on."

It's not wrong. But it's also not the answer you should reach for first when you're running a real production system. After two years of running embeddings across a handful of AI agent products, I now make this choice with a different framework — one that has me keeping a local model for most of my workload, and only reaching for the API in specific cases.

This post is about that framework.

## The hidden assumption

Most "use OpenAI embeddings" advice is implicitly written for one of two scenarios:

1. **One-time batch:** you have 50k–500k documents to embed once for a RAG demo or research prototype.
2. **Greenfield startup:** you're optimizing for time-to-launch over operating cost.

Both are valid. Neither is most production AI agents.

The actual production case looks like this:

- You have **daily ingestion** of new content (news, transcripts, docs, user-generated text)
- Volume is **modest** — 100 to 1000 new items per day, not 100k
- You're running **several agents** off the same vector store
- You care about **latency-from-write-to-queryable** more than throughput
- Cost is "small enough to ignore" already at this volume
- You **value not having a daily cloud dependency** for indexing

In this regime, the calculus inverts. Let me show you why.

## The triangle: speed, cost, quality

Embedding choice sits at the corner of three constraints:

```
            Speed
              /\
             /  \
            /    \
           /      \
          /        \
         /          \
        /____________\
     Cost          Quality
```

What people assume:

- **OpenAI** wins on speed and cost, ties on quality
- **Self-hosted (bge-m3, e5, etc.)** wins on nothing in particular

What's actually true at small scale:

- **Self-hosted** wins on **latency-from-trigger** (no network roundtrip, no cloud rate limits)
- **Self-hosted** wins on **cost predictability** (CPU time you already pay for vs metered API calls)
- **Self-hosted** ties or beats on **quality for non-English content** — especially bge-m3 for Chinese
- **OpenAI** wins on **raw throughput** by a wide margin (1400× in one benchmark I ran)
- **OpenAI** wins when you have **bursty large-batch workloads**

The trap is reading the OpenAI numbers — $0.02 per million tokens, ~10ms per call — and concluding "obviously use OpenAI." That math only matters above a certain volume.

## A real production decision I made

I had a backfill problem. ~415,000 academic papers needed to be embedded once for a discovery system. I had two options:

**Option A — bge-m3 on my existing CPU VPS:**
- ~1.5 seconds per paper, sequential
- No GPU available on this VPS
- Batch/parallelism gave no measurable speedup (ollama runtime limitation)
- Total time: **7+ days**

**Option B — OpenAI `text-embedding-3-small`:**
- Burst through the entire corpus in 105 minutes
- Cost: $1.61 USD, one-time
- Quality: comparable for this English-only corpus

I switched to OpenAI. Obviously.

But here's the part that surprised people I told this story to: **I didn't migrate everything else.**

My daily ingestion — news articles, transcripts, daily corpus updates — kept running on bge-m3. The reason is that the cost calculation that justified switching for backfill **doesn't apply** to the daily workload:

| | Backfill (one-time) | Daily ingest (recurring) |
|---|---|---|
| Volume | 415,000 items | 100–500 items/day |
| Time on CPU bge-m3 | 7 days (unacceptable) | 5–15 minutes (fine) |
| Time on OpenAI | 105 min | ~30 seconds |
| Cost on OpenAI | $1.61 total | ~$0.10/month |
| **Net difference vs status quo** | "Save 7 days for $1.61" | "Save 14 minutes for $0.10/mo, gain cloud dep" |

For the daily workload, switching gains me nothing operationally significant (the agent doesn't care about 14 minutes vs 30 seconds in a nightly batch) but adds:

- A new external dependency
- Different failure modes (API outages vs my own infra)
- Drift between "what my embeddings look like in dev" vs "what they look like in prod"
- A monthly bill, however small

The right decision was hybrid: **OpenAI for the one bursty workload, bge-m3 for everything else.**

## The framework

After making this decision and a few similar ones, here's the framework I now use:

**Default to self-hosted.** The reasons are operational, not technical:

- One less external dependency in your stack
- Embeddings stay consistent dev → staging → prod
- Cost is bounded and predictable
- You learn the failure modes of your own model

**Switch to API when one of these is true:**

1. **You have a bursty workload** that can't fit in your CPU/GPU budget on local hardware. (My 415k backfill case.)
2. **You're dealing with an English-only corpus** where OpenAI's quality lead matters. For multilingual content — especially Chinese — local models like bge-m3 are often equal or better, because they were trained with that in mind.
3. **Latency from trigger-to-result is critical** *and* you have low-volume queries. For real-time user-facing queries embedding a search term, OpenAI's ~10ms response vs your local 100–500ms might matter.
4. **You don't have or want infrastructure to run a model.** Sometimes the right answer is "I will not run another process on this server."

**Stay self-hosted when:**

1. **Daily ingestion volume is < 1000 items.** The cost win from API doesn't translate to a noticeable operational win.
2. **You have multilingual content.** bge-m3 was explicitly trained on Chinese, Japanese, and many other languages by a team optimizing for that case.
3. **Cross-project consistency matters.** Running one knowledge engine service that all your agents share means one source of truth for embeddings. Switching part of it to a cloud API creates dialect drift.
4. **You already have the compute.** If your VPS sits idle 90% of the time, the marginal cost of running embeddings on it is approximately zero.

## The mistake to avoid

The mistake I see most often: a team picks "use OpenAI for everything" early, then six months later has $200/month in embedding bills, three different production paths depending on which service is calling it, and no plan for what happens if OpenAI deprecates the model.

Or the opposite mistake: they pick a local model, hit a bursty workload that takes 7 days, conclude self-hosted "doesn't scale," and rip the whole thing out.

Both are reactions to a single data point. The actual answer is: **measure your workload's distribution, not its average.** If 95% of your work is small daily batches and 5% is occasional backfills, your infrastructure should reflect that split, not collapse to one or the other.

## Takeaway

The default advice — "just use OpenAI" — optimizes for the wrong constraint when your real workload is small daily volume rather than one-shot batches. Local embeddings keep your stack simpler, your dev/prod consistent, and your costs bounded.

Switch to API for the specific workloads that justify it. Keep the rest local.

This is one of those decisions where being a little more boring early saves you a lot of operational complexity later.

---

*Next in this Context Engineering series: hybrid retrieval (vector + lexical + rerank) and why most teams skip the rerank step wrongly.*
