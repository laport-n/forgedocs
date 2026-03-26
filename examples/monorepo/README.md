# Monorepo Example

This example shows how Forgedocs handles a monorepo with multiple services under a `services/` directory.

## Structure

```
monorepo/
├── services/
│   ├── api/                  ← Node.js REST API
│   │   ├── ARCHITECTURE.md   ← Detected by forgedocs
│   │   └── README.md
│   └── worker/               ← Python background worker
│       ├── ARCHITECTURE.md   ← Detected by forgedocs
│       └── README.md
└── docsite.config.mjs        ← Points to nested dirs
```

## Configuration

```js
// docsite.config.mjs
export default {
  title: 'My Platform',
  nestedDirs: ['services'],   // ← tells forgedocs to look inside services/
}
```

When you run `forgedocs init`, it scans `services/` and discovers both `api` and `worker` as separate services in the doc site.
