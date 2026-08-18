'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useSettingsForm } from '../../settings-form-context';

export function AIFeatures() {
  const { draft, updateDraft } = useSettingsForm();

  return (
    <Card className="bg-accent/70 rounded-md shadow-none h-full flex flex-col">
      <CardContent className="p-0 flex flex-col h-full">
        <h3 className="text-sm font-medium text-foreground py-2.5 ps-2">AI Features</h3>
        <div className="bg-background rounded-md m-1 mt-0 border border-input p-5 pb-3.5 space-y-5 h-full">
          <div className="flex items-start gap-5">
            <div className="flex flex-col gap-1.5 basis-1/3">
              <Label className="text-sm font-medium tracking-[-0.13px] shrink-0">Enable AI Semantic Search</Label>
              <span className="text-xs font-normal text-muted-foreground leading-none">Improves search with AI understanding</span>
            </div>
            <div className="flex flex-col gap-2.5 basis-2/3">
              <div className="flex items-center gap-2">
                <Switch
                  id="ai-semantic-search"
                  size="sm"
                  checked={draft.aiSemanticSearch}
                  onCheckedChange={(checked) => updateDraft({ aiSemanticSearch: checked })}
                />
                <Label htmlFor="ai-semantic-search">{draft.aiSemanticSearch ? 'Active' : 'Inactive'}</Label>
              </div>
              <span className="text-xs font-normal text-muted-foreground leading-none">
                {draft.aiSemanticSearch
                  ? 'Search understands intent and related product terms.'
                  : 'AI-powered search is disabled; only basic keyword matching is used.'}
              </span>
            </div>
          </div>

          <Separator />

          <div className="flex items-start gap-5">
            <div className="flex flex-col gap-1.5 basis-1/3">
              <Label className="text-sm font-medium tracking-[-0.13px] shrink-0">Enable AI Insight</Label>
              <span className="text-xs font-normal text-muted-foreground leading-none">Provides AI-driven analytics and trends</span>
            </div>
            <div className="flex flex-col gap-2.5 basis-2/3">
              <div className="flex items-center gap-2">
                <Switch
                  id="ai-insight"
                  size="sm"
                  checked={draft.aiInsight}
                  onCheckedChange={(checked) => updateDraft({ aiInsight: checked })}
                />
                <Label htmlFor="ai-insight">{draft.aiInsight ? 'Active' : 'Inactive'}</Label>
              </div>
              <span className="text-xs font-normal text-muted-foreground leading-none">
                {draft.aiInsight
                  ? 'Provides real-time analytics, trends, and predictions using AI models.'
                  : 'AI insights are turned off for dashboards and reports.'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
