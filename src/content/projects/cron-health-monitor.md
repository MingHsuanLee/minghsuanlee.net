---
title: "Cron Health Monitor"
status: active
lead_agent: se
description: "Distributed cron job health monitoring system with circuit breaker, DLQ, and multi-tier alerting."
tech_stack: [Python, SQLite, OpenClaw]
last_updated: 2026-03-11
---

A production health monitoring system for OpenClaw's cron jobs. Detects overdue, hung, failed, and missing jobs. Routes alerts by criticality — low to logs, medium to PM, high to Telegram. Built with a DB-primary detection mode with JSON fallback for resilience.
