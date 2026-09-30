// Original vector scenery, drawn in code for Triseal. No external assets.
// Low-contrast architecture stays behind the open, softly lit combat area.
export function renderBattleScenery(encounterId) {
  const boss = encounterId === "boss";
  const palette = boss
    ? { sky: "#19232e", water: "#353741", haze: "#797174", light: "#c9b8a7", ruin: "#202a34", edge: "#7c777a", floor: "#263039" }
    : encounterId === "rift"
      ? { sky: "#112630", water: "#283e4a", haze: "#5a7683", light: "#a9c2cb", ruin: "#1c303b", edge: "#617986", floor: "#21333e" }
      : encounterId === "quiet"
        ? { sky: "#112830", water: "#2b4145", haze: "#657f7b", light: "#b4cec0", ruin: "#1b3238", edge: "#68827d", floor: "#20353a" }
        : { sky: "#102730", water: "#284247", haze: "#5c827e", light: "#b0d3c5", ruin: "#193139", edge: "#60817e", floor: "#20373d" };

  return `<svg class="world-scenery${boss ? " world-scenery-boss" : ""}" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="world-depth" x2="0" y2="1">
        <stop stop-color="${palette.sky}"/><stop offset=".48" stop-color="${palette.water}"/><stop offset="1" stop-color="#0c2029"/>
      </linearGradient>
      <radialGradient id="world-water-glow" cx=".51" cy=".43" r=".65">
        <stop stop-color="${palette.haze}" stop-opacity=".18"/><stop offset="1" stop-color="${palette.haze}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="world-beam" x1="0" y1="0" x2=".15" y2="1">
        <stop stop-color="${palette.light}" stop-opacity=".055"/><stop offset=".72" stop-color="${palette.light}" stop-opacity=".01"/><stop offset="1" stop-color="${palette.light}" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="world-floor" x2="0" y2="1">
        <stop stop-color="${palette.floor}"/><stop offset=".6" stop-color="#142831"/><stop offset="1" stop-color="#0b1c25"/>
      </linearGradient>
      <linearGradient id="world-floor-haze" x2="0" y2="1">
        <stop stop-color="${palette.water}" stop-opacity="0"/><stop offset=".35" stop-color="${palette.water}" stop-opacity=".5"/><stop offset="1" stop-color="${palette.water}" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="world-vignette" x2="0" y2="1">
        <stop stop-color="#091c25" stop-opacity=".16"/><stop offset=".24" stop-color="#091c25" stop-opacity="0"/><stop offset=".68" stop-color="#091c25" stop-opacity="0"/><stop offset="1" stop-color="#091820" stop-opacity=".38"/>
      </linearGradient>
    </defs>

    <path fill="url(#world-depth)" d="M0 0h1600v900H0Z"/>

    <!-- One distant landmark supplies depth without competing with figures. -->
    <g class="world-observatory" fill="${palette.ruin}" opacity=".48">
      <path d="M633 518V329h349v189ZM661 329c3-115 67-190 146-190 82 0 147 75 149 190Z"/>
      <path d="M607 506h401v21H607Z"/>
      <g fill="none" stroke="${palette.edge}" stroke-width="7" opacity=".23">
        <path d="M670 328c5-109 67-176 137-176 72 0 132 67 139 176"/>
        <path d="M807 152c-32 43-49 102-47 174m48-174c33 43 49 102 47 174M655 330h307"/>
      </g>
      <path d="M757 512v-99c0-29 21-51 50-51s50 22 50 51v99Z" fill="${palette.water}" opacity=".48"/>
      <path d="M681 504V382h29v122Zm225 0V382h29v122Z" fill="${palette.water}" opacity=".21"/>
    </g>

    <!-- Broad shapes at the edges suggest the surrounding drowned chamber. -->
    <g class="world-ruins" fill="${palette.ruin}" opacity=".56">
      <path d="M0 0h343c-38 42-96 64-144 100-55 44-77 96-79 173v288H0Z"/>
      <path d="M1600 0h-309c32 35 86 59 131 94 49 39 70 100 70 174v292h108Z"/>
      <path d="M143 212h48v311h-48Zm1259-3h45v315h-45Z" opacity=".45"/>
    </g>
    <g fill="none" stroke="${palette.edge}" opacity=".07" stroke-width="6">
      <path d="M145 243c8-118 53-169 142-216m1173 213c-7-117-48-170-124-213"/>
    </g>

    <path fill="url(#world-water-glow)" d="M0 0h1600v900H0Z"/>
    <g class="world-light-shafts" fill="url(#world-beam)">
      <path d="m658-30 119 6-167 611-262 38Z"/>
      <path d="m991-28 72 14 149 570-143 16Z"/>
    </g>

    <!-- Unmarked ground keeps health, intent, cards, and effects easy to read. -->
    <path d="M0 552c272-9 399 9 635-2 233-10 413-5 965 5v345H0Z" fill="url(#world-floor)"/>
    <path d="M0 493h1600v134H0Z" fill="url(#world-floor-haze)"/>
    <path d="M0 653c61-7 95 13 138 32 33 15 58 44 81 67l21 148H0Zm1600-1c-66 8-99 39-130 62-24 18-49 52-67 75l-12 111h209Z" fill="#10252d" opacity=".52"/>

    <g class="world-motes" fill="${palette.light}" opacity=".11">
      <circle cx="403" cy="183" r="1.5"/><circle cx="631" cy="109" r="1.4"/><circle cx="1085" cy="163" r="1.5"/><circle cx="1250" cy="276" r="1.3"/>
    </g>
    <path fill="url(#world-vignette)" d="M0 0h1600v900H0Z"/>
  </svg>`;
}
