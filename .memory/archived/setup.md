## Domaineat Project Setup

### Commands:
- **Cleanup**: Run `/opt/data/bin/cleanup` to clean temp files
- **OS Info**: Run `/opt/data/bin/os` to check disk/system info
- **Safe npm install**: Use the helper script to avoid filling disk

### Disk Safety:
- node_modules is symlinked to /tmp/domaineat_node_modules
- After npm install, always run the move script to keep node_modules on /tmp
- Never install heavy deps in /opt/data directly

### GitHub:
- Token is set as GH_PAT and GITHUB_TOKEN env vars (do NOT store token value in files)

