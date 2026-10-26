// Utility generators for educational games

export function autoGenerateSyllableGrid(
  count: number,
  paletteSyllables: string[]
): string[] {
  if (paletteSyllables.length === 0) return Array(count).fill('СЛОГ');
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(paletteSyllables[i % paletteSyllables.length]);
  }
  // Shuffle for variety
  return result.sort(() => Math.random() - 0.5);
}

export function autoGenerateMazeGrid(
  rows: number,
  cols: number,
  targetLetter: string | string[]
): string[][] {
  const targetLetters = (Array.isArray(targetLetter) ? targetLetter : [targetLetter])
    .map(letter => letter.trim())
    .filter(Boolean);
  const pathLetters = targetLetters.length > 0 ? targetLetters : ['А'];
  const distractors = ['А', 'О', 'У', 'Ы', 'Э', 'Я', 'Ё', 'Ю', 'И', 'Е', 'Б', 'В', 'Г', 'Д', 'Ж', 'З', 'К', 'Л', 'М', 'Н', 'П', 'Р', 'С', 'Т', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Щ'];
  const normalizedPathLetters = new Set(pathLetters.map(letter => letter.toLocaleUpperCase('ru-RU')));
  const filteredDistractors = distractors.filter(letter => !normalizedPathLetters.has(letter));
  let pathIndex = 0;
  const nextPathLetter = () => {
    const letter = pathLetters[pathIndex % pathLetters.length];
    pathIndex += 1;
    return letter;
  };

  // Fill board with random distractors
  const grid: string[][] = [];
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      const randChar = filteredDistractors[Math.floor(Math.random() * filteredDistractors.length)];
      grid[r][c] = randChar;
    }
  }

  // Generate winding path from (0,0) to bottom row
  let cr = 0;
  let cc = 0;
  grid[cr][cc] = nextPathLetter();

  const visited = new Set<string>();
  visited.add(`0,0`);

  while (cr < rows - 1) {
    const candidates: [number, number][] = [];
    // Can go down
    if (cr + 1 < rows && !visited.has(`${cr + 1},${cc}`)) {
      candidates.push([cr + 1, cc]);
      candidates.push([cr + 1, cc]); // weight towards going down
    }
    // Can go right
    if (cc + 1 < cols && !visited.has(`${cr},${cc + 1}`)) {
      candidates.push([cr, cc + 1]);
    }
    // Can go left
    if (cc - 1 >= 0 && !visited.has(`${cr},${cc - 1}`)) {
      candidates.push([cr, cc - 1]);
    }

    if (candidates.length === 0) {
      // Force down
      cr++;
      grid[cr][cc] = nextPathLetter();
      visited.add(`${cr},${cc}`);
      continue;
    }

    const next = candidates[Math.floor(Math.random() * candidates.length)];
    cr = next[0];
    cc = next[1];
    grid[cr][cc] = nextPathLetter();
    visited.add(`${cr},${cc}`);
  }

  // Reach near bottom right for finish
  while (cc < cols - 2) {
    cc++;
    grid[cr][cc] = nextPathLetter();
    visited.add(`${cr},${cc}`);
  }

  return grid;
}
