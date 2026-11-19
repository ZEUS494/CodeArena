import type { PublicTask, TeacherPreviewTask, TrackId } from './types.ts';

interface InternalTask extends TeacherPreviewTask {
  validate: (rawAnswer: string) => boolean;
}

function normalizeText(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

function normalizeCode(input: string): string {
  return input
    .trim()
    .replace(/;+$/g, '')
    .replace(/\s+/g, '');
}

function stripOuterQuotes(input: string): string {
  const trimmed = input.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

const TASKS_BY_TRACK: Record<TrackId, InternalTask[]> = {
  cpp: [
    {
      id: 'cpp-1',
      floor: 1,
      track: 'cpp',
      title: 'Целочисленное деление и остаток',
      answerType: 'output',
      prompt: 'Какое число выведет программа на экран?',
      code: `#include <iostream>
using namespace std;

int main() {
    int a = 17;
    int b = 5;
    cout << (a / b) + (a % b);
    return 0;
}`,
      inputPlaceholder: 'Например: 12',
      inputHint: 'Введите итоговое число, которое окажется в консоли.',
      sampleAnswer: '5',
      explanation: '17 / 5 = 3 (целочисленное деление), 17 % 5 = 2 (остаток). Сумма 3 + 2 = 5.',
      validate: (raw) => normalizeText(raw) === '5',
    },
    {
      id: 'cpp-2',
      floor: 2,
      track: 'cpp',
      title: 'Условие чётности числа',
      answerType: 'code',
      prompt: 'Напишите условие внутри if, чтобы в сумму попадали только чётные значения переменной i.',
      code: `int sum = 0;
for (int i = 1; i <= 10; i++) {
    if ( /* ВАШ КОД */ ) {
        sum += i;
    }
}`,
      inputPlaceholder: 'Например: i > 0',
      inputHint: 'Укажите логическое выражение для проверки чётности i.',
      sampleAnswer: 'i % 2 == 0',
      explanation: 'Остаток от деления чётного числа на 2 равен нулю: i % 2 == 0.',
      validate: (raw) => {
        const clean = normalizeCode(raw).replace(/^\((.*)\)$/, '$1');
        return [
          'i%2==0',
          '0==i%2',
          '!(i%2)',
          '(i&1)==0',
          'i&1==0',
          '0==(i&1)',
          'i%2!=1',
        ].includes(clean);
      },
    },
    {
      id: 'cpp-3',
      floor: 3,
      track: 'cpp',
      title: 'Фильтрация элементов массива',
      answerType: 'output',
      prompt: 'Что выведет программа после прохода по массиву?',
      code: `int arr[4] = {2, 5, 8, 3};
int res = 0;
for (int i = 0; i < 4; i++) {
    if (arr[i] > 4) {
        res += arr[i];
    }
}
cout << res;`,
      inputPlaceholder: 'Введите число',
      inputHint: 'Сложите только те элементы, которые строго больше 4.',
      sampleAnswer: '13',
      explanation: 'Условию arr[i] > 4 подходят элементы 5 и 8. Их сумма: 5 + 8 = 13.',
      validate: (raw) => normalizeText(raw) === '13',
    },
    {
      id: 'cpp-4',
      floor: 4,
      track: 'cpp',
      title: 'Передача параметра по ссылке',
      answerType: 'output',
      prompt: 'Какое значение переменной n выведет программа?',
      code: `void boost(int& x) {
    x = x * 2 + 1;
}

int main() {
    int n = 4;
    boost(n);
    boost(n);
    cout << n;
}`,
      inputPlaceholder: 'Введите число',
      inputHint: 'Обратите внимание на знак & — функция изменяет исходную переменную n.',
      sampleAnswer: '19',
      explanation: 'Первый вызов: 4 * 2 + 1 = 9. Второй вызов: 9 * 2 + 1 = 19.',
      validate: (raw) => normalizeText(raw) === '19',
    },
    {
      id: 'cpp-5',
      floor: 5,
      track: 'cpp',
      title: 'Добавление элемента в std::vector',
      answerType: 'code',
      prompt: 'Напишите одну строку кода, чтобы добавить число 40 в конец вектора nums.',
      code: `#include <vector>
using namespace std;

vector<int> nums = {10, 20, 30};
// Добавьте 40 в конец вектора nums:
/* ВАШ КОД */`,
      inputPlaceholder: 'nums. ...',
      inputHint: 'Используйте стандартный метод добавления элемента в конец вектора.',
      sampleAnswer: 'nums.push_back(40);',
      explanation: 'Для добавления элемента в конец std::vector используется nums.push_back(40); или emplace_back(40).',
      validate: (raw) => {
        const clean = normalizeCode(raw);
        return clean === 'nums.push_back(40)' || clean === 'nums.emplace_back(40)';
      },
    },
    {
      id: 'cpp-6',
      floor: 6,
      track: 'cpp',
      title: 'Префиксный инкремент',
      answerType: 'output',
      prompt: 'Какое число выведет программа?',
      code: `int a = 5;
int b = ++a + 2;
cout << a + b;`,
      inputPlaceholder: 'Введите число',
      inputHint: 'Префиксный ++a сначала увеличивает a на 1, затем подставляет новое значение.',
      sampleAnswer: '14',
      explanation: '++a делает a равным 6, затем b = 6 + 2 = 8. В итоге a + b = 6 + 8 = 14.',
      validate: (raw) => normalizeText(raw) === '14',
    },
    {
      id: 'cpp-7',
      floor: 7,
      track: 'cpp',
      title: 'Длина строки std::string',
      answerType: 'code',
      prompt: 'Дополните выражение, чтобы получить длину строки s.',
      code: `#include <string>
using namespace std;

string s = "Coding";
int len = /* ВАШ КОД */;`,
      inputPlaceholder: 's. ...',
      inputHint: 'Используйте метод std::string для получения количества символов.',
      sampleAnswer: 's.size()',
      explanation: 'В C++ длину std::string возвращают методы s.size() или s.length().',
      validate: (raw) => {
        const clean = normalizeCode(raw);
        return clean === 's.size()' || clean === 's.length()';
      },
    },
    {
      id: 'cpp-8',
      floor: 8,
      track: 'cpp',
      title: 'Количество итераций цикла while',
      answerType: 'output',
      prompt: 'Какое значение счётчика c выведет программа?',
      code: `int x = 20;
int c = 0;
while (x > 3) {
    x -= 5;
    c++;
}
cout << c;`,
      inputPlaceholder: 'Введите число',
      inputHint: 'Отследите значение x на каждом шаге: 20 → 15 → ...',
      sampleAnswer: '4',
      explanation: 'Шаги: 20→15 (c=1), 15→10 (c=2), 10→5 (c=3), 5→0 (c=4). На x=0 цикл завершается.',
      validate: (raw) => normalizeText(raw) === '4',
    },
    {
      id: 'cpp-9',
      floor: 9,
      track: 'cpp',
      title: 'Тернарный оператор',
      answerType: 'output',
      prompt: 'Что выведет программа на экран?',
      code: `int a = 9;
int b = 12;
int m = (a > b) ? a : b;
cout << m * 2;`,
      inputPlaceholder: 'Введите число',
      inputHint: 'Если условие истинно — выбирается значение после ?, иначе — после :.',
      sampleAnswer: '24',
      explanation: 'Условие 9 > 12 ложно, поэтому m получает значение b = 12. Итог: 12 * 2 = 24.',
      validate: (raw) => normalizeText(raw) === '24',
    },
    {
      id: 'cpp-10',
      floor: 10,
      track: 'cpp',
      title: 'Поиск максимума в массиве',
      answerType: 'output',
      prompt: 'Какое число выведет программа?',
      code: `int v[4] = {7, 14, 9, 11};
int mx = v[0];
for (int i = 1; i < 4; i++) {
    if (v[i] > mx) mx = v[i];
}
cout << mx;`,
      inputPlaceholder: 'Введите число',
      inputHint: 'Найдите максимальный элемент среди чисел массива.',
      sampleAnswer: '14',
      explanation: 'Цикл сравнивает каждый элемент с текущим максимумом mx. Наибольшее число — 14.',
      validate: (raw) => normalizeText(raw) === '14',
    },
  ],

  csharp: [
    {
      id: 'csharp-1',
      floor: 1,
      track: 'csharp',
      title: 'Базовая арифметика и вывод',
      answerType: 'output',
      prompt: 'Какое число появится в консоли после выполнения кода?',
      code: `int x = 6;
int y = 4;
int z = x * y - 10;
Console.WriteLine(z);`,
      inputPlaceholder: 'Введите число',
      inputHint: 'Сначала выполняется умножение, затем вычитание.',
      sampleAnswer: '14',
      explanation: '6 * 4 = 24; 24 - 10 = 14.',
      validate: (raw) => normalizeText(raw) === '14',
    },
    {
      id: 'csharp-2',
      floor: 2,
      track: 'csharp',
      title: 'Количество элементов массива',
      answerType: 'code',
      prompt: 'Дополните выражение, чтобы получить длину массива scores.',
      code: `int[] scores = { 12, 18, 25, 9, 30 };
// Получите количество элементов массива scores:
int count = /* ВАШ КОД */;`,
      inputPlaceholder: 'scores. ...',
      inputHint: 'Укажите свойство массива C#, возвращающее число элементов (с учётом регистра).',
      sampleAnswer: 'scores.Length',
      explanation: 'В C# размер одномерного массива хранится в свойстве Length: scores.Length.',
      validate: (raw) => {
        const clean = normalizeCode(raw);
        return clean === 'scores.Length' || clean === 'scores.Count()';
      },
    },
    {
      id: 'csharp-3',
      floor: 3,
      track: 'csharp',
      title: 'Цикл foreach и кратность 3',
      answerType: 'output',
      prompt: 'Что выведет программа на экран?',
      code: `int[] data = { 3, 6, 2, 9 };
int total = 0;
foreach (int n in data)
{
    if (n % 3 == 0)
        total += n;
}
Console.WriteLine(total);`,
      inputPlaceholder: 'Введите число',
      inputHint: 'Суммируются только элементы, делящиеся на 3 без остатка.',
      sampleAnswer: '18',
      explanation: 'На 3 делятся 3, 6 и 9. Их сумма: 3 + 6 + 9 = 18.',
      validate: (raw) => normalizeText(raw) === '18',
    },
    {
      id: 'csharp-4',
      floor: 4,
      track: 'csharp',
      title: 'Подстрока и верхний регистр',
      answerType: 'output',
      prompt: 'Какую строку выведет Console.WriteLine?',
      code: `string word = "CSharp";
Console.WriteLine(word.Substring(1, 3).ToUpper());`,
      inputPlaceholder: 'Например: ABC',
      inputHint: 'Первый аргумент Substring — индекс начала (с 0), второй — длина фрагмента.',
      sampleAnswer: 'SHA',
      explanation: 'С индекса 1 берём 3 символа: "Sha", затем ToUpper() переводит их в "SHA".',
      validate: (raw) => stripOuterQuotes(raw) === 'SHA',
    },
    {
      id: 'csharp-5',
      floor: 5,
      track: 'csharp',
      title: 'Лямбда-условие в LINQ Where',
      answerType: 'code',
      prompt: 'Напишите лямбда-выражение внутри Where, чтобы отобрать числа строго больше 10.',
      code: `using System.Linq;

int[] nums = { 4, 11, 7, 15, 2 };
// Выберите только числа больше 10:
var big = nums.Where(/* ВАШ КОД */).ToList();`,
      inputPlaceholder: 'Например: x => x > 0',
      inputHint: 'Используйте синтаксис лямбды C#: параметр => условие.',
      sampleAnswer: 'x => x > 10',
      explanation: 'Подходит любое лямбда-выражение вида x => x > 10 (или n => n > 10).',
      validate: (raw) => {
        const clean = normalizeCode(raw);
        const match = clean.match(/^\(?([a-zA-Z_]\w*)\)?=>\(?(.+?)\)?$/);
        if (!match) return false;
        const param = match[1];
        const body = match[2];
        return body === `${param}>10` || body === `10<${param}`;
      },
    },
    {
      id: 'csharp-6',
      floor: 6,
      track: 'csharp',
      title: 'Деление и остаток в C#',
      answerType: 'output',
      prompt: 'Какое число выведет программа?',
      code: `int n = 23;
Console.WriteLine((n % 5) + (n / 5));`,
      inputPlaceholder: 'Введите число',
      inputHint: 'Оба операнда целые числа (int).',
      sampleAnswer: '7',
      explanation: '23 % 5 = 3, 23 / 5 = 4. Сумма 3 + 4 = 7.',
      validate: (raw) => normalizeText(raw) === '7',
    },
    {
      id: 'csharp-7',
      floor: 7,
      track: 'csharp',
      title: 'Добавление элемента в List<int>',
      answerType: 'code',
      prompt: 'Напишите строку кода, чтобы добавить число 3 в конец списка list.',
      code: `using System.Collections.Generic;

var list = new List<int> { 1, 2 };
// Добавьте число 3 в список list:
/* ВАШ КОД */`,
      inputPlaceholder: 'list. ...',
      inputHint: 'Используйте метод класса List<T> для добавления одного элемента.',
      sampleAnswer: 'list.Add(3);',
      explanation: 'Метод list.Add(3); добавляет новый элемент в конец List<int>.',
      validate: (raw) => normalizeCode(raw) === 'list.Add(3)',
    },
    {
      id: 'csharp-8',
      floor: 8,
      track: 'csharp',
      title: 'Цикл for с шагом 2',
      answerType: 'output',
      prompt: 'Какое значение переменной s выведет программа?',
      code: `int s = 0;
for (int i = 2; i <= 8; i += 2)
{
    s += i;
}
Console.WriteLine(s);`,
      inputPlaceholder: 'Введите число',
      inputHint: 'Переменная i принимает значения 2, 4, 6, 8.',
      sampleAnswer: '20',
      explanation: 'Сумма чётных чисел от 2 до 8: 2 + 4 + 6 + 8 = 20.',
      validate: (raw) => normalizeText(raw) === '20',
    },
    {
      id: 'csharp-9',
      floor: 9,
      track: 'csharp',
      title: 'Замена символов в строке',
      answerType: 'output',
      prompt: 'Какую строку выведет программа?',
      code: `string t = "c-sharp";
Console.WriteLine(t.Replace("-", "_"));`,
      inputPlaceholder: 'Например: a_b',
      inputHint: 'Метод Replace заменяет первый фрагмент на второй.',
      sampleAnswer: 'c_sharp',
      explanation: 'Дефис заменяется на подчёркивание, получается строка c_sharp.',
      validate: (raw) => stripOuterQuotes(raw) === 'c_sharp',
    },
    {
      id: 'csharp-10',
      floor: 10,
      track: 'csharp',
      title: 'Подсчёт элементов через LINQ Count',
      answerType: 'output',
      prompt: 'Какое число появится в консоли?',
      code: `using System.Linq;

int[] a = { 2, 7, 10, 15, 4 };
Console.WriteLine(a.Count(x => x >= 7));`,
      inputPlaceholder: 'Введите число',
      inputHint: 'Count с условием возвращает количество подходящих элементов.',
      sampleAnswer: '3',
      explanation: 'Условию x >= 7 соответствуют 3 числа: 7, 10 и 15.',
      validate: (raw) => normalizeText(raw) === '3',
    },
  ],

  python: [
    {
      id: 'python-1',
      floor: 1,
      track: 'python',
      title: 'Возведение в степень и деление нацело',
      answerType: 'output',
      prompt: 'Какое число напечатает Python?',
      code: `a = 2 ** 3
b = 15 // 4
print(a + b)`,
      inputPlaceholder: 'Введите число',
      inputHint: 'Оператор ** — степень, оператор // — деление нацело.',
      sampleAnswer: '11',
      explanation: '2 ** 3 = 8, 15 // 4 = 3. В сумме 8 + 3 = 11.',
      validate: (raw) => normalizeText(raw) === '11',
    },
    {
      id: 'python-2',
      floor: 2,
      track: 'python',
      title: 'Срез строки',
      answerType: 'output',
      prompt: 'Что выведет функция print?',
      code: `text = "PYTHON"
print(text[1:4])`,
      inputPlaceholder: 'Например: PYT',
      inputHint: 'Правая граница среза [1:4] не включается.',
      sampleAnswer: 'YTH',
      explanation: 'Индексы 1, 2, 3 в строке "PYTHON" соответствуют символам Y, T, H → YTH.',
      validate: (raw) => stripOuterQuotes(raw) === 'YTH',
    },
    {
      id: 'python-3',
      floor: 3,
      track: 'python',
      title: 'Добавление элемента в список',
      answerType: 'code',
      prompt: 'Напишите строку кода, которая добавит число 40 в конец списка items.',
      code: `items = [10, 20, 30]
# Добавьте число 40 в конец списка items:
# ВАШ КОД`,
      inputPlaceholder: 'items. ...',
      inputHint: 'Используйте стандартный метод списка для добавления одного элемента.',
      sampleAnswer: 'items.append(40)',
      explanation: 'Метод items.append(40) добавляет элемент 40 в конец списка.',
      validate: (raw) => {
        const clean = normalizeCode(raw);
        return (
          clean === 'items.append(40)' ||
          clean === 'items+=[40]' ||
          clean === 'items.extend([40])' ||
          clean === 'items.insert(3,40)'
        );
      },
    },
    {
      id: 'python-4',
      floor: 4,
      track: 'python',
      title: 'Сумма нечётных чисел в range',
      answerType: 'output',
      prompt: 'Какое число выведет программа?',
      code: `total = 0
for i in range(1, 6):
    if i % 2 == 1:
        total += i
print(total)`,
      inputPlaceholder: 'Введите число',
      inputHint: 'range(1, 6) перебирает числа от 1 до 5 включительно.',
      sampleAnswer: '9',
      explanation: 'Нечётные числа от 1 до 5 — это 1, 3 и 5. Сумма: 1 + 3 + 5 = 9.',
      validate: (raw) => normalizeText(raw) === '9',
    },
    {
      id: 'python-5',
      floor: 5,
      track: 'python',
      title: 'Генератор списка и сумма квадратов',
      answerType: 'output',
      prompt: 'Какой результат выведет программа?',
      code: `nums = [1, 2, 3, 4]
squares = [x * x for x in nums if x > 1]
print(sum(squares))`,
      inputPlaceholder: 'Введите число',
      inputHint: 'Сначала отбираются числа больше 1, возводятся в квадрат, затем суммируются.',
      sampleAnswer: '29',
      explanation: 'Для x > 1 подходят 2, 3, 4. Их квадраты: 4 + 9 + 16 = 29.',
      validate: (raw) => normalizeText(raw) === '29',
    },
    {
      id: 'python-6',
      floor: 6,
      track: 'python',
      title: 'Отрицательные индексы списка',
      answerType: 'output',
      prompt: 'Какое число напечатает программа?',
      code: `nums = [5, 10, 15, 20]
print(nums[-1] - nums[0])`,
      inputPlaceholder: 'Введите число',
      inputHint: 'Индекс -1 обращается к последнему элементу списка.',
      sampleAnswer: '15',
      explanation: 'nums[-1] = 20, nums[0] = 5. Разность: 20 - 5 = 15.',
      validate: (raw) => normalizeText(raw) === '15',
    },
    {
      id: 'python-7',
      floor: 7,
      track: 'python',
      title: 'Длина списка',
      answerType: 'code',
      prompt: 'Дополните строку, чтобы записать в count количество элементов списка data.',
      code: `data = [3, 6, 9, 12, 15]
count = # ВАШ КОД`,
      inputPlaceholder: 'len(...)',
      inputHint: 'Используйте встроенную функцию Python для определения длины.',
      sampleAnswer: 'len(data)',
      explanation: 'Функция len(data) возвращает число элементов в списке.',
      validate: (raw) => normalizeCode(raw) === 'len(data)',
    },
    {
      id: 'python-8',
      floor: 8,
      track: 'python',
      title: 'Работа со словарём',
      answerType: 'output',
      prompt: 'Что выведет программа?',
      code: `scores = {"a": 4, "b": 7}
scores["a"] += 6
print(scores["a"] + scores["b"])`,
      inputPlaceholder: 'Введите число',
      inputHint: 'Сначала значение по ключу "a" увеличивается на 6.',
      sampleAnswer: '17',
      explanation: 'scores["a"] становится 4 + 6 = 10. Сумма 10 + 7 = 17.',
      validate: (raw) => normalizeText(raw) === '17',
    },
    {
      id: 'python-9',
      floor: 9,
      track: 'python',
      title: 'Срез списка с шагом 2',
      answerType: 'output',
      prompt: 'Какое число выведет программа?',
      code: `nums = [10, 20, 30, 40, 50]
print(sum(nums[::2]))`,
      inputPlaceholder: 'Введите число',
      inputHint: 'Срез [::2] берёт каждый второй элемент начиная с нулевого.',
      sampleAnswer: '90',
      explanation: 'nums[::2] даёт [10, 30, 50]. Их сумма равна 90.',
      validate: (raw) => normalizeText(raw) === '90',
    },
    {
      id: 'python-10',
      floor: 10,
      track: 'python',
      title: 'Разность max и min',
      answerType: 'output',
      prompt: 'Какой результат выведет print?',
      code: `vals = [8, 3, 19, 5, 12]
print(max(vals) - min(vals))`,
      inputPlaceholder: 'Введите число',
      inputHint: 'Вычтите минимальное число списка из максимального.',
      sampleAnswer: '16',
      explanation: 'max(vals) = 19, min(vals) = 3. Разность: 19 - 3 = 16.',
      validate: (raw) => normalizeText(raw) === '16',
    },
  ],
};

export function getPublicTasks(track: TrackId): PublicTask[] {
  return TASKS_BY_TRACK[track].map(
    ({ validate: _v, sampleAnswer: _s, explanation: _e, ...pub }) => pub
  );
}

export function getTeacherPreviewTasks(): Record<TrackId, TeacherPreviewTask[]> {
  return {
    cpp: TASKS_BY_TRACK.cpp.map(({ validate: _v, ...rest }) => rest),
    csharp: TASKS_BY_TRACK.csharp.map(({ validate: _v, ...rest }) => rest),
    python: TASKS_BY_TRACK.python.map(({ validate: _v, ...rest }) => rest),
  };
}

export function checkTaskAnswer(
  track: TrackId,
  taskId: string,
  rawAnswer: string
): { found: boolean; correct: boolean; floor: number } {
  const task = TASKS_BY_TRACK[track]?.find((t) => t.id === taskId);
  if (!task) {
    return { found: false, correct: false, floor: 0 };
  }
  return {
    found: true,
    correct: task.validate(rawAnswer),
    floor: task.floor,
  };
}
