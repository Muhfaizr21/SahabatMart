import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

const MemberCard = ({ user, profile }) => {
  if (!user) return null;

  return (
    <div className="relative w-full max-w-[440px] group flex justify-center mx-auto">
      <div 
        className="relative w-full h-[280px] rounded-[2rem] p-9 text-white border border-gray-100 overflow-hidden bg-[#0f172a] shadow-2xl shadow-indigo-500/20"
      >
        {/* Subtle Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e293b] to-[#0f172a]"></div>
        
        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

        <div className="relative h-full flex flex-col justify-between z-10">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <i className="bx bxs-crown text-2xl text-white"></i>
                </div>
                <div className="flex flex-col">
                  <span className="font-black tracking-tighter text-2xl bg-gradient-to-r from-white via-white to-amber-200 bg-clip-text text-transparent">AKUGLOW</span>
                  <span className="text-[8px] font-black text-amber-500 uppercase tracking-[0.3em] leading-none">Premium Experience</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-2 rounded-2xl shadow-xl border border-white/20 transform transition-transform group-hover:scale-105">
              <QRCodeSVG 
                value={user.id} 
                size={65}
                level="H"
                fgColor="#0f172a"
                includeMargin={false}
              />
            </div>
          </div>

          <div className="mt-auto">
            <div className="mb-4">
              <h4 className="text-xl font-black tracking-tight leading-none text-white truncate">{profile?.full_name || 'LOYAL MEMBER'}</h4>
              <div className="flex items-center gap-2 mt-1.5">
                 <div className="h-[2px] w-6 bg-amber-500 rounded-full"></div>
                 <p className="text-[8px] font-bold text-white/40 tracking-widest uppercase">ID: {user.id?.substring(0, 18).toUpperCase()}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between border-t border-white/10 pt-4">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">Status Membership</span>
                <div className="flex items-center gap-1.5">
                  <i className="bx bxs-check-shield text-amber-400 text-sm"></i>
                  <span className="text-lg font-black text-white">ACTIVE MEMBER</span>
                </div>
              </div>
              
              <div className="px-3 py-1 bg-white/5 backdrop-blur-md rounded-full border border-white/10">
                 <span className="text-[8px] font-black text-white/80 uppercase tracking-widest">Platinum</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card Shine Effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
      </div>
    </div>
  );
};

export default MemberCard;
