import React from 'react'
import styles from './SceneArt.module.css'

interface Props {
  locationName: string
}

export default function SceneArt({ locationName }: Props) {
  return (
    <div className={styles.scenePanel}>
      <div className={styles.sceneArt}>
        <svg viewBox="0 0 295 600" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="mGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4a6aaa" stopOpacity="0.18"/>
              <stop offset="100%" stopColor="#1a2a4a" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="mCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#c8dcf0" stopOpacity="0.12"/>
              <stop offset="100%" stopColor="#6090c0" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="wGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3a5a8a" stopOpacity="0.22"/>
              <stop offset="100%" stopColor="#1a2a4a" stopOpacity="0"/>
            </radialGradient>
          </defs>

          {/* void sky */}
          <rect width="295" height="600" fill="#000000"/>

          {/* moon halo large */}
          <circle cx="218" cy="72" r="60" fill="url(#mGlow)" className={styles.moonGlow}/>
          <circle cx="218" cy="72" r="36" fill="url(#mCore)" className={styles.moonGlow}/>
          {/* moon body */}
          <circle cx="218" cy="72" r="28" fill="#0a0e14"/>
          <circle cx="226" cy="66" r="24" fill="#000000"/>
          <circle cx="218" cy="72" r="27" fill="none" stroke="#1e2e48" strokeWidth="0.8"/>

          {/* stars */}
          <circle cx="22"  cy="24"  r="0.8" fill="#2a3e5a" opacity="0.9"/>
          <circle cx="58"  cy="14"  r="0.7" fill="#2a3e5a" opacity="0.7"/>
          <circle cx="94"  cy="38"  r="0.9" fill="#3a5070"/>
          <circle cx="132" cy="19"  r="0.7" fill="#2a3e5a" opacity="0.6"/>
          <circle cx="52"  cy="52"  r="0.8" fill="#2a3e5a" opacity="0.8"/>
          <circle cx="170" cy="30"  r="0.7" fill="#2a3e5a" opacity="0.5"/>
          <circle cx="248" cy="108" r="0.8" fill="#2a3e5a" opacity="0.7"/>
          <circle cx="16"  cy="78"  r="0.7" fill="#2a3e5a" opacity="0.6"/>
          <circle cx="78"  cy="92"  r="0.6" fill="#2a3e5a" opacity="0.5"/>
          <circle cx="268" cy="46"  r="0.7" fill="#2a3e5a" opacity="0.4"/>
          <circle cx="142" cy="60"  r="0.6" fill="#2a3e5a" opacity="0.6"/>
          <circle cx="186" cy="50"  r="0.7" fill="#3a5070" opacity="0.7"/>

          {/* treeline far */}
          <path d="M0 248 Q12 224 26 238 Q38 210 54 228 Q66 200 84 218 Q98 192 116 210 Q130 184 150 204 Q164 178 184 198 Q198 174 218 192 Q234 170 254 188 Q268 164 285 180 L295 178 L295 600 L0 600Z" fill="#04060a"/>

          {/* ground */}
          <rect x="0" y="360" width="295" height="240" fill="#030406"/>

          {/* moonlight on ground */}
          <path d="M120 600 L148 360 L172 360 L200 600Z" fill="#0a0e18" opacity="0.3"/>

          {/* road stones hint */}
          <line x1="148" y1="600" x2="155" y2="360" stroke="#0c1018" strokeWidth="1.2" opacity="0.5"/>
          <line x1="172" y1="600" x2="165" y2="360" stroke="#0c1018" strokeWidth="1"   opacity="0.4"/>

          {/* Inn building */}
          <rect x="22" y="268" width="148" height="142" fill="#060810"/>
          <rect x="22" y="268" width="148" height="142" fill="none" stroke="#101828" strokeWidth="0.8"/>

          {/* Inn roof */}
          <path d="M12 274 L96 218 L180 274Z" fill="#04060c" stroke="#101828" strokeWidth="0.8"/>
          {/* roof ridge */}
          <line x1="96" y1="218" x2="96" y2="230" stroke="#1a2840" strokeWidth="1.2"/>

          {/* chimney */}
          <rect x="120" y="210" width="11" height="30" fill="#070a10" stroke="#101828" strokeWidth="0.7"/>
          {/* smoke */}
          <path d="M125 210 Q130 200 124 190 Q119 181 125 172" stroke="#141e2e" strokeWidth="0.9" fill="none" opacity="0.6"/>

          {/* window left — blue moonlit glow */}
          <rect x="40" y="292" width="32" height="26" fill="#040608" rx="1"/>
          <rect x="42" y="294" width="28" height="22" fill="#0a1220" rx="1"/>
          <line x1="56" y1="294" x2="56" y2="316" stroke="#060a12" strokeWidth="0.8"/>
          <line x1="42" y1="305" x2="70" y2="305" stroke="#060a12" strokeWidth="0.8"/>
          <rect x="42" y="294" width="28" height="22" fill="#1a2a4a" rx="1" opacity="0.25"/>

          {/* window right */}
          <rect x="116" y="292" width="32" height="26" fill="#040608" rx="1"/>
          <rect x="118" y="294" width="28" height="22" fill="#080e1a" rx="1"/>
          <line x1="132" y1="294" x2="132" y2="316" stroke="#060a12" strokeWidth="0.8"/>
          <line x1="118" y1="305" x2="146" y2="305" stroke="#060a12" strokeWidth="0.8"/>

          {/* window glow radials */}
          <circle cx="56"  cy="305" r="26" fill="url(#wGlow)" opacity="0.6"/>
          <circle cx="132" cy="305" r="22" fill="url(#wGlow)" opacity="0.4"/>

          {/* door */}
          <path d="M80 410 L80 356 Q96 348 112 356 L112 410Z" fill="#030406" stroke="#101828" strokeWidth="0.7"/>
          <path d="M80 356 Q96 347 112 356" stroke="#1a2840" strokeWidth="0.8" fill="none"/>
          <circle cx="108" cy="384" r="1.8" fill="#1a2840"/>

          {/* hanging sign */}
          <line x1="84" y1="278" x2="84" y2="290" stroke="#101828" strokeWidth="0.8"/>
          <line x1="108" y1="278" x2="108" y2="290" stroke="#101828" strokeWidth="0.8"/>
          <rect x="80" y="286" width="32" height="10" fill="#070a10" stroke="#141e2e" strokeWidth="0.7"/>

          {/* wall torch left */}
          <rect x="40" y="335" width="3" height="14" fill="#0c1420"/>
          <ellipse cx="41" cy="333" rx="3" ry="4" fill="#1a2840" opacity="0.8"/>
          <circle cx="41" cy="333" r="10" fill="url(#wGlow)" opacity="0.7"/>

          {/* wall torch right */}
          <rect x="148" y="335" width="3" height="14" fill="#0c1420"/>
          <ellipse cx="149" cy="333" rx="3" ry="4" fill="#141e30" opacity="0.7"/>
          <circle cx="149" cy="333" r="8" fill="url(#wGlow)" opacity="0.5"/>

          {/* barrel */}
          <rect x="116" y="376" width="16" height="24" fill="#060810" stroke="#101828" strokeWidth="0.7"/>
          <ellipse cx="124" cy="376" rx="8" ry="4" fill="#08090e" stroke="#101828" strokeWidth="0.7"/>
          <line x1="116" y1="384" x2="132" y2="384" stroke="#0c1018" strokeWidth="0.6"/>
          <line x1="116" y1="392" x2="132" y2="392" stroke="#0c1018" strokeWidth="0.6"/>

          {/* second building right */}
          <rect x="202" y="300" width="82" height="100" fill="#050710"/>
          <rect x="202" y="300" width="82" height="100" fill="none" stroke="#0c1420" strokeWidth="0.7"/>
          <path d="M195 304 L243 268 L291 304Z" fill="#030408" stroke="#0c1420" strokeWidth="0.7"/>
          <rect x="218" y="320" width="22" height="18" fill="#060a14" rx="1"/>
          <rect x="220" y="322" width="18" height="14" fill="#0a1224" rx="1" opacity="0.7"/>

          {/* lone figure in street */}
          <ellipse cx="168" cy="448" rx="8" ry="22" fill="#030406"/>
          <circle  cx="168" cy="424" r="7" fill="#04060a"/>
          <path d="M160 432 Q153 448 156 464 L180 464 Q184 448 176 432 Q172 424 168 424 Q164 424 160 432Z" fill="#030406"/>

          {/* moonlight cast shadow */}
          <path d="M164 464 Q168 490 172 464" stroke="#080c14" strokeWidth="1" fill="none" opacity="0.4"/>

          {/* fog layers */}
          <g className={styles.fogLayer}>
            <path d="M-40 490 Q30 478 110 486 Q190 494 270 480 Q310 472 340 478 L340 600 L-40 600Z" fill="#030406" opacity="0.8"/>
          </g>
          <path d="M0 520 Q60 510 140 518 Q220 526 295 514 L295 600 L0 600Z" fill="#020305" opacity="0.9"/>
          <path d="M0 545 Q80 536 160 542 Q240 548 295 538 L295 600 L0 600Z" fill="#010203" opacity="0.95"/>

          {/* foreground ground detail */}
          <line x1="40"  y1="572" x2="120" y2="570" stroke="#0a0e14" strokeWidth="1" opacity="0.5"/>
          <line x1="150" y1="582" x2="240" y2="578" stroke="#0a0e14" strokeWidth="0.8" opacity="0.4"/>
        </svg>
      </div>
      <div className={styles.sceneFooter}>{locationName}</div>
    </div>
  )
}
