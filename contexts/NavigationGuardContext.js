import { createContext, useContext, useState, useRef } from 'react';
import ConfirmationModal from '../components/ConfirmationModal';

const NavigationGuardContext = createContext(null);

export function NavigationGuardProvider({ children }) {
  const [guardConfig, setGuardConfig] = useState(null);
  const tabGuardRef = useRef(null);

  function showGuard(config) { setGuardConfig(config); }
  function hideGuard() { setGuardConfig(null); }

  function setTabGuard(config) { tabGuardRef.current = config; }
  function clearTabGuard() { tabGuardRef.current = null; }

  function triggerTabGuardIfAny(destinationTabName, proceedFn) {
    const config = tabGuardRef.current;
    if (!config) return false;
    if (destinationTabName === config.guardingTabName) return false;
    if (!config.isActive()) return false;
    setGuardConfig({
      title: config.title,
      message: config.message,
      confirmLabel: config.confirmLabel,
      cancelLabel: config.cancelLabel,
      destructive: config.destructive ?? true,
      onConfirm: () => { proceedFn?.(); },
      onCancel: () => { config.onSave?.(destinationTabName); },
    });
    return true;
  }

  return (
    <NavigationGuardContext.Provider value={{ showGuard, hideGuard, setTabGuard, clearTabGuard, triggerTabGuardIfAny }}>
      {children}
      {guardConfig && (
        <ConfirmationModal
          visible={true}
          title={guardConfig.title}
          message={guardConfig.message}
          confirmLabel={guardConfig.confirmLabel}
          cancelLabel={guardConfig.cancelLabel}
          onConfirm={() => { hideGuard(); guardConfig.onConfirm(); }}
          onCancel={() => { hideGuard(); guardConfig.onCancel(); }}
          destructive={guardConfig.destructive ?? true}
        />
      )}
    </NavigationGuardContext.Provider>
  );
}

export const useNavigationGuard = () => useContext(NavigationGuardContext);
