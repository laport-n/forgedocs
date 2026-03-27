# Worker Service — Architecture

## System Purpose

Asynchronous task processor. Consumes jobs from RabbitMQ queues, processes them, and stores results. Handles email sending, file processing, and report generation.

## Codemap

| Module | Path | Purpose |
|--------|------|---------|
| Tasks | `tasks/` | Celery task definitions (email, uploads, reports) |
| Processors | `processors/` | Business logic for each task type |
| Config | `config/` | Celery and queue configuration |

## Data Flow

```
RabbitMQ → Celery Worker → Task Handler → Processor → External Service (SMTP / S3 / etc.)
                                       → Database (status updates)
```

## Invariants

| Rule | Verification |
|------|-------------|
| All tasks must be idempotent | `grep -c "def " tasks/*.py` matches task count in README |
| Failed tasks retry with exponential backoff | `grep -c "backoff" tasks/*.py` should be > 0 |
