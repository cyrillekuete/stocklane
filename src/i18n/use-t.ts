import { useCallback } from 'react';
import { useLanguage } from '@/providers/i18n-provider';
import { translate, type MessageValues } from './translate';

export function useT() {
  const { currenLanguage } = useLanguage();
  const messages = currenLanguage.messages as Record<string, string>;

  return useCallback(
    (id: string, values?: MessageValues) => translate(messages, id, values),
    [messages],
  );
}

export function T({
  id,
  values,
}: {
  id: string;
  values?: MessageValues;
}) {
  const t = useT();
  return t(id, values);
}
