#!/usr/bin/env node
/**
 * Custom HugeIcons MCP server for the illustrator plugin.
 * Three tools: search_icons → preview_icon → get_icon_svg.
 *
 * Uses the HugeIcons REST API directly — no npm icon packages needed.
 * Replaces @hugeicons/mcp-server which has a broken search endpoint
 * and returns font glyphs instead of inline SVG.
 */
const readline = require('readline');
const path = require('path');
const os = require('os');
const fs = require('fs');

const API_KEY = process.env.HUGEICONS_API_KEY || '';
const API_BASE = 'https://api.hugeicons.com/v1';
const PLUGIN_DATA = process.env.CLAUDE_PLUGIN_DATA
  || path.join(os.homedir(), '.claude/plugins/data/illustrator');
const PREVIEW_DIR = path.join(PLUGIN_DATA, 'icon-previews');

// ---------- MCP protocol (JSON-RPC 2.0 over stdio) ----------

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', async (line) => {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  const res = await handle(msg);
  if (res) process.stdout.write(JSON.stringify(res) + '\n');
});

async function handle(msg) {
  const { id, method, params } = msg;
  switch (method) {
    case 'initialize':
      return ok(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'hugeicons-illustrator', version: '1.0.0' },
      });
    case 'notifications/initialized':
      return null;
    case 'tools/list':
      return ok(id, { tools: TOOLS });
    case 'tools/call':
      return toolCall(id, params);
    default:
      return id !== undefined
        ? err(id, -32601, `Method not found: ${method}`)
        : null;
  }
}

function ok(id, result) { return { jsonrpc: '2.0', id, result }; }
function err(id, code, message) { return { jsonrpc: '2.0', id, error: { code, message } }; }
function text(id, t) { return ok(id, { content: [{ type: 'text', text: t }] }); }
function textErr(id, t) { return ok(id, { content: [{ type: 'text', text: t }], isError: true }); }

// ---------- Tool definitions ----------

const TOOLS = [
  {
    name: 'search_icons',
    description: 'Search HugeIcons by keyword. Returns icon names you can pass to preview_icon or get_icon_svg.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords (e.g., "checkmark", "notification")' },
      },
      required: ['query'],
    },
  },
  {
    name: 'preview_icon',
    description: 'Render an icon to a PNG file for visual evaluation. Returns the file path — use Read to view it. Call this on multiple candidates from search_icons to compare and pick the best fit.',
    inputSchema: {
      type: 'object',
      properties: {
        icon_name: { type: 'string', description: 'Icon name in kebab-case (e.g., "notification-03")' },
        style: { type: 'string', enum: ['stroke-rounded', 'solid-rounded'], description: 'Icon style (default: stroke-rounded)' },
      },
      required: ['icon_name'],
    },
  },
  {
    name: 'get_icon_svg',
    description: 'Get a HugeIcons icon as a <symbol> definition + <use> reference. Add the <symbol> to your <defs> block once, then use <use href="#icon-name"> wherever needed. This prevents SVG duplication.',
    inputSchema: {
      type: 'object',
      properties: {
        icon_name: { type: 'string', description: 'Icon name in kebab-case (e.g., "notification-03")' },
        style: { type: 'string', enum: ['stroke-rounded', 'solid-rounded'], description: 'Icon style (default: stroke-rounded)' },
      },
      required: ['icon_name'],
    },
  },
];

async function toolCall(id, params) {
  const { name, arguments: args } = params;
  try {
    switch (name) {
      case 'search_icons': return text(id, await searchIcons(args.query));
      case 'preview_icon': return text(id, await previewIcon(args.icon_name, args.style || 'stroke-rounded'));
      case 'get_icon_svg': return text(id, await getIconSvg(args.icon_name, args.style || 'stroke-rounded'));
      default: return textErr(id, `Unknown tool: ${name}`);
    }
  } catch (e) {
    return textErr(id, e.message);
  }
}

// ---------- API helpers ----------

function authHeaders() {
  const h = { accept: 'application/json' };
  if (API_KEY) h['Authorization'] = `Bearer ${API_KEY}`;
  return h;
}

async function fetchRawSvg(iconName, style) {
  const url = `${API_BASE}/icon/${encodeURIComponent(iconName)}/svg?style=${encodeURIComponent(style)}`;
  const res = await fetch(url, { headers: authHeaders(), signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Icon "${iconName}" not found (${res.status})`);
  return await res.text();
}

// ---------- search_icons ----------

async function searchIcons(query) {
  if (!query || !query.trim()) return '[]';
  const url = `${API_BASE}/search?q=${encodeURIComponent(query.trim())}&per_page=25`;
  const res = await fetch(url, { headers: authHeaders(), signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`HugeIcons API ${res.status}: ${await res.text()}`);
  const body = await res.json();
  const icons = (body.data || []).map(r => ({
    name: r.name,
    tags: r.tags,
    category: r.category,
  }));
  return JSON.stringify(icons, null, 2);
}

// ---------- preview_icon ----------

async function previewIcon(iconName, style) {
  // Clean up previews older than 5 minutes
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const f of fs.readdirSync(PREVIEW_DIR)) {
    const fp = path.join(PREVIEW_DIR, f);
    try { if (fs.statSync(fp).mtimeMs < cutoff) fs.unlinkSync(fp); } catch {}
  }

  const raw = await fetchRawSvg(iconName, style);

  // Replace dimensions for consistent rendering, swap hardcoded color for black
  const renderSvg = raw
    .replace(/width="[^"]*"/, 'width="128"')
    .replace(/height="[^"]*"/, 'height="128"')
    .replace(/#141B34/gi, '#000000');

  // Render to PNG via sharp
  const sharp = require(require.resolve('sharp', {
    paths: [path.join(PLUGIN_DATA, 'node_modules')]
  }));
  const outPath = path.join(PREVIEW_DIR, `${iconName}--${style}.png`);
  await sharp(Buffer.from(renderSvg)).resize(128, 128).png().toFile(outPath);

  return outPath;
}

// ---------- get_icon_svg ----------

async function getIconSvg(iconName, style) {
  const raw = await fetchRawSvg(iconName, style);
  const svg = raw.replace(/#141B34/gi, 'currentColor');

  // Extract inner content (everything between <svg ...> and </svg>)
  const innerMatch = svg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
  if (!innerMatch) throw new Error(`Could not parse SVG for "${iconName}"`);
  const inner = innerMatch[1];

  // Extract viewBox from original
  const vbMatch = svg.match(/viewBox="([^"]+)"/);
  const viewBox = vbMatch ? vbMatch[1] : '0 0 24 24';

  const symbolId = iconName;

  return [
    `<!-- Add to <defs> (once): -->`,
    `<symbol id="${symbolId}" viewBox="${viewBox}" fill="none">`,
    `  ${inner.trim()}`,
    `</symbol>`,
    ``,
    `<!-- Reference (as many times as needed): -->`,
    `<use href="#${symbolId}"/>`,
  ].join('\n');
}

process.stderr.write('hugeicons-illustrator MCP server running on stdio\n');
