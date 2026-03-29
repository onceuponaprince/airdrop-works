'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { nodeUnlock } from '@/lib/animations';
import clsx from 'clsx';

interface SkillNode {
  id: string;
  branch: 'educator' | 'builder' | 'creator' | 'scout' | 'diplomat';
  name: string;
  description: string;
  row: number;
  col: number;
  xpRequired: number;
  prerequisites?: string[];
}

const SKILL_NODES: SkillNode[] = [
  { id: 'educator-1', branch: 'educator', name: 'Teaching Basics', description: 'Start creating educational content', row: 0, col: 0, xpRequired: 0 },
  { id: 'educator-2', branch: 'educator', name: 'Deep Explanations', description: 'Break down advanced concepts', row: 1, col: 0, xpRequired: 100, prerequisites: ['educator-1'] },
  { id: 'builder-1', branch: 'builder', name: 'Build Tools', description: 'Ship your first useful tool', row: 0, col: 1, xpRequired: 0 },
  { id: 'builder-2', branch: 'builder', name: 'Protocol Integrations', description: 'Integrate across ecosystems', row: 1, col: 1, xpRequired: 120, prerequisites: ['builder-1'] },
  { id: 'creator-1', branch: 'creator', name: 'Visual Storytelling', description: 'Create engaging visual content', row: 0, col: 2, xpRequired: 0 },
  { id: 'creator-2', branch: 'creator', name: 'Campaign Craft', description: 'Produce high-impact campaigns', row: 1, col: 2, xpRequired: 120, prerequisites: ['creator-1'] },
  { id: 'scout-1', branch: 'scout', name: 'Alpha Discovery', description: 'Find useful signals early', row: 0, col: 3, xpRequired: 0 },
  { id: 'scout-2', branch: 'scout', name: 'Risk Radar', description: 'Identify protocol/systemic risks', row: 1, col: 3, xpRequired: 140, prerequisites: ['scout-1'] },
  { id: 'diplomat-1', branch: 'diplomat', name: 'Community Support', description: 'Help users and moderate discussions', row: 0, col: 4, xpRequired: 0 },
  { id: 'diplomat-2', branch: 'diplomat', name: 'Conflict Resolution', description: 'Resolve disputes and coordinate action', row: 1, col: 4, xpRequired: 140, prerequisites: ['diplomat-1'] },
];

interface SkillTreeProps {
  branch?: 'educator' | 'builder' | 'creator' | 'scout' | 'diplomat';
  unlockedNodes?: string[];
  currentXp?: number;
  isUnlocking?: boolean;
  onUnlock?: (nodeId: string) => void;
}

export function SkillTree({
  branch = 'educator',
  unlockedNodes = [],
  currentXp = 0,
  isUnlocking = false,
  onUnlock,
}: SkillTreeProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const filteredNodes = useMemo(
    () => SKILL_NODES.filter((n) => n.branch === branch),
    [branch]
  );

  return (
    <div className="w-full h-full flex flex-col gap-6">
      <div className="flex-1 relative border border-[--border] rounded-lg bg-[--card]/50 overflow-hidden min-h-[340px]">
        <div className="relative w-full h-full p-12">
          {filteredNodes.map((node) => {
            const x = node.col * 180 + 20;
            const y = node.row * 150 + 40;
            const isUnlocked = unlockedNodes.includes(node.id);
            const canUnlock = (node.prerequisites ?? []).every((p) => unlockedNodes.includes(p)) && currentXp >= node.xpRequired;

            return (
              <motion.div
                key={node.id}
                className="absolute"
                style={{ left: `${x}px`, top: `${y}px` }}
                variants={nodeUnlock}
                initial="initial"
                animate={isUnlocked ? 'animate' : 'initial'}
              >
                <button
                  onClick={() => {
                    setSelectedNode(node.id);
                    if (!isUnlocked && canUnlock && onUnlock) onUnlock(node.id);
                  }}
                  disabled={isUnlocking}
                  className={clsx(
                    'w-24 h-24 rounded-full flex items-center justify-center border-2 transition-all text-center p-2',
                    isUnlocked
                      ? 'border-[--primary] bg-[--primary]/20 text-[--primary] shadow-lg shadow-[--primary]/50'
                      : canUnlock
                        ? 'border-[--secondary] bg-[--secondary]/10 text-[--foreground] hover:border-[--primary] cursor-pointer'
                        : 'border-[--border] bg-[--card] text-[--muted-foreground] opacity-60'
                  )}
                  title={node.name}
                >
                  <span className="text-[10px] font-mono leading-tight">
                    {isUnlocked ? 'UNLOCKED' : `${node.xpRequired} XP`}
                  </span>
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {selectedNode && (
        <motion.div className="border border-[--border] rounded-lg bg-[--card] p-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="font-semibold text-sm">{filteredNodes.find((n) => n.id === selectedNode)?.name}</p>
          <p className="text-sm text-[--muted-foreground] mt-1">{filteredNodes.find((n) => n.id === selectedNode)?.description}</p>
        </motion.div>
      )}
    </div>
  );
}
