'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, InputAddon, InputGroup, InputWrapper } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toAbsoluteUrl } from "@/lib/helpers";
import { CircleCheck, SquarePlus } from "lucide-react";
import { useSettingsForm } from "../../settings-form-context";
import type { ContactChannel } from "@/store-inventory/types";

const CHANNEL_META: Record<string, { prefix: string; logo: string; label: string }> = {
  github: { prefix: 'github.com/', logo: 'github.svg', label: 'GitHub' },
  linkedin: { prefix: 'linkedin.com/', logo: 'linkedin.svg', label: 'LinkedIn' },
  figma: { prefix: 'figma.com/', logo: 'figma.svg', label: 'Figma' },
  twitch: { prefix: 'twitch.tv/', logo: 'twitch-purple.svg', label: 'Twitch' },
  slack: { prefix: 'slack.com/', logo: 'slack.svg', label: 'Slack' },
};

const DEFAULT_ORDER = ['github', 'linkedin', 'figma', 'twitch', 'slack'];

export function ContactChannels() {
  const { draft, updateDraft } = useSettingsForm();

  const updateHandle = (provider: string, handle: string) => {
    const existing = draft.contactChannels.find((channel) => channel.provider === provider);
    const next: ContactChannel[] = existing
      ? draft.contactChannels.map((channel) =>
          channel.provider === provider ? { ...channel, handle } : channel,
        )
      : [...draft.contactChannels, { provider, handle }];
    updateDraft({ contactChannels: next });
  };

  const addChannel = () => {
    const nextProvider = DEFAULT_ORDER.find(
      (provider) => !draft.contactChannels.some((channel) => channel.provider === provider),
    );
    if (!nextProvider) return;
    updateDraft({
      contactChannels: [...draft.contactChannels, { provider: nextProvider, handle: '' }],
    });
  };

  const channels = DEFAULT_ORDER.map((provider) => ({
    provider,
    handle: draft.contactChannels.find((channel) => channel.provider === provider)?.handle ?? '',
  })).filter((channel) => draft.contactChannels.some((item) => item.provider === channel.provider) || ['github', 'linkedin', 'figma'].includes(channel.provider));

  return (
    <Card className="bg-accent/70 rounded-md shadow-none h-full flex flex-col">
      <CardContent className="p-0 flex flex-col h-full">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground py-2.5 ps-2">Contact Channels</h3>
          <Button variant="dim" mode="icon" className="me-1" onClick={addChannel}>
            <SquarePlus className="text-muted-foreground/70"/>
          </Button>
        </div>
        <div className="bg-background rounded-md m-1 mt-0 border border-input p-5 space-y-5 h-full">
          <div className="flex items-start gap-5">
            <div className="flex flex-col gap-0.5 basis-1/3">
              <Label className="text-2sm font-medium shrink-0">Social profiles</Label>
              <span className="text-xs font-normal text-muted-foreground">Public links shown on invoices and store pages</span>
            </div>
            <div className="basis-2/3 space-y-3.5">
              {channels.map((channel) => {
                const meta = CHANNEL_META[channel.provider];
                const verified = Boolean(channel.handle.trim());
                return (
                  <InputWrapper key={channel.provider} className="px-0 overflow-hidden">
                    <InputAddon className="rounded-r-none border-s-0 border-e-border text-muted-foreground bg-muted/50">
                      <img
                        src={toAbsoluteUrl(`/media/brand-logos/${meta.logo}`)}
                        alt={meta.label}
                        className="size-4.5 me-1.5 -ms-1"
                      />
                      {meta.prefix}
                    </InputAddon>
                    <Input
                      type="text"
                      placeholder="Enter your social link"
                      value={channel.handle}
                      onChange={(e) => updateHandle(channel.provider, e.target.value)}
                    />
                    {verified ? (
                      <Button size="sm" variant="dim" mode="icon" className="me-1">
                        <CircleCheck className="fill-green-500 !text-background size-4.5" />
                      </Button>
                    ) : null}
                  </InputWrapper>
                );
              })}

              {!draft.contactChannels.some((channel) => channel.provider === 'twitch') && (
                <InputGroup>
                  <InputAddon className="rounded-r-none border-s-0 border-e-border text-muted-foreground bg-muted/50">
                    <img
                      src={toAbsoluteUrl('/media/brand-logos/twitch-purple.svg')}
                      alt="Twitch"
                      className="size-4.5 me-1.5 -ms-1"
                    />
                    twitch.tv/
                  </InputAddon>
                  <Input
                    type="text"
                    placeholder="Enter your social link"
                    value=""
                    onChange={(e) => updateHandle('twitch', e.target.value)}
                  />
                </InputGroup>
              )}

              {!draft.contactChannels.some((channel) => channel.provider === 'slack') && (
                <InputGroup>
                  <InputAddon className="rounded-r-none border-s-0 border-e-border text-muted-foreground bg-muted/50">
                    <img
                      src={toAbsoluteUrl('/media/brand-logos/slack.svg')}
                      alt="Slack"
                      className="size-4.5 me-1.5 -ms-1"
                    />
                    slack.com/
                  </InputAddon>
                  <Input
                    type="text"
                    placeholder="Enter your social link"
                    value=""
                    onChange={(e) => updateHandle('slack', e.target.value)}
                  />
                </InputGroup>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
