import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

import {
  approveFullLogoFaviconSource,
  gotoApp,
  reviewLogoPackBackground,
  selectLogoPackBackgroundMode,
  selectMode,
  waitForStatus,
} from '../helpers/app';

const capturesEnclosedBackground = process.env.FSG_CAPTURE_ENCLOSED_BACKGROUND === '1';
const EVIDENCE_DIR = path.join(
  import.meta.dirname,
  '..',
  '.artifacts',
  capturesEnclosedBackground ? 'fsg-007-enclosed-background' : 'fsg-007-logo-readiness-realistic',
);

type FixtureKind = 'wordmark' | 'multicolor' | 'gradient' | 'ambiguous';
type RemovalStrength = 'gentle' | 'balanced' | 'strong';

interface FixtureDefinition {
  kind: FixtureKind;
  filename: string;
  width: number;
  height: number;
}

interface PreparedInspection {
  width: number;
  height: number;
  bounds: { left: number; top: number; right: number; bottom: number; width: number; height: number };
  padding: number;
  classification: string;
  originalDimensions: string;
  preparedDimensions: string;
  resolution: string;
}

const FIXTURES: Record<FixtureKind, FixtureDefinition> = {
  wordmark: {
    kind: 'wordmark',
    filename: 'northline-wordmark.png',
    width: 1080,
    height: 1080,
  },
  multicolor: {
    kind: 'multicolor',
    filename: 'mosaic-studio-low-resolution.png',
    width: 480,
    height: 320,
  },
  gradient: {
    kind: 'gradient',
    filename: 'orbit-and-co-high-resolution.png',
    width: 2600,
    height: 1400,
  },
  ambiguous: {
    kind: 'ambiguous',
    filename: 'luma-ambiguous-white-detail.png',
    width: 800,
    height: 500,
  },
};

function evidenceName(legacy: string, enclosed: string): string {
  return capturesEnclosedBackground ? enclosed : legacy;
}

async function createFixture(page: Page, fixture: FixtureDefinition): Promise<Buffer> {
  const base64 = await page.evaluate(({ kind, width, height }) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: true });

    if (context === null) {
      throw new Error('Canvas fixture context unavailable.');
    }

    const drawingContext = context;

    function spacedText(text: string, x: number, y: number, spacing: number): void {
      let cursor = x;

      for (const character of text) {
        drawingContext.fillText(character, cursor, y);
        cursor += drawingContext.measureText(character).width + spacing;
      }
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.textBaseline = 'alphabetic';

    if (kind === 'wordmark') {
      // Oversized document canvas around a realistic typographic lockup.
      context.fillStyle = '#0f172a';
      context.beginPath();
      context.roundRect(146, 420, 126, 126, 26);
      context.fill();

      context.strokeStyle = '#ffffff';
      context.lineWidth = 15;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.beginPath();
      context.moveTo(178, 514);
      context.lineTo(178, 452);
      context.lineTo(236, 514);
      context.lineTo(236, 452);
      context.stroke();

      context.fillStyle = '#0f172a';
      context.font = '700 105px Arial, sans-serif';
      context.fillText('NORTHLINE', 310, 505);

      context.fillStyle = '#2563eb';
      context.beginPath();
      context.arc(925, 463, 12, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = '#64748b';
      context.font = '400 28px Arial, sans-serif';
      spacedText('DESIGN. SYSTEMS.', 316, 557, 7);

      context.strokeStyle = '#cbd5e1';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(316, 575);
      context.lineTo(731, 575);
      context.stroke();
    } else if (kind === 'multicolor') {
      // A compact, intentionally low-resolution symbol + wordmark.
      context.save();
      context.translate(72, 160);
      context.rotate(-Math.PI / 4);
      context.fillStyle = '#f97316';
      context.beginPath();
      context.roundRect(-35, -35, 70, 70, 18);
      context.fill();
      context.restore();

      context.fillStyle = '#2563eb';
      context.beginPath();
      context.arc(105, 153, 38, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = '#10b981';
      context.beginPath();
      context.arc(116, 101, 14, 0, Math.PI * 2);
      context.fill();

      context.strokeStyle = '#ffffff';
      context.lineWidth = 9;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(80, 158);
      context.lineTo(101, 178);
      context.lineTo(133, 130);
      context.stroke();

      context.fillStyle = '#0f172a';
      context.font = '700 55px Arial, sans-serif';
      context.fillText('MOSAIC', 166, 165);
      context.fillStyle = '#64748b';
      context.font = '400 18px Arial, sans-serif';
      spacedText('CREATIVE STUDIO', 170, 196, 2.4);

      context.fillStyle = '#f97316';
      context.beginPath();
      context.arc(407, 113, 6, 0, Math.PI * 2);
      context.fill();
    } else if (kind === 'gradient') {
      // A source larger than the 1024px analysis ceiling with gradients,
      // curves, a real enclosed counter, fine text, and a separated accent.
      const symbolGradient = context.createLinearGradient(190, 420, 820, 1010);
      symbolGradient.addColorStop(0, '#2563eb');
      symbolGradient.addColorStop(0.5, '#7c3aed');
      symbolGradient.addColorStop(1, '#ec4899');

      context.fillStyle = symbolGradient;
      context.beginPath();
      context.arc(510, 700, 250, 0, Math.PI * 2);
      context.arc(510, 700, 118, 0, Math.PI * 2, true);
      context.fill('evenodd');

      context.strokeStyle = '#0f172a';
      context.lineWidth = 34;
      context.lineCap = 'round';
      context.beginPath();
      context.arc(510, 700, 318, -0.8, 1.72);
      context.stroke();

      context.fillStyle = '#22c55e';
      context.beginPath();
      context.arc(783, 484, 38, 0, Math.PI * 2);
      context.fill();

      const wordGradient = context.createLinearGradient(900, 0, 2280, 0);
      wordGradient.addColorStop(0, '#0f172a');
      wordGradient.addColorStop(0.7, '#2563eb');
      wordGradient.addColorStop(1, '#7c3aed');
      context.fillStyle = wordGradient;
      context.font = '700 250px Arial, sans-serif';
      context.fillText('ORBIT', 900, 735);

      context.fillStyle = '#475569';
      context.font = '400 58px Arial, sans-serif';
      spacedText('PRODUCTS WITH GRAVITY', 916, 835, 11);

      context.strokeStyle = '#94a3b8';
      context.lineWidth = 7;
      context.beginPath();
      context.moveTo(920, 885);
      context.lineTo(2250, 885);
      context.stroke();
    } else {
      // Deliberately ambiguous: the white sparkle is authored foreground,
      // but exactly matches the white source canvas. Geometry is the only
      // available evidence, so the safe outcome is Needs Review, not silent
      // deletion or a false Verified state.
      context.fillStyle = '#2563eb';
      context.beginPath();
      context.roundRect(126, 142, 230, 216, 62);
      context.fill();

      context.strokeStyle = '#ffffff';
      context.lineWidth = 16;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(241, 190);
      context.lineTo(241, 310);
      context.moveTo(181, 250);
      context.lineTo(301, 250);
      context.stroke();

      context.fillStyle = '#0f172a';
      context.font = '700 88px Arial, sans-serif';
      context.fillText('LUMA', 392, 270);
      context.fillStyle = '#64748b';
      context.font = '400 24px Arial, sans-serif';
      spacedText('STUDIO', 397, 313, 6);
    }

    return canvas.toDataURL('image/png').split(',')[1];
  }, fixture);

  return Buffer.from(base64, 'base64');
}

async function uploadFixture(page: Page, fixture: FixtureDefinition, buffer: Buffer): Promise<void> {
  await page.locator('#source-file').setInputFiles({
    name: fixture.filename,
    mimeType: 'image/png',
    buffer,
  });
  await waitForStatus(page, 'ready');
  await selectMode(page, 'logo-pack');
  await selectLogoPackBackgroundMode(page, 'transparent');
  await reviewLogoPackBackground(page);
  await expect(page.locator('#logo-pack-preview')).toBeVisible({ timeout: 30_000 });
}

async function selectStrength(page: Page, strength: RemovalStrength): Promise<void> {
  const preview = page.locator('#logo-pack-preview-image');
  const previousSource = await preview.getAttribute('src');
  await page.locator('#logo-pack-change-background').click();
  await expect(page.locator('#logo-pack-step-2')).toBeVisible();
  await page.locator(`#logo-pack-strength-${strength}`).check({ force: true });
  await expect(page.locator(`#logo-pack-strength-${strength}`)).toBeChecked();
  await reviewLogoPackBackground(page);

  if (previousSource !== null) {
    await expect.poll(() => preview.getAttribute('src'), { timeout: 30_000 }).not.toBe(previousSource);
  }

  await expect(page.locator('#logo-pack-preview')).toBeVisible({ timeout: 30_000 });
}

async function preparedBytes(page: Page): Promise<Buffer> {
  const base64 = await page.locator('#logo-pack-preview-image').evaluate((image) => {
    const preview = image as HTMLImageElement;
    const canvas = document.createElement('canvas');
    canvas.width = preview.naturalWidth;
    canvas.height = preview.naturalHeight;
    const context = canvas.getContext('2d', { alpha: true });

    if (context === null) {
      throw new Error('Prepared evidence context unavailable.');
    }

    context.drawImage(preview, 0, 0);
    return canvas.toDataURL('image/png').split(',')[1];
  });

  return Buffer.from(base64, 'base64');
}

async function inspectPrepared(page: Page): Promise<PreparedInspection> {
  const pixelInspection = await page.locator('#logo-pack-preview-image').evaluate((image) => {
    const preview = image as HTMLImageElement;
    const canvas = document.createElement('canvas');
    canvas.width = preview.naturalWidth;
    canvas.height = preview.naturalHeight;
    const context = canvas.getContext('2d', { alpha: true });

    if (context === null) {
      throw new Error('Prepared inspection context unavailable.');
    }

    context.drawImage(preview, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let left = canvas.width;
    let top = canvas.height;
    let right = -1;
    let bottom = -1;

    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        if (data[(y * canvas.width + x) * 4 + 3] === 0) {
          continue;
        }

        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }

    if (right < left || bottom < top) {
      throw new Error('Prepared logo contains no visible pixels.');
    }

    return {
      width: canvas.width,
      height: canvas.height,
      bounds: {
        left,
        top,
        right,
        bottom,
        width: right - left + 1,
        height: bottom - top + 1,
      },
      padding: Math.min(left, top, canvas.width - 1 - right, canvas.height - 1 - bottom),
    };
  });

  return {
    ...pixelInspection,
    classification: (await page.locator('#logo-pack-preview-confidence').textContent())?.trim() ?? '',
    originalDimensions: (await page.locator('#logo-pack-preview-original-dimensions').textContent())?.trim() ?? '',
    preparedDimensions: (await page.locator('#logo-pack-preview-prepared-dimensions').textContent())?.trim() ?? '',
    resolution: (await page.locator('#logo-pack-preview-resolution').textContent())?.trim() ?? '',
  };
}

async function inspectMaterialOpaqueSourceBackground(page: Page): Promise<Array<{ left: number; top: number; width: number; height: number; pixels: number }>> {
  return page.locator('#logo-pack-preview-image').evaluate((image) => {
    const preview = image as HTMLImageElement;
    const canvas = document.createElement('canvas');
    canvas.width = preview.naturalWidth;
    canvas.height = preview.naturalHeight;
    const context = canvas.getContext('2d', { alpha: true });

    if (context === null) {
      throw new Error('Residual-background inspection context unavailable.');
    }

    context.drawImage(preview, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const visited = new Uint8Array(canvas.width * canvas.height);
    const components: Array<{ left: number; top: number; width: number; height: number; pixels: number }> = [];

    function isOpaqueWhite(index: number): boolean {
      const offset = index * 4;
      return data[offset + 3] >= 250 && data[offset] >= 252 && data[offset + 1] >= 252 && data[offset + 2] >= 252;
    }

    for (let start = 0; start < visited.length; start += 1) {
      if (visited[start] === 1 || !isOpaqueWhite(start)) {
        continue;
      }

      const queue = [start];
      visited[start] = 1;
      let cursor = 0;
      let left = start % canvas.width;
      let right = left;
      let top = Math.floor(start / canvas.width);
      let bottom = top;

      while (cursor < queue.length) {
        const index = queue[cursor];
        cursor += 1;
        const x = index % canvas.width;
        const y = Math.floor(index / canvas.width);
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);

        for (const [nextX, nextY] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as const) {
          if (nextX < 0 || nextY < 0 || nextX >= canvas.width || nextY >= canvas.height) {
            continue;
          }

          const next = nextY * canvas.width + nextX;

          if (visited[next] === 0 && isOpaqueWhite(next)) {
            visited[next] = 1;
            queue.push(next);
          }
        }
      }

      if (queue.length >= 4) {
        components.push({ left, top, width: right - left + 1, height: bottom - top + 1, pixels: queue.length });
      }
    }

    return components;
  });
}

async function capturePreviewBackground(page: Page, background: 'checkerboard' | 'light' | 'dark', filename: string): Promise<void> {
  await page.locator(`#logo-pack-preview-bg-${background}`).click();
  await expect(page.locator(`#logo-pack-preview-bg-${background}`)).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#logo-pack-preview').screenshot({ path: path.join(EVIDENCE_DIR, filename) });
}

async function reset(page: Page): Promise<void> {
  if (await page.locator('#logo-pack-dialog').isVisible()) {
    await page.keyboard.press('Escape');
    await expect(page.locator('#logo-pack-dialog')).toBeHidden();
  }

  await page.locator('#reset-button').click();
  await waitForStatus(page, 'idle');
}

async function createHighResolutionComparison(page: Page, filename: string): Promise<void> {
  const comparisonBase64 = await page.locator('#logo-pack-preview-image').evaluate(async (image) => {
    const prepared = image as HTMLImageElement;
    const sourceFile = document.querySelector<HTMLInputElement>('#source-file')?.files?.[0];

    if (sourceFile === undefined) {
      throw new Error('Selected source file unavailable for comparison evidence.');
    }

    const sourceImage = await createImageBitmap(sourceFile);

    const canvas = document.createElement('canvas');
    canvas.width = 1800;
    canvas.height = 980;
    const context = canvas.getContext('2d');

    if (context === null) {
      throw new Error('Comparison evidence context unavailable.');
    }

    context.fillStyle = '#f8fafc';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#0f172a';
    context.font = '700 42px Arial, sans-serif';
    context.fillText('High-resolution source → prepared master', 70, 75);
    context.fillStyle = '#475569';
    context.font = '400 25px Arial, sans-serif';
    context.fillText(`${sourceImage.width} × ${sourceImage.height} source`, 70, 120);
    context.fillText(`${prepared.naturalWidth} × ${prepared.naturalHeight} prepared`, 930, 120);

    context.fillStyle = '#ffffff';
    context.fillRect(70, 165, 800, 480);
    context.fillRect(930, 165, 800, 480);
    context.drawImage(sourceImage, 0, 0, sourceImage.width, sourceImage.height, 70, 165, 800, 430);

    const tile = 20;
    for (let y = 165; y < 645; y += tile) {
      for (let x = 930; x < 1730; x += tile) {
        context.fillStyle = (Math.floor((x - 930) / tile) + Math.floor((y - 165) / tile)) % 2 === 0 ? '#e2e8f0' : '#ffffff';
        context.fillRect(x, y, tile, tile);
      }
    }

    const preparedScale = Math.min(760 / prepared.naturalWidth, 430 / prepared.naturalHeight);
    const preparedWidth = Math.round(prepared.naturalWidth * preparedScale);
    const preparedHeight = Math.round(prepared.naturalHeight * preparedScale);
    context.drawImage(prepared, 0, 0, prepared.naturalWidth, prepared.naturalHeight, 950, 185, preparedWidth, preparedHeight);

    context.fillStyle = '#0f172a';
    context.font = '700 28px Arial, sans-serif';
    context.fillText('1:1 prepared edge crop', 70, 710);
    context.fillStyle = '#ffffff';
    context.fillRect(70, 740, 1660, 190);
    const cropWidth = Math.min(1500, prepared.naturalWidth);
    const cropHeight = Math.min(170, prepared.naturalHeight);
    context.drawImage(prepared, 0, Math.max(0, Math.floor(prepared.naturalHeight / 2 - cropHeight / 2)), cropWidth, cropHeight, 90, 750, cropWidth, cropHeight);

    sourceImage.close();
    return canvas.toDataURL('image/png').split(',')[1];
  });

  await writeFile(path.join(EVIDENCE_DIR, filename), Buffer.from(comparisonBase64, 'base64'));
}

test('captures realistic logo quality evidence without changing production behavior', async ({ page }) => {
  test.setTimeout(240_000);
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await gotoApp(page);

  const evidence: Record<string, unknown> = {};

  const fixtureA = FIXTURES.wordmark;
  const sourceA = await createFixture(page, fixtureA);
  await writeFile(path.join(EVIDENCE_DIR, evidenceName('fixture-a-source.png', 'wordmark-source.png')), sourceA);
  await uploadFixture(page, fixtureA, sourceA);

  for (const strength of ['gentle', 'balanced', 'strong'] as const) {
    await selectStrength(page, strength);
    await writeFile(path.join(EVIDENCE_DIR, evidenceName(`fixture-a-${strength}.png`, `wordmark-${strength}.png`)), await preparedBytes(page));
    evidence[`fixtureA-${strength}`] = await inspectPrepared(page);
    expect(await inspectMaterialOpaqueSourceBackground(page)).toHaveLength(1);
  }

  await selectStrength(page, 'balanced');
  await capturePreviewBackground(page, 'checkerboard', evidenceName('fixture-a-checkerboard.png', 'wordmark-checkerboard.png'));
  await capturePreviewBackground(page, 'light', evidenceName('fixture-a-light.png', 'wordmark-light.png'));
  await capturePreviewBackground(page, 'dark', evidenceName('fixture-a-dark.png', 'wordmark-dark.png'));

  await approveFullLogoFaviconSource(page);
  await page.locator('#logo-pack-create-button').click();
  await waitForStatus(page, 'success', 30_000);
  await page.locator('#logo-pack-result').screenshot({
    path: path.join(EVIDENCE_DIR, evidenceName('realistic-logo-pack-result.png', 'final-logo-pack-result.png')),
  });
  evidence.fixtureAResult = {
    originalDimensions: (await page.locator('#logo-pack-result-original-dimensions').textContent())?.trim(),
    preparedDimensions: (await page.locator('#logo-pack-result-prepared-dimensions').textContent())?.trim(),
    transparency: (await page.locator('#logo-pack-result-transparency').textContent())?.trim(),
    canvas: (await page.locator('#logo-pack-result-canvas').textContent())?.trim(),
    resolution: (await page.locator('#logo-pack-result-resolution').textContent())?.trim(),
  };

  await reset(page);

  const fixtureB = FIXTURES.multicolor;
  const sourceB = await createFixture(page, fixtureB);
  await writeFile(path.join(EVIDENCE_DIR, evidenceName('fixture-b-source.png', 'multicolor-source.png')), sourceB);
  await uploadFixture(page, fixtureB, sourceB);
  await writeFile(path.join(EVIDENCE_DIR, evidenceName('fixture-b-balanced.png', 'multicolor-prepared.png')), await preparedBytes(page));
  evidence.fixtureB = await inspectPrepared(page);
  const fixtureBResidual = await inspectMaterialOpaqueSourceBackground(page);
  evidence.fixtureBResidual = fixtureBResidual;
  const fixtureBMaterialResidual = fixtureBResidual.filter((component) => component.pixels >= 16);
  expect(fixtureBMaterialResidual).toHaveLength(1);
  expect(fixtureBMaterialResidual[0].width).toBeGreaterThanOrEqual(50);
  expect(fixtureBMaterialResidual[0].width).toBeLessThanOrEqual(60);
  expect(fixtureBMaterialResidual[0].height).toBeGreaterThanOrEqual(50);
  expect(fixtureBMaterialResidual[0].height).toBeLessThanOrEqual(60);
  await capturePreviewBackground(page, 'checkerboard', evidenceName('fixture-b-checkerboard.png', 'multicolor-checkerboard.png'));
  await capturePreviewBackground(page, 'light', evidenceName('fixture-b-light.png', 'multicolor-light.png'));
  await capturePreviewBackground(page, 'dark', evidenceName('fixture-b-dark.png', 'multicolor-dark.png'));
  await approveFullLogoFaviconSource(page);
  await page.locator('#logo-pack-create-button').click();
  await waitForStatus(page, 'success', 30_000);
  await page.locator('#logo-pack-result').screenshot({ path: path.join(EVIDENCE_DIR, 'low-resolution-advisory.png') });

  await reset(page);

  const fixtureC = FIXTURES.gradient;
  const sourceC = await createFixture(page, fixtureC);
  await writeFile(path.join(EVIDENCE_DIR, evidenceName('fixture-c-source.png', 'complex-source.png')), sourceC);
  await uploadFixture(page, fixtureC, sourceC);
  await writeFile(path.join(EVIDENCE_DIR, evidenceName('fixture-c-balanced.png', 'complex-prepared.png')), await preparedBytes(page));
  evidence.fixtureC = await inspectPrepared(page);
  const fixtureCResidual = await inspectMaterialOpaqueSourceBackground(page);
  evidence.fixtureCResidual = fixtureCResidual;
  expect(fixtureCResidual.filter((component) => (
    component.width >= 3 && component.height >= 3 && component.pixels >= 16
  ))).toHaveLength(0);
  await capturePreviewBackground(page, 'checkerboard', evidenceName('fixture-c-checkerboard.png', 'complex-checkerboard.png'));
  await capturePreviewBackground(page, 'light', evidenceName('fixture-c-light.png', 'complex-light.png'));
  await capturePreviewBackground(page, 'dark', evidenceName('fixture-c-dark.png', 'complex-dark.png'));
  await createHighResolutionComparison(page, evidenceName('high-resolution-comparison.png', 'complex-full-resolution-edge-review.png'));

  if (capturesEnclosedBackground) {
    await reset(page);
    const ambiguous = FIXTURES.ambiguous;
    const ambiguousSource = await createFixture(page, ambiguous);
    await writeFile(path.join(EVIDENCE_DIR, 'ambiguous-source.png'), ambiguousSource);
    await uploadFixture(page, ambiguous, ambiguousSource);
    await expect(page.locator('#logo-pack-preview-confidence')).toHaveText('⚠ Please review the edges before continuing');
    await expect.poll(async () => (
      await inspectMaterialOpaqueSourceBackground(page)
    ).filter((component) => component.pixels >= 100)).toHaveLength(1);
    await capturePreviewBackground(page, 'dark', 'ambiguous-needs-review.png');
    evidence.ambiguous = await inspectPrepared(page);
  }

  console.log(`FSG_REALISTIC_LOGO_EVIDENCE ${JSON.stringify(evidence)}`);
});
