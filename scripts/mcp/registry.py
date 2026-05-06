"""
MCP Server Registry
Bilinen MCP server'lari ve kurulum bilgileri.
vibecosystem v2.0
"""

import os
import sys

REGISTRY = {
    "github": {
        "name": "GitHub MCP Server",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"],
        "env": {"GITHUB_PERSONAL_ACCESS_TOKEN": ""},
        "description": "GitHub API - repos, issues, PRs, code search",
        "project_signals": [".github/", ".git/"],
        "install": "npx -y @modelcontextprotocol/server-github",
    },
    "filesystem": {
        "name": "Filesystem MCP",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"],
        "description": "Local filesystem access",
        "project_signals": ["*"],
        "install": "npx -y @modelcontextprotocol/server-filesystem",
    },
    "postgres": {
        "name": "PostgreSQL MCP",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-postgres"],
        "env": {"DATABASE_URL": ""},
        "description": "PostgreSQL database access",
        "project_signals": ["schema.prisma", "*.sql", "migrations/"],
        "install": "npx -y @modelcontextprotocol/server-postgres",
    },
    "docker": {
        "name": "Docker MCP",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-docker"],
        "description": "Docker container management",
        "project_signals": ["Dockerfile", "docker-compose.yml"],
        "install": "npx -y @modelcontextprotocol/server-docker",
    },
    "brave-search": {
        "name": "Brave Search MCP",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-brave-search"],
        "env": {"BRAVE_API_KEY": ""},
        "description": "Web search via Brave",
        "project_signals": [],
        "install": "npx -y @modelcontextprotocol/server-brave-search",
    },
    "sqlite": {
        "name": "SQLite MCP",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-sqlite"],
        "description": "SQLite database access",
        "project_signals": ["*.db", "*.sqlite"],
        "install": "npx -y @modelcontextprotocol/server-sqlite",
    },
    "puppeteer": {
        "name": "Puppeteer MCP",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-puppeteer"],
        "description": "Browser automation",
        "project_signals": [
            "playwright.config.ts",
            "playwright.config.js",
            "cypress.config.ts",
            "cypress.config.js",
        ],
        "install": "npx -y @modelcontextprotocol/server-puppeteer",
    },
    "chrome-devtools": {
        "name": "Chrome DevTools MCP",
        "command": "npx",
        "args": ["-y", "@anthropic/chrome-devtools-mcp"],
        "description": "Browser debugging - console, network, performance",
        "project_signals": [
            "next.config.js",
            "next.config.ts",
            "next.config.mjs",
            "vite.config.ts",
            "vite.config.js",
            "webpack.config.js",
        ],
        "install": "npx -y @anthropic/chrome-devtools-mcp",
    },
    "notion": {
        "name": "Notion MCP",
        "command": "npx",
        "args": ["-y", "@notionhq/notion-mcp-server"],
        "env": {"OPENAPI_MCP_HEADERS": ""},
        "description": "Notion workspace - pages, databases, comments",
        "project_signals": [],
        "install": "npx -y @notionhq/notion-mcp-server",
    },
    "browser-use": {
        "name": "Browser Use MCP",
        "command": "browser-use",
        "args": ["--mcp"],
        "description": "AI browser automation with vision",
        "project_signals": [
            "next.config.js",
            "next.config.ts",
            "vite.config.ts",
        ],
        "install": "pip3 install --user --break-system-packages browser-use",
    },
    "codebase-memory": {
        "name": "Codebase Memory MCP",
        "command": "codebase-memory-mcp",
        "args": [],
        "description": "Codebase indexing, architecture graph, semantic search (64 dil)",
        "project_signals": ["docs/", "src/", "lib/"],
        "install": "Binary: ~/bin/codebase-memory-mcp (zaten kurulu)",
    },
    "kubernetes": {
        "name": "Kubernetes MCP",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-kubernetes"],
        "description": "Kubernetes cluster management",
        "project_signals": ["k8s/", "kubernetes/", "kustomization.yaml"],
        "install": "npx -y @modelcontextprotocol/server-kubernetes",
    },
}


def get_recommendations(project_path: str) -> list:
    """Proje dizinine gore MCP onerileri dondur."""
    recommendations = []

    try:
        project_files = os.listdir(project_path)
    except OSError:
        return recommendations

    for key, server in REGISTRY.items():
        signals = server.get("project_signals", [])
        if not signals:
            continue

        for signal in signals:
            if signal == "*":
                continue

            # Wildcard pattern: *.sql gibi
            if signal.startswith("*"):
                ext = signal.lstrip("*")
                if any(f.endswith(ext) for f in project_files):
                    recommendations.append(server)
                    break
            else:
                # Direkt dosya/dizin kontrolu
                check_path = os.path.join(project_path, signal.rstrip("/"))
                if os.path.exists(check_path):
                    recommendations.append(server)
                    break

    return recommendations


def get_installed_mcps() -> dict:
    """~/.mcp.json'dan kurulu MCP server'lari oku."""
    import json

    mcp_path = os.path.join(os.path.expanduser("~"), ".mcp.json")
    if not os.path.exists(mcp_path):
        return {}
    try:
        with open(mcp_path) as f:
            config = json.load(f)
        return config.get("mcpServers", {})
    except (json.JSONDecodeError, OSError):
        return {}


def print_status():
    """Kurulu MCP server durumunu goster."""
    installed = get_installed_mcps()
    if not installed:
        print("Kurulu MCP server yok (~/.mcp.json bos veya yok)")
        return

    print(f"Kurulu MCP server'lar ({len(installed)}):")
    for name, config in installed.items():
        cmd = config.get("command", "?")
        args = " ".join(config.get("args", []))
        print(f"  * {name}: {cmd} {args}")


def print_registry():
    """Tum registry'yi goster."""
    print(f"MCP Server Registry ({len(REGISTRY)} server):\n")
    for key, server in REGISTRY.items():
        print(f"  [{key}]")
        print(f"    {server['name']}: {server['description']}")
        print(f"    Install: {server['install']}")
        signals = server.get("project_signals", [])
        if signals:
            print(f"    Signals: {', '.join(signals)}")
        print()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Kullanim:")
        print("  python registry.py recommend <path>  - Proje icin MCP onerisi")
        print("  python registry.py status             - Kurulu MCP'ler")
        print("  python registry.py list               - Tum registry")
        sys.exit(0)

    cmd = sys.argv[1]

    if cmd == "recommend":
        path = sys.argv[2] if len(sys.argv) > 2 else "."
        recs = get_recommendations(path)
        if not recs:
            print("Bu proje icin ek MCP onerisi yok.")
        else:
            print(f"Onerilen MCP server'lar ({len(recs)}):\n")
            for r in recs:
                print(f"  * {r['name']}: {r['description']}")
                print(f"    Install: {r['install']}")
                print()

    elif cmd == "status":
        print_status()

    elif cmd == "list":
        print_registry()

    else:
        print(f"Bilinmeyen komut: {cmd}")
        sys.exit(1)
