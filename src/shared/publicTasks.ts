import type { PublicTask, TrackId } from './types.ts';

export const PUBLIC_TASKS_BY_TRACK: Record<TrackId, PublicTask[]> = {
  "cpp": [
    {
      "id": "cpp-1",
      "floor": 1,
      "track": "cpp",
      "title": "Целочисленное деление и остаток",
      "answerType": "output",
      "prompt": "Какое число выведет программа на экран?",
      "code": "#include <iostream>\nusing namespace std;\n\nint main() {\n    int a = 17;\n    int b = 5;\n    cout << (a / b) + (a % b);\n    return 0;\n}",
      "inputPlaceholder": "Например: 12",
      "inputHint": "Введите итоговое число, которое окажется в консоли."
    },
    {
      "id": "cpp-2",
      "floor": 2,
      "track": "cpp",
      "title": "Условие чётности числа",
      "answerType": "code",
      "prompt": "Напишите условие внутри if, чтобы в сумму попадали только чётные значения переменной i.",
      "code": "int sum = 0;\nfor (int i = 1; i <= 10; i++) {\n    if ( /* ВАШ КОД */ ) {\n        sum += i;\n    }\n}",
      "inputPlaceholder": "Например: i > 0",
      "inputHint": "Укажите логическое выражение для проверки чётности i."
    },
    {
      "id": "cpp-3",
      "floor": 3,
      "track": "cpp",
      "title": "Фильтрация элементов массива",
      "answerType": "output",
      "prompt": "Что выведет программа после прохода по массиву?",
      "code": "int arr[4] = {2, 5, 8, 3};\nint res = 0;\nfor (int i = 0; i < 4; i++) {\n    if (arr[i] > 4) {\n        res += arr[i];\n    }\n}\ncout << res;",
      "inputPlaceholder": "Введите число",
      "inputHint": "Сложите только те элементы, которые строго больше 4."
    },
    {
      "id": "cpp-4",
      "floor": 4,
      "track": "cpp",
      "title": "Передача параметра по ссылке",
      "answerType": "output",
      "prompt": "Какое значение переменной n выведет программа?",
      "code": "void boost(int& x) {\n    x = x * 2 + 1;\n}\n\nint main() {\n    int n = 4;\n    boost(n);\n    boost(n);\n    cout << n;\n}",
      "inputPlaceholder": "Введите число",
      "inputHint": "Обратите внимание на знак & — функция изменяет исходную переменную n."
    },
    {
      "id": "cpp-5",
      "floor": 5,
      "track": "cpp",
      "title": "Добавление элемента в std::vector",
      "answerType": "code",
      "prompt": "Напишите одну строку кода, чтобы добавить число 40 в конец вектора nums.",
      "code": "#include <vector>\nusing namespace std;\n\nvector<int> nums = {10, 20, 30};\n// Добавьте 40 в конец вектора nums:\n/* ВАШ КОД */",
      "inputPlaceholder": "nums. ...",
      "inputHint": "Используйте стандартный метод добавления элемента в конец вектора."
    },
    {
      "id": "cpp-6",
      "floor": 6,
      "track": "cpp",
      "title": "Префиксный инкремент",
      "answerType": "output",
      "prompt": "Какое число выведет программа?",
      "code": "int a = 5;\nint b = ++a + 2;\ncout << a + b;",
      "inputPlaceholder": "Введите число",
      "inputHint": "Префиксный ++a сначала увеличивает a на 1, затем подставляет новое значение."
    },
    {
      "id": "cpp-7",
      "floor": 7,
      "track": "cpp",
      "title": "Длина строки std::string",
      "answerType": "code",
      "prompt": "Дополните выражение, чтобы получить длину строки s.",
      "code": "#include <string>\nusing namespace std;\n\nstring s = \"Coding\";\nint len = /* ВАШ КОД */;",
      "inputPlaceholder": "s. ...",
      "inputHint": "Используйте метод std::string для получения количества символов."
    },
    {
      "id": "cpp-8",
      "floor": 8,
      "track": "cpp",
      "title": "Количество итераций цикла while",
      "answerType": "output",
      "prompt": "Какое значение счётчика c выведет программа?",
      "code": "int x = 20;\nint c = 0;\nwhile (x > 3) {\n    x -= 5;\n    c++;\n}\ncout << c;",
      "inputPlaceholder": "Введите число",
      "inputHint": "Отследите значение x на каждом шаге: 20 → 15 → ..."
    },
    {
      "id": "cpp-9",
      "floor": 9,
      "track": "cpp",
      "title": "Тернарный оператор",
      "answerType": "output",
      "prompt": "Что выведет программа на экран?",
      "code": "int a = 9;\nint b = 12;\nint m = (a > b) ? a : b;\ncout << m * 2;",
      "inputPlaceholder": "Введите число",
      "inputHint": "Если условие истинно — выбирается значение после ?, иначе — после :."
    },
    {
      "id": "cpp-10",
      "floor": 10,
      "track": "cpp",
      "title": "Поиск максимума в массиве",
      "answerType": "output",
      "prompt": "Какое число выведет программа?",
      "code": "int v[4] = {7, 14, 9, 11};\nint mx = v[0];\nfor (int i = 1; i < 4; i++) {\n    if (v[i] > mx) mx = v[i];\n}\ncout << mx;",
      "inputPlaceholder": "Введите число",
      "inputHint": "Найдите максимальный элемент среди чисел массива."
    }
  ],
  "csharp": [
    {
      "id": "csharp-1",
      "floor": 1,
      "track": "csharp",
      "title": "Базовая арифметика и вывод",
      "answerType": "output",
      "prompt": "Какое число появится в консоли после выполнения кода?",
      "code": "int x = 6;\nint y = 4;\nint z = x * y - 10;\nConsole.WriteLine(z);",
      "inputPlaceholder": "Введите число",
      "inputHint": "Сначала выполняется умножение, затем вычитание."
    },
    {
      "id": "csharp-2",
      "floor": 2,
      "track": "csharp",
      "title": "Количество элементов массива",
      "answerType": "code",
      "prompt": "Дополните выражение, чтобы получить длину массива scores.",
      "code": "int[] scores = { 12, 18, 25, 9, 30 };\n// Получите количество элементов массива scores:\nint count = /* ВАШ КОД */;",
      "inputPlaceholder": "scores. ...",
      "inputHint": "Укажите свойство массива C#, возвращающее число элементов (с учётом регистра)."
    },
    {
      "id": "csharp-3",
      "floor": 3,
      "track": "csharp",
      "title": "Цикл foreach и кратность 3",
      "answerType": "output",
      "prompt": "Что выведет программа на экран?",
      "code": "int[] data = { 3, 6, 2, 9 };\nint total = 0;\nforeach (int n in data)\n{\n    if (n % 3 == 0)\n        total += n;\n}\nConsole.WriteLine(total);",
      "inputPlaceholder": "Введите число",
      "inputHint": "Суммируются только элементы, делящиеся на 3 без остатка."
    },
    {
      "id": "csharp-4",
      "floor": 4,
      "track": "csharp",
      "title": "Подстрока и верхний регистр",
      "answerType": "output",
      "prompt": "Какую строку выведет Console.WriteLine?",
      "code": "string word = \"CSharp\";\nConsole.WriteLine(word.Substring(1, 3).ToUpper());",
      "inputPlaceholder": "Например: ABC",
      "inputHint": "Первый аргумент Substring — индекс начала (с 0), второй — длина фрагмента."
    },
    {
      "id": "csharp-5",
      "floor": 5,
      "track": "csharp",
      "title": "Лямбда-условие в LINQ Where",
      "answerType": "code",
      "prompt": "Напишите лямбда-выражение внутри Where, чтобы отобрать числа строго больше 10.",
      "code": "using System.Linq;\n\nint[] nums = { 4, 11, 7, 15, 2 };\n// Выберите только числа больше 10:\nvar big = nums.Where(/* ВАШ КОД */).ToList();",
      "inputPlaceholder": "Например: x => x > 0",
      "inputHint": "Используйте синтаксис лямбды C#: параметр => условие."
    },
    {
      "id": "csharp-6",
      "floor": 6,
      "track": "csharp",
      "title": "Деление и остаток в C#",
      "answerType": "output",
      "prompt": "Какое число выведет программа?",
      "code": "int n = 23;\nConsole.WriteLine((n % 5) + (n / 5));",
      "inputPlaceholder": "Введите число",
      "inputHint": "Оба операнда целые числа (int)."
    },
    {
      "id": "csharp-7",
      "floor": 7,
      "track": "csharp",
      "title": "Добавление элемента в List<int>",
      "answerType": "code",
      "prompt": "Напишите строку кода, чтобы добавить число 3 в конец списка list.",
      "code": "using System.Collections.Generic;\n\nvar list = new List<int> { 1, 2 };\n// Добавьте число 3 в список list:\n/* ВАШ КОД */",
      "inputPlaceholder": "list. ...",
      "inputHint": "Используйте метод класса List<T> для добавления одного элемента."
    },
    {
      "id": "csharp-8",
      "floor": 8,
      "track": "csharp",
      "title": "Цикл for с шагом 2",
      "answerType": "output",
      "prompt": "Какое значение переменной s выведет программа?",
      "code": "int s = 0;\nfor (int i = 2; i <= 8; i += 2)\n{\n    s += i;\n}\nConsole.WriteLine(s);",
      "inputPlaceholder": "Введите число",
      "inputHint": "Переменная i принимает значения 2, 4, 6, 8."
    },
    {
      "id": "csharp-9",
      "floor": 9,
      "track": "csharp",
      "title": "Замена символов в строке",
      "answerType": "output",
      "prompt": "Какую строку выведет программа?",
      "code": "string t = \"c-sharp\";\nConsole.WriteLine(t.Replace(\"-\", \"_\"));",
      "inputPlaceholder": "Например: a_b",
      "inputHint": "Метод Replace заменяет первый фрагмент на второй."
    },
    {
      "id": "csharp-10",
      "floor": 10,
      "track": "csharp",
      "title": "Подсчёт элементов через LINQ Count",
      "answerType": "output",
      "prompt": "Какое число появится в консоли?",
      "code": "using System.Linq;\n\nint[] a = { 2, 7, 10, 15, 4 };\nConsole.WriteLine(a.Count(x => x >= 7));",
      "inputPlaceholder": "Введите число",
      "inputHint": "Count с условием возвращает количество подходящих элементов."
    }
  ],
  "python": [
    {
      "id": "python-1",
      "floor": 1,
      "track": "python",
      "title": "Возведение в степень и деление нацело",
      "answerType": "output",
      "prompt": "Какое число напечатает Python?",
      "code": "a = 2 ** 3\nb = 15 // 4\nprint(a + b)",
      "inputPlaceholder": "Введите число",
      "inputHint": "Оператор ** — степень, оператор // — деление нацело."
    },
    {
      "id": "python-2",
      "floor": 2,
      "track": "python",
      "title": "Срез строки",
      "answerType": "output",
      "prompt": "Что выведет функция print?",
      "code": "text = \"PYTHON\"\nprint(text[1:4])",
      "inputPlaceholder": "Например: PYT",
      "inputHint": "Правая граница среза [1:4] не включается."
    },
    {
      "id": "python-3",
      "floor": 3,
      "track": "python",
      "title": "Добавление элемента в список",
      "answerType": "code",
      "prompt": "Напишите строку кода, которая добавит число 40 в конец списка items.",
      "code": "items = [10, 20, 30]\n# Добавьте число 40 в конец списка items:\n# ВАШ КОД",
      "inputPlaceholder": "items. ...",
      "inputHint": "Используйте стандартный метод списка для добавления одного элемента."
    },
    {
      "id": "python-4",
      "floor": 4,
      "track": "python",
      "title": "Сумма нечётных чисел в range",
      "answerType": "output",
      "prompt": "Какое число выведет программа?",
      "code": "total = 0\nfor i in range(1, 6):\n    if i % 2 == 1:\n        total += i\nprint(total)",
      "inputPlaceholder": "Введите число",
      "inputHint": "range(1, 6) перебирает числа от 1 до 5 включительно."
    },
    {
      "id": "python-5",
      "floor": 5,
      "track": "python",
      "title": "Генератор списка и сумма квадратов",
      "answerType": "output",
      "prompt": "Какой результат выведет программа?",
      "code": "nums = [1, 2, 3, 4]\nsquares = [x * x for x in nums if x > 1]\nprint(sum(squares))",
      "inputPlaceholder": "Введите число",
      "inputHint": "Сначала отбираются числа больше 1, возводятся в квадрат, затем суммируются."
    },
    {
      "id": "python-6",
      "floor": 6,
      "track": "python",
      "title": "Отрицательные индексы списка",
      "answerType": "output",
      "prompt": "Какое число напечатает программа?",
      "code": "nums = [5, 10, 15, 20]\nprint(nums[-1] - nums[0])",
      "inputPlaceholder": "Введите число",
      "inputHint": "Индекс -1 обращается к последнему элементу списка."
    },
    {
      "id": "python-7",
      "floor": 7,
      "track": "python",
      "title": "Длина списка",
      "answerType": "code",
      "prompt": "Дополните строку, чтобы записать в count количество элементов списка data.",
      "code": "data = [3, 6, 9, 12, 15]\ncount = # ВАШ КОД",
      "inputPlaceholder": "len(...)",
      "inputHint": "Используйте встроенную функцию Python для определения длины."
    },
    {
      "id": "python-8",
      "floor": 8,
      "track": "python",
      "title": "Работа со словарём",
      "answerType": "output",
      "prompt": "Что выведет программа?",
      "code": "scores = {\"a\": 4, \"b\": 7}\nscores[\"a\"] += 6\nprint(scores[\"a\"] + scores[\"b\"])",
      "inputPlaceholder": "Введите число",
      "inputHint": "Сначала значение по ключу \"a\" увеличивается на 6."
    },
    {
      "id": "python-9",
      "floor": 9,
      "track": "python",
      "title": "Срез списка с шагом 2",
      "answerType": "output",
      "prompt": "Какое число выведет программа?",
      "code": "nums = [10, 20, 30, 40, 50]\nprint(sum(nums[::2]))",
      "inputPlaceholder": "Введите число",
      "inputHint": "Срез [::2] берёт каждый второй элемент начиная с нулевого."
    },
    {
      "id": "python-10",
      "floor": 10,
      "track": "python",
      "title": "Разность max и min",
      "answerType": "output",
      "prompt": "Какой результат выведет print?",
      "code": "vals = [8, 3, 19, 5, 12]\nprint(max(vals) - min(vals))",
      "inputPlaceholder": "Введите число",
      "inputHint": "Вычтите минимальное число списка из максимального."
    }
  ]
};

export function getPublicTasks(track: TrackId): PublicTask[] {
  return PUBLIC_TASKS_BY_TRACK[track] ?? [];
}

export function getAllPublicTasks(): Record<TrackId, PublicTask[]> {
  return PUBLIC_TASKS_BY_TRACK;
}
