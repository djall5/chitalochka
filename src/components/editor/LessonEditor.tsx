import React, { useState } from 'react';
import { LessonData, PaletteItem, WordFillItem, ReadingCardItem } from '../../types';
import { autoGenerateMazeGrid, autoGenerateSyllableGrid } from '../../utils/generators';
import { PRESET_LESSONS, defaultLessonY } from '../../defaultLessons';
import {
  Save,
  RotateCcw,
  Sparkles,
  Plus,
  Trash2,
  Volume2,
  Download,
  Upload,
  Play,
  Grid,
  Check,
  Palette,
  CloudRain,
  Compass,
  PenTool,
  Type,
  BookOpen,
  Settings,
} from 'lucide-react';

interface Props {
  lesson: LessonData;
  onSave: (updated: LessonData) => void;
  onClose: () => void;
  activeStepTab?: number;
}

export const LessonEditor: React.FC<Props> = ({
  lesson: initialLesson,
  onSave,
  onClose,
  activeStepTab = 0,
}) => {
  const [data, setData] = useState<LessonData>(JSON.stringify(initialLesson) ? JSON.parse(JSON.stringify(initialLesson)) : initialLesson);
  const [activeTab, setActiveTab] = useState<string>(
    activeStepTab === 0 ? 'step1' :
    activeStepTab === 1 ? 'step2' :
    activeStepTab === 2 ? 'step3' :
    activeStepTab === 3 ? 'step4' :
    activeStepTab === 4 ? 'step5' :
    activeStepTab === 5 ? 'step6' : 'general'
  );
  const [savedNotice, setSavedNotice] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [showImportBox, setShowImportBox] = useState(false);

  const handleSave = () => {
    onSave(data);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleSaveAndPlay = () => {
    onSave(data);
    onClose();
  };

  const handleResetToDefault = () => {
    if (confirm('Сбросить все настройки урока к исходному состоянию (Буква Й)?')) {
      const reset = JSON.parse(JSON.stringify(defaultLessonY));
      setData(reset);
      onSave(reset);
    }
  };

  const handleLoadPreset = (preset: LessonData) => {
    if (confirm(`Загрузить готовый урок «${preset.title}»?`)) {
      const loaded = JSON.parse(JSON.stringify(preset));
      setData(loaded);
      onSave(loaded);
    }
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `urok_${data.targetLetter || 'gramota'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      if (!parsed.step1 || !parsed.step2 || !parsed.step3) {
        alert('Некорректный формат файла урока.');
        return;
      }
      setData(parsed);
      onSave(parsed);
      setShowImportBox(false);
      setImportJsonText('');
      alert('Урок успешно загружен!');
    } catch {
      alert('Ошибка чтения JSON. Проверьте правильность структуры текста.');
    }
  };

  // --- Step 1 helpers ---
  const handleUpdatePalette = (idx: number, patch: Partial<PaletteItem>) => {
    setData(prev => {
      const newPalette = [...prev.step1.palette];
      newPalette[idx] = { ...newPalette[idx], ...patch };
      const syllables = newPalette.map(item => item.syllable.trim()).filter(Boolean);
      const totalCells = (prev.step1.gridRows || 4) * (prev.step1.gridCols || 4);
      return {
        ...prev,
        step1: {
          ...prev.step1,
          palette: newPalette,
          cells: patch.syllable === undefined
            ? prev.step1.cells
            : syllables.length ? autoGenerateSyllableGrid(totalCells, syllables) : [],
        },
      };
    });
  };

  const handleAddPaletteItem = () => {
    const newId = `p_${Date.now()}`;
    const defaultColors = ['#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];
    const color = defaultColors[data.step1.palette.length % defaultColors.length];
    setData(prev => {
      const palette = [...prev.step1.palette, { id: newId, syllable: 'СЛ', color }];
      const totalCells = (prev.step1.gridRows || 4) * (prev.step1.gridCols || 4);
      return { ...prev, step1: { ...prev.step1, palette, cells: autoGenerateSyllableGrid(totalCells, palette.map(item => item.syllable)) } };
    });
  };

  const handleRemovePaletteItem = (idx: number) => {
    if (data.step1.palette.length <= 2) {
      alert('В палитре должно оставаться минимум 2 слога.');
      return;
    }
    setData(prev => {
      const palette = prev.step1.palette.filter((_, i) => i !== idx);
      const totalCells = (prev.step1.gridRows || 4) * (prev.step1.gridCols || 4);
      return { ...prev, step1: { ...prev.step1, palette, cells: autoGenerateSyllableGrid(totalCells, palette.map(item => item.syllable)) } };
    });
  };

  const handleAutoFillStep1 = () => {
    const syllables = data.step1.palette.map(p => p.syllable);
    const total = (data.step1.gridRows || 4) * (data.step1.gridCols || 4);
    const newCells = autoGenerateSyllableGrid(total, syllables);
    setData(prev => ({
      ...prev,
      step1: { ...prev.step1, cells: newCells },
    }));
  };

  const handleCellClickChange = (cellIdx: number) => {
    const syllables = data.step1.palette.map(p => p.syllable);
    if (syllables.length === 0) return;
    const current = data.step1.cells[cellIdx];
    const currentPos = syllables.indexOf(current);
    const nextSyllable = syllables[(currentPos + 1) % syllables.length];
    setData(prev => {
      const copy = [...prev.step1.cells];
      copy[cellIdx] = nextSyllable;
      return {
        ...prev,
        step1: { ...prev.step1, cells: copy },
      };
    });
  };

  // --- Step 2 helpers ---
  const handleSyllablesStringChange = (val: string) => {
    const list = val
      .split(/[,;\s]+/)
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);
    setData(prev => ({
      ...prev,
      step2: { ...prev.step2, syllables: list },
    }));
  };

  // --- Step 3 helpers (Maze) ---
  const handleAutoGenerateMaze = () => {
    const target = data.step3.targetLetter || data.targetLetter || 'Й';
    const rows = data.step3.gridRows || 8;
    const cols = data.step3.gridCols || 7;
    const newCells = autoGenerateMazeGrid(rows, cols, target);
    setData(prev => ({
      ...prev,
      step3: {
        ...prev.step3,
        cells: newCells,
      },
    }));
  };

  const handleMazeCellEdit = (r: number, c: number, newLetter: string) => {
    const char = newLetter.toUpperCase().slice(-1) || 'А';
    setData(prev => {
      const copy = prev.step3.cells.map(row => [...row]);
      if (copy[r] && copy[r][c] !== undefined) {
        copy[r][c] = char;
      }
      return {
        ...prev,
        step3: { ...prev.step3, cells: copy },
      };
    });
  };

  // --- Step 5 helpers (Word Fill) ---
  const handleAddWord = () => {
    const target = data.step5.targetLetter || data.targetLetter || 'Й';
    const newWord: WordFillItem = {
      id: `w_${Date.now()}`,
      before: 'СА',
      missing: target,
      after: '',
      fullWord: `СА${target}`,
    };
    setData(prev => ({
      ...prev,
      step5: {
        ...prev.step5,
        words: [...prev.step5.words, newWord],
      },
    }));
  };

  const handleUpdateWord = (idx: number, patch: Partial<WordFillItem>) => {
    setData(prev => {
      const copy = [...prev.step5.words];
      copy[idx] = { ...copy[idx], ...patch };
      // auto-compute fullWord if not specified
      if (!patch.fullWord) {
        copy[idx].fullWord = `${copy[idx].before}${copy[idx].missing}${copy[idx].after}`;
      }
      return {
        ...prev,
        step5: { ...prev.step5, words: copy },
      };
    });
  };

  const handleRemoveWord = (idx: number) => {
    setData(prev => ({
      ...prev,
      step5: {
        ...prev.step5,
        words: prev.step5.words.filter((_, i) => i !== idx),
      },
    }));
  };

  // --- Step 6 helpers (Reading Cards) ---
  const handleAddCard = () => {
    const newCard: ReadingCardItem = {
      id: `c_${Date.now()}`,
      icon: '⭐',
      displayWord: 'НОВОЕ-СЛОВО',
      speakWord: 'новое слово',
    };
    setData(prev => ({
      ...prev,
      step6: {
        ...prev.step6,
        cards: [...prev.step6.cards, newCard],
      },
    }));
  };

  const handleUpdateCard = (idx: number, patch: Partial<ReadingCardItem>) => {
    setData(prev => {
      const copy = [...prev.step6.cards];
      copy[idx] = { ...copy[idx], ...patch };
      return {
        ...prev,
        step6: { ...prev.step6, cards: copy },
      };
    });
  };

  const handleRemoveCard = (idx: number) => {
    setData(prev => ({
      ...prev,
      step6: {
        ...prev.step6,
        cards: prev.step6.cards.filter((_, i) => i !== idx),
      },
    }));
  };

  const tabs = [
    { id: 'general', label: '🌟 Общие', icon: Settings },
    { id: 'step1', label: '1. Раскраска', icon: Palette },
    { id: 'step2', label: '2. Ловля', icon: CloudRain },
    { id: 'step3', label: '3. Лабиринт', icon: Compass },
    { id: 'step4', label: '4. Рисование', icon: PenTool },
    { id: 'step5', label: '5. Впиши букву', icon: Type },
    { id: 'step6', label: '6. Чтение', icon: BookOpen },
  ];

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border-2 border-pink-200 overflow-hidden flex flex-col max-h-[92vh] w-full max-w-4xl text-slate-800">
      {/* Editor Top Bar */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-white/20 rounded-xl text-xl">🛠️</span>
          <div>
            <h1 className="font-black text-base md:text-lg leading-tight">
              Конструктор урока грамоты
            </h1>
            <p className="text-[11px] text-pink-100 font-medium">
              Редактируйте тексты, слоги, лабиринт, слова и озвучку
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {savedNotice && (
            <span className="flex items-center gap-1 text-xs font-black bg-emerald-400 text-emerald-950 px-2.5 py-1 rounded-lg animate-pulse">
              <Check className="w-3.5 h-3.5" />
              Сохранено!
            </span>
          )}
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Сохранить
          </button>
          <button
            onClick={handleSaveAndPlay}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-white text-pink-600 hover:bg-pink-50 font-black text-xs shadow-md transition-transform cursor-pointer active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-pink-600" />
            Играть ▶
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 p-2 bg-slate-100 border-b border-slate-200 text-xs font-bold scrollbar-none">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-pink-50 hover:text-pink-600'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Editor Content Area */}
      <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-6">
        {/* TAB: GENERAL */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            <div className="bg-pink-50/60 p-4 rounded-2xl border border-pink-100">
              <h3 className="font-black text-base text-pink-700 mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Основные параметры урока
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Название урока
                  </label>
                  <input
                    type="text"
                    value={data.title}
                    onChange={e => setData({ ...data, title: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:border-pink-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Изучаемая буква
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={data.targetLetter || 'Й'}
                    onChange={e =>
                      setData({ ...data, targetLetter: e.target.value.toUpperCase() })
                    }
                    className="w-20 px-3 py-2 text-lg text-center bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:border-pink-500 font-black text-pink-600"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Подзаголовок / Описание урока
                  </label>
                  <textarea
                    rows={2}
                    value={data.subtitle}
                    onChange={e => setData({ ...data, subtitle: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:border-pink-500 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Presets and Management */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <h3 className="font-black text-sm text-slate-700 mb-2">
                Готовые шаблоны и резервное копирование
              </h3>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <button
                  onClick={() => handleLoadPreset(defaultLessonY)}
                  className="px-3 py-1.5 rounded-xl bg-pink-100 hover:bg-pink-200 text-pink-800 text-xs font-bold cursor-pointer"
                >
                  Загрузить урок: Буква Й
                </button>
                <button
                  onClick={() => handleLoadPreset(PRESET_LESSONS[1])}
                  className="px-3 py-1.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-bold cursor-pointer"
                >
                  Загрузить урок: Буква С
                </button>
                <button
                  onClick={handleResetToDefault}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold cursor-pointer ml-auto"
                >
                  <RotateCcw className="w-3 h-3" />
                  Сброс к оригиналу
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                <button
                  onClick={handleExportJson}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Экспорт урока (JSON)
                </button>
                <button
                  onClick={() => setShowImportBox(!showImportBox)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Импорт из JSON...
                </button>
              </div>

              {showImportBox && (
                <div className="mt-3 p-3 bg-white rounded-xl border border-slate-300">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Вставьте текст JSON урока:
                  </label>
                  <textarea
                    rows={4}
                    value={importJsonText}
                    onChange={e => setImportJsonText(e.target.value)}
                    placeholder='{"id": "...", "title": "...", ...}'
                    className="w-full text-[11px] font-mono p-2 border border-slate-200 rounded-lg mb-2"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowImportBox(false)}
                      className="px-3 py-1 text-xs text-slate-500"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleImportJson}
                      className="px-3 py-1 bg-pink-500 text-white rounded-lg text-xs font-bold"
                    >
                      Загрузить
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: STEP 1 (Coloring) */}
        {activeTab === 'step1' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Заголовок шага
                </label>
                <input
                  type="text"
                  value={data.step1.title}
                  onChange={e =>
                    setData({
                      ...data,
                      step1: { ...data.step1, title: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-white rounded-xl border border-slate-200 font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Инструкция для ребенка
                </label>
                <input
                  type="text"
                  value={data.step1.instruction}
                  onChange={e =>
                    setData({
                      ...data,
                      step1: { ...data.step1, instruction: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-white rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            {/* Syllables Palette Editor */}
            <div className="bg-pink-50/50 p-4 rounded-2xl border border-pink-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-pink-700 uppercase">
                  Палитра слогов и цветов
                </span>
                <button
                  onClick={handleAddPaletteItem}
                  className="flex items-center gap-1 text-xs font-bold bg-pink-500 text-white px-2.5 py-1 rounded-lg hover:bg-pink-600 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Добавить слог
                </button>
              </div>
              <p className="mb-3 text-[11px] font-semibold text-slate-500">Заполните образцы — карточки сетки создадутся автоматически только из этих слогов.</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {data.step1.palette.map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <input
                        type="text"
                        maxLength={4}
                        value={item.syllable}
                        onChange={e =>
                          handleUpdatePalette(idx, {
                            syllable: e.target.value.toUpperCase(),
                          })
                        }
                        className="w-16 px-2 py-1 text-center font-black text-base rounded-lg border border-slate-300"
                      />
                      <input
                        type="color"
                        value={item.color}
                        onChange={e => handleUpdatePalette(idx, { color: e.target.value })}
                        className="w-7 h-7 rounded-md cursor-pointer border-0"
                      />
                      <button
                        onClick={() => handleRemovePaletteItem(idx)}
                        className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Grid Preview and Editor */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="text-xs font-bold text-slate-700">
                  Сетка карточек (кликните по клетке для переключения слога)
                </span>
                <button
                  onClick={handleAutoFillStep1}
                  className="flex items-center gap-1 px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  Перемешать случайно
                </button>
              </div>

              <div
                className="grid gap-2 max-w-xs mx-auto"
                style={{
                  gridTemplateColumns: `repeat(${data.step1.gridCols || 4}, minmax(0, 1fr))`,
                }}
              >
                {data.step1.cells.map((cellSyllable, idx) => {
                  const paletteItem = data.step1.palette.find(
                    p => p.syllable === cellSyllable
                  );
                  return (
                    <button
                      key={idx}
                      onClick={() => handleCellClickChange(idx)}
                      style={
                        paletteItem
                          ? { backgroundColor: paletteItem.color, color: paletteItem.textColor || '#ffffff' }
                          : undefined
                      }
                      className="aspect-square rounded-xl font-black text-sm flex items-center justify-center border-2 border-slate-200 shadow-xs cursor-pointer hover:scale-105 transition-all"
                    >
                      {cellSyllable}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB: STEP 2 (Falling) */}
        {activeTab === 'step2' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Заголовок шага
                </label>
                <input
                  type="text"
                  value={data.step2.title}
                  onChange={e =>
                    setData({
                      ...data,
                      step2: { ...data.step2, title: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-white rounded-xl border border-slate-200 font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Инструкция
                </label>
                <input
                  type="text"
                  value={data.step2.instruction}
                  onChange={e =>
                    setData({
                      ...data,
                      step2: { ...data.step2, instruction: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-white rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="bg-sky-50/60 p-4 rounded-2xl border border-sky-100 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Список слогов (вводите через запятую или пробел):
                </label>
                <textarea
                  rows={3}
                  value={data.step2.syllables.join(', ')}
                  onChange={e => handleSyllablesStringChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold bg-white rounded-xl border border-slate-200 text-indigo-900"
                />
                <span className="text-[11px] text-slate-500">
                  Всего слогов в пуле: {data.step2.syllables.length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Скорость падения
                  </label>
                  <select
                    value={data.step2.speed}
                    onChange={e =>
                      setData({
                        ...data,
                        step2: {
                          ...data.step2,
                          speed: e.target.value as 'slow' | 'medium' | 'fast',
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-bold bg-white rounded-xl border border-slate-200"
                  >
                    <option value="slow">Медленная (для начинающих)</option>
                    <option value="medium">Обычная (рекомендуется)</option>
                    <option value="fast">Быстрая (для продвинутых)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Сколько слогов поймать за раунд
                  </label>
                  <input
                    type="number"
                    min={4}
                    max={30}
                    value={data.step2.targetCatchCount}
                    onChange={e =>
                      setData({
                        ...data,
                        step2: {
                          ...data.step2,
                          targetCatchCount: parseInt(e.target.value) || 8,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-bold bg-white rounded-xl border border-slate-200"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: STEP 3 (Maze) */}
        {activeTab === 'step3' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Заголовок
                </label>
                <input
                  type="text"
                  value={data.step3.title}
                  onChange={e =>
                    setData({
                      ...data,
                      step3: { ...data.step3, title: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-white rounded-xl border border-slate-200 font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Маскот (эмодзи)
                </label>
                <div className="flex gap-1.5 items-center">
                  <input
                    type="text"
                    value={data.step3.mascot}
                    onChange={e =>
                      setData({
                        ...data,
                        step3: { ...data.step3, mascot: e.target.value },
                      })
                    }
                    className="w-14 text-center px-2 py-1.5 text-xl bg-white rounded-xl border border-slate-200"
                  />
                  {['🧘', '🦊', '🐻', '🐰', '🦉', '🚀'].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() =>
                        setData({
                          ...data,
                          step3: { ...data.step3, mascot: emoji },
                        })
                      }
                      className="p-1 hover:bg-slate-100 rounded-lg text-lg cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-pink-50 rounded-2xl border border-pink-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Целевая буква:</span>
                <input
                  type="text"
                  maxLength={1}
                  value={data.step3.targetLetter}
                  onChange={e =>
                    setData({
                      ...data,
                      step3: {
                        ...data.step3,
                        targetLetter: e.target.value.toUpperCase(),
                      },
                    })
                  }
                  className="w-10 text-center font-black text-pink-600 bg-white border border-slate-300 rounded-lg py-1 text-sm"
                />
              </div>
              <button
                onClick={handleAutoGenerateMaze}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-black text-xs shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Сгенерировать дорожку автоматически ✨
              </button>
            </div>

            {/* Maze Grid Editor */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 overflow-x-auto">
              <div className="text-[11px] font-medium text-slate-500 mb-2 text-center">
                Вы можете редактировать буквы в каждой клетке вручную:
              </div>
              <div className="flex flex-col gap-1.5 items-center">
                {data.step3.cells.map((row, r) => (
                  <div key={r} className="flex gap-1.5">
                    {row.map((char, c) => {
                      const isTarget =
                        char.toUpperCase() === data.step3.targetLetter.toUpperCase();
                      return (
                        <input
                          key={`${r}-${c}`}
                          type="text"
                          maxLength={1}
                          value={char}
                          onChange={e => handleMazeCellEdit(r, c, e.target.value)}
                          className={`w-7 h-7 text-center font-black text-xs rounded-lg border transition-colors ${
                            isTarget
                              ? 'bg-pink-100 border-pink-500 text-pink-900'
                              : 'bg-white border-slate-300 text-slate-700'
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: STEP 4 (Drawing) */}
        {activeTab === 'step4' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Заголовок
              </label>
              <input
                type="text"
                value={data.step4.title}
                onChange={e =>
                  setData({
                    ...data,
                    step4: { ...data.step4, title: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-sm bg-white rounded-xl border border-slate-200 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Инструкция (что нарисовать)
              </label>
              <input
                type="text"
                value={data.step4.instruction}
                onChange={e =>
                  setData({
                    ...data,
                    step4: { ...data.step4, instruction: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-sm bg-white rounded-xl border border-slate-200"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Подсказка в углу холста
                </label>
                <input
                  type="text"
                  value={data.step4.promptWord || ''}
                  onChange={e =>
                    setData({
                      ...data,
                      step4: { ...data.step4, promptWord: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Цвет фона доски
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={data.step4.canvasBg}
                    onChange={e =>
                      setData({
                        ...data,
                        step4: { ...data.step4, canvasBg: e.target.value },
                      })
                    }
                    className="w-8 h-8 rounded-lg cursor-pointer border-0"
                  />
                  {['#334155', '#1e293b', '#ffffff', '#fef3c7', '#0f172a'].map(c => (
                    <button
                      key={c}
                      onClick={() =>
                        setData({
                          ...data,
                          step4: { ...data.step4, canvasBg: c },
                        })
                      }
                      style={{ backgroundColor: c }}
                      className="w-6 h-6 rounded-full border border-slate-300 cursor-pointer shadow-xs"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: STEP 5 (Word Fill) */}
        {activeTab === 'step5' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Заголовок шага
                </label>
                <input
                  type="text"
                  value={data.step5.title}
                  onChange={e =>
                    setData({
                      ...data,
                      step5: { ...data.step5, title: e.target.value },
                    })
                  }
                  className="w-full md:w-96 px-3 py-2 text-sm bg-white rounded-xl border border-slate-200 font-bold"
                />
              </div>
              <button
                onClick={handleAddWord}
                className="flex items-center gap-1 bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs px-3 py-2 rounded-xl cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Добавить слово
              </button>
            </div>

            <div className="space-y-2">
              {data.step5.words.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-2xl border border-slate-200 shadow-xs"
                >
                  <span className="text-xs font-bold text-slate-400 w-5">
                    {idx + 1}.
                  </span>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500">
                      Начало
                    </label>
                    <input
                      type="text"
                      value={item.before}
                      onChange={e =>
                        handleUpdateWord(idx, {
                          before: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="—"
                      className="w-16 px-2 py-1 text-center font-bold text-sm bg-slate-50 rounded-lg border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-pink-600">
                      Пропуск
                    </label>
                    <input
                      type="text"
                      maxLength={1}
                      value={item.missing}
                      onChange={e =>
                        handleUpdateWord(idx, {
                          missing: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-12 px-2 py-1 text-center font-black text-sm bg-pink-50 border border-pink-300 rounded-lg text-pink-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500">
                      Конец
                    </label>
                    <input
                      type="text"
                      value={item.after}
                      onChange={e =>
                        handleUpdateWord(idx, {
                          after: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="—"
                      className="w-20 px-2 py-1 text-center font-bold text-sm bg-slate-50 rounded-lg border border-slate-200"
                    />
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-[10px] font-bold text-slate-500">
                      Слово целиком
                    </label>
                    <input
                      type="text"
                      value={item.fullWord}
                      onChange={e =>
                        handleUpdateWord(idx, {
                          fullWord: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full px-2 py-1 text-xs font-black text-indigo-900 bg-slate-50 rounded-lg border border-slate-200"
                    />
                  </div>
                  <button
                    onClick={() => handleRemoveWord(idx)}
                    title="Удалить"
                    className="p-2 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: STEP 6 (Reading Cards) */}
        {activeTab === 'step6' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Заголовок шага
                </label>
                <input
                  type="text"
                  value={data.step6.title}
                  onChange={e =>
                    setData({
                      ...data,
                      step6: { ...data.step6, title: e.target.value },
                    })
                  }
                  className="w-full md:w-96 px-3 py-2 text-sm bg-white rounded-xl border border-slate-200 font-bold"
                />
              </div>
              <button
                onClick={handleAddCard}
                className="flex items-center gap-1 bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs px-3 py-2 rounded-xl cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Добавить карточку
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.step6.cards.map((card, idx) => (
                <div
                  key={card.id}
                  className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={card.icon}
                      onChange={e =>
                        handleUpdateCard(idx, { icon: e.target.value })
                      }
                      className="w-12 text-center text-2xl py-1 rounded-xl bg-slate-50 border border-slate-300"
                    />
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500">
                        Отображение (слоги через дефис)
                      </label>
                      <input
                        type="text"
                        value={card.displayWord}
                        onChange={e =>
                          handleUpdateCard(idx, {
                            displayWord: e.target.value.toUpperCase(),
                          })
                        }
                        className="w-full px-2 py-1 text-sm font-black text-slate-800 bg-slate-50 rounded-lg border border-slate-200"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => handleRemoveCard(idx)}
                      title="Удалить карточку"
                      className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Editor Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-slate-500 font-medium">
          Изменения сохраняются в браузере и доступны сразу в игре.
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold cursor-pointer"
          >
            Закрыть редактор
          </button>
          <button
            onClick={handleSaveAndPlay}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-md cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            Применить и играть ▶
          </button>
        </div>
      </div>
    </div>
  );
};
