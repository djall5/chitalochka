import { useState } from 'react';
import type { Step4Config } from '../types';

type Props = { config: Step4Config; onChange: (pages: NonNullable<Step4Config['drawingPages']>) => void };

export function DrawingPagesEditor({ config, onChange }: Props) {
  const [error, setError] = useState('');
  const pages = (config.drawingPages?.length ? config.drawingPages : [{}]).slice(0, 3);

  const upload = async (index: number, file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) { setError('Выберите PNG или JPEG.'); return; }
    if (file.size > 12 * 1024 * 1024) { setError('Файл должен быть меньше 12 МБ.'); return; }
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 1000 / bitmap.width, 1000 / bitmap.height);
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const next = [...pages];
      next[index] = { ...next[index], backgroundImageDataUrl: canvas.toDataURL('image/webp', 0.8) };
      onChange(next);
      setError('');
    } catch { setError('Не удалось прочитать изображение.'); }
  };

  return <div className="space-y-3 rounded-2xl bg-pink-50/60 p-4">
    <h3 className="text-xs font-black text-pink-700">Экраны для рисования · {pages.length} из 3</h3>
    {pages.map((page, index) => <div key={index} className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-2 text-xs font-bold text-slate-600">
      <span className="min-w-16">Экран {index + 1}</span>
      {page.backgroundImageDataUrl && <img src={page.backgroundImageDataUrl} alt={`Подложка экрана ${index + 1}`} className="h-12 w-14 rounded border object-contain" />}
      <label className="cursor-pointer rounded-lg bg-pink-100 px-3 py-2 text-pink-700">{page.backgroundImageDataUrl ? 'Заменить фон' : 'Загрузить фон'}<input type="file" accept="image/png,image/jpeg" className="hidden" onChange={event => { void upload(index, event.target.files?.[0]); event.currentTarget.value = ''; }} /></label>
      {page.backgroundImageDataUrl && <button type="button" className="rounded-lg px-2 py-2 text-rose-600" onClick={() => onChange(pages.map((item, pageIndex) => pageIndex === index ? {} : item))}>Убрать фон</button>}
      {index > 0 && <button type="button" className="ml-auto rounded-lg px-2 py-2 text-rose-600" onClick={() => onChange(pages.filter((_, pageIndex) => pageIndex !== index))}>Удалить экран</button>}
    </div>)}
    {pages.length < 3 && <button type="button" className="rounded-xl bg-pink-500 px-3 py-2 text-xs font-bold text-white" onClick={() => onChange([...pages, {}])}>+ Добавить экран</button>}
    {error && <p role="alert" className="text-xs font-bold text-rose-600">{error}</p>}
  </div>;
}
