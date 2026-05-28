/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {useEffect, useRef} from 'react';

import * as THREE from 'three';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatUser {
  name: string;
  color: string;
  avatarBg: string;
}

interface InlineToken {
  text: string;
  style?: 'bold' | 'link';
}

interface WrappedToken extends InlineToken {
  w: number;
}

interface ChatMessage {
  user: ChatUser;
  time: string;
  parts: InlineToken[];
}

interface MessageLayout extends ChatMessage {
  lines: WrappedToken[][];
  y: number;
  blockH: number;
}

interface TextureResult {
  texture: THREE.CanvasTexture;
  worldRepeat: number;
}

interface Particle {
  pos: THREE.Vector3;
  prev: THREE.Vector3;
  kinematic: boolean;
  pathT: number;
  arc: number;
}

interface PhysicsRange {
  min: number;
  max: number;
  T: number;
}

interface AnimParams {
  bgColor: string;
  boxW: number;
  boxH: number;
  boxD: number;
  boxX: number;
  boxY: number;
  widthRatio: number;
  marginWidth: number;
  holeWidth: number;
  holeHeight: number;
  holePitch: number;
  paperColor: string;
  marginColor: string;
  textureScale: number;
  feedSpeed: number;
  wallEnabled: boolean;
  wallDist: number;
  gravity: number;
  drag: number;
  bendStiffness: number;
  collisionRadius: number;
  friction: number;
  animSpeed: number;
  runChance: number;
  verbosity: number;
  chatDensity: number;
  maxParticles: number;
  segLen: number;
  constraintIters: number;
  maxVelocity: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BASE_BOX = 2.2;
const HARD_MAX = 18000;
const GROUND_Y = -3.0;
const PX_PER_WORLD = 600;
const FIXED_DT = 1 / 120;

const USERS: ChatUser[] = [
  {name: 'Arthur Wolf', color: '#5b8def', avatarBg: '#5b6478'},
  {name: 'Julia Longtin', color: '#c074f5', avatarBg: '#6e7693'},
  {name: 'Sam Chen', color: '#3aa676', avatarBg: '#7a8a73'},
  {name: 'Maya R.', color: '#e07a3b', avatarBg: '#8a7a6b'},
];

const MSG_SHORT = [
  'mhm', '+1', 'agreed', 'interesting', 'thanks!', 'lol', 'haha yeah', 'sure',
  'sounds good', 'yep', 'on it', 'will do', 'k', 'noted', 'ack', 'cool',
  '👍', '✅', '😂', '✌️', 'gotcha', 'hmm', 'oof', 'whoops',
];
const MSG_MEDIUM = [
  'sneak peek of something I\'m working on:',
  'what a day to be ooo. ;)',
  'ok let me check that and get back to you in a sec.',
  'is anyone seeing the same issue on staging?',
  'I\'ll write up a summary doc tonight and share tomorrow.',
  'pushing a small fix — should be live in ~5min.',
  'pretty sure that\'s the same bug from last week',
  'do we have a meeting scheduled for friday? cant find it in cal',
  'reviewing the PR now, lgtm at a glance',
  'one thing that came up in the discussion: scope creep',
  'fwiw I think option 2 is the cleaner path here',
  'small question, do we still need the legacy adapter or is that fully retired',
  'looking into it now, will report back shortly',
  'just a heads up, the build pipeline is flaky again today',
];
const MSG_LONG = [
  'the main subject of the "coffee with adam" thing today has been open source, it would have been nice if you had been able to be around, guess you\'re busy.',
  'btw, I now estimate WPB-20153 (the sso provisioning script) at 6 days, 2 to create the script 4 to create the test environment and test things. that\'s 6 full days of work without being interrupted by other stuff.',
  'so the plan for next week is: monday — PR reviews + sync w/ infra, tuesday — deep work on the migration script, wednesday — demo for stakeholders, thursday/friday — buffer for whatever explodes.',
  'I went through the doc again this morning and I think we\'re still missing a section on rollback. specifically what we do if the v2 schema deploy fails halfway through. should we add that before review?',
  'quick brain dump: 1) auth pipeline is solid, 2) data ingestion needs another pass, 3) observability is decent but alerting rules are stale, 4) we still don\'t have a runbook for the cron job failures.',
  'I tried the new flow end to end and it works, but the latency on the last step is way higher than what we benchmarked. need to investigate before we ship.',
];

const PHYSICS_RANGES: Record<string, PhysicsRange> = {
  gravity:         {min: -16.5, max: -14,   T: 11},
  drag:            {min: 0.996, max: 1.0,   T:  7},
  bendStiffness:   {min: 0.14,  max: 0.155, T: 17},
  collisionRadius: {min: 0.14,  max: 0.15,  T: 13},
  friction:        {min: 1,     max: 1,     T:  5},
};

const DEFAULT_PARAMS: AnimParams = {
  bgColor:         '#0a0c11',
  boxW:            1.75,
  boxH:            0.85,
  boxD:            2.05,
  boxX:           -10.0,
  boxY:            5.7,
  widthRatio:      0.88,
  marginWidth:     29,
  holeWidth:       11,
  holeHeight:      11,
  holePitch:       170,
  paperColor:      '#15181e',
  marginColor:     '#e0ebff',
  textureScale:    3.00,
  feedSpeed:       40,
  wallEnabled:     true,
  wallDist:        3.75,
  gravity:        -14.75,
  drag:            0.990,
  bendStiffness:   0.100,
  collisionRadius: 0.1725,
  friction:        1,
  animSpeed:       0.35,
  runChance:       0.66,
  verbosity:       0.76,
  chatDensity:     160,
  maxParticles:    3600,
  segLen:          0.10,
  constraintIters: 19,
  maxVelocity:     0.55,
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function paletteForPaper(paperHex: string) {
  const isLight = luminance(paperHex) > 0.5;
  return isLight
    ? {paper: paperHex, text: '#1a1d24', dim: 'rgba(40,46,60,0.55)',    link: '#0a64d6'}
    : {paper: paperHex, text: '#e8ecf3', dim: 'rgba(180,190,210,0.65)', link: '#5b8def'};
}

function makeRng(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function parseInline(text: string): InlineToken[] {
  const out: InlineToken[] = [];
  const re = /<b>([^<]+)<\/b>|<link:([^>]+)>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({text: text.slice(last, m.index)});
    if (m[1] !== undefined) out.push({text: m[1], style: 'bold'});
    else                    out.push({text: m[2], style: 'link'});
    last = re.lastIndex;
  }
  if (last < text.length) out.push({text: text.slice(last)});
  return out;
}

function generateConversation(opts: {
  seed: number; count: number; runChance: number; verbosity: number;
}): ChatMessage[] {
  const {seed, count, runChance, verbosity} = opts;
  const rnd = makeRng(seed);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];

  const shortP = Math.max(0.05, 0.6 - verbosity * 0.55);
  const longP  = Math.max(0.02, 0.06 + verbosity * 0.62);

  const out: ChatMessage[] = [];
  let user = USERS[Math.floor(rnd() * USERS.length)];
  let hour   = 9 + Math.floor(rnd() * 6);
  let minute = Math.floor(rnd() * 60);

  for (let i = 0; i < count; i++) {
    if (i > 0 && rnd() >= runChance) {
      let candidate: ChatUser;
      do { candidate = pick(USERS); } while (USERS.length > 1 && candidate === user);
      user = candidate;
    }
    minute += Math.floor(rnd() * 6) + 1;
    if (minute >= 60) { hour += Math.floor(minute / 60); minute %= 60; }
    if (hour > 23)    hour -= 24;
    const ap  = hour < 12 ? 'AM' : 'PM';
    const h12 = ((hour + 11) % 12) + 1;
    const time = `${h12}:${minute.toString().padStart(2, '0')} ${ap}`;
    const r = rnd();
    const text = r < shortP ? pick(MSG_SHORT) : r > 1 - longP ? pick(MSG_LONG) : pick(MSG_MEDIUM);
    out.push({user, time, parts: parseInline(text)});
  }
  return out;
}

function makeSMSTexture(opts: {
  seed: number; count: number; runChance: number; verbosity: number;
  paperColor: string; marginColor: string; marginWidth: number;
  holeWidth: number; holeHeight: number; holePitch: number;
  maxTextureSize: number; maxAnisotropy: number;
}): TextureResult {
  const {seed, count, runChance, verbosity, paperColor, marginColor,
         marginWidth, holeWidth, holeHeight, holePitch, maxTextureSize, maxAnisotropy} = opts;
  const pal = paletteForPaper(paperColor);

  const W      = 576;
  const margin = Math.max(0, Math.min(marginWidth, (W - 100) / 2));
  const innerInset  = margin > 0 ? Math.max(8, Math.min(20, margin * 0.3)) : 14;
  const contentLeft = margin + innerInset;
  const contentRight = W - margin - innerInset;
  const pitch = Math.max(8, holePitch);

  const AVATAR_SIZE     = 32;
  const AVATAR_GAP      = 12;
  const HEADER_FONT     = 'bold 22px -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
  const TIME_FONT       = '18px -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
  const BODY_FONT       = '20px -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
  const BODY_BOLD_FONT  = 'bold 20px -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
  const LINE_H          = 28;
  const HEADER_H        = 28;
  const HEADER_BODY_GAP = 4;
  const MSG_GAP         = 16;

  const textLeft = contentLeft + AVATAR_SIZE + AVATAR_GAP;
  const textW    = Math.max(60, contentRight - textLeft);

  const messages = generateConversation({seed, count, runChance, verbosity});
  const tmp = document.createElement('canvas').getContext('2d')!;

  function wrapTokens(parts: InlineToken[]): WrappedToken[][] {
    const tokens: WrappedToken[] = [];
    for (const p of parts) {
      if (p.style === 'link') {
        tokens.push({text: p.text, style: 'link', w: 0});
        continue;
      }
      for (const word of p.text.split(/(\s+)/)) {
        if (!word) continue;
        tokens.push({text: word, style: p.style, w: 0});
      }
    }
    const lines: WrappedToken[][] = [];
    let line: WrappedToken[] = [];
    let lineW = 0;
    for (const t of tokens) {
      tmp.font = t.style === 'bold' ? BODY_BOLD_FONT : BODY_FONT;
      const w = tmp.measureText(t.text).width;
      if (line.length === 0 && /^\s+$/.test(t.text)) continue;
      if (lineW + w > textW && line.length > 0) {
        lines.push(line);
        line = [];
        lineW = 0;
        if (/^\s+$/.test(t.text)) continue;
      }
      line.push({...t, w});
      lineW += w;
    }
    if (line.length) lines.push(line);
    return lines;
  }

  let y = 28;
  const layout: MessageLayout[] = [];
  for (const m of messages) {
    const lines  = wrapTokens(m.parts);
    const blockH = HEADER_H + HEADER_BODY_GAP + lines.length * LINE_H;
    layout.push({...m, lines, y, blockH});
    y += blockH + MSG_GAP;
  }

  const maxH = maxTextureSize || 8192;
  let H = y + 28;
  H = Math.ceil(H / pitch) * pitch;
  if (H > maxH) {
    while (layout.length && layout[layout.length - 1].y + layout[layout.length - 1].blockH > maxH - 28) {
      layout.pop();
    }
    H = Math.floor(maxH / pitch) * pitch;
  }

  const cnv = document.createElement('canvas');
  cnv.width = W;
  cnv.height = H;
  const ctx = cnv.getContext('2d')!;

  ctx.fillStyle = pal.paper;
  ctx.fillRect(0, 0, W, H);

  if (margin > 0 && marginColor !== paperColor) {
    ctx.fillStyle = marginColor;
    ctx.fillRect(0, 0, margin, H);
    ctx.fillRect(W - margin, 0, margin, H);
  }

  if (margin > 4) {
    ctx.strokeStyle = luminance(paperColor) > 0.5 ? 'rgba(60,70,90,0.18)' : 'rgba(140,156,184,0.16)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(margin + 0.5, 0);  ctx.lineTo(margin + 0.5, H);
    ctx.moveTo(W - margin - 0.5, 0); ctx.lineTo(W - margin - 0.5, H);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const m of layout) {
    const ax = contentLeft + AVATAR_SIZE / 2;
    const ay = m.y + AVATAR_SIZE / 2 + 4;
    ctx.fillStyle = m.user.avatarBg;
    ctx.beginPath();
    ctx.arc(ax, ay, AVATAR_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f3f5f9';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(m.user.name[0], ax, ay + 1);

    const hy = m.y + 14;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = HEADER_FONT;
    ctx.fillStyle = m.user.color;
    ctx.fillText(m.user.name, textLeft, hy);
    const nameW = ctx.measureText(m.user.name).width;
    ctx.font = TIME_FONT;
    ctx.fillStyle = pal.dim;
    ctx.fillText(m.time, textLeft + nameW + 12, hy + 1);

    const bodyY0 = m.y + HEADER_H + HEADER_BODY_GAP;
    for (let li = 0; li < m.lines.length; li++) {
      let x = textLeft;
      const cy = bodyY0 + li * LINE_H + LINE_H / 2;
      for (const t of m.lines[li]) {
        if (t.style === 'bold') {
          ctx.font = BODY_BOLD_FONT;
          ctx.fillStyle = pal.text;
        } else if (t.style === 'link') {
          ctx.font = BODY_FONT;
          ctx.fillStyle = pal.link;
          ctx.strokeStyle = pal.link;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, cy + 11);
          ctx.lineTo(x + t.w, cy + 11);
          ctx.stroke();
        } else {
          ctx.font = BODY_FONT;
          ctx.fillStyle = pal.text;
        }
        ctx.fillText(t.text, x, cy);
        x += t.w;
      }
    }
  }

  if (margin >= 4 && holeWidth > 0.4 && holeHeight > 0.4) {
    ctx.globalCompositeOperation = 'destination-out';
    const holeXL = margin / 2;
    const holeXR = W - margin / 2;
    const rx = Math.min(holeWidth, margin / 2 - 1);
    const ry = holeHeight;
    ctx.fillStyle = '#000';
    for (let yy = pitch / 2; yy < H; yy += pitch) {
      ctx.beginPath(); ctx.ellipse(holeXL, yy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(holeXR, yy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  const tex = new THREE.CanvasTexture(cnv);
  tex.wrapS       = THREE.ClampToEdgeWrapping;
  tex.wrapT       = THREE.RepeatWrapping;
  tex.anisotropy  = maxAnisotropy;
  tex.minFilter   = THREE.LinearMipMapLinearFilter;
  tex.magFilter   = THREE.LinearFilter;
  tex.colorSpace  = THREE.SRGBColorSpace;
  return {texture: tex, worldRepeat: H / PX_PER_WORLD};
}

// ─── Ribbon class ─────────────────────────────────────────────────────────────

class Ribbon {
  private readonly params: AnimParams;
  private readonly pathStart: THREE.Vector3;
  private readonly pathEnd:   THREE.Vector3;
  private readonly pathDir:   THREE.Vector3;
  private pathLen: number;
  readonly particles: Particle[];
  private emitTimer: number;
  private totalArc: number;
  private readonly positionsArr: Float32Array;
  private readonly uvsArr:       Float32Array;
  private readonly geo:    THREE.BufferGeometry;
  private readonly posAttr: THREE.BufferAttribute;
  private readonly uvAttr:  THREE.BufferAttribute;
  readonly mat:  THREE.MeshBasicMaterial;
  readonly mesh: THREE.Mesh;
  worldRepeat: number;
  private readonly _grid: Map<number, number[]>;

  constructor(scene: THREE.Scene, params: AnimParams) {
    this.params    = params;
    this.pathStart = new THREE.Vector3(-22, 0, 0);
    this.pathEnd   = new THREE.Vector3(0, 0, 0);
    this.pathDir   = new THREE.Vector3(1, 0, 0);
    this.pathLen   = 0;
    this.applyBoxTransform();

    this.particles  = [];
    this.emitTimer  = 0;
    this.totalArc   = 0;
    this.worldRepeat = 1;

    this.positionsArr = new Float32Array(HARD_MAX * 2 * 3);
    this.uvsArr       = new Float32Array(HARD_MAX * 2 * 2);

    const indices = new Uint32Array((HARD_MAX - 1) * 6);
    for (let i = 0; i < HARD_MAX - 1; i++) {
      const a = i*2, b = i*2+1, c = (i+1)*2, d = (i+1)*2+1;
      indices[i*6+0] = a; indices[i*6+1] = c; indices[i*6+2] = b;
      indices[i*6+3] = b; indices[i*6+4] = c; indices[i*6+5] = d;
    }

    this.geo     = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.positionsArr, 3);
    this.uvAttr  = new THREE.BufferAttribute(this.uvsArr, 2);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.uvAttr.setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('position', this.posAttr);
    this.geo.setAttribute('uv',       this.uvAttr);
    this.geo.setIndex(new THREE.BufferAttribute(indices, 1));
    this.geo.setDrawRange(0, 0);

    this.mat  = new THREE.MeshBasicMaterial({side: THREE.DoubleSide, transparent: true, alphaTest: 0.5});
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this._grid = new Map();
  }

  setTexture({texture, worldRepeat}: TextureResult) {
    if (this.mat.map) this.mat.map.dispose();
    this.mat.map = texture;
    this.mat.needsUpdate = true;
    this.worldRepeat = worldRepeat;
  }

  applyBoxTransform() {
    this.pathEnd.x  = (BASE_BOX / 2) * this.params.boxW + this.params.boxX;
    this.pathStart.y = this.params.boxY;
    this.pathEnd.y   = this.params.boxY;
    this.pathLen     = this.pathStart.distanceTo(this.pathEnd);
  }

  step(dt: number) {
    const p      = this.params;
    const segLen = p.segLen;
    const cap    = Math.min(p.maxParticles, HARD_MAX);

    // Advance kinematic particles along entry rail
    for (const part of this.particles) {
      if (!part.kinematic) continue;
      part.pathT += p.feedSpeed * dt;
      part.prev.copy(part.pos);
      if (part.pathT >= this.pathLen) {
        part.pos.copy(this.pathStart).addScaledVector(this.pathDir, part.pathT);
        part.kinematic = false;
        const clampedDelta = Math.min(p.feedSpeed * dt, p.maxVelocity);
        part.prev.copy(part.pos).addScaledVector(this.pathDir, -clampedDelta);
      } else {
        part.pos.copy(this.pathStart).addScaledVector(this.pathDir, part.pathT);
      }
    }

    // Emit new particles
    this.emitTimer += p.feedSpeed * dt;
    while (this.emitTimer >= segLen) {
      if (this.particles.length >= cap) {
        const idx = this.particles.findIndex(pp => !pp.kinematic);
        if (idx < 0) break;
        this.particles.splice(idx, 1);
      }
      this.emitTimer -= segLen;
      const part: Particle = {
        pos:       new THREE.Vector3(),
        prev:      new THREE.Vector3(),
        kinematic: true,
        pathT:     this.emitTimer,
        arc:       this.totalArc,
      };
      part.pos.copy(this.pathStart).addScaledVector(this.pathDir, part.pathT);
      part.prev.copy(part.pos);
      this.particles.push(part);
      this.totalArc += segLen;
    }
    while (this.particles.length > cap) {
      const idx = this.particles.findIndex(pp => !pp.kinematic);
      if (idx < 0) break;
      this.particles.splice(idx, 1);
    }

    // Verlet integration
    const dt2  = dt * dt;
    const drag = p.drag;
    const gAcc = p.gravity;
    const maxV = p.maxVelocity;
    for (const part of this.particles) {
      if (part.kinematic) continue;
      let vx = (part.pos.x - part.prev.x) * drag;
      let vy = (part.pos.y - part.prev.y) * drag;
      const vLen = Math.sqrt(vx * vx + vy * vy);
      if (vLen > maxV) { const s = maxV / vLen; vx *= s; vy *= s; }
      part.prev.set(part.pos.x, part.pos.y, 0);
      part.pos.x += vx;
      part.pos.y += vy + gAcc * dt2;
      part.pos.z  = 0;
    }

    // Constraint solver
    const iters   = p.constraintIters;
    const collR   = p.collisionRadius;
    const bend    = p.bendStiffness;
    const friction = p.friction;
    const wallX   = (BASE_BOX / 2) * p.boxW + p.boxX;
    const wall2X  = wallX + p.wallDist * BASE_BOX * p.boxW;
    const wallOn  = p.wallEnabled;
    const ps = this.particles;
    const n  = ps.length;

    for (let it = 0; it < iters; it++) {
      // Distance constraints
      for (let i = 0; i < n - 1; i++) {
        const a = ps[i], b = ps[i + 1];
        const dx = b.pos.x - a.pos.x;
        const dy = b.pos.y - a.pos.y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= segLen * segLen) continue;
        const d    = Math.sqrt(d2) || 1e-6;
        const diff = (d - segLen) / d;
        if (a.kinematic && b.kinematic) continue;
        if (!a.kinematic && !b.kinematic) {
          const hx = dx * diff * 0.5, hy = dy * diff * 0.5;
          a.pos.x += hx; a.pos.y += hy; b.pos.x -= hx; b.pos.y -= hy;
        } else if (a.kinematic) {
          b.pos.x -= dx * diff; b.pos.y -= dy * diff;
        } else {
          a.pos.x += dx * diff; a.pos.y += dy * diff;
        }
      }

      // Bend stiffness
      if (bend > 0) {
        for (let i = 1; i < n - 1; i++) {
          const b = ps[i];
          if (b.kinematic) continue;
          const a = ps[i - 1], c = ps[i + 1];
          b.pos.x += ((a.pos.x + c.pos.x) * 0.5 - b.pos.x) * bend;
          b.pos.y += ((a.pos.y + c.pos.y) * 0.5 - b.pos.y) * bend;
        }
      }

      // Spatial-hashed self-collision
      if (collR > 0 && (it & 1) === 0) {
        const cell = collR;
        const grid = this._grid;
        grid.clear();
        for (let i = 0; i < n; i++) {
          const part = ps[i];
          if (part.kinematic) continue;
          const cx = Math.floor(part.pos.x / cell);
          const cy = Math.floor(part.pos.y / cell);
          const k  = cx * 73856093 ^ cy * 19349663;
          let bucket = grid.get(k);
          if (!bucket) { bucket = []; grid.set(k, bucket); }
          bucket.push(i);
        }
        const r2 = collR * collR;
        for (let i = 0; i < n; i++) {
          const part = ps[i];
          if (part.kinematic) continue;
          const cx = Math.floor(part.pos.x / cell);
          const cy = Math.floor(part.pos.y / cell);
          for (let ox = -1; ox <= 1; ox++) {
            for (let oy = -1; oy <= 1; oy++) {
              const bucket = grid.get((cx + ox) * 73856093 ^ (cy + oy) * 19349663);
              if (!bucket) continue;
              for (const j of bucket) {
                if (j <= i + 2) continue;
                const q  = ps[j];
                const dx = q.pos.x - part.pos.x;
                const dy = q.pos.y - part.pos.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < r2 && d2 > 1e-8) {
                  const push = (collR - Math.sqrt(d2)) / Math.sqrt(d2) * 0.5;
                  part.pos.x -= dx * push; part.pos.y -= dy * push;
                  q.pos.x    += dx * push; q.pos.y    += dy * push;
                }
              }
            }
          }
        }
      }

      // Ground + wall constraints
      for (const part of ps) {
        if (part.kinematic) continue;
        if (part.pos.y < GROUND_Y) {
          part.pos.y  = GROUND_Y;
          part.prev.y = GROUND_Y;
          const vx = part.pos.x - part.prev.x;
          part.prev.x = part.pos.x - vx * (1 - friction);
        }
        if (wallOn && part.pos.x < wallX)                       { part.pos.x = wallX;  if (part.prev.x < wallX)  part.prev.x = wallX;  }
        if (wallOn && p.wallDist > 0 && part.pos.x > wall2X)   { part.pos.x = wall2X; if (part.prev.x > wall2X) part.prev.x = wall2X; }
      }
    }

    this.updateGeometry();
  }

  private updateGeometry() {
    const N = this.particles.length;
    if (N < 2) { this.geo.setDrawRange(0, 0); return; }

    const w      = BASE_BOX * this.params.boxD * this.params.widthRatio * 0.5;
    const repeat = this.worldRepeat * this.params.textureScale;

    for (let i = 0; i < N; i++) {
      const part = this.particles[i];
      const o  = i * 6;
      this.positionsArr[o + 0] = part.pos.x; this.positionsArr[o + 1] = part.pos.y; this.positionsArr[o + 2] = -w;
      this.positionsArr[o + 3] = part.pos.x; this.positionsArr[o + 4] = part.pos.y; this.positionsArr[o + 5] = +w;
      const uo = i * 4;
      const v  = part.arc / repeat;
      this.uvsArr[uo + 0] = 0; this.uvsArr[uo + 1] = v;
      this.uvsArr[uo + 2] = 1; this.uvsArr[uo + 3] = v;
    }
    this.posAttr.needsUpdate = true;
    this.uvAttr.needsUpdate  = true;
    this.geo.setDrawRange(0, (N - 1) * 6);
  }

  dispose() {
    if (this.mat.map) this.mat.map.dispose();
    this.mat.dispose();
    this.geo.dispose();
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

/** Three.js ribbon animation used as the background of the reports table while a scan is active. */
export const ScanningAnimation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    // Non-null: useEffect runs only after mount, canvas element is always present here.
    const canvas = canvasRef.current as HTMLCanvasElement;

    // ── Renderer & scene ──
    const renderer = new THREE.WebGLRenderer({canvas, antialias: true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0c11, 1);

    const scene = new THREE.Scene();
    scene.fog   = new THREE.Fog(0x0a0c11, 30, 70);

    // ── Orthographic camera ──
    const VIEW_SIZE = 9.5;
    const aspect    = canvas.clientWidth / canvas.clientHeight;
    const camera    = new THREE.OrthographicCamera(
      -VIEW_SIZE * aspect, VIEW_SIZE * aspect, VIEW_SIZE, -VIEW_SIZE, 0.1, 200,
    );
    camera.position.set(15.094, 15.036, 23.692);
    camera.zoom = 0.831;
    camera.updateProjectionMatrix();
    camera.lookAt(0, 7, 0);

    // ── Lights ──
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const keyLight  = new THREE.DirectionalLight(0xffffff, 0.85);
    keyLight.position.set(5, 10, 7);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x8aa8ff, 0.35);
    fillLight.position.set(-6, 4, -3);
    scene.add(fillLight);

    // ── Ground ──
    const grid = new THREE.GridHelper(120, 120, 0x1c2230, 0x141821);
    grid.position.y = GROUND_Y;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity     = 0.55;
    scene.add(grid);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 160),
      new THREE.MeshBasicMaterial({color: 0x0d1019}),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = GROUND_Y - 0.01;
    scene.add(ground);

    // ── Processing cube ──
    const params = {...DEFAULT_PARAMS};

    const cubeGroup = new THREE.Group();
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(BASE_BOX, BASE_BOX, BASE_BOX),
      new THREE.MeshStandardMaterial({color: 0x1a1f2c, roughness: 0.55, metalness: 0.15}),
    );
    cubeGroup.add(cube);
    cubeGroup.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(cube.geometry),
      new THREE.LineBasicMaterial({color: 0x4a5878}),
    ));

    function slotMarker(color: number) {
      return new THREE.Mesh(
        new THREE.PlaneGeometry(0.95, 0.6),
        new THREE.MeshBasicMaterial({color, transparent: true, opacity: 0.9}),
      );
    }
    const entrySlot = slotMarker(0x6ea7ff);
    entrySlot.rotation.y = Math.PI / 2;
    entrySlot.position.set(-BASE_BOX / 2 - 0.001, 0, 0);
    cubeGroup.add(entrySlot);
    const exitSlot = slotMarker(0xff8a4c);
    exitSlot.rotation.y = -Math.PI / 2;
    exitSlot.position.set(BASE_BOX / 2 + 0.001, 0, 0);
    cubeGroup.add(exitSlot);

    cubeGroup.scale.set(params.boxW, params.boxH, params.boxD);
    cubeGroup.position.set(params.boxX, params.boxY, 0);
    scene.add(cubeGroup);

    // ── LED indicator ──
    const ledGroup  = new THREE.Group();
    const ledBase   = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.26, 0.11, 18),
      new THREE.MeshStandardMaterial({color: 0x2c3140, roughness: 0.55, metalness: 0.2}),
    );
    ledBase.position.y = 0.055;
    ledGroup.add(ledBase);

    const LED_GREEN = 0x33ff66;
    const LED_RED   = 0xff3a3a;
    const ledBulb   = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 24, 16),
      new THREE.MeshBasicMaterial({color: LED_GREEN}),
    );
    ledBulb.position.y = 0.22;
    ledGroup.add(ledBulb);

    const ledLight     = new THREE.PointLight(LED_GREEN, 0.9, 3.5, 2);
    ledLight.position.y = 0.28;
    ledGroup.add(ledLight);
    scene.add(ledGroup);

    // ── LCD display ──
    const lcdGroup  = new THREE.Group();
    const LCD_W = 1.5, LCD_H = 0.42;

    lcdGroup.add(new THREE.Mesh(
      new THREE.BoxGeometry(LCD_W + 0.16, LCD_H + 0.16, 0.07),
      new THREE.MeshStandardMaterial({color: 0x1a1d24, roughness: 0.62, metalness: 0.15}),
    ));

    const lcdCanvas = document.createElement('canvas');
    lcdCanvas.width  = 192;
    lcdCanvas.height = 54;
    const lcdCtx = lcdCanvas.getContext('2d')!;
    const lcdTex = new THREE.CanvasTexture(lcdCanvas);
    lcdTex.magFilter = THREE.NearestFilter;
    lcdTex.minFilter = THREE.NearestFilter;
    lcdTex.colorSpace = THREE.SRGBColorSpace;

    const lcdScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(LCD_W, LCD_H),
      new THREE.MeshBasicMaterial({map: lcdTex}),
    );
    lcdScreen.position.z = 0.041;
    lcdGroup.add(lcdScreen);
    scene.add(lcdGroup);

    let lcdLastT = -1;
    let lcdDots  = 0;
    function drawLCD(dotCount: number) {
      const {width: W, height: H} = lcdCanvas;
      lcdCtx.fillStyle = '#091505';
      lcdCtx.fillRect(0, 0, W, H);
      lcdCtx.fillStyle = 'rgba(124,230,59,0.05)';
      for (let y = 0; y < H; y += 2) lcdCtx.fillRect(0, y, W, 1);
      lcdCtx.fillStyle   = '#a4ff5a';
      lcdCtx.font        = 'bold 38px "Courier New", monospace';
      lcdCtx.textBaseline = 'middle';
      lcdCtx.textAlign   = 'left';
      const dots    = '.'.repeat(dotCount);
      const padDots = '.'.repeat(3 - dotCount);
      lcdCtx.fillText('SCANNING' + dots, 10, H / 2 + 2);
      lcdCtx.fillStyle = 'rgba(124,230,59,0.10)';
      lcdCtx.fillText(padDots, 10 + lcdCtx.measureText('SCANNING' + dots).width, H / 2 + 2);
      lcdTex.needsUpdate = true;
    }
    drawLCD(0);

    // ── Adornment positioning ──
    function updateAdornments() {
      ledGroup.position.set(params.boxX, params.boxY + BASE_BOX * params.boxH / 2, 0);
      lcdGroup.position.set(
        params.boxX,
        params.boxY - BASE_BOX * params.boxH * 0.18,
        BASE_BOX * params.boxD / 2 + 0.05,
      );
    }
    updateAdornments();

    // ── Physics oscillator ──
    function updateOscillation(t: number) {
      const sp = params.animSpeed;
      for (const key of Object.keys(PHYSICS_RANGES) as (keyof typeof PHYSICS_RANGES)[]) {
        const r = PHYSICS_RANGES[key];
        const phase = 0.5 + 0.5 * Math.sin(2 * Math.PI * (t * sp) / r.T);
        (params as unknown as Record<string, number>)[key] = r.min + (r.max - r.min) * phase;
      }
    }

    // ── LED color cycling ──
    let ledNextChange = 0;
    function updateLED(t: number) {
      if (t >= ledNextChange) {
        const color = Math.random() < 0.5 ? LED_GREEN : LED_RED;
        (ledBulb.material as THREE.MeshBasicMaterial).color.setHex(color);
        ledLight.color.setHex(color);
        ledNextChange = t + 0.25 + Math.random() * 2.2;
      }
    }

    // ── Ribbon ──
    function makeRibbon() {
      const r = new Ribbon(scene, params);
      r.setTexture(makeSMSTexture({
        seed:           Math.floor(Math.random() * 1e9),
        count:          Math.round(params.chatDensity),
        runChance:      params.runChance,
        verbosity:      params.verbosity,
        paperColor:     params.paperColor,
        marginColor:    params.marginColor,
        marginWidth:    params.marginWidth,
        holeWidth:      params.holeWidth,
        holeHeight:     params.holeHeight,
        holePitch:      params.holePitch,
        maxTextureSize: renderer.capabilities.maxTextureSize,
        maxAnisotropy:  renderer.capabilities.getMaxAnisotropy(),
      }));
      return r;
    }

    let ribbon = makeRibbon();

    const resetInterval = setInterval(() => {
      scene.remove(ribbon.mesh);
      ribbon.dispose();
      ribbon = makeRibbon();
    }, 20_000);

    // ── Resize handler ──
    function onResize() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      const a = w / h;
      camera.left   = -VIEW_SIZE * a;
      camera.right  =  VIEW_SIZE * a;
      camera.top    =  VIEW_SIZE;
      camera.bottom = -VIEW_SIZE;
      camera.updateProjectionMatrix();
    }
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(canvas);
    onResize();

    // ── Animation loop ──
    let rafId = 0;
    let acc   = 0;
    let last  = performance.now();

    function frame(now: number) {
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.1) dt = 0.1;
      acc += dt;

      const tsec = now / 1000;
      updateOscillation(tsec);
      updateLED(tsec);

      if (tsec - lcdLastT > 0.45) {
        lcdLastT = tsec;
        lcdDots  = (lcdDots + 1) % 4;
        drawLCD(lcdDots);
      }

      updateAdornments();

      let safety = 4;
      while (acc >= FIXED_DT && safety-- > 0) {
        ribbon.step(FIXED_DT);
        acc -= FIXED_DT;
      }

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(resetInterval);
      resizeObserver.disconnect();
      ribbon.dispose();
      lcdTex.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="reports-list-page__animation-bg" />;
};
