<script setup lang="ts">
import { toThaiDigits } from '@shared/drawn'

// A Thai-lottery-style ticket frame around the drawn digits (decoration only: the inputs live in the slot).
const draw = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
</script>

<template>
  <section class="ticket relative" aria-labelledby="drawn">
    <!-- header band -->
    <div class="flex items-center justify-between gap-3 rounded-t-[20px] bg-primary px-5 py-2 text-white sm:px-8">
      <span class="text-sm font-bold tracking-wide sm:text-base">สลากลุ้นทายเลข</span>
      <span class="text-xs sm:text-sm">งวดวันที่ {{ toThaiDigits(draw) }}</span>
    </div>

    <div class="ticket-body px-5 pb-5 pt-4 sm:px-8 sm:pb-7">
      <div class="mb-4 flex items-center justify-center gap-3">
        <span aria-hidden="true" class="text-star">★</span>
        <h2 id="drawn" class="text-center text-xl font-extrabold text-primary">เลขที่ได้</h2>
        <span aria-hidden="true" class="text-star">★</span>
      </div>
      <slot />
    </div>

    <!-- perforated stub -->
    <div class="ticket-stub flex items-center justify-between gap-3 rounded-b-[20px] px-5 py-3 sm:px-8" aria-hidden="true">
      <span class="text-xs font-semibold text-star">ชุดที่ {{ toThaiDigits('01') }} • ม.๑ ภาษาไทย</span>
      <span class="barcode h-6 w-24 sm:w-32" />
    </div>
  </section>
</template>

<style scoped>
.ticket {
  /* round notches cut into both sides at the perforation */
  --notch: 12px;
  filter: drop-shadow(0 2px 6px rgb(27 31 59 / 0.12));
  -webkit-mask:
    radial-gradient(circle var(--notch) at 0 calc(100% - 48px), #0000 98%, #000) left / 51% 100% no-repeat,
    radial-gradient(circle var(--notch) at 100% calc(100% - 48px), #0000 98%, #000) right / 51% 100% no-repeat;
  mask:
    radial-gradient(circle var(--notch) at 0 calc(100% - 48px), #0000 98%, #000) left / 51% 100% no-repeat,
    radial-gradient(circle var(--notch) at 100% calc(100% - 48px), #0000 98%, #000) right / 51% 100% no-repeat;
}
.ticket-body {
  /* a quiet printed-ticket texture: a fine diamond grid under a soft glow in the middle */
  background-color: #fff7e6;
  background-image:
    radial-gradient(ellipse 60% 70% at 50% 45%, rgb(255 255 255 / 0.85), rgb(255 255 255 / 0) 70%),
    repeating-linear-gradient(45deg, rgb(232 199 122 / 0.22) 0 1px, transparent 1px 14px),
    repeating-linear-gradient(-45deg, rgb(232 199 122 / 0.22) 0 1px, transparent 1px 14px);
  border-left: 2px solid #e8c77a;
  border-right: 2px solid #e8c77a;
}
.ticket-stub {
  background-color: #fff1d0;
  border: 2px solid #e8c77a;
  border-top: 2px dashed #9b1c1c;
}
.barcode {
  background: repeating-linear-gradient(90deg, #1b1f3b 0 2px, transparent 2px 4px, #1b1f3b 4px 5px, transparent 5px 8px);
  opacity: 0.7;
}
</style>
