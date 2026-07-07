---
title: "Infrastructure for solo AI builders: why I split one server into three"
date: 2026-07-07
author: ming
tags: [infrastructure, ai-agents, self-hosting, mlops, production]
lang: en
series: "Running AI in Production"
description: "Running your own AI agents and GenAI tools? Here's the three-tier setup I landed on — dev, production, and a shared AI + data tier — and the three principles behind it."
---

> Run enough of your own AI agents and one day an experiment takes down something you actually depend on. That's the day you learn about separation of concerns.

For about a year I've been building AI agents and GenAI tools in my own time — orchestration, retrieval systems, a couple of small products. For most of that time, everything ran on a single server. It was simple, and simple was right… right up until it wasn't.

The failure mode is always the same: you spin up a heavy experiment — a new model, a backfill job, a runaway agent loop — and it starves or crashes the box that's also running the thing you (or your users) rely on. On one server, your playground and your production line share the same floor.

Here's the setup I moved to, and the thinking behind it. It's aimed at professionals running their own AI stack solo — not a company platform team.

## Three tiers, one job each

I split across three servers, each with a single clear responsibility:

**Dev** — where I build and break things. If I crash it, nothing real goes down. That's the whole point: a place to be reckless.

**Production** — what actually serves users. It's deliberately boring. Small, stable, protected, and changed as little as possible. Boring is a feature here.

**AI + Data** — the heavy tier. Local model inference, an embedding service, and a vector database, all behind one authenticated API. Everything memory-hungry or compute-intensive lives here, isolated from the web-facing tiers.

That's it. Three modest servers, not one big one.

## Three principles, if you're doing this alone

**1. Isolate the blast radius.** The real value of separation isn't tidiness — it's freedom. When a 3am experiment *can't* touch what you depend on, you stop being cautious in the one place where caution kills momentum. You move fast on dev precisely because it's walled off.

**2. Centralise the expensive stuff.** Inference, embeddings, and your vector store are the costly, heavy pieces. Host them once, behind one internal API, and let every app and agent call in. The alternative — re-hosting a model per project, or paying per-token for workloads you run daily — quietly bleeds money and duplicates effort. One AI + data tier becomes your own little internal platform.

**3. One gateway, and let the servers talk on a schedule.** Put a single secure gateway in front of everything, so there's one front door to reason about. Then wire the cross-server work as automated pipelines — data gathered on the AI tier, served from production — instead of you SSHing around at midnight moving files by hand. The goal is a system that runs without you in the loop.

## When not to bother

This isn't a licence to over-engineer. If you run one bot and a cron job, one server is correct — adding tiers would just be cosplaying as a platform team. The signal to split is friction you can feel: experiments knocking over real things, one machine juggling incompatible jobs, or a cost line creeping up because every project hosts its own model.

And none of this needs a big cloud bill. Three small VPS instances and some discipline get you most of the way. The win was never scale — it's separation of concerns, so I can keep shipping without breaking my own tools.

If you're running your own agents, I'd genuinely like to hear how you've structured yours. Different constraints, different answers.
