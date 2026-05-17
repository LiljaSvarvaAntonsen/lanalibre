jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'es' }]),
}));

import i18n from '../i18n';

beforeAll(async () => {
  await i18n.changeLanguage('es');
});

afterAll(async () => {
  await i18n.changeLanguage('es');
});

test('Spanish: login.tagline', () => {
  expect(i18n.t('login.tagline')).toBe('Tu espacio para crear');
});

test('English: login.tagline', async () => {
  await i18n.changeLanguage('en');
  expect(i18n.t('login.tagline')).toBe('Your creative space');
});

test('Norwegian: login.tagline', async () => {
  await i18n.changeLanguage('nb');
  expect(i18n.t('login.tagline')).toBe('Din kreative plass');
});

test('Falls back to Spanish for unknown locale', async () => {
  await i18n.changeLanguage('fr');
  expect(i18n.t('login.tagline')).toBe('Tu espacio para crear');
});
