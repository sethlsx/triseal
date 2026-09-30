// Original vector scenery, drawn in code for Triseal. No external assets.
// Keep scenery below combatants and disable pointer events on .world-scenery.
export function renderBattleScenery(encounterId) {
  const boss = encounterId === "boss";
  const rift = encounterId === "rift";
  const palette = boss
    ? { sky: "#171c30", water: "#323042", light: "#ccae96", haze: "#645461", glow: "#c18f78", stone: "#2a303b", edge: "#7e6d69" }
    : rift
      ? { sky: "#0d2131", water: "#244052", light: "#a7bccf", haze: "#3d6673", glow: "#8fb5c6", stone: "#1a3540", edge: "#557987" }
      : { sky: "#0c242e", water: "#214a50", light: "#b0ddc9", haze: "#477e7b", glow: "#85bfaa", stone: "#1b3b40", edge: "#638883" };
  return `<svg class="world-scenery${boss ? " world-scenery-boss" : ""}" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="world-depth" x2="0" y2="1">
        <stop stop-color="${palette.sky}"/><stop offset=".54" stop-color="${palette.water}"/><stop offset="1" stop-color="#06171f"/>
      </linearGradient>
      <linearGradient id="world-beam" x1="0" y1="0" x2=".2" y2="1">
        <stop stop-color="${palette.light}" stop-opacity=".15"/><stop offset=".72" stop-color="${palette.light}" stop-opacity=".025"/><stop offset="1" stop-color="${palette.light}" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="world-floor" x2=".2" y2="1">
        <stop stop-color="${palette.stone}"/><stop offset="1" stop-color="#081b23"/>
      </linearGradient>
      <radialGradient id="world-water-glow" cx=".55" cy=".26" r=".7">
        <stop stop-color="${palette.haze}" stop-opacity=".28"/><stop offset="1" stop-color="${palette.haze}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="world-vignette" x2="0" y2="1">
        <stop stop-color="#03141d" stop-opacity=".43"/><stop offset=".28" stop-color="#03141d" stop-opacity="0"/><stop offset=".64" stop-color="#03141d" stop-opacity="0"/><stop offset="1" stop-color="#03141d" stop-opacity=".76"/>
      </linearGradient>
      <linearGradient id="world-column" x1="0" y1="0" x2="1" y2=".1">
        <stop stop-color="#102830"/><stop offset=".6" stop-color="${palette.stone}"/><stop offset="1" stop-color="#112830"/>
      </linearGradient>
    </defs>

    <path fill="url(#world-depth)" d="M0 0h1600v900H0Z"/>
    <path fill="url(#world-water-glow)" d="M0 0h1600v900H0Z"/>

    <!-- Far city: its broken towers are silhouettes in the water. -->
    <g fill="${palette.sky}" opacity=".48">
      <path d="m175 481 17-103 36-13 24 16 8 111 21-4 12-170 39-19 26 9 15 191 25 4 6-96 31-26 38 18 8 118Z"/>
      <path d="m1133 490 12-171 32-26 38 11 7 180 19-3 8-113 27-17 42 6 15 140 18-2 9-213 35-13 25 10 19 205Z"/>
      <path d="m458 474 19-118 26-11 23 16 9 119m476-1 13-138 38-23 25 18 5 151"/>
    </g>
    <g fill="none" stroke="${palette.edge}" opacity=".12" stroke-width="2">
      <path d="m306 328 5 127m22-140 8 141m812-130-1 147m29-161 6 143m179-165 7 158"/>
    </g>

    <!-- A distant observatory with an open, fractured armillary dome. -->
    <g class="world-observatory" opacity=".53">
      <path d="M603 489V355l29-16 8-48 45-4 11-30 141-9 103 17 42 52 44 19 17 161Z" fill="${palette.sky}"/>
      <g fill="none" stroke="${palette.edge}">
        <path d="M657 303c8-129 97-192 190-177 87 15 148 98 142 182" stroke-width="14" opacity=".6"/>
        <path d="M685 293c8-112 76-156 151-145 70 10 119 73 124 145" stroke-width="3" opacity=".5"/>
        <path d="M806 133c-45 42-66 94-57 152m90-155c49 51 73 98 69 155" stroke-width="7" opacity=".7"/>
        <path d="m649 304 349-4m-360 31 378 3" stroke-width="12"/>
        <path d="m664 307 7 28m46-30 2 31m42-33 1 31m111-32-3 34m42-32 1 33m44-31-2 33m-227 10-5 113m66-114 1 112m164-111 6 113m62-117 6 120" stroke-width="8" opacity=".6"/>
        <path d="M723 477v-55c0-39 29-69 64-70 39-2 64 31 64 70v58" stroke-width="6" opacity=".55"/>
      </g>
      <path d="m743 111 29 4 7 24-24-4m101-17 15-9 17 27-25-5m113 106 18 8-5 32-23-11" fill="${palette.water}"/>
      <g transform="translate(806 283)" fill="none" stroke="${palette.glow}" opacity=".8">
        <ellipse rx="72" ry="23" transform="rotate(-31)" stroke-width="3"/>
        <ellipse rx="53" ry="67" transform="rotate(21)" stroke-width="2"/>
        <circle r="44" stroke-width="1.5"/><path d="M-86 0H87M0-77v151" opacity=".4"/>
        <path d="m0-14 10 14-10 15L-10 0Z" fill="${palette.glow}" stroke="none"/>
      </g>
      <path d="m593 481 434-1 11 15-458 9Zm-34 23 507-5 25 25-566 7Z" fill="${palette.stone}"/>
      <path d="m596 484 424-1m-454 26 491-5" stroke="${palette.edge}" opacity=".45" fill="none"/>
    </g>

    <g class="world-light-shafts" fill="url(#world-beam)">
      <path d="m688-40 74 7-284 660-268 100Z"/>
      <path d="m791-31 31 4-137 566-72 86Z"/>
      <path d="m943-43 98 21 245 666-183-24Z"/>
      <path d="m878-30 13 2 26 553-54-4Z"/>
    </g>

    <!-- Near architecture frames the world; the center remains open. -->
    <g class="world-ruins">
      <path d="M0 0h444l-37 51-62 12-19 52-52 13-55 107-13 225-30 26-7 103L0 617Z" fill="#102831"/>
      <path d="M0 0h405l-11 30-72 15-14 39-69 32-52 105-17 252-42 17 1 101-86 20L0 591Z" fill="#09212a"/>
      <path d="M23 0h165v68l-18 15 11 95-20 16 7 103-22 36 8 143-12 122H22Z" fill="url(#world-column)"/>
      <path d="m31 79 123-1 18-14H26m8 106 128 7m-132 17 133 4m-125 110 108 17M28 481l115 3m-104-42 5-100-12-30m94-288-4 47 18 17-14 41m-24 93 16 35-18 35 11 15" fill="none" stroke="${palette.edge}" stroke-width="3" opacity=".32"/>
      <path d="m187 218 37-73 33-28 50-18 21-47 77-18m-40-11 14 25m-72 8 14 28m-74 31 16 15m-45 25 17 15m-40 32 20 10" fill="none" stroke="${palette.edge}" stroke-width="4" opacity=".2"/>
      <path d="m0 583 74-12 48 10 29-25 52 13 25 28-4 49H0Z" fill="#102a30"/>

      <path d="M1600 0h-340l24 42 55 22 21 58 74 27 33 68-7 159 29 28-5 89 30 30-9 103 95 37Z" fill="#102830"/>
      <path d="M1600 0h-299l21 21 40 20 32 59 70 26 40 85-8 173 19 26 2 151 83 43Z" fill="#0a2029"/>
      <path d="m1490 123 110 4v493l-133-28 20-37-5-86 17-32-12-143 11-23Z" fill="url(#world-column)"/>
      <path d="m1503 164 97 8m-105 104 105 3m-111 25 111 7m-110 159 110 9m-106 22 106 7m-56-274-12 30 10 45-14 23m44 83-21 19 6 48-14 20" fill="none" stroke="${palette.edge}" stroke-width="3" opacity=".25"/>
      <path d="m1282 29 51 21 23 61 71 28 33 63m-131-157-8 17m44 36-18 9m56 23-10 14m55 30-18 9" fill="none" stroke="${palette.edge}" stroke-width="4" opacity=".22"/>
    </g>

    <!-- A continuous worn stone shelf gives every figure a shared ground. -->
    <g transform="translate(0 -50)">
    <path d="m0 598 98-10 125 7 78-13 151 2 105-12 134 14 122-8 79 7 102-7 88 11 106-11 92 8 108-5 112 14v355H0Z" fill="url(#world-floor)"/>
    <path d="m0 598 98-10 125 7 78-13 151 2 105-12 134 14 122-8 79 7 102-7 88 11 106-11 92 8 108-5 112 14" stroke="${palette.edge}" opacity=".3" stroke-width="3" fill="none"/>
    <g fill="none" stroke="${palette.edge}" opacity=".18" stroke-width="2">
      <path d="m227 595-69 78 28 20-77 112m349-219 41 66-39 30 25 84m604-174-27 47 41 47-4 74m276-145-60 58 30 27-10 91"/>
      <path d="m13 665 145 8m28 20 274-11m39-30 183 12 216-13 134-12m41 47 216-4 172 25m-1352 98 302-13 131-26 128 19m535-25 141 33 292 6"/>
      <ellipse cx="800" cy="651" rx="370" ry="36"/><ellipse cx="800" cy="651" rx="332" ry="28" stroke-dasharray="39 15 6 15" opacity=".65"/>
    </g>
    <g fill="${palette.stone}" stroke="${palette.edge}" stroke-opacity=".2">
      <path d="m212 580 30-24 43 8 16 20-38 13Z"/><path d="m1152 579 27-15 40 7 20 17-60 5Z"/>
      <path d="m1372 605 28-29 59 4 30 36-67 6Z"/><path d="m99 635 39-16 36 12-4 21-64 2Z"/>
      <path d="m563 590 18-9 20 4 9 10-32 1Z"/><path d="m949 599 19-5 16 7-26 4Z"/>
    </g>

    <!-- Foreground vegetation and rubble, clear of the central hand. -->
    <g class="world-kelp" fill="none" stroke-linecap="round">
      <g stroke="#133d40" stroke-width="11">
        <path d="M20 739c38-99 79-114 63-207-6-37 19-66 11-99M70 728c-9-83 68-123 74-189 4-47-15-55-2-87M126 738c53-70 10-115 43-160 14-22 44-30 37-61"/>
        <path d="M1590 748c-20-104-95-113-72-208 8-38-16-57-9-89m58 280c-50-32-15-78-49-112-31-31-50-39-45-79m-21 187c-36-65 8-90-22-133-20-29-41-32-38-65"/>
      </g>
      <g stroke="#396862" stroke-width="3" opacity=".43">
        <path d="M21 739c38-99 78-114 62-207-6-37 19-66 11-99M72 728c-9-83 68-123 74-189m1443 209c-20-104-95-113-72-208m-65 187c-36-65 8-90-22-133"/>
      </g>
    </g>
    <path d="m0 702 46 18 23-11 31 19 22-6 43 31 32-1 45 51-10 147H0Zm1600 14-63-6-39 21-19-7-56 32-49-1-40 36-20 159h286Z" fill="#071b23"/>
    </g>

    <g class="world-motes" fill="${palette.light}" opacity=".22">
      <circle cx="287" cy="217" r="2"/><circle cx="328" cy="401" r="1.6"/><circle cx="481" cy="149" r="1.4"/><circle cx="527" cy="339" r="2"/>
      <circle cx="619" cy="92" r="1.7"/><circle cx="725" cy="412" r="1.4"/><circle cx="788" cy="203" r="1.2"/><circle cx="903" cy="103" r="2"/>
      <circle cx="1030" cy="352" r="1.7"/><circle cx="1113" cy="219" r="1.4"/><circle cx="1229" cy="410" r="2.1"/><circle cx="1322" cy="263" r="1.8"/>
      <circle cx="392" cy="511" r="1.3"/><circle cx="866" cy="491" r="1.5"/><circle cx="1165" cy="523" r="1.6"/>
    </g>
    <path fill="url(#world-vignette)" d="M0 0h1600v900H0Z"/>
  </svg>`;
}
