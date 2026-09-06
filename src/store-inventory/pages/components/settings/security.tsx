'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useSettingsForm } from "./settings-form-context";
import { NumberField } from "./components/number-field";
import { useT } from '@/i18n/use-t';

export function Security() {
  const t = useT();
  const { draft, updateDraft, fieldErrors } = useSettingsForm();

  return (
    <div className="space-y-5">
      <Card className="bg-accent/70 rounded-md shadow-none flex flex-col">
        <CardContent className="p-0 flex flex-col">
          <h3 className="text-sm font-medium text-foreground py-2.5 ps-2">{t('Account Security')}</h3>
          <div className="bg-background rounded-md m-1 mt-0 border border-input p-5 space-y-5">
            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">{t('Two-factor authentication')}</Label>
                <span className="text-xs font-normal text-muted-foreground">{t('Require 2FA for staff sign-in')}</span>
              </div>
              <div className="basis-2/3 flex items-center gap-2">
                <Switch
                  id="two-factor"
                  size="sm"
                  checked={draft.twoFactorRequired}
                  onCheckedChange={(twoFactorRequired) => updateDraft({ twoFactorRequired })}
                />
                <Label htmlFor="two-factor">{draft.twoFactorRequired ? t('Required') : t('Optional')}</Label>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">{t('Session timeout')}</Label>
                <span className="text-xs font-normal text-muted-foreground">{t('Minutes of inactivity before sign-out')}</span>
              </div>
              <div className="basis-2/3">
                <NumberField
                  id="settings-session-timeout"
                  value={draft.sessionTimeoutMinutes}
                  min={5}
                  max={1440}
                  step={1}
                  error={fieldErrors.sessionTimeoutMinutes}
                  hint={t('Minutes of inactivity before sign-out (5–1440)')}
                  ariaLabel={t('Session timeout')}
                  onCommit={(value) =>
                    updateDraft({
                      sessionTimeoutMinutes: Number.isFinite(value)
                        ? Math.trunc(value)
                        : Number.NaN,
                    })
                  }
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">{t('Login alerts')}</Label>
                <span className="text-xs font-normal text-muted-foreground">{t('Email staff when a new device signs in')}</span>
              </div>
              <div className="basis-2/3 flex items-center gap-2">
                <Switch
                  id="login-alerts"
                  size="sm"
                  checked={draft.loginAlerts}
                  onCheckedChange={(loginAlerts) => updateDraft({ loginAlerts })}
                />
                <Label htmlFor="login-alerts">{draft.loginAlerts ? t('Active') : t('Inactive')}</Label>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">{t('Minimum password length')}</Label>
                <span className="text-xs font-normal text-muted-foreground">{t('Characters required for staff passwords')}</span>
              </div>
              <div className="basis-2/3">
                <NumberField
                  id="settings-password-min-length"
                  value={draft.passwordMinLength}
                  min={6}
                  max={128}
                  step={1}
                  error={fieldErrors.passwordMinLength}
                  hint={t('Characters required for staff passwords (6–128)')}
                  ariaLabel={t('Minimum password length')}
                  onCommit={(value) =>
                    updateDraft({
                      passwordMinLength: Number.isFinite(value)
                        ? Math.trunc(value)
                        : Number.NaN,
                    })
                  }
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-5">
              <div className="flex flex-col gap-0.5 basis-1/3">
                <Label className="text-2sm font-medium shrink-0">{t('Require strong passwords')}</Label>
                <span className="text-xs font-normal text-muted-foreground">{t('Must include letters, numbers, and a symbol')}</span>
              </div>
              <div className="basis-2/3 flex items-center gap-2">
                <Switch
                  id="strong-password"
                  size="sm"
                  checked={draft.requireStrongPassword}
                  onCheckedChange={(requireStrongPassword) => updateDraft({ requireStrongPassword })}
                />
                <Label htmlFor="strong-password">{draft.requireStrongPassword ? t('Required') : t('Optional')}</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
