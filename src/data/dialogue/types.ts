/** Dialogue tree type definitions — used by situation data files and RadioPanel */

export interface DialogueOption {
  id: string;
  text: string;
  /** ALL listed journal keys must be present for this option to be selectable */
  requiredKeys?: string[];
  /** Shown alongside the greyed option when requirements aren't met */
  hint?: string;
  /** Next node id, or null to end the conversation */
  nextNodeId: string | null;
  /** Optional journal entry to log when this option is chosen */
  journalEffect?: {
    key: string;
    text: string;
  };
}

export interface DialogueNode {
  id: string;
  npcLine: string;
  options: DialogueOption[];
}

export interface DialogueSession {
  id: string;
  /** Which radio station triggers this session */
  stationId: string;
  startNodeId: string;
  nodes: Record<string, DialogueNode>;
}

export interface MorningMessage {
  from: string;
  text: string;
  /** Journal key — prevents duplicate logging if component remounts */
  journalKey: string;
  journalText: string;
}
