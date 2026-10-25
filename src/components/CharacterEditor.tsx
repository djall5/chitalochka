import { useState } from 'react';
import { CharacterImages } from './DesertGame';

const poses: { key: keyof CharacterImages; title: string; fallback: string }[] = [
  { key: 'front', title: 'Спереди', fallback: 'front' },
  { key: 'back', title: 'Сзади', fallback: 'back' },
  { key: 'side', title: 'Сбоку', fallback: 'side' },
  { key: 'threeQuarter', title: 'В три четверти', fallback: 'three-quarter' },
  { key: 'watering', title: 'Поливает', fallback: 'watering' },
];

async function prepareImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Выберите изображение PNG или WebP.');
  if (file.size > 12_000_000) throw new Error('Изображение слишком большое. Максимум 12 МБ.');
  const image = new Image();
  const source = URL.createObjectURL(file);
  try {
    image.src = source;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 384;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Не удалось обработать изображение.');
    const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    context.drawImage(image, (canvas.width - width) / 2, canvas.height - height, width, height);
    return canvas.toDataURL('image/webp', 0.82);
  } finally { URL.revokeObjectURL(source); }
}

export function CharacterEditor({ character, onChange }: { character?: CharacterImages; onChange: (next: CharacterImages) => void }) {
  const [message, setMessage] = useState('');
  return <section className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
    <h2 className="text-sm font-black text-emerald-900">Герой ученика</h2>
    <p className="mt-1 text-xs font-medium text-slate-600">Загрузите отдельные картинки с прозрачным фоном: четыре ракурса героя и, при желании, позу с лейкой. Для нового героя поза с лейкой появится после загрузки его картинки.</p>
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">{poses.map(pose => <label key={pose.key} className="cursor-pointer rounded-xl border border-emerald-200 bg-white p-2 text-center text-xs font-black text-slate-700"><img src={character?.[pose.key] || `${import.meta.env.BASE_URL}characters/sample-boy/${pose.fallback}.png`} alt={pose.title} className="mx-auto h-28 w-full object-contain" /><span>{pose.title}</span><span className="mt-1 block text-[10px] text-emerald-700">Загрузить</span><input type="file" accept="image/png,image/webp" className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (!file) return; void prepareImage(file).then(data => { onChange({ ...character, [pose.key]: data }); setMessage(`${pose.title}: изображение сохранено.`); }).catch(error => setMessage(error instanceof Error ? error.message : 'Не удалось загрузить изображение.')); event.target.value = ''; }} /></label>)}</div>
    {message && <p role="status" className="mt-2 text-xs font-bold text-emerald-800">{message}</p>}
  </section>;
}
