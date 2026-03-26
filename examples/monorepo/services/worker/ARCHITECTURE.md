# Worker Service — Architecture

## System Purpose

Asynchronous task processor. Consumes jobs from RabbitMQ queues, processes them, and stores results. Handles email sending, file processing, and report generation.

## Codemap

| Module | Purpose | Key files |
|--------|---------|-----------|
| `tasks/` | Celery task definitions | `email.py`, `uploads.py`, `reports.py` |
| `processors/` | Business logic for each task type | `email_sender.py`, `file_processor.py` |
| `config/` | Celery and queue configuration | `celery_config.py` |

## Data Flow

```
RabbitMQ → Celery Worker → Task Handler → Processor → External Service (SMTP / S3 / etc.)
                                       → Database (status updates)
```

## Invariants

| Rule | Verification |
|------|-------------|
| All tasks must be idempotent | `grep -rn "def " tasks/ \| wc -l` matches task count in README |
| Failed tasks retry with exponential backoff | `grep -r "retry" tasks/ \| grep -c "backoff"` > 0 |
