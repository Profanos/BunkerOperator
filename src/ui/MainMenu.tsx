/** Main menu — start screen with New Game button */

interface MainMenuProps {
  onNewGame: () => void;
}

export function MainMenu({ onNewGame }: MainMenuProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#0a0a14',
      color: '#9ad4e8',
      fontFamily: 'monospace',
    }}>
      <h1 style={{
        fontSize: '48px',
        fontWeight: 'bold',
        marginBottom: '8px',
        letterSpacing: '4px',
        color: '#6a9fb5',
      }}>
        BUNKER OPERATOR
      </h1>
      <p style={{
        fontSize: '14px',
        color: '#4a4a6e',
        marginBottom: '60px',
      }}>
        Trust is a signal. Verify everything.
      </p>
      <button
        onClick={onNewGame}
        style={{
          padding: '12px 48px',
          fontSize: '18px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          backgroundColor: 'transparent',
          color: '#6a9fb5',
          border: '2px solid #3a3a5e',
          cursor: 'pointer',
          letterSpacing: '2px',
          transition: 'border-color 0.2s, color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#6a9fb5';
          e.currentTarget.style.color = '#9ad4e8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#3a3a5e';
          e.currentTarget.style.color = '#6a9fb5';
        }}
      >
        NEW GAME
      </button>
    </div>
  );
}
