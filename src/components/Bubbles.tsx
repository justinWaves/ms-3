import React from 'react';

const Bubbles: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-sky-400/20"
          style={{
            width: `${Math.random() * 10 + 3}px`,
            height: `${Math.random() * 10 + 3}px`,
            left: `${Math.random() * 100}%`,
            bottom: '-20px',
            animation: `float ${Math.random() * 6 + 8}s linear infinite`,
            animationDelay: `${Math.random() * 10}s`,
            opacity: Math.random() * 0.3 + 0.1,
          }}
        />
      ))}
    </div>
  );
};

export default Bubbles; 