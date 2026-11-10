'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { CHAPTER1_ALL } from '@/data/cards/chapter1Extra';
import SwipeableCard from './SwipeableCard';
import GameOverModal from '../modals/GameOverModal';
import EmergencyRevivalModal from '../modals/EmergencyRevivalModal';
import VictoryModal from '../modals/VictoryModal';
import DeathGalleryModal from '../modals/DeathGalleryModal';
import ScrapbookModal from '../modals/ScrapbookModal';
import VoucherWalletModal from '../modals/VoucherWalletModal';
import MemoryUnlockModal from '../modals/MemoryUnlockModal';

/**
 * Renders the current card (with exit/enter transitions) and the reaction
 * toast. Handles the store's draw lifecycle against the deck.
 */
export default function CardDeck() {
  const currentCard = useGameStore((s) => s.currentCard);
  const lastReaction = useGameStore((s) => s.lastReaction);

  // Whenever the card is cleared (after a choice or slot switch) and the run
  // is still alive, draw a fresh one.
  useEffect(() => {
    if (!currentCard && !useGameStore.getState().isGameOver) {
      useGameStore.getState().drawNextCard(CHAPTER1_ALL);
    }
  }, [currentCard]);

  // The reaction bubble is a moment of feedback: fade it out on its own.
  useEffect(() => {
    if (!lastReaction) return;
    const t = window.setTimeout(() => {
      useGameStore.setState({ lastReaction: null });
    }, 2200);
    return () => window.clearTimeout(t);
  }, [lastReaction]);

  return (
    <div className="mx-auto flex w-[92%] max-w-[380px] flex-col items-center gap-3">
      {/* Narrative reaction pops as a speech bubble above the card — it belongs
          to the stage, not floating down by the inventory bar. */}
      <AnimatePresence>
        {lastReaction && (
          <motion.div
            key={lastReaction}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="relative w-full rounded-2xl bg-[#4a3f35] px-4 py-3 text-center text-sm text-[#fdfbf7] shadow-md"
            aria-live="polite"
          >
            {lastReaction}
            {/* Bubble tail */}
            <span
              aria-hidden
              className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-[#4a3f35]"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {currentCard ? (
          <SwipeableCard key={currentCard.id} card={currentCard} />
        ) : (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-3xl border border-dashed border-[#e3d9c9] bg-white/60 p-8 text-center text-sm text-[#4a3f35]/60"
          >
            Đang chọn thẻ tiếp theo…
          </motion.div>
        )}
      </AnimatePresence>

      <GameOverModal />
      <EmergencyRevivalModal />
      <VictoryModal />
      <DeathGalleryModal />
      <ScrapbookModal />
      <VoucherWalletModal />
      {/* The unlock popup stacks above the scrapbook so dismissing it can open the album. */}
      <MemoryUnlockModal />
    </div>
  );
}
