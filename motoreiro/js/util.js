/* ==========================================================================
   util.js — helpers de DOM, data e formatação (pt-BR).
   ========================================================================== */
'use strict';

/* ── DOM ───────────────────────────────────────────────────────────────── */

// Propriedades CSS que aceitam número puro; as demais recebem "px".
const UNITLESS = new Set(['opacity', 'flex', 'flexGrow', 'flexShrink', 'zIndex',
  'fontWeight', 'lineHeight', 'order']);

function h(tag, props, ...children) {
  const e = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'style' && typeof v === 'object') applyStyle(e, v);
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) e.setAttribute(k, '');
      else e.setAttribute(k, v);
    }
  }
  appendKids(e, children);
  return e;
}

function applyStyle(e, obj) {
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    e.style[k] = (typeof v === 'number' && !UNITLESS.has(k)) ? v + 'px' : v;
  }
}

function appendKids(e, kids) {
  for (const c of kids) {
    if (c == null || c === false || c === true) continue;
    if (Array.isArray(c)) appendKids(e, c);
    else e.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
}

const $ = (sel, root = document) => root.querySelector(sel);
const clear = (node) => { while (node.firstChild) node.removeChild(node.firstChild); return node; };

/* ── Números e moeda ───────────────────────────────────────────────────── */

const brl = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const brl0 = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const num = (v, d = 0) => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const kmFmt = (v) => num(Math.round(Number(v) || 0)) + ' km';
const pct = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));

// Aceita "1.234,56", "1234.56", "1234,56" e "4.200" (milhar pt-BR).
function parseNum(raw) {
  if (typeof raw === 'number') return raw;
  if (!raw) return 0;
  let s = String(raw).trim().replace(/[^\d,.-]/g, '');
  if (!s) return 0;
  if (s.includes(',')) return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  // Só pontos: "4.200" e "1.234.567" são separador de milhar; "12.5" é decimal.
  if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  return parseFloat(s) || 0;
}

/* ── Datas (ISO local, sem fuso) ───────────────────────────────────────── */

const MES_CURTO = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const DIA_MS = 86400000;

const pad2 = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const today = () => toISO(new Date());

function fromISO(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function addMonths(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth() + n, 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(date.getDate(), last));
  return d;
}

const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
const daysUntil = (iso) => Math.round((fromISO(iso) - fromISO(today())) / DIA_MS);
const monthsBetween = (isoA, isoB) => {
  const a = fromISO(isoA), b = fromISO(isoB);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + (b.getDate() >= a.getDate() ? 0 : -1);
};

const fmtDia = (iso) => { const d = fromISO(iso); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`; };
const fmtData = (iso) => { const d = fromISO(iso); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`; };
const fmtMesAno = (iso) => { const d = fromISO(iso); return `${pad2(d.getMonth() + 1)}/${d.getFullYear()}`; };
const mesCurto = (iso) => MES_CURTO[fromISO(iso).getMonth()];
const chaveMes = (iso) => String(iso).slice(0, 7);

/* ── Diversos ──────────────────────────────────────────────────────────── */

const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
