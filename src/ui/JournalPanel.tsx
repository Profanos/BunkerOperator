/** Journal — full-screen tool view positioned over panel_journal.png art.
 *  Content window: P9(23,99) → P12(936,493). Tabs: y≈57-79, x≈9-556. */

import { useEffect, useRef, useState } from 'react';
import { StateManager } from '../shared/StateManager.ts';
import type { JournalEntry } from '../shared/types.ts';

type Tab = 'ALL' | 'SCANS' | 'COMMS' | 'INTEL';

const TABS: Tab[] = ['ALL', 'SCANS', 'COMMS', 'INTEL'];

const TAB_LABELS: Record<Tab, string> = {
  ALL:   'ALL ENTRIES',
  SCANS: 'SCANS',
  COMMS: 'COMMS',
  INTEL: 'INTEL',
};

function categorise(entry: JournalEntry): Exclude<Tab, 'ALL'> {
  if (entry.key.startsWith('radar:')) return 'SCANS';
  if (entry.key.startsWith('radio:')) return 'COMMS';
  return 'INTEL';
}

const TAB_COLOR: Record<Tab, string> = {
  ALL:   '#6a9fb5',
  SCANS: '#4aaa6a',
  COMMS: '#c89b3c',
  INTEL: '#9a6ab5',
};

// Tab click zones — full width overlay over art tab areas
const TAB_X: Record<Tab, number> = {
  ALL:   9,
  SCANS: 147,
  COMMS: 287,
  INTEL: 428,
};
const TAB_WIDTH = 138;

// Count badge position — right after each art text label (P13/P15/P17/P20)
const TAB_COUNT_X: Record<Tab, number> = {
  ALL:   93,
  SCANS: 240,
  COMMS: 381,
  INTEL: 514,
};
const TAB_COUNT_Y = 71;

export function JournalPanel() {
  const [entries, setEntries] = useState<JournalEntry[]>(StateManager.getState().journal);
  const [activeTab, setActiveTab] = useState<Tab>('ALL');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = StateManager.subscribe((state) => setEntries(state.journal));
    return unsub;
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [activeTab]);

  const visible = [...entries]
    .reverse()
    .filter((e) => activeTab === 'ALL' || categorise(e) === activeTab);

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0,
      width: '960px', height: '540px',
      backgroundImage: 'url(/assets/sprites/panel_journal.png)',
      backgroundSize: '960px 540px',
      backgroundColor: '#0a0a14',
      fontFamily: 'monospace',
      zIndex: 20,
    }}>

      {/* Tab click zones — invisible overlays, art provides the labels */}
      {TABS.map((tab) => {
        const active = tab === activeTab;
        return (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              position: 'absolute',
              left: TAB_X[tab],
              top: 57,
              width: TAB_WIDTH,
              height: 42,
              cursor: 'pointer',
              border: 'none',
              borderBottom: active ? `2px solid ${TAB_COLOR[tab]}` : '2px solid transparent',
              backgroundColor: active ? `${TAB_COLOR[tab]}15` : 'transparent',
            }}
          />
        );
      })}

      {/* Count badges — positioned right after each art tab label */}
      {TABS.map((tab) => {
        const count = tab === 'ALL'
          ? entries.length
          : entries.filter((e) => categorise(e) === tab).length;
        const active = tab === activeTab;
        return (
          <div
            key={`count-${tab}`}
            style={{
              position: 'absolute',
              left: TAB_COUNT_X[tab],
              top: TAB_COUNT_Y,
              fontSize: '9px',
              fontFamily: 'monospace',
              color: active ? TAB_COLOR[tab] : '#3a3a5e',
              pointerEvents: 'none',
              transform: 'translateY(-50%)',
            }}
          >
            {count}
          </div>
        );
      })}

      {/* Entry count — top right of content window */}
      <div style={{
        position: 'absolute',
        top: 62,
        right: 28,
        fontSize: '10px',
        letterSpacing: '1px',
        color: '#3a3a5e',
        pointerEvents: 'none',
      }}>
        {visible.length} / {entries.length}
      </div>

      {/* Scrollable entry list — within content window P9(23,99)→P12(936,493) */}
      <div ref={scrollRef} style={{
        position: 'absolute',
        top: 99,
        left: 23,
        right: 24,   // 960 - 936
        bottom: 47,  // 540 - 493
        overflowY: 'auto',
        padding: '10px 14px',
        color: '#b0b0c8',
        fontSize: '12px',
      }}>
        {visible.length === 0 ? (
          <div style={{ color: '#3a3a5e', fontStyle: 'italic', marginTop: '20px' }}>
            No entries in this category.
          </div>
        ) : (
          visible.map((entry, i) => (
            <div key={i} style={{
              marginBottom: '10px',
              paddingBottom: '10px',
              borderBottom: '1px solid #1a1a2e',
              lineHeight: '1.5',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                <span style={{
                  fontSize: '9px',
                  letterSpacing: '1px',
                  color: TAB_COLOR[categorise(entry)],
                  opacity: 0.7,
                }}>
                  {categorise(entry)}
                </span>
                <span style={{ color: '#4a6a8e', fontSize: '10px' }}>
                  DAY {entry.day} — {entry.timeStr}
                </span>
              </div>
              <span style={{ color: '#8a8aae' }}>{entry.text}</span>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
