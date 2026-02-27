/**
 * @file BreakoutGame.tsx
 * @description ブロック崩しミニゲームコンポーネント。
 * 翻訳APIの応答待ちなど、処理待機中のユーザーの退屈を軽減するために
 * 提供されるシンプルなブロック崩しゲーム。Canvas APIを使用して描画し、
 * マウスまたはタッチ操作でパドルを操作する。
 * 全ブロックを破壊するとボール速度が上がり、ブロックが復活する。
 */
import { useRef, useEffect, useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';

/** キャンバスの幅(px) */
const W = 280, H = 180, COLS = 7, ROWS = 3;
/** 個々のブロックの幅・高さ(px) */
const BW = W / COLS - 4, BH = 12;

/** ゲーム内のブロック1個を表すインターフェース */
interface Block { x: number; y: number; w: number; h: number; alive: boolean; hue: number; }

/**
 * ブロック崩しミニゲームコンポーネント。
 * useAppStoreのminiGameActiveフラグがtrueの場合にのみ表示される。
 * requestAnimationFrameによるゲームループで描画・更新を行い、
 * ポインター（マウス/タッチ）でパドルを操作してボールを跳ね返し、
 * ブロックを破壊してスコアを稼ぐ。表示/非表示の切り替えも可能。
 */
export default function BreakoutGame() {
  const active = useAppStore((s) => s.miniGameActive);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(true);
  const gameRef = useRef<{
    paddle: { x: number; w: number; h: number };
    ball: { x: number; y: number; dx: number; dy: number; r: number };
    blocks: Block[];
    score: number;
    running: boolean;
    paused: boolean;
  } | null>(null);

  useEffect(() => {
    if (!active) return;
    const cv = canvasRef.current;
    if (!cv) return;

    const ctx = cv.getContext("2d")!;
    const paddle = { x: W / 2 - 25, w: 50, h: 6 };
    const ball = { x: W / 2, y: H - 20, dx: 2.2, dy: -2.2, r: 4 };
    let score = 0, running = true, paused = false;

    const blocks: Block[] = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        blocks.push({ x: c * (BW + 4) + 4, y: r * (BH + 4) + 12, w: BW, h: BH, alive: true, hue: ((r * COLS + c) / (ROWS * COLS)) * 360 });

    gameRef.current = { paddle, ball, blocks, score, running, paused };

    /** キャンバスにブロック、パドル、ボール、スコア、一時停止メッセージを描画する */
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (const b of blocks) {
        if (!b.alive) continue;
        ctx.fillStyle = `hsl(${b.hue},70%,55%)`;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = `hsl(${b.hue},70%,70%)`;
        ctx.fillRect(b.x, b.y, b.w, 2);
      }
      ctx.fillStyle = "#8b5cf6";
      ctx.beginPath();
      ctx.roundRect(paddle.x, H - 10, paddle.w, paddle.h, 3);
      ctx.fill();
      if (!paused || Math.floor(Date.now() / 300) % 2) {
        ctx.fillStyle = "#f0f0f5";
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#666";
      ctx.font = "10px 'DM Mono',monospace";
      ctx.fillText(`SCORE: ${score}`, W - 70, H - 2);
      if (paused) {
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = "bold 14px 'DM Mono',monospace";
        ctx.textAlign = "center";
        ctx.fillText("READY", W / 2, H / 2 + 20);
        ctx.textAlign = "start";
      }
    }

    /** ボールの移動、壁・パドル・ブロックとの衝突判定、スコア加算、ブロック復活処理を行う */
    function update() {
      if (paused) return;
      ball.x += ball.dx; ball.y += ball.dy;
      if (ball.x < ball.r || ball.x > W - ball.r) ball.dx *= -1;
      if (ball.y < ball.r) ball.dy *= -1;
      if (ball.dy > 0 && ball.y + ball.r >= H - 10 && ball.x >= paddle.x && ball.x <= paddle.x + paddle.w) {
        ball.dy *= -1;
        ball.dx += (ball.x - (paddle.x + paddle.w / 2)) * 0.08;
        ball.dx = Math.max(-4, Math.min(4, ball.dx));
      }
      if (ball.y > H + ball.r) {
        ball.x = W / 2; ball.y = H - 20;
        ball.dx = 2.2 * (Math.random() > 0.5 ? 1 : -1);
        ball.dy = -2.2;
        paused = true;
        setTimeout(() => { paused = false; }, 1500);
      }
      for (const b of blocks) {
        if (!b.alive) continue;
        if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w && ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
          b.alive = false; ball.dy *= -1; score += 10;
        }
      }
      if (blocks.every(b => !b.alive)) {
        blocks.forEach(b => { b.alive = true; });
        ball.dy = -Math.abs(ball.dy) * 1.05;
      }
    }

    let rafId: number;
    /** requestAnimationFrameによるメインゲームループ */
    function loop() {
      if (!running) return;
      update();
      if (visible) draw();
      rafId = requestAnimationFrame(loop);
    }

    /** マウスまたはタッチ位置に基づいてパドルのX座標を更新する */
    function onPointerMove(e: MouseEvent | TouchEvent) {
      const rect = cv!.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      paddle.x = Math.max(0, Math.min(W - paddle.w, (clientX - rect.left) * (W / rect.width) - paddle.w / 2));
    }

    cv.addEventListener("mousemove", onPointerMove);
    cv.addEventListener("touchmove", onPointerMove as EventListener, { passive: true });
    loop();

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      cv.removeEventListener("mousemove", onPointerMove);
      cv.removeEventListener("touchmove", onPointerMove as EventListener);
    };
  }, [active, visible]);

  if (!active) return null;

  return (
    <div className="flex flex-col items-center my-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] text-[#888]">&#x1F9F1; ブロック崩しで待ち時間をお楽しみください</span>
        <button
          onClick={() => setVisible((v) => !v)}
          className="text-[10px] text-[#aaa] bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.15)] rounded px-2 py-0.5 cursor-pointer"
        >
          {visible ? '非表示' : '表示'}
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded-md bg-app-surface cursor-pointer max-w-full"
        style={{ touchAction: 'none', display: visible ? 'block' : 'none' }}
      />
    </div>
  );
}
