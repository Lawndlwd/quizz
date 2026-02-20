import { useState } from 'react';
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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.7)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        className="card card-md"
        style={{ maxWidth: 520, width: '100%', zIndex: 201, maxHeight: '90vh', overflowY: 'auto' }}
      >
        <h2 className="mb-1">Game Settings</h2>
        <p className="text-muted text-sm mb-5">
          These settings apply to this game only and won't change your defaults.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Pass joker score */}
          <div>
            <label
              htmlFor="pass-joker-score"
              style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}
            >
              Pass Joker Score
            </label>
            <p className="text-muted text-sm" style={{ marginBottom: 8 }}>
              Points awarded to each player when the Pass joker is used
            </p>
            <input
              id="pass-joker-score"
              type="number"
              min={0}
              value={baseScore}
              onChange={(e) => setBaseScore(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Streak bonus */}
          <div>
            <label
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <input
                type="checkbox"
                checked={streakEnabled}
                onChange={(e) => setStreakEnabled(e.target.checked)}
              />
              Enable streak bonus
            </label>
            {streakEnabled && (
              <div style={{ marginTop: 10, paddingLeft: 26 }}>
                <label
                  htmlFor="streak-base-score"
                  style={{
                    display: 'block',
                    color: 'var(--text2)',
                    fontSize: '0.85rem',
                    marginBottom: 6,
                  }}
                >
                  Points per streak level above minimum
                </label>
                <input
                  id="streak-base-score"
                  type="number"
                  min={0}
                  value={streakBase}
                  onChange={(e) => setStreakBase(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <h3 style={{ marginBottom: 4 }}>Jokers</h3>
            <p className="text-muted text-sm" style={{ marginBottom: 14 }}>
              Activate jokers from the game control panel during gameplay. Each joker can be used
              once per game.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label
                style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={passEnabled}
                  onChange={(e) => setPassEnabled(e.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>Pass</div>
                  <div className="text-muted text-sm">
                    Allow players to skip the current question and award base score once
                  </div>
                </div>
              </label>

              <label
                style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={fiftyFiftyEnabled}
                  onChange={(e) => setFiftyFiftyEnabled(e.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>50/50</div>
                  <div className="text-muted text-sm">
                    Allow players to eliminate 2 wrong answers once (multiple choice only)
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button type="button" className="btn btn-ghost" onClick={onCancel} style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onConfirm(defaultSettings)}
            style={{ flex: 1 }}
          >
            Use Defaults
          </button>
          <button
            type="button"
            className="btn btn-success"
            onClick={() => onConfirm(currentSettings)}
            style={{ flex: 1 }}
          >
            Start →
          </button>
        </div>
      </div>
    </div>
  );
}
