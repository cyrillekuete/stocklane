'use client';

import { LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/use-t';
import { TimelineItem } from './timeline-item';

const ActivitiesInterview = () => {
  const t = useT();
  return (
    <TimelineItem icon={LogIn} className="text-foreground" line={true}>
      <div className="flex flex-col">
        <div className="text-sm text-foreground font-normal">
          {t("I had the privilege of interviewing an industry expert for an")}{' '}
          <Button mode="link" asChild>
            <Link to="#">
              {t('upcoming blog post')}
            </Link>
          </Button>
        </div>
        <span className="text-xs text-muted-foreground/80 font-normal">
          {t('2 days ago, 4:07 PM')}
        </span>
      </div>
    </TimelineItem>
  );
};

export { ActivitiesInterview };
