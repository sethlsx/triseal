// Original vector characters drawn for Triseal. No external images or fonts.
// The containing element owns combat movement; internal groups own idle motion.
const figures = {
  hero: `
    <ellipse class="art-shadow" cx="98" cy="192" rx="52" ry="9" fill="#04161e" opacity=".65"/>
    <g class="art-body">
      <path class="art-cloth" d="M73 85C54 101 37 127 31 158L58 150 50 179 95 165 132 174 118 133Z" fill="#245257" stroke="#7cbbb0"/>
      <path d="M75 140 65 184 82 187 99 145M99 140 102 183 119 186 115 138" fill="#142c3a" stroke="#729c98"/>
      <path d="m65 181-8 11 26-1 1-8m19-3-2 11 27 1-11-12" fill="#10202e" stroke="#64928c"/>
      <path d="M77 80C67 95 59 120 60 149L84 161 98 141 119 156 124 117 110 80Z" fill="#305f60" stroke="#93c6b3"/>
      <path d="m78 89 8 45 16 12 5-55" fill="#193940" stroke="#628e86"/>
      <path d="m67 116 48 3-1 11-50-5Z" fill="#744f43" stroke="#d3a476"/>
      <path d="m86 116 8 8 8-7-8-7Z" fill="#e4ba7e" stroke="#302e2a"/>
      <path d="M110 87c15 7 19 19 24 27l16-12 5 8-23 20c-12-4-17-16-24-23" fill="#326b69" stroke="#93c6b3"/>
      <path d="M70 89c-8 6-15 16-19 28l-4 24 10 2 9-24 14-15" fill="#254e55" stroke="#7cb4a6"/>
      <path d="m46 140 10 2-1 12-10-1Z" fill="#ccb18d" stroke="#444637"/>
      <path d="m142 105 11-7 6 7-6 11-9-3Z" fill="#dcc19a" stroke="#6b6550"/>
      <g class="art-staff">
        <path d="m152 174 9-131" stroke="#d7af7b" stroke-width="5"/>
        <path d="m158 66 10 2m-11 7 10 2m-12 69 10 1" stroke="#795943" stroke-width="3"/>
        <path d="m162 19 15 18-16 20-15-20Z" fill="#163f4c" stroke="#d9c391"/>
        <path class="art-light" d="m162 25 9 12-10 13-9-13Z" fill="#bdf7de" stroke="#88d9cd"/>
        <path d="m141 36-7-1m49 4 7 2m-27-30 1-7" stroke="#99dfca" opacity=".7"/>
      </g>
      <path d="M69 80c-7-22 1-48 27-55 25 11 30 31 24 56l-21 14Z" fill="#356b69" stroke="#a1ceba"/>
      <path d="M78 68c0-15 6-25 19-31 13 9 18 21 17 36L97 84Z" fill="#112b38" stroke="#578e89"/>
      <path d="m82 64 11 2m8-1 9-3" stroke="#d7f0d2" stroke-width="2.8"/>
      <path d="m69 77 25 12 25-14-2 16-22 11-24-9Z" fill="#bb8d63" stroke="#e5bd89"/>
      <path class="art-cloth art-scarf" d="M75 83c-15 3-33 2-50-9l8 14-13 3c20 13 37 10 59 4" fill="#b78c65" stroke="#dbb782"/>
      <path d="m73 106-12 42m48-43 8 37m-39-7 5 14" stroke="#94b8a2" opacity=".5"/>
      <path d="m111 133 14 5-5 24-14-4Z" fill="#5a423c" stroke="#b98b62"/>
      <path d="m112 137 11 3" stroke="#dbc097"/>
    </g>`,
  driftling: `
    <ellipse class="art-shadow" cx="101" cy="181" rx="46" ry="8" fill="#031822" opacity=".5"/>
    <g class="art-body art-float">
      <g class="art-tendrils" fill="none" stroke="#6cb7ac" stroke-width="4">
        <path d="M68 112c-11 17 6 22-4 39s-22 7-28 22"/>
        <path d="M88 123c2 12 16 17 3 30s-1 20 8 20"/>
        <path d="M113 122c-10 21 17 21 14 39"/>
        <path d="M131 111c15 19 0 29 16 43"/>
      </g>
      <path d="M43 104c4-31 19-54 57-58 34 5 54 24 61 54l-20 12-18-5-21 14-21-13-21 7Z" fill="#396e72" stroke="#adddca"/>
      <path d="M61 96c10-26 22-36 39-41 22 5 32 17 44 40l-24-6-20 13-17-14Z" fill="#579b93" stroke="#8ac6b3"/>
      <path d="M82 77c12-10 25-9 36 0" fill="none" stroke="#d3e2bb"/>
      <path d="m76 59-7-15 20 7m26-1 17-13-3 21" fill="#285158" stroke="#84c5b5"/>
      <path d="M69 98q10 13 20 1m22 1q9 13 20-2" fill="none" stroke="#15313b" stroke-width="5"/>
      <path class="art-light" d="m91 95 9 15 9-15-9-9Z" fill="#d6f7dc" stroke="#aff0ce"/>
      <path d="m46 90-10-3m122-3 13-8m-20 45 10 4" stroke="#8bb5a9" opacity=".6"/>
    </g>`,
  brineback: `
    <ellipse class="art-shadow" cx="103" cy="181" rx="65" ry="9" fill="#041721" opacity=".65"/>
    <g class="art-body art-heavy">
      <path d="m47 141-20 20 9 14 17-13 21-7m62-7 20 30 19-2-6-11-13-25" fill="#527c76" stroke="#a3b8a0"/>
      <path d="m62 150-7 27 22 1 4-20m32-1 7 23 21-4-13-25" fill="#365a5c" stroke="#94b3a0"/>
      <path d="M33 142c7-47 27-73 69-78 38 6 57 34 61 78l-28 16-47 5-34-8Z" fill="#957b57" stroke="#e1c095"/>
      <path d="m43 134 18-33 24-18 20-6 25 12 19 28 5 22-27 13-40 4-30-10Z" fill="#6b725d" stroke="#c1aa7b"/>
      <path d="m61 101 32 10-9 29-27 6m36-35 21-21 21 29-10 25-41-4m-41-6 16-5m66 15 21-10" fill="none" stroke="#dfbd85" stroke-width="3"/>
      <path d="m60 93 3-26 14 16m12-13 15-23 7 24m19 9 21-10-7 26" fill="#c4a77a" stroke="#ebd09d"/>
      <path d="M39 134c-18-3-24 4-24 17l10 13 29-6 8-17Z" fill="#729a87" stroke="#c4cbaa"/>
      <path d="m19 143 15-1-4 9-10-1Z" fill="#14323b" stroke="none"/>
      <path class="art-light" d="m20 143 11-1-3 4-7 1Z" fill="#e6e8b6" stroke="none"/>
      <path d="m15 153 19 4m-7 4 3 7 6-9" stroke="#d0bd94"/>
      <path d="m158 139 23 2-12 12-14-2" fill="#567b73" stroke="#b7b992"/>
    </g>`,
  mirrorfin: `
    <ellipse class="art-shadow" cx="99" cy="183" rx="56" ry="7" fill="#031722" opacity=".5"/>
    <g class="art-body art-float">
      <path class="art-fin" d="m110 95 53-48-7 47 27 9-43 27-21 22Z" fill="#546985" stroke="#b8c8e2"/>
      <path class="art-fin" d="m92 88-15-46-27 25 2 36-26 19 44 22 37-15Z" fill="#537d90" stroke="#9acbd2"/>
      <path d="m34 119 63-49 49 34-47 43Z" fill="#79aeb6" stroke="#d0ecdf"/>
      <path d="m34 119 63-49-4 47 6 30Z" fill="#497984" stroke="#a1d6d3"/>
      <path d="m93 117 53-13-47 43Z" fill="#9bbcc8" stroke="#d0e7e5"/>
      <path d="m97 70 24 27 25 7" fill="none" stroke="#d2e3d5"/>
      <path d="m40 114 31-6 6 12-30 5Z" fill="#1b3d4b" stroke="none"/>
      <path class="art-light" d="m45 115 23-3 3 5-24 4Z" fill="#cefafa" stroke="none"/>
      <path d="m76 144 29 14-18 12m34-33 14 15-19 7" fill="none" stroke="#a4bdce"/>
      <path d="m18 92 10-6m123 66 10-4m-45-93 6-10" stroke="#c9d8e2" opacity=".6"/>
    </g>`,
  inkling: `
    <ellipse class="art-shadow" cx="100" cy="183" rx="58" ry="8" fill="#091324" opacity=".7"/>
    <g class="art-body art-float">
      <g class="art-tendrils" fill="#594e79" stroke="#ab94c5">
        <path d="M69 115c-7 29-31 18-32 39 0 14 17 18 23 5-10 5-16-3-8-8 24-1 31-16 36-29Z"/>
        <path d="M107 121c8 22-8 25-5 42 5 19 31 16 32-2-10 11-20 6-15-4 13-21 5-30-1-39Z"/>
        <path d="M130 108c10 16 35 9 38 28 2 12-7 23-20 16 16-5 10-19-1-18-18 0-25-9-30-14Z"/>
        <path d="M89 122c-9 25 8 31-7 53-7 6-16 4-16-4 17 1 12-15 7-23l1-28Z"/>
      </g>
      <path d="M54 106c-1-26 9-52 42-65 28 7 49 28 53 55l-21 24-38 16-30-12Z" fill="#6b5b8f" stroke="#c5b2de"/>
      <path d="M68 89c10-24 29-35 29-35 21 11 34 26 40 42l-24-12-21 15Z" fill="#9383b0" stroke="#bfb0d3"/>
      <path d="m63 105 22 5 18-8 20 2 14-9-7 25-43 8-23-10Z" fill="#24344d" stroke="#887ea6"/>
      <path class="art-light" d="m74 108 10 3 3 6-12-2m34-7 11-1-3 8-11 2" fill="#e6c9f2" stroke="none"/>
      <circle cx="49" cy="74" r="4" fill="#9885b2" stroke="none"/>
      <circle cx="152" cy="64" r="3" fill="#af9acd" stroke="none"/>
      <circle cx="166" cy="95" r="2" fill="#af9acd" stroke="none"/>
    </g>`,
  bellwether: `
    <ellipse class="art-shadow" cx="100" cy="184" rx="48" ry="8" fill="#061824" opacity=".65"/>
    <g class="art-body art-float">
      <path class="art-tendrils" d="M73 128c-17 19-7 35-24 47m49-40c-7 16 17 27 4 45m28-50c21 14 10 27 29 34" fill="none" stroke="#c69876" stroke-width="4"/>
      <path d="m95 29-10 20 14 16 16-18-10-19Z" fill="#a68163" stroke="#e8c292"/>
      <path d="M63 80c1-19 14-35 37-35 25 3 37 19 38 42l14 46-52 16-51-16Z" fill="#826953" stroke="#dfb587"/>
      <path d="M75 75c3-12 12-20 25-21 16 2 22 12 24 24l11 44-35 10-34-11Z" fill="#bc9368" stroke="#e4c291"/>
      <path d="m87 58-7 57m31-56 10 56" stroke="#f0c995" opacity=".6"/>
      <path d="m72 88 28-14 29 16-28 32Z" fill="#1b4249" stroke="#e9ca95"/>
      <path class="art-light" d="m100 82 17 10-16 19-17-20Z" fill="#e4d9a5" stroke="#f3e7bb"/>
      <path d="m50 126 50 14 53-15-3 14-49 17-49-17Z" fill="#795a48" stroke="#d9ad7c"/>
      <path d="M87 147v15q14 14 26-1v-15" fill="#be9973" stroke="#ead2a4"/>
      <path d="M36 84q-11 15 0 30m-11-36q-17 23 0 43m139-37q11 15 0 30m11-36q17 23 0 43" fill="none" stroke="#c3aa84" opacity=".4"/>
    </g>`,
  horizon: `
    <ellipse class="art-shadow" cx="100" cy="185" rx="77" ry="12" fill="#120e20" opacity=".7"/>
    <g class="art-body art-float">
      <g class="art-orbit" fill="none" stroke="#c99792">
        <ellipse cx="102" cy="99" rx="79" ry="28" transform="rotate(-23 102 99)"/>
        <path d="M28 66c40-39 126-27 148 26M27 125c48 48 113 35 139-10" opacity=".5"/>
      </g>
      <path d="m54 61 8-35 32 22 30-27 14 34 40 6-22 35 24 32-38 11-8 35-34-17-35 21-9-38-32-9 17-34-20-23Z" fill="#523e59" stroke="#ad817f"/>
      <path d="m66 58 30 7 30-12 9 26 24 14-12 28-18 11-6 25-27-14-28 15-9-33-15-21Z" fill="#885d6d" stroke="#d3a094"/>
      <path d="m69 75 29 4 26-9 12 24-7 29-29 12-29-12-10-25Z" fill="#192f42" stroke="#d4a897"/>
      <path d="M54 104c24-24 66-34 98-11-22 35-65 44-98 11Z" fill="#ead4b5" stroke="#fae2ba"/>
      <path d="M89 86c-11 18-8 34 6 39 21-4 27-22 14-41" fill="#5b465e" stroke="#956e7a"/>
      <path class="art-light" d="m98 87 5 18-5 17-5-17Z" fill="#fff0c7" stroke="#f3d89f"/>
      <path d="m56 69 14 14m65-15-10 15m-59 45 13-9m48 6 13 12" stroke="#e4bca0"/>
      <path class="art-tendrils" d="M66 148c-13 7-33 4-40 21m101-17c20-9 21 21 44 19" fill="none" stroke="#b0868a" stroke-width="4"/>
      <circle cx="31" cy="44" r="3" fill="#d6b4a2" stroke="none"/>
      <path d="m166 149 7 7-7 7-7-7Z" fill="#ceaa9f" stroke="none"/>
    </g>`,
};

export function renderCombatant(kind) {
  const name = Object.hasOwn(figures, kind) ? kind : "driftling";
  return `<svg class="combat-portrait art-${name}" viewBox="0 0 200 210" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" aria-hidden="true" focusable="false">${figures[name]}</svg>`;
}
