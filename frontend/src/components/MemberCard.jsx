import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

const MemberCard = ({ user, profile, size = 'small' }) => {
  if (!user) return null;

  // Format ID to look like a credit/e-money card number (4 groups of 4 characters)
  const formatCardNumber = (id) => {
    if (!id) return '0000 0000 0000 0000';
    const cleanId = id.replace(/[^a-zA-Z0-9]/g, '').padEnd(16, '0');
    return `${cleanId.substring(0, 4)} ${cleanId.substring(4, 8)} ${cleanId.substring(8, 12)} ${cleanId.substring(12, 16)}`.toUpperCase();
  };

  const cardNumber = formatCardNumber(user.id);
  const cardHolderName = (profile?.full_name || 'LOYAL MITRA').toUpperCase();
  const tierName = (user.affiliate?.membership_tier?.name || 'Mitra').toUpperCase();

  const isLarge = size === 'large';

  return (
    <div 
      className="relative w-full group flex justify-center mx-auto select-none transition-all duration-300"
      style={{ maxWidth: isLarge ? '1063px' : '480px' }}
    >
      <div 
        className="relative w-full text-white border border-blue-400/20 overflow-hidden shadow-2xl transition-transform duration-500 hover:scale-[1.01] flex flex-col justify-between"
        style={{
          height: isLarge ? '650px' : '240px',
          borderRadius: isLarge ? '48px' : '24px',
          padding: isLarge ? '56px' : '22px',
          background: 'linear-gradient(135deg, #0b5fa8 0%, #00366f 45%, #011b3b 100%)',
          boxShadow: '0 20px 50px -10px rgba(0, 54, 111, 0.4)'
        }}
      >
        {/* --- Card Swooshes & Waves (Mandiri E-Money Style) --- */}
        <div 
          className="absolute -left-1/4 -top-1/4 w-[150%] rotate-[18deg] opacity-40 blur-2xl pointer-events-none"
          style={{
            height: isLarge ? '400px' : '150px',
            background: 'radial-gradient(ellipse at center, rgba(56, 189, 248, 0.4) 0%, transparent 70%)'
          }}
        />
        <div 
          className="absolute -right-20 -bottom-10 w-[120%] rotate-[-12deg] opacity-25 rounded-full pointer-events-none"
          style={{
            height: isLarge ? '400px' : '160px',
            borderTop: '2px solid rgba(255, 255, 255, 0.2)',
            background: 'linear-gradient(180deg, rgba(6, 182, 212, 0.1) 0%, transparent 80%)',
            filter: 'blur(4px)'
          }}
        />
        <div 
          className="absolute left-10 top-20 w-[100%] rotate-[15deg] opacity-15 pointer-events-none"
          style={{
            height: isLarge ? '300px' : '100px',
            borderTop: '1px solid rgba(255, 255, 255, 0.3)',
            filter: 'blur(2px)'
          }}
        />

        {/* --- Top Row: Branding Partners (100% AkuGlow) --- */}
        <div className="relative z-10 flex justify-between items-center">
          {/* Top-Left: AkuGlow Logo Badge */}
          <div className="bg-transparent flex items-center justify-center">
            <img 
              src="/akuglow.jpg" 
              alt="AkuGlow" 
              className="w-auto object-contain"
              style={{
                height: isLarge ? '90px' : '28px',
                mixBlendMode: 'multiply'
              }}
            />
          </div>

          {/* Top-Right: AkuGlow Signature Gold Butterfly Logo */}
          <div 
            className="flex items-center text-right rounded-full shadow-sm"
            style={{
              background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 50%, #a16207 100%)',
              padding: isLarge ? '14px 28px' : '4px 10px',
              gap: isLarge ? '12px' : '6px'
            }}
          >
            <span 
              className="font-extrabold font-sans text-amber-950"
              style={{
                fontSize: isLarge ? '18px' : '8px',
                letterSpacing: '0.05em'
              }}
            >
              Trusted Glow Partner
            </span>
            <svg 
              viewBox="0 0 24 24" 
              className="fill-amber-950 drop-shadow-[0_1px_2px_rgba(255,255,255,0.4)] animate-pulse" 
              style={{
                width: isLarge ? '28px' : '12px',
                height: isLarge ? '28px' : '12px'
              }}
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 21a1 1 0 0 1-1-1v-5.32c-1.09-.73-2.18-1.74-3.14-2.88C6.18 9.87 5 7.74 5 5.5A3.5 3.5 0 0 1 8.5 2c1.76 0 3.22 1 3.5 2.5C12.28 3 13.74 2 15.5 2A3.5 3.5 0 0 1 19 5.5c0 2.24-1.18 4.37-2.86 6.3-1 .14-2.09 1.15-3.14 2.88V20a1 1 0 0 1-1 1zM8.5 4A1.5 1.5 0 0 0 7 5.5c0 1.5 1 3.21 2.5 5 1.09-1.22 2-2.73 2-5A1.5 1.5 0 0 0 10 4zm7 0A1.5 1.5 0 0 0 14 5.5c0 2.27.91 3.78 2 5 1.5-1.79 2.5-3.5 2.5-5A1.5 1.5 0 0 0 15.5 4z"/>
            </svg>
          </div>
        </div>

        {/* --- Center: Card Type Title & Barcode/QR Code Container --- */}
        <div className="relative z-10 flex justify-between items-center py-1 md:py-2 gap-4">
          <div className="text-left flex flex-col justify-center">
            <h2 
              className="text-white font-extrabold tracking-normal font-sans drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] leading-tight"
              style={{
                fontSize: isLarge ? '76px' : '30px'
              }}
            >
              Member Card
            </h2>
            <h3 
              className="text-white font-bold tracking-normal font-sans drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] leading-tight"
              style={{
                fontSize: isLarge ? '60px' : '24px',
                opacity: 0.95
              }}
            >
              {tierName}
            </h3>
          </div>
          
          {/* Floating Premium QR Code (Barcode equivalent) */}
          <div 
            className="bg-white shadow-xl border border-white/20 transform group-hover:scale-[1.03] transition-transform duration-300 flex-shrink-0"
            style={{
              padding: isLarge ? '24px' : '8px',
              borderRadius: isLarge ? '40px' : '14px'
            }}
          >
            <div style={{ width: isLarge ? '210px' : '64px', height: isLarge ? '210px' : '64px' }}>
              <QRCodeSVG 
                value={user.id} 
                size="100%"
                level="H"
                fgColor="#00366f"
                includeMargin={false}
              />
            </div>
          </div>
        </div>

        {/* --- Bottom Row: Card Details & E-Wallet --- */}
        <div className="relative z-10 flex justify-between items-end">
          {/* Bottom-Left: NIK & Cardholder Info */}
          <div 
            className="text-left"
            style={{
              gap: isLarge ? '16px' : '4px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Card Number */}
            <p 
              className="font-mono text-white font-semibold"
              style={{
                fontSize: isLarge ? '40px' : '16px',
                letterSpacing: isLarge ? '0.24em' : '0.18em',
                textShadow: isLarge 
                  ? '1px 2px 2px rgba(0, 0, 0, 0.8), -1px -1px 0px rgba(255, 255, 255, 0.3)' 
                  : '0.5px 1px 1px rgba(0, 0, 0, 0.8), -0.5px -0.5px 0px rgba(255, 255, 255, 0.3)'
              }}
            >
              {cardNumber}
            </p>
            {/* Card Holder Name */}
            <div>
              <p 
                className="font-black text-white tracking-widest truncate"
                style={{
                  fontSize: isLarge ? '20px' : '10px',
                  maxWidth: isLarge ? '500px' : '200px'
                }}
              >
                {cardHolderName}
              </p>
              <p 
                className="font-bold tracking-wider"
                style={{
                  color: '#eab308',
                  fontSize: isLarge ? '14px' : '7.5px',
                  marginTop: isLarge ? '6px' : '2px'
                }}
              >
                {tierName || 'MITRA'} MEMBER
              </p>
            </div>
          </div>

          {/* Bottom-Right: Website Domain */}
          <div className="text-right pb-1">
            <span 
              className="font-bold tracking-widest text-white/55 font-sans uppercase"
              style={{
                fontSize: isLarge ? '20px' : '9.5px',
                letterSpacing: '0.12em',
                textShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              akuglow.com
            </span>
          </div>
        </div>

        {/* Card Shine Glare Effect on Hover */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
      </div>
    </div>
  );
};

export default MemberCard;
