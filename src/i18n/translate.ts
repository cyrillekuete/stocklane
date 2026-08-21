export type MessageValues = Record<string, string | number>;

export function interpolate(template: string, values?: MessageValues): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    values[key] !== undefined ? String(values[key]) : `{${key}}`,
  );
}

export function translate(
  messages: Record<string, string> | undefined,
  id: string,
  values?: MessageValues,
): string {
  const template = messages?.[id] ?? id;
  return interpolate(template, values);
}
