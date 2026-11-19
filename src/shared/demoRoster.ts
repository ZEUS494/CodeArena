import type { CharacterCustomization, GroupId, TrackId } from './types.ts';

export interface DemoRosterCandidate {
  firstName: string;
  lastName: string;
  track: TrackId;
  group: GroupId;
  customization: CharacterCustomization;
}

export const DEMO_ROSTER: DemoRosterCandidate[] = [
  {
    firstName: 'Артём',
    lastName: 'Соколов',
    track: 'cpp',
    group: 'Группа 1',
    customization: { suitColorIndex: 0, hairStyle: 'spiky', hairColor: '#4A2E1B', pattern: 'lightning', barStyle: 'gold' },
  },
  {
    firstName: 'Полина',
    lastName: 'Морозова',
    track: 'python',
    group: 'Группа 1',
    customization: { suitColorIndex: 7, hairStyle: 'ponytail', hairColor: '#A16207', pattern: 'star', barStyle: 'neon' },
  },
  {
    firstName: 'Даниил',
    lastName: 'Волков',
    track: 'csharp',
    group: 'Группа 2',
    customization: { suitColorIndex: 2, hairStyle: 'cap', hairColor: '#1E1B18', pattern: 'chevron', barStyle: 'classic' },
  },
  {
    firstName: 'Екатерина',
    lastName: 'Лебедева',
    track: 'python',
    group: 'Группа 2',
    customization: { suitColorIndex: 3, hairStyle: 'ponytail', hairColor: '#C2410C', pattern: 'stripes', barStyle: 'emerald' },
  },
  {
    firstName: 'Максим',
    lastName: 'Козлов',
    track: 'cpp',
    group: 'Группа 3',
    customization: { suitColorIndex: 1, hairStyle: 'helmet', hairColor: '#CBD5E1', pattern: 'lightning', barStyle: 'gold' },
  },
  {
    firstName: 'София',
    lastName: 'Новикова',
    track: 'csharp',
    group: 'Группа 1',
    customization: { suitColorIndex: 4, hairStyle: 'short', hairColor: '#38BDF8', pattern: 'star', barStyle: 'neon' },
  },
  {
    firstName: 'Илья',
    lastName: 'Петров',
    track: 'python',
    group: 'Группа 3',
    customization: { suitColorIndex: 5, hairStyle: 'cap', hairColor: '#4A2E1B', pattern: 'stripes', barStyle: 'classic' },
  },
  {
    firstName: 'Алина',
    lastName: 'Смирнова',
    track: 'cpp',
    group: 'Группа 2',
    customization: { suitColorIndex: 6, hairStyle: 'spiky', hairColor: '#1E1B18', pattern: 'chevron', barStyle: 'emerald' },
  },
  {
    firstName: 'Кирилл',
    lastName: 'Орлов',
    track: 'python',
    group: 'Группа 1',
    customization: { suitColorIndex: 2, hairStyle: 'helmet', hairColor: '#38BDF8', pattern: 'chevron', barStyle: 'neon' },
  },
  {
    firstName: 'Дарья',
    lastName: 'Павлова',
    track: 'cpp',
    group: 'Группа 1',
    customization: { suitColorIndex: 5, hairStyle: 'ponytail', hairColor: '#4A2E1B', pattern: 'lightning', barStyle: 'gold' },
  },
  {
    firstName: 'Егор',
    lastName: 'Зайцев',
    track: 'csharp',
    group: 'Группа 1',
    customization: { suitColorIndex: 3, hairStyle: 'cap', hairColor: '#1E1B18', pattern: 'stripes', barStyle: 'emerald' },
  },
  {
    firstName: 'Виктория',
    lastName: 'Белова',
    track: 'csharp',
    group: 'Группа 2',
    customization: { suitColorIndex: 4, hairStyle: 'ponytail', hairColor: '#A16207', pattern: 'star', barStyle: 'gold' },
  },
  {
    firstName: 'Никита',
    lastName: 'Фёдоров',
    track: 'python',
    group: 'Группа 2',
    customization: { suitColorIndex: 0, hairStyle: 'spiky', hairColor: '#C2410C', pattern: 'lightning', barStyle: 'classic' },
  },
  {
    firstName: 'Мария',
    lastName: 'Кузнецова',
    track: 'csharp',
    group: 'Группа 3',
    customization: { suitColorIndex: 7, hairStyle: 'ponytail', hairColor: '#1E1B18', pattern: 'star', barStyle: 'neon' },
  },
  {
    firstName: 'Тимур',
    lastName: 'Громов',
    track: 'cpp',
    group: 'Группа 3',
    customization: { suitColorIndex: 2, hairStyle: 'spiky', hairColor: '#CBD5E1', pattern: 'chevron', barStyle: 'emerald' },
  },
  {
    firstName: 'Анна',
    lastName: 'Соловьёва',
    track: 'python',
    group: 'Группа 3',
    customization: { suitColorIndex: 3, hairStyle: 'short', hairColor: '#4A2E1B', pattern: 'stripes', barStyle: 'gold' },
  },
];
