import { useEffect, useRef, useState, type MouseEventHandler } from 'react';
import { Step13Config } from '../types';
import { decodeRegionMap, drawColoring, encodeRegionMap, imageFromDataUrl, loadColoringFile, regionAtEvent, segmentColoringImage } from '../utils/coloringImage';

type Props = { config: Step13Config; onChange: (patch: Partial<Step13Config>) => void };
type Tool = 'answer' | 'exclude' | 'merge' | 'repair';

export function ColoringEditor({ config, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<Uint8Array | null>(null);
  const [tool, setTool] = useState<Tool>('answer');
  const [selectedColor, setSelectedColor] = useState(config.palette[0] || '#ef4444');
  const [firstRegion, setFirstRegion] = useState<number | null>(null);
  const [firstPoint, setFirstPoint] = useState<{ x: number; y: number } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!config.imageDataUrl || !config.regionMapDataUrl) { labelsRef.current = null; return; }
    let cancelled = false;
    void Promise.all([imageFromDataUrl(config.imageDataUrl), decodeRegionMap(config.regionMapDataUrl, config.imageWidth, config.imageHeight)]).then(([image, labels]) => {
      if (cancelled) return;
      labelsRef.current = labels;
      const colors: Record<number, string> = {};
      for (const region of config.regions) if (region.enabled && region.targetColor) colors[region.id] = region.targetColor;
      else if (!region.enabled) colors[region.id] = '#e5e7eb';
      if (canvasRef.current) drawColoring(canvasRef.current, image, labels, colors, config.imageWidth, config.imageHeight, config.regions.filter(region => !region.enabled).map(region => region.id));
    }).catch(() => { if (!cancelled) setError('Не удалось открыть подготовленную раскраску.'); });
    return () => { cancelled = true; };
  }, [config.imageDataUrl, config.regionMapDataUrl, config.imageWidth, config.imageHeight, config.regions]);

  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const imageDataUrl = await loadColoringFile(file);
      const segmentation = await segmentColoringImage(imageDataUrl);
      onChange({ imageDataUrl, ...segmentation });
      setFirstRegion(null);
      setFirstPoint(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось обработать картинку.'); }
    finally { setBusy(false); }
  };

  const changeRegion = (id: number, patch: Partial<Step13Config['regions'][number]>) => {
    onChange({ regions: config.regions.map(region => region.id === id ? { ...region, ...patch } : region) });
  };

  const handleCanvasClick: MouseEventHandler<HTMLCanvasElement> = async event => {
    const labels = labelsRef.current;
    if (!labels) return;
    const id = regionAtEvent(event, labels, config.imageWidth, config.imageHeight);
    if (tool === 'repair') {
      const rect = event.currentTarget.getBoundingClientRect();
      const point = { x: (event.clientX - rect.left) * config.imageWidth / rect.width, y: (event.clientY - rect.top) * config.imageHeight / rect.height };
      if (!firstPoint) { setFirstPoint(point); return; }
      setBusy(true);
      try {
        const image = await imageFromDataUrl(config.imageDataUrl);
        const canvas = document.createElement('canvas');
        canvas.width = config.imageWidth;
        canvas.height = config.imageHeight;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Не удалось исправить линию.');
        context.drawImage(image, 0, 0);
        context.strokeStyle = '#000';
        context.lineWidth = Math.max(3, Math.round(config.imageWidth / 160));
        context.lineCap = 'round';
        context.beginPath();
        context.moveTo(firstPoint.x, firstPoint.y);
        context.lineTo(point.x, point.y);
        context.stroke();
        const imageDataUrl = canvas.toDataURL('image/png');
        const segmentation = await segmentColoringImage(imageDataUrl);
        onChange({ imageDataUrl, ...segmentation });
        setFirstPoint(null);
        setError('Контур обновлён. Задайте цвета областей заново.');
      } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось исправить контур.'); }
      finally { setBusy(false); }
      return;
    }
    if (!id) return;
    const region = config.regions.find(item => item.id === id);
    if (!region) return;
    if (tool === 'answer') changeRegion(id, { targetColor: selectedColor, enabled: true });
    if (tool === 'exclude') changeRegion(id, { enabled: !region.enabled });
    if (tool === 'merge') {
      if (firstRegion === null) { setFirstRegion(id); return; }
      setFirstRegion(null);
      if (firstRegion === id || !config.regions.some(item => item.id === firstRegion)) return;
      const merged = labels.slice();
      for (let index = 0; index < merged.length; index++) if (merged[index] === id) merged[index] = firstRegion;
      onChange({ regionMapDataUrl: encodeRegionMap(merged, config.imageWidth, config.imageHeight), regions: config.regions.filter(item => item.id !== id) });
    }
  };

  const toolButton = (value: Tool, label: string) => <button type="button" className={`rounded-xl px-3 py-2 text-xs font-bold ${tool === value ? 'bg-pink-500 text-white' : 'bg-white text-slate-600 ring-1 ring-pink-200'}`} onClick={() => { setTool(value); setFirstRegion(null); setFirstPoint(null); }}>{label}</button>;
  const enabled = config.regions.filter(region => region.enabled);
  const configured = enabled.filter(region => region.targetColor);

  return <div className="space-y-3 rounded-2xl bg-pink-50/60 p-4">
    <p className="text-xs font-bold text-pink-700">Загрузите контурную картинку с замкнутыми линиями. Сайт найдёт области для раскрашивания.</p>
    <label className="inline-flex cursor-pointer rounded-xl bg-white px-4 py-2 text-xs font-black text-pink-700 ring-1 ring-pink-200">{busy ? 'Обрабатываем…' : 'Загрузить PNG или JPG'}<input type="file" accept="image/png,image/jpeg" disabled={busy} className="hidden" onChange={event => { void upload(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label>
    {config.imageDataUrl && <>
      <div className="flex flex-wrap gap-2">{toolButton('answer', 'Задать цвет')}{toolButton('exclude', 'Включить / исключить')}{toolButton('merge', 'Объединить две области')}{toolButton('repair', 'Соединить линию')}</div>
      <p className="text-[11px] font-semibold text-slate-600">{tool === 'merge' ? firstRegion ? 'Нажмите вторую область.' : 'Нажмите первую область.' : tool === 'repair' ? firstPoint ? 'Нажмите конец недостающей линии.' : 'Нажмите начало недостающей линии.' : tool === 'exclude' ? 'Нажмите область, чтобы исключить или вернуть её.' : 'Выберите цвет и нажмите область на рисунке.'}</p>
      <div className="flex flex-wrap items-center gap-2">{config.palette.map((color, index) => <button key={`${color}-${index}`} type="button" aria-label={`Цвет ${index + 1}`} title={color} onClick={() => setSelectedColor(color)} className={`h-9 w-9 rounded-full border-2 ${selectedColor === color ? 'ring-2 ring-pink-500 ring-offset-2' : ''}`} style={{ backgroundColor: color }} />)}<label className="text-[11px] font-bold text-slate-600">Свой цвет <input type="color" value={selectedColor} onChange={event => { const color = event.target.value; setSelectedColor(color); if (!config.palette.includes(color)) onChange({ palette: [...config.palette, color] }); }} /></label></div>
      <canvas ref={canvasRef} onClick={event => { void handleCanvasClick(event); }} className="mx-auto block h-auto max-h-[440px] w-auto max-w-full cursor-crosshair rounded-xl border-2 border-pink-200 bg-white object-contain" style={{ aspectRatio: `${config.imageWidth} / ${config.imageHeight}` }} aria-label="Области раскраски для настройки" />
      <p className="text-[11px] font-bold text-slate-600">Цвет задан для {configured.length} из {enabled.length} областей. {config.regions.length - enabled.length ? `Исключено: ${config.regions.length - enabled.length}.` : ''}</p>
    </>}
    {error && <p className="rounded-xl bg-rose-50 p-2 text-xs font-bold text-rose-600">{error}</p>}
    <label className="block text-[11px] font-bold text-slate-600">Предложения для ребёнка — каждое с новой строки<textarea className="mt-1 w-full rounded-xl border border-pink-200 bg-white px-3 py-2 text-sm font-semibold" rows={5} value={config.sentences.join('\n')} onChange={event => onChange({ sentences: event.target.value.split('\n') })} placeholder="У кота рыжая шерсть.&#10;На небе жёлтое солнце." /></label>
  </div>;
}
