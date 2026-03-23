/** Main menu — start screen with New Game and optional Continue buttons */

interface MainMenuProps {
  onNewGame: () => void;
  onContinue?: () => void;
}

export function MainMenu({ onNewGame, onContinue }: MainMenuProps) {
  return (
    <div style={{
      position: 'relative',
      width: '960px',
      height: '540px',
      margin: '0 auto',
      overflow: 'hidden',
      fontFamily: 'monospace',
    }}>
      {/* Background */}
      <img
        src="/assets/sprites/menu_bg.png"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        alt=""
      />

      {/* Dark vignette overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Title image — top quarter, above the central door element */}
      <img
        src="/assets/sprites/menu_title.png"
        style={{
          position: 'absolute',
          top: '36px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '380px',
          mixBlendMode: 'screen',
        }}
        alt="BUNKER OPERATOR"
      />

      {/* Tagline — dark strip keeps it legible over any background */}
      <div style={{
        position: 'absolute',
        top: '128px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#6a5a3a',
        fontSize: '10px',
        letterSpacing: '5px',
        whiteSpace: 'nowrap',
        padding: '4px 16px',
        backgroundColor: 'rgba(0,0,0,0.6)',
      }}>
        TRUST IS A SIGNAL
      </div>

      {/* Buttons — lower third, below the central door */}
      <div style={{
        position: 'absolute',
        top: '358px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '14px',
      }}>
        {onContinue && (
          <MenuButton onClick={onContinue}>
            CONTINUE OPERATION
          </MenuButton>
        )}
        <MenuButton onClick={onNewGame}>
          NEW OPERATION
        </MenuButton>
        {onContinue && (
          <div style={{ fontSize: '10px', color: '#4a3a2a', letterSpacing: '1px', marginTop: '4px' }}>
            NEW OPERATION WILL ERASE SAVED PROGRESS
          </div>
        )}
      </div>

      {/* Bottom classification line */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#3a2a1a',
        fontSize: '9px',
        letterSpacing: '3px',
        whiteSpace: 'nowrap',
      }}>
        CLASSIFIED — AUTHORIZED PERSONNEL ONLY
      </div>
    </div>
  );
}

function MenuButton({ onClick, children }: { onClick: () => void; color?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={(e) => {
        (e.currentTarget.querySelector('img') as HTMLImageElement).src = '/assets/sprites/btn_hover.png';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget.querySelector('img') as HTMLImageElement).src = '/assets/sprites/btn_normal.png';
      }}
      style={{
        position: 'relative',
        width: '220px',
        height: '48px',
        padding: 0,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      <img
        src="/assets/sprites/btn_normal.png"
        alt=""
        style={{ position: 'absolute', top: 0, left: 0, width: '220px', height: '48px', display: 'block' }}
      />
      <span style={{
        position: 'absolute',
        top: 0, left: 0,
        width: '100%', height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        fontSize: '11px',
        fontWeight: 'bold',
        letterSpacing: '3px',
        color: '#c8b98a',
        pointerEvents: 'none',
      }}>
        {children}
      </span>
    </button>
  );
}
