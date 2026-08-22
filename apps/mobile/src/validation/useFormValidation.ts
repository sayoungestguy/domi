import { useState } from 'react';

export function useFormValidation() {
  const [changed, setChanged] = useState<Record<string, boolean>>({});

  function bind(name: string, setter: (value: string) => void) {
    return (value: string) => {
      setChanged((current) => ({ ...current, [name]: true }));
      setter(value);
    };
  }

  function error(name: string, message?: string) {
    return changed[name] ? message : undefined;
  }

  function reset() {
    setChanged({});
  }

  function clear(name: string) {
    setChanged((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  return { bind, clear, error, reset };
}
