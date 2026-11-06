import type { MouseEvent } from 'react';
import { ColoringRegion, Step13Config } from '../types';

const MAX_SIDE = 640;
const MIN_AREA = 32;

export function defaultColoringStep(): Step13Config {
  return { title: '🖼️ Прочитай и раскрась', instruction: 'Читай предложения и раскрашивай картинку.', sentences: [], palette: ['#ef4444', '#f59e0b', '#facc15', '#22c55e', '#3b82f6', '#a855f7', '#a16207', '#6b7280'], imageDataUrl: '', regionMapDataUrl: '', imageWidth: 0, imageHeight: 0, regions: [] };
}

function canvasOf(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export async function imageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  return image;
}

export async function loadColoringFile(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Загрузите PNG или JPG.');
  if (file.size > 12 * 1024 * 1024) throw new Error('Картинка должна быть меньше 12 МБ.');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = canvasOf(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Не удалось подготовить картинку.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally { bitmap.close(); }
}

export async function segmentColoringImage(imageDataUrl: string): Promise<Pick<Step13Config, 'regionMapDataUrl' | 'imageWidth' | 'imageHeight' | 'regions'>> {
  const image = await imageFromDataUrl(imageDataUrl);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const source = canvasOf(width, height);
  const context = source.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Не удалось прочитать рисунок.');
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, width, height).data;
  const labels = new Uint8Array(width * height);
  const visited = new Uint8Array(labels.length);
  const queue = new Int32Array(labels.length);
  const regions: ColoringRegion[] = [];
  const isOpen = (position: number) => {
    const offset = position * 4;
    return (pixels[offset] * 0.299 + pixels[offset + 1] * 0.587 + pixels[offset + 2] * 0.114) > 180;
  };
  for (let start = 0; start < labels.length; start++) {
    if (visited[start] || !isOpen(start)) continue;
    let head = 0;
    let tail = 1;
    let touchesEdge = false;
    queue[0] = start;
    visited[start] = 1;
    while (head < tail) {
      const position = queue[head++];
      const x = position % width;
      const y = Math.floor(position / width);
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) touchesEdge = true;
      const neighbors = [x > 0 ? position - 1 : -1, x < width - 1 ? position + 1 : -1, y > 0 ? position - width : -1, y < height - 1 ? position + width : -1];
      for (const next of neighbors) {
        if (next < 0 || visited[next] || !isOpen(next)) continue;
        visited[next] = 1;
        queue[tail++] = next;
      }
    }
    if (touchesEdge || tail < MIN_AREA || regions.length >= 254) continue;
    const id = regions.length + 1;
    for (let index = 0; index < tail; index++) labels[queue[index]] = id;
    regions.push({ id, enabled: true, targetColor: '' });
  }
  if (!regions.length) throw new Error('Не найдены замкнутые области. Проверьте контуры рисунка.');
  return { regionMapDataUrl: encodeRegionMap(labels, width, height), imageWidth: width, imageHeight: height, regions };
}

export function encodeRegionMap(labels: Uint8Array, width: number, height: number): string {
  const canvas = canvasOf(width, height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Не удалось сохранить области.');
  const image = context.createImageData(width, height);
  for (let index = 0; index < labels.length; index++) {
    image.data[index * 4] = labels[index];
    image.data[index * 4 + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL('image/png');
}

export async function decodeRegionMap(dataUrl: string, width: number, height: number): Promise<Uint8Array> {
  const image = await imageFromDataUrl(dataUrl);
  if (image.naturalWidth !== width || image.naturalHeight !== height) throw new Error('Размеры рисунка и областей не совпадают.');
  const canvas = canvasOf(width, height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Не удалось прочитать области.');
  context.drawImage(image, 0, 0);
  const data = context.getImageData(0, 0, width, height).data;
  const labels = new Uint8Array(width * height);
  for (let index = 0; index < labels.length; index++) labels[index] = data[index * 4];
  return labels;
}

export function regionAtEvent(event: MouseEvent<HTMLCanvasElement>, labels: Uint8Array, width: number, height: number): number {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = Math.min(width - 1, Math.max(0, Math.floor((event.clientX - rect.left) * width / rect.width)));
  const y = Math.min(height - 1, Math.max(0, Math.floor((event.clientY - rect.top) * height / rect.height)));
  return labels[y * width + x];
}

export function drawColoring(canvas: HTMLCanvasElement, source: HTMLImageElement, labels: Uint8Array, colors: Record<number, string>, width: number, height: number, highlightIds: number[] = []) {
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.drawImage(source, 0, 0, width, height);
  const picture = context.getImageData(0, 0, width, height);
  const parsed = new Map<number, [number, number, number]>();
  for (const [key, hex] of Object.entries(colors)) {
    const match = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!match) continue;
    const number = Number.parseInt(match[1], 16);
    parsed.set(Number(key), [(number >> 16) & 255, (number >> 8) & 255, number & 255]);
  }
  for (let index = 0; index < labels.length; index++) {
    const color = parsed.get(labels[index]);
    if (!color) continue;
    const offset = index * 4;
    const shade = (picture.data[offset] + picture.data[offset + 1] + picture.data[offset + 2]) / (3 * 255);
    picture.data[offset] = color[0] * shade;
    picture.data[offset + 1] = color[1] * shade;
    picture.data[offset + 2] = color[2] * shade;
  }
  if (highlightIds.length) {
    const highlighted = new Set(highlightIds);
    for (let index = 0; index < labels.length; index++) {
      if (!highlighted.has(labels[index])) continue;
      const x = index % width;
      const y = Math.floor(index / width);
      if (x > 0 && labels[index - 1] === labels[index] && x < width - 1 && labels[index + 1] === labels[index] && y > 0 && labels[index - width] === labels[index] && y < height - 1 && labels[index + width] === labels[index]) continue;
      const offset = index * 4;
      picture.data[offset] = 239;
      picture.data[offset + 1] = 68;
      picture.data[offset + 2] = 68;
    }
  }
  context.putImageData(picture, 0, 0);
}
