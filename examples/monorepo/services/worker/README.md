# Worker Service

Background job processor built with Python and Celery. Consumes tasks from the message queue.

## Setup

```bash
cd services/worker
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
celery -A tasks worker
```

## Tasks

| Task | Queue | Description |
|------|-------|-------------|
| `send_email` | `notifications` | Send transactional emails |
| `process_upload` | `uploads` | Process and store uploaded files |
| `generate_report` | `reports` | Generate PDF reports |
