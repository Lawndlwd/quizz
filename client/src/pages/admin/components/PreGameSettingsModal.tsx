import { useState } from 'react';
import { Input } from '@/components/Input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { AppConfig, GameSettings } from '../../../types';

interface Props {
  config: AppConfig;
  onConfirm: (settings: GameSettings) => void;
  onCancel: () => void;
}

export function PreGameSettingsModal({ config, onConfirm, onCancel }: Props) {
  const [baseScore, setBaseScore] = useState(config.defaultBaseScore);
  const [streakEnabled, setStreakEnabled] = useState(config.streakBonusEnabled);
  const [streakBase, setStreakBase] = useState(config.streakBonusBase);
  const [passEnabled, setPassEnabled] = useState(false);
  const [fiftyFiftyEnabled, setFiftyFiftyEnabled] = useState(false);

  const defaultSettings: GameSettings = {
    baseScore: config.defaultBaseScore,
    streakBonusEnabled: config.streakBonusEnabled,
    streakBonusBase: config.streakBonusBase,
    jokersEnabled: { pass: false, fiftyFifty: false },
  };

  const currentSettings: GameSettings = {
    baseScore,
    streakBonusEnabled: streakEnabled,
    streakBonusBase: streakBase,
    jokersEnabled: { pass: passEnabled, fiftyFifty: fiftyFiftyEnabled },
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-6">
      <Card className="z-[201] max-h-[90vh] w-full max-w-lg overflow-y-auto">
        <CardContent className="p-6">
          <h2 className="mb-1">Game Settings</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            These settings apply to this game only and won&apos;t change your defaults.
          </p>

          <div className="flex flex-col gap-5">
            <Input
              id="pass-joker-score"
              label="Pass joker score"
              type="number"
              min={0}
              value={baseScore}
              onChange={(e) => setBaseScore(Number(e.target.value))}
              hint="Points awarded to each player when the Pass joker is used"
            />

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="streak-enabled"
                  checked={streakEnabled}
                  onCheckedChange={(v) => setStreakEnabled(v === true)}
                />
                <Label htmlFor="streak-enabled" className="font-semibold">
                  Enable streak bonus
                </Label>
              </div>
              {streakEnabled && (
                <div className="pl-7">
                  <Input
                    id="streak-base-score"
                    label="Points per streak level above minimum"
                    type="number"
                    min={0}
                    value={streakBase}
                    onChange={(e) => setStreakBase(Number(e.target.value))}
                    noMargin
                  />
                </div>
              )}
            </div>

            <Separator />

            <div>
              <h3 className="mb-1 font-semibold">Jokers</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Activate jokers from the game control panel during gameplay. Each joker can be used
                once per game.
              </p>
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="pass-joker"
                    className="mt-0.5"
                    checked={passEnabled}
                    onCheckedChange={(v) => setPassEnabled(v === true)}
                  />
                  <div>
                    <Label htmlFor="pass-joker" className="font-semibold">
                      Pass
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Allow players to skip the current question and award base score once
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="fifty-fifty-joker"
                    className="mt-0.5"
                    checked={fiftyFiftyEnabled}
                    onCheckedChange={(v) => setFiftyFiftyEnabled(v === true)}
                  />
                  <div>
                    <Label htmlFor="fifty-fifty-joker" className="font-semibold">
                      50/50
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Allow players to eliminate 2 wrong answers once (multiple choice only)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => onConfirm(defaultSettings)}
            >
              Use defaults
            </Button>
            <Button
              type="button"
              variant="success"
              className="flex-1"
              onClick={() => onConfirm(currentSettings)}
            >
              Start →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
