jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'es' }]),
}));

jest.mock('../firebase', () => ({}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { Calculator } from 'lucide-react-native';
import i18n from '../i18n';
import ResultSummaryCard from '../components/ResultSummaryCard';

beforeAll(async () => {
  await i18n.changeLanguage('es');
});

afterEach(() => jest.clearAllMocks());

describe('ResultSummaryCard', () => {
  it('renders label, keyValue and date string when savedDate is provided', () => {
    const savedDate = new Date('2026-05-15T12:00:00.000Z');
    const { getByText } = render(
      <ResultSummaryCard
        icon={Calculator}
        label="Calculadora de lana"
        keyValue="~240 g"
        savedDate={savedDate}
        iconColor="#B89AD8"
        iconBg="#EDE5F8"
        onPress={() => {}}
      />
    );

    expect(getByText('Calculadora de lana')).toBeTruthy();
    expect(getByText('~240 g')).toBeTruthy();
    // The date row must appear with "Guardado el" prefix
    expect(getByText(/Guardado el/)).toBeTruthy();
  });

  it('renders label and keyValue but no date row when savedDate is null', () => {
    const { getByText, queryByText } = render(
      <ResultSummaryCard
        icon={Calculator}
        label="Calculadora de lana"
        keyValue="~240 g"
        savedDate={null}
        iconColor="#B89AD8"
        iconBg="#EDE5F8"
        onPress={() => {}}
      />
    );

    expect(getByText('Calculadora de lana')).toBeTruthy();
    expect(getByText('~240 g')).toBeTruthy();
    expect(queryByText(/Guardado/)).toBeNull();
  });
});
