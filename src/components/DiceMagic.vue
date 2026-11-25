<template>
  <!-- Decorative lottery ticket + magic wand -->
  <svg aria-hidden="true" viewBox="0 0 150 110" class="mx-auto h-24 w-32">
    <g transform="rotate(-8 70 58)">
      <!-- ticket with side notches -->
      <path
        d="M16 30h96v22a8 8 0 0 0 0 16v22H16V68a8 8 0 0 0 0-16z"
        fill="#FFF7E6"
        stroke="#1B1F3B"
        stroke-width="3"
        stroke-linejoin="round"
      />
      <rect x="16" y="30" width="96" height="12" fill="#9B1C1C" stroke="#1B1F3B" stroke-width="3" />
      <path d="M90 42v48" stroke="#9B1C1C" stroke-width="2" stroke-dasharray="4 3" />
      <!-- the numbers -->
      <g font-family="Noto Sans Thai Variable, sans-serif" font-weight="800" font-size="15" fill="#1B1F3B" text-anchor="middle">
        <text x="32" y="68">๒</text><text x="46" y="68">๕</text><text x="60" y="68">๗</text><text x="74" y="68">๙</text>
      </g>
      <path d="M26 76h56" stroke="#E8C77A" stroke-width="2" />
      <path d="M96 50v30M100 50v30M103 50v30M107 50v30" stroke="#1B1F3B" stroke-width="1.5" opacity=".7" />
    </g>
    <!-- wand + sparkles -->
    <path d="M70 100L128 44" stroke="#8B6CF0" stroke-width="6" stroke-linecap="round" />
    <path d="M134 18l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#FFC83D" stroke="#B8860B" stroke-width="2" />
    <path d="M10 14l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#8B6CF0" />
    <path d="M140 80l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill="#E05A5A" />
  </svg>
</template>
