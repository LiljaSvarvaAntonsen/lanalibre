import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Appearance } from 'react-native';
import { colors, darkColors } from '../constants/colors';
import { getUserDocument, saveUserSettings } from '../services/firestore';
import { useAuth } from '../hooks/useAuth';
import i18n from '../i18n';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const systemDark = Appearance.getColorScheme() === 'dark';
  const [isDark, setIsDark] = useState(systemDark);
  const [notifEnabled, setNotifEnabled] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    getUserDocument(user.uid)
      .then((doc) => {
        if (!doc) return;
        if (doc.tema === 'dark') setIsDark(true);
        else if (doc.tema === 'light') setIsDark(false);
        if (doc.idioma) i18n.changeLanguage(doc.idioma);
        if (typeof doc.notifWIP === 'boolean') setNotifEnabled(doc.notifWIP);
      })
      .catch(() => {});
  }, [user?.uid]);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      if (user?.uid) {
        saveUserSettings(user.uid, { tema: next ? 'dark' : 'light' }).catch(() => {});
      }
      return next;
    });
  }, [user?.uid]);

  const theme = isDark ? darkColors : colors;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, theme, notifEnabled, setNotifEnabled }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
