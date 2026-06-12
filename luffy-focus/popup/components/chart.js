/**
 * Luffy Focus — Custom Pixel-Art Canvas Chart Renderer
 * Renders 7-day Work vs Rest bar chart with NES aesthetic.
 */

/**
 * Render the 7-day work vs rest bar chart.
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {Array} daysData - Array of { label, workHours, restHours, isToday }
 */
export function renderWeekChart(canvas, daysData) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || 340;
  const height = rect.height || 200;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.scale(dpr, dpr);

  // Clear
  ctx.fillStyle = '#f7f9ff';
  ctx.fillRect(0, 0, width, height);

  const padding = { top: 16, right: 16, bottom: 28, left: 32 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxHours = 8;

  // Y-axis labels + grid lines
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillStyle = '#5e3f39';
  ctx.textAlign = 'right';
  [0, 4, 8].forEach(h => {
    const y = padding.top + chartH - (h / maxHours) * chartH;
    ctx.fillText(`${h}h`, padding.left - 4, y + 3);

    if (h > 0) {
      ctx.strokeStyle = '#d7dadf';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left + 4, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });

  // Draw Y and X axis
  ctx.strokeStyle = '#181c20';
  ctx.lineWidth = 4;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + chartH);
  ctx.lineTo(padding.left + chartW, padding.top + chartH);
  ctx.stroke();

  // Draw bars
  const barGroupWidth = chartW / daysData.length;
  const barWidth = (barGroupWidth * 0.6) / 2;

  daysData.forEach((day, i) => {
    const groupX = padding.left + i * barGroupWidth + barGroupWidth * 0.2;

    // Work bar (red brick pattern)
    const workH = (day.workHours / maxHours) * chartH;
    const workX = groupX;
    const workY = padding.top + chartH - workH;
    drawBrickBar(ctx, workX, workY, barWidth, workH, '#e41000', '#b60b00');

    // Rest bar (green brick pattern)
    const restH = (day.restHours / maxHours) * chartH;
    const restX = groupX + barWidth + 2;
    const restY = padding.top + chartH - restH;
    drawBrickBar(ctx, restX, restY, barWidth, restH, '#92cc41', '#7ab830');

    // Day label
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = day.isToday ? '#b60b00' : '#181c20';
    ctx.textAlign = 'center';
    ctx.fillText(day.label, groupX + barWidth, padding.top + chartH + 16);
  });

  // Draw border around chart area
  ctx.strokeStyle = '#181c20';
  ctx.lineWidth = 4;
  ctx.setLineDash([]);
  ctx.strokeRect(padding.left - 2, padding.top, chartW + 8, chartH + 4);
}

/**
 * Draw a single bar with diagonal brick pattern fill.
 */
function drawBrickBar(ctx, x, y, w, h, color1, color2) {
  if (h <= 0) return;

  // Base fill
  ctx.fillStyle = color1;
  ctx.fillRect(x, y, w, h);

  // Brick pattern overlay (4px tiles at 45°)
  const brickSize = 4;
  ctx.fillStyle = color2;
  for (let row = 0; row < Math.ceil(h / brickSize); row++) {
    const offset = row % 2 === 0 ? 0 : brickSize / 2;
    for (let col = -1; col < Math.ceil((w + brickSize) / brickSize); col++) {
      const bx = x + col * brickSize + offset;
      const by = y + row * brickSize;
      if (bx < x + w && by < y + h) {
        ctx.fillRect(
          Math.max(x, bx),
          by,
          Math.min(brickSize, x + w - Math.max(x, bx)),
          Math.min(brickSize, y + h - by)
        );
      }
    }
  }

  // Bar outline
  ctx.strokeStyle = '#181c20';
  ctx.lineWidth = 3;
  ctx.setLineDash([]);
  ctx.strokeRect(x, y, w, Math.max(0, h));
}
