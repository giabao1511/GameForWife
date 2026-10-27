'use client';

import { useEffect } from 'react';
import GameViewport from './GameViewport';
import TopHud from './hud/TopHud';
import StatGroup from './hud/StatGroup';
import CardDeck from './card/CardDeck';
import InventoryBar from './inventory/InventoryBar';
import { unlockAudio, playPeriodAmbience } from '@/lib/audio';
import { useGameStore } from '@/store/useGameStore';
import { useUiStore } from '@/store/useUiStore';
import { getActivePeriod } from '@/lib/timeContext';

/** Top-level game layout for a chapter session. Card drawing lives in CardDeck. */
export default function GameScreen() {
  // Browsers require a user gesture before an AudioContext can start — unlock
  // the ASMR engine on the first tap anywhere in the game.
  useEffect(() => {
    const onFirstGesture = () => unlockAudio();
    window.addEventListener('pointerdown', onFirstGesture, { once: true });
    return () => window.removeEventListener('pointerdown', onFirstGesture);
  }, []);

  // Apply persisted, browser-only state (unlocked endings, vouchers, time slot,
  // mute) once after mount so SSR and first client render never diverge.
  useEffect(() => {
    useGameStore.getState().hydrateFromStorage();
    useUiStore.getState().hydrateMuted();
    // Real-time ambience flourish for the current period (morning chirps /
    // latenight lullaby). No-ops silently when muted or before first gesture
    // unlocks the AudioContext — it's atmosphere, not gameplay SFX.
    playPeriodAmbience(getActivePeriod());
  }, []);

  return (
    <GameViewport>
      <TopHud />
      <StatGroup />
      {/* Center stage: card is the protagonist, vertically centered between HUD and inventory. */}
      <div className="my-auto flex flex-1 flex-col items-center justify-center py-3">
        <CardDeck />
      </div>
      <InventoryBar />
    </GameViewport>
  );
}
