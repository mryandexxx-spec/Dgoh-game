// UI-03 calendar-only collectible art. Editable SVG silhouettes, no remote assets.
// Names/keys remain canonical: this module only renders a graphic.
const DEFINITIONS = '<defs>'
  + '<linearGradient id="`-gold" x1=".1" y1=".1" x2=".9" y2=".95"><stop stop-color="#fff1b9"/><stop offset=".26" stop-color="#e7b55a"/><stop offset=".59" stop-color="#a76a2e"/><stop offset="1" stop-color="#523018"/></linearGradient>'
  + '<linearGradient id="`-steel" x1=".1" y1=".05" x2=".9" y2=".94"><stop stop-color="#edf3ed"/><stop offset=".27" stop-color="#aeb5b4"/><stop offset=".61" stop-color="#5a6870"/><stop offset="1" stop-color="#28323b"/></linearGradient>'
  + '<linearGradient id="`-spice" x1=".15" y1="0" x2=".84" y2="1"><stop stop-color="#ffdd92"/><stop offset=".24" stop-color="#ff9558"/><stop offset=".6" stop-color="#bd4328"/><stop offset="1" stop-color="#60221e"/></linearGradient>'
  + '<linearGradient id="`-aqua" x1=".16" y1="0" x2=".84" y2="1"><stop stop-color="#d5fbec"/><stop offset=".24" stop-color="#72d9da"/><stop offset=".62" stop-color="#248ba3"/><stop offset="1" stop-color="#15384e"/></linearGradient>'
  + '<linearGradient id="`-ivory" x1=".12" y1=".05" x2=".9" y2=".98"><stop stop-color="#fff7d3"/><stop offset=".43" stop-color="#e1ca9b"/><stop offset=".75" stop-color="#b49a70"/><stop offset="1" stop-color="#66523b"/></linearGradient>'
  + '<radialGradient id="`-halo"><stop stop-color="#ffd99e" stop-opacity=".34"/><stop offset="1" stop-color="#f5c16f" stop-opacity="0"/></radialGradient>'
  + '</defs>';

// Hand-authored, original miniature object illustrations, optimized for 30–42px.
const ART = Object.freeze({
  sol: '<ellipse cx="24" cy="26" rx="20" ry="19" fill="url(#`-halo)"/>'
    + '<circle cx="24" cy="25" r="18.1" fill="#4d2d17" stroke="#f6d18a" stroke-width="1.3"/>'
    + '<circle cx="24" cy="23.3" r="16.6" fill="url(#`-gold)" stroke="#57351a" stroke-width="1.4"/>'
    + '<circle cx="24" cy="23.3" r="13.3" fill="none" stroke="#ffe8a0" stroke-width="1.3" opacity=".9"/>'
    + '<circle cx="24" cy="23.3" r="10.9" fill="none" stroke="#59391e" stroke-width="1.4"/>'
    + '<path d="M24 12v4M24 31v4M12.7 23.3h4M31.3 23.3h4M15.7 15l2.9 2.9M29.4 28.7l2.9 2.9M32.3 15l-2.9 2.9M18.6 28.7l-2.9 2.9" stroke="#7c4e25" stroke-width="1.2" stroke-linecap="round"/>'
    + '<path d="M26.6 18.2c-4.8-2.3-8.5 2.3-6.5 5.8 1.2 2.4 6.5 1.5 7.2 4.1.8 2.7-2.6 4.5-7.9 2.6M24 15.5v16" fill="none" stroke="#653b1c" stroke-width="2.2" stroke-linecap="round"/>'
    + '<path d="M15 11.2a17 17 0 0 1 16.7-2.9" fill="none" stroke="#fff5cb" stroke-width="1.6" opacity=".9" stroke-linecap="round"/>'
    + '<circle cx="35" cy="33" r="1.5" fill="#fff5cf"/>',
  folio: '<ellipse cx="24" cy="26" rx="22" ry="18" fill="url(#`-halo)"/>'
    + '<path d="M5.8 12.5 22 15.8 25 16.9 42.2 12v26.2L25 42l-3.5-.6-15.7-3.6Z" fill="#3f261c" stroke="#b78650" stroke-width="2"/>'
    + '<path d="M8.6 9.8c5.8-1 11.6.7 15.4 4.6 4.4-3.8 10.3-5.6 15.4-4.6v25c-5.4-1-11.1.9-15.4 4.9-4.4-4-10.1-5.9-15.4-4.9Z" fill="url(#`-ivory)" stroke="#f4ddb1" stroke-width="1.2"/>'
    + '<path d="M24 14.4v25.3" stroke="#986b41" stroke-width="2"/>'
    + '<path d="M12.5 15c3.5-.2 6.4.6 8.5 2.2M12.5 19c3.4 0 6.3.7 8.3 2.3M12.5 23c3.6.1 6.4 1 8.3 2.4M12.5 27c3.4.4 5.6.9 7.6 2.3M27.2 17.2c2.4-1.5 5.4-2.2 8.6-2.2M27.2 21.3c2.3-1.4 5.2-2 8.5-2M27.2 25.4c2.4-1.5 5.2-2 8.5-2.2" fill="none" stroke="#8f633e" stroke-width="1" opacity=".75" stroke-linecap="round"/>'
    + '<path d="M24 10v29.4" stroke="#fbe1ab" stroke-width=".8" opacity=".85"/>'
    + '<path d="M5.9 12.5v25.2M42.2 12v26.2" stroke="#f3bb72" stroke-width="2"/>'
    + '<path d="m33.7 7.5 2.6 4.3-2.3 7.1-2-5Z" fill="#b33e29" stroke="#f8c36f" stroke-width=".8"/>',
  cry: '<ellipse cx="24" cy="24" rx="21" ry="20" fill="url(#`-halo)"/>'
    + '<path d="m8 22 7.8-12.5 9 3.2 2.2 21.4-12.8 7.3Z" fill="url(#`-spice)" stroke="#ffd6a0" stroke-width="1.3"/>'
    + '<path d="m15.8 9.5 9 3.2-7 10.2L8 22Z" fill="#ffc17c" opacity=".9"/>'
    + '<path d="m17.8 22.9 7-10.2 2.2 21.4-12.8 7.3Z" fill="#882b24" opacity=".58"/>'
    + '<path d="m27 13.2 10.9 2.9 4.6 13.2-13.1 9.6-5-11.6Z" fill="url(#`-spice)" stroke="#f6ad70" stroke-width="1.2"/>'
    + '<path d="m27 13.2 10.9 2.9-13.5 11.2Z" fill="#ffd096"/>'
    + '<path d="m24.4 27.3 5 11.6 13.1-9.6-10.7 1.5Z" fill="#862c25"/>'
    + '<path d="m32.5 4.5 1 5.3 5.2.8-5.2 1.1-1 5.2-1.1-5.2-5.1-1.1 5.1-.8Z" fill="#fff4ca"/>'
    + '<path d="m9 5.6.7 3.3 3.4.7-3.4.7L9 13.6l-.7-3.3-3.3-.7 3.3-.7Z" fill="#ffd88d"/>',
  pl: '<ellipse cx="24" cy="25" rx="22" ry="19" fill="url(#`-halo)"/>'
    + '<path d="m5.8 22 17.6-8.5L41 22.4v12.3L23.7 44l-17.9-9Z" fill="#475057" stroke="#8d9b98" stroke-width="1.6"/>'
    + '<path d="M5.8 22 23.4 13.5 41 22.4l-17.3 9.4Z" fill="url(#`-steel)" stroke="#e0e9db" stroke-width="1.6"/>'
    + '<path d="M23.7 31.8V44M41 22.4v12.3L23.7 44V31.8Z" fill="#36424c" stroke="#88999f" stroke-width="1.3"/>'
    + '<path d="m11.6 22 11.8-5.8 11.8 6.2-11.5 6.1Z" fill="#98a4a4" opacity=".45"/>'
    + '<path d="m8.6 29.5 13.5 6.8M28 35.6l9-4.9M8.6 33.4l13.5 6.7" stroke="#bdc9c4" stroke-width="1" opacity=".7"/>'
    + '<circle cx="13" cy="24.9" r="1.3" fill="#fae4ab"/><circle cx="34" cy="25" r="1.3" fill="#fae4ab"/><circle cx="26" cy="38" r="1.2" fill="#d1d4c1"/>'
    + '<path d="M15.3 8.2h17.3l-4.4 6.3H11Z" fill="url(#`-gold)" stroke="#d0ac71" stroke-width=".8"/>',
  water: '<ellipse cx="24" cy="25" rx="21" ry="21" fill="url(#`-halo)"/>'
    + '<path d="M18.5 6h11v7l4.9 5.4v17.5c0 4.1-3.5 7-7.5 7h-5.8c-4 0-7.4-2.9-7.4-7V18.4l4.8-5.4Z" fill="#5c4b38" stroke="#ddb478" stroke-width="1.7"/>'
    + '<path d="M17.5 18.9h13V36c0 2.5-1.6 4.1-4 4.1h-5c-2.5 0-4-1.6-4-4.1Z" fill="url(#`-aqua)" stroke="#a0ecdc" stroke-width=".8"/>'
    + '<path d="M18.6 22.8c4-2.1 6.9 2 12-.7v11.6c-4 1.8-7-1.3-12 .4Z" fill="#6cf1ed" opacity=".4"/>'
    + '<path d="M19.8 19v14M27.7 18.9v19.2" stroke="#edfaf0" stroke-width="1.4" opacity=".6"/>'
    + '<path d="M13.9 19.7h4.3M30 19.7h4.5M13.8 34.6h4.1M30.5 34.6h3.8" stroke="#c59c60" stroke-width="3"/>'
    + '<rect x="17.5" y="4.5" width="13" height="5.3" rx="1.4" fill="url(#`-gold)" stroke="#f6d59b" stroke-width=".9"/>'
    + '<path d="M20.8 5.5h6.5M20 12.8h8" stroke="#ffedbd" stroke-width=".9" opacity=".7"/>'
    + '<path d="m33 10 3.2 4.4-1.4 4.9" fill="none" stroke="#e0bb7c" stroke-width="1.4"/>',
  teeth: '<ellipse cx="24" cy="24" rx="21" ry="20" fill="url(#`-halo)"/>'
    + '<path d="M7 10.4q4-4.5 12-2.3 4.3 1.1 7.1 5.6-2.9 2.8-4.1 7.9l-3 18.8q-2.7-6.6-5-10.6Q10 25.3 7 10.4Z" fill="url(#`-ivory)" stroke="#765b41" stroke-width="1.3"/>'
    + '<path d="M9.4 11.5Q15 10 19.7 14q-1 7.2-4.1 14.2Q11 22.8 9.4 11.5Z" fill="#fff0c9" opacity=".75"/>'
    + '<path d="M25 11q6.8-4.4 15.6-.2-2.3 18.8-10.8 30.2L27.5 22Q26 15.8 25 11Z" fill="url(#`-ivory)" stroke="#6b5038" stroke-width="1.5"/>'
    + '<path d="M28.4 13.4q6.2-2.9 9.7-1.2Q36 27.1 31 33.2" fill="none" stroke="#fffbe0" stroke-width="2.1" opacity=".75" stroke-linecap="round"/>'
    + '<path d="M15.5 14.4q2.3 4.3 0 8.7M33 14.9q1.8 5.1-1.5 11" fill="none" stroke="#8a6d4a" stroke-width="1.2" opacity=".7"/>'
    + '<path d="m5.3 7.2 3.3-3M38.5 7.1l3.4-3.1" stroke="#dcb873" stroke-width="1.2" stroke-linecap="round"/>',
  seal: '<ellipse cx="24" cy="25" rx="21" ry="21" fill="url(#`-halo)"/>'
    + '<path d="m10 5.7 5.5 6.3M38 5.7 32.5 12" stroke="#b76e36" stroke-width="2.5" stroke-linecap="round"/>'
    + '<path d="M24 5.2 26.1 10l5.1-1-1.1 5.2 5.2 2.3-4.7 2.7-6.6-2.5-6.4 2.5-4.8-2.7 5.2-2.3L17 9l4.9 1Z" fill="url(#`-gold)" stroke="#ffdf9e" stroke-width="1.1"/>'
    + '<path d="M24 12c-9.3 0-15.3 7.5-15.3 16.5S14.7 44 24 44s15.3-6.4 15.3-15.5S33.3 12 24 12Z" fill="#65221d" stroke="#e7a25d" stroke-width="2"/>'
    + '<circle cx="24" cy="27.9" r="11.4" fill="#9e332b" stroke="#e8a85f" stroke-width="1.5"/>'
    + '<circle cx="24" cy="27.9" r="8.5" fill="none" stroke="#5a1716" stroke-width="1.2"/>'
    + '<path d="m24 19.8 2.4 5.5 5.9.8-4.3 4.3 1.1 6-5.1-3-5.2 3 1-6-4.3-4.3 6-.8Z" fill="url(#`-gold)" stroke="#fff3b8" stroke-width=".7"/>'
    + '<path d="M12.5 23.9c1.5-6.6 7-10.2 14-9.5" fill="none" stroke="#ffd7a1" stroke-width="1.4" opacity=".8"/>',
  rid: '<ellipse cx="24" cy="25" rx="22" ry="21" fill="url(#`-halo)"/>'
    + '<path d="m6 17 18-10 19 10v21L24 46 6 37Z" fill="#213b4b" stroke="#e6c78f" stroke-width="1.7"/>'
    + '<path d="M6 17 24 7l19 10-19 11Z" fill="#68d7e5" stroke="#e4faff" stroke-width="1.7"/>'
    + '<path d="m6 17 18 11v18L6 37Z" fill="#2f8097" stroke="#b3f5f2" stroke-width="1.3"/>'
    + '<path d="m43 17-19 11v18l19-9Z" fill="#15566f" stroke="#97dae2" stroke-width="1.3"/>'
    + '<path d="m24 7 4 15-4 6-5-8Z" fill="#d8fff7" opacity=".6"/>'
    + '<path d="m6 17 13 3 5 8m19-11-15 5-4 6" fill="none" stroke="#f3fcf1" stroke-width="1.3" opacity=".65"/>'
    + '<path d="m9 33 10 5m10-5 10-5" fill="none" stroke="#b7f1f0" stroke-width="1.2" opacity=".64"/>'
    + '<path d="m34 2 1.4 5 5 1.4-5 1.4-1.4 5-1.4-5-5-1.4 5-1.4Z" fill="#f8fbd1"/>',
  wol: '<ellipse cx="24" cy="26" rx="21" ry="21" fill="url(#`-halo)"/>'
    + '<path d="M20.1 4h7.8v7.6l5.3 7.1v17.8c0 4.1-3.2 6.5-7 6.5h-4.4c-4 0-7-2.4-7-6.5V18.7l5.3-7.1Z" fill="#153948" stroke="#d1b078" stroke-width="2"/>'
    + '<path d="M17.9 22.5h12.2v14.4c0 2-1.3 3.2-3.7 3.2h-4.8c-2.5 0-3.7-1.2-3.7-3.2Z" fill="url(#`-aqua)"/>'
    + '<path d="M18.2 25.3q6.1-2.8 11.8 0v10.4q-6.2 2.9-11.8-.6Z" fill="#94ecfc" opacity=".41"/>'
    + '<rect x="18" y="4" width="12" height="5.6" rx="1.5" fill="url(#`-gold)" stroke="#ffe1a5" stroke-width="1"/>'
    + '<path d="M18.2 17.4h11.6M17.7 34.7h12.6" stroke="#e4c384" stroke-width="2"/>'
    + '<path d="m24 20.5 2.1 4.6 5 .6-3.7 3.4 1 5.1-4.4-2.4-4.4 2.4 1-5.1-3.6-3.4 4.9-.6Z" fill="#d9faff" opacity=".9"/>'
    + '<path d="M20.5 13v6M21 24v9" stroke="#e5fbff" stroke-width="1.4" opacity=".6" stroke-linecap="round"/>'
    + '<circle cx="34.4" cy="13.2" r="2.4" fill="#a9f4fe"/><circle cx="37.7" cy="9" r="1.2" fill="#defaff"/>'
});
const SHARD_ART = '<circle cx="24" cy="24" r="21.5" fill="url(#`-halo)"/>'
  + '<path d="m24 2 5.5 7.4 10.1-.6-1.2 9.6L45 24l-6.6 6 1.2 9.2-10.1-.6L24 46l-5.5-7.4-10.1.6 1.2-9.2L3 24l6.6-5.6-1.2-9.6 10.1.6Z" fill="url(#`-gold)" stroke="#fff0be" stroke-width=".8"/>'
  + '<circle cx="24" cy="24" r="17.4" fill="#21180f" stroke="#a96c32" stroke-width="2.1"/>'
  + '<path d="m4.8 6 5.9 2.1-2.4 6.3-3.8-3.8ZM42.7 6l-6 2.1 2.5 6.3 3.7-3.8ZM5 42l5.7-2.3-2.4-5.9-3.9 3.7ZM42.8 42l-6-2.3 2.4-5.9 3.8 3.7Z" fill="#c56d3b" stroke="#ffda8e" stroke-width=".8"/>';


// UI-03c: original handcrafted mission illustrations, matching calendar loot.
// The ten keys below are visual DAILY.k categories, never new gameplay state.
const QUEST_ART = Object.freeze({
  login: '<ellipse cx="24" cy="24" rx="22" ry="22" fill="url(#`-halo)"/>'
    + '<path d="M5 42V19L24 5l19 14v23H5Z" fill="#422a1e" stroke="#d69a57" stroke-width="1.8"/>'
    + '<path d="M11 39V22L24 11l13 11v17Z" fill="#6c401e" stroke="#f8d095" stroke-width="1.2"/>'
    + '<path d="M15 39V25q9-14 18 0v14Z" fill="#261912" stroke="#f8dc99" stroke-width="1.4"/>'
    + '<path d="M17 36V25q7-10 14 0v11Z" fill="url(#`-spice)"/>'
    + '<path d="m21 25 3-7 3 7M24 18v17" stroke="#fff4bd" stroke-width="1.5" fill="none"/>'
    + '<path d="M4 42h40v3H4Z" fill="url(#`-gold)" stroke="#f4c17a" stroke-width=".9"/>'
    + '<path d="m24 0 1.3 3.4 3.6 1.3-3.6 1.3-1.3 3.4-1.3-3.4-3.6-1.3 3.6-1.3Z" fill="#fff3b8"/>',
  water: ART.water,
  camp: '<ellipse cx="24" cy="24" rx="22" ry="22" fill="url(#`-halo)"/>'
    + '<path d="M24 5 40 12v16q-4 12-16 17Q12 40 8 28V12Z" fill="#54382a" stroke="#f6c77e" stroke-width="1.8"/>'
    + '<path d="M24 10 35 15v12q-3 9-11 13-8-4-11-13V15Z" fill="#3c2922" stroke="#bf8850" stroke-width="1.2"/>'
    + '<path d="M16 14 34 37M33 14 14 37" stroke="#1d1e21" stroke-width="5.5" stroke-linecap="round"/>'
    + '<path d="M16 14 34 37M33 14 14 37" stroke="url(#`-steel)" stroke-width="2.8" stroke-linecap="round"/>'
    + '<path d="m12 15 5-3 5 6-5 3ZM30 18l5-6 5 3-5 6Z" fill="url(#`-gold)" stroke="#ffe9a4" stroke-width=".8"/>'
    + '<path d="m15 34 5-4 5 5-6 5ZM29 35l5-5 5 4-4 6Z" fill="#b88445" stroke="#f4ca80" stroke-width=".8"/>',
  chron: '<ellipse cx="24" cy="24" rx="22" ry="22" fill="url(#`-halo)"/>'
    + '<path d="M10 9 30 6l9 9v24l-20 4-9-7Z" fill="#4f2e22" stroke="#e9b476" stroke-width="1.3"/>'
    + '<path d="M14 11 32 9l3.5 6v21L19 39l-5-4Z" fill="url(#`-ivory)" stroke="#fff1bc" stroke-width="1.3"/>'
    + '<path d="m19 17 13-2M19 22l13-2M19 27l13-2M19 32l11-2" stroke="#906443" stroke-width="1.4" stroke-linecap="round"/>'
    + '<path d="M11 9c-3-1-5 2-5 5v25q1 5 5 4t4-5V13q-1-4-4-4Z" fill="url(#`-gold)" stroke="#ffe3a0" stroke-width="1"/>'
    + '<path d="m24 15 4 6-4 6-4-6Z" fill="url(#`-spice)" stroke="#814128" stroke-width=".9"/>'
    + '<path d="m38 4 1.3 4 4.2 1.2-4.2 1.3L38 14.5l-1.3-4-4.1-1.3 4.1-1.2Z" fill="#fff4bc"/>',
  shop: ART.sol
    + '<path d="M6 16 12 9h24l6 7-6 6-6-3-6 3-6-3-6 3Z" fill="url(#`-spice)" stroke="#ffde98" stroke-width="1.2"/>'
    + '<path d="m11 23 5 3 8-3 8 3 5-3v17H11Z" fill="#4f311e" stroke="#d6a36c" stroke-width="1.3"/>'
    + '<path d="M15 28h18M17 32h14M20 40V26h8v14" stroke="#e9bc84" stroke-width="1.4"/>'
    + '<circle cx="24" cy="28" r="8.3" fill="url(#`-gold)" stroke="#fff1ba" stroke-width="1.1"/>'
    + '<path d="M24 23v10M20.5 28h7" stroke="#73421f" stroke-width="1.8"/>',
  raid: '<ellipse cx="24" cy="24" rx="22" ry="22" fill="url(#`-halo)"/>'
    + '<path d="M2 40q12-7 23-3 12-6 21 3v6H2Z" fill="#a57549" stroke="#f2c17b" stroke-width="1"/>'
    + '<path d="M5 37Q7 11 24 5q17 1 19 28L34 40Z" fill="#836041" stroke="#dfb484" stroke-width="2"/>'
    + '<path d="M13 35Q14 14 25 13q12 1 12 19L25 43Z" fill="#241914" stroke="#d4a877" stroke-width="1.8"/>'
    + '<path d="M11 20 16 28l4-9 5 7 4-8 6 9 5-7M11 35l5-6 4 10 5-8 4 9 6-11 4 6" fill="#f4e3bc" stroke="#a98b60" stroke-width="1"/>'
    + '<path d="m16 8 8-6 8 6" fill="none" stroke="#f3d19b" stroke-width="1.5"/>',
  ult: '<ellipse cx="24" cy="24" rx="22" ry="22" fill="url(#`-halo)"/>'
    + '<path d="m24 1 5 12 12-6-6 12 12 5-12 5 6 12-12-6-5 12-5-12-12 6 6-12-12-5 12-5L7 7l12 6Z" fill="url(#`-spice)" stroke="#ffe0a1" stroke-width="1.6"/>'
    + '<circle cx="24" cy="24" r="13" fill="#81351e" stroke="#f7c56e" stroke-width="1.5"/>'
    + '<path d="m27 9-12 18h9l-4 12 13-20h-9Z" fill="#fff4c8" stroke="#e9a25d" stroke-width="1.3"/>'
    + '<path d="M24 1v4M1 24h4M43 24h4M24 43v4" stroke="#fff2b5" stroke-width="1"/>',
  skill: ART.folio
    + '<path d="M24 11 36 18v12L24 37 12 30V18Z" fill="#523622" stroke="#f9dfaa" stroke-width="1.4"/>'
    + '<path d="M24 15 32 20v8l-8 5-8-5v-8Z" fill="url(#`-gold)" stroke="#fff1bc" stroke-width=".9"/>'
    + '<path d="M24 18v12M19 25l5-5 5 5" stroke="#74451e" stroke-width="2" fill="none" stroke-linecap="round"/>'
    + '<path d="m40 7 1.2 3.7 3.5 1.2-3.5 1.2-1.2 3.7-1.2-3.7-3.5-1.2 3.5-1.2Z" fill="#fff5bf"/>',
  craft: ART.pl
    + '<path d="m7 6 13-3 13 13-9 9Z" fill="url(#`-steel)" stroke="#fff0cc" stroke-width="1.2"/>'
    + '<path d="m7 6 14 17-5 5L3 13Z" fill="#75838b" stroke="#d7e2df" stroke-width="1.1"/>'
    + '<path d="m25 18 6-5 13 13-5 6Z" fill="#835027" stroke="#edc27b" stroke-width="1"/>'
    + '<path d="m37 2 1.3 4.2 4 1.3-4 1.2-1.3 4.3-1.2-4.3-4.3-1.2 4.3-1.3Z" fill="#fff2b9"/>'
    + '<path d="m8 34 10 7 22-5" fill="none" stroke="#dfd3ae" stroke-width="1.1"/>',
  lvl: '<ellipse cx="24" cy="24" rx="22" ry="22" fill="url(#`-halo)"/>'
    + '<path d="M24 4 40 11v16L24 45 8 27V11Z" fill="#483123" stroke="#ffe1a0" stroke-width="1.6"/>'
    + '<path d="M24 9 35 14v12L24 39 13 26V14Z" fill="url(#`-gold)" stroke="#ac7739" stroke-width="1.4"/>'
    + '<path d="m24 13 4 8h6l-10 12-10-12h6Z" fill="#57371c" stroke="#fff1bd" stroke-width="1.4"/>'
    + '<path d="m24 10 3 5.5 5.5.6-4.2 3.8 1.1 5.5-5.4-3-5.4 3 1.1-5.5-4.2-3.8 5.5-.6Z" fill="#f9d58a" opacity=".68"/>'
    + '<path d="M6 36q7 6 14 3M42 36q-7 6-14 3" stroke="#e8b97f" stroke-width="2" fill="none"/>'
});
function dailyQuestIcon(key) {
  const kind = Object.hasOwn(QUEST_ART,key) ? key : 'login';
  const id = 'u03-quest-' + kind;
  return '<svg class="ui03-quest-svg" data-ui03quest-art="' + kind
    + '" viewBox="0 0 48 48" aria-hidden="true" focusable="false">'
    + defsFor(id) + QUEST_ART[kind].replaceAll(String.fromCharCode(96),id) + '</svg>';
}

function defsFor(id) { return DEFINITIONS.replaceAll('`',id); }
// id is local to each day's SVG. Repeated icon types cannot collide with
// another day's gradients when several month calendars are mounted in tests.
function calendarRewardIcon(kind, day, portraitMarkup = '') {
  const safeDay = Number.isInteger(day) && day >= 1 && day <= 31 ? day : 0;
  const safeKind = Object.hasOwn(ART,kind) || kind === 'shard' ? kind : 'sol';
  const id = 'u03-' + safeKind + '-' + safeDay;
  const illustration = (safeKind === 'shard' ? SHARD_ART : ART[safeKind]).replaceAll('`',id);
  const svg = `<svg class="ui03-loot-svg" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${defsFor(id)}${illustration}</svg>`;
  return safeKind === 'shard' ? `<span class="ui03-shard-art">${svg}<span class="ui03-shard-face">${portraitMarkup}</span></span>` : svg;
}
// Shared miniature object art for daily rewards. Separate per-tile gradient IDs.
function dailyRewardIcon(kind, scope = 'daily') {
  if (!Object.hasOwn(ART, kind)) return '';
  const id = 'u03-chip-' + kind + '-' + String(scope).replace(/[^a-z0-9_-]/gi, '').slice(0, 38);
  return '<svg class="ui03-loot-svg ui03-daily-loot-svg" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' +
    defsFor(id) + ART[kind].replaceAll(String.fromCharCode(96), id) + '</svg>';
}
// Original illustrated UI-03 art. Pure presentation; no reward or save semantics.
const DEFS =
  '<defs><linearGradient id="coam-metal" x1="0" y1="0" x2=".85" y2="1"><stop stop-color="#7d8580"/><stop offset=".16" stop-color="#43484a"/><stop offset=".61" stop-color="#252b30"/><stop offset="1" stop-color="#0c1117"/></linearGradient>' +
  '<linearGradient id="coam-face" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#57514a"/><stop offset=".42" stop-color="#322c28"/><stop offset="1" stop-color="#161719"/></linearGradient>' +
  '<linearGradient id="coam-bronze" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#ffe7ae"/><stop offset=".27" stop-color="#c79552"/><stop offset=".59" stop-color="#754524"/><stop offset="1" stop-color="#d7a760"/></linearGradient>' +
  '<linearGradient id="coam-lamp" x1="0" x2="1"><stop stop-color="#9b3b0e"/><stop offset=".25" stop-color="#ffc66f"/><stop offset=".5" stop-color="#fff5b4"/><stop offset=".8" stop-color="#ffab46"/><stop offset="1" stop-color="#73330e"/></linearGradient>' +
  '<radialGradient id="coam-glow"><stop stop-color="#ffbc61" stop-opacity=".56"/><stop offset="1" stop-color="#f49c45" stop-opacity="0"/></radialGradient></defs>';
const LID_CLOSED =
  '<path d="M25 72 73 43 227 39 277 67 256 91 43 93Z" fill="url(#coam-metal)" stroke="#c4955c" stroke-width="2.3"/>' +
  '<path d="m46 72 37-21 133-3 42 20-15 12-185 2Z" fill="#414342" stroke="#a37c49" stroke-width="1.7"/>' +
  '<path d="m76 54 28-6 103 1 28 12-16 5-130-2Z" fill="#888071" opacity=".25"/>' +
  '<path d="M40 73 61 85 239 83 261 70" stroke="#e0ae6b" fill="none" stroke-width="2.5"/>' +
  '<path d="m112 44 25-2 15 43-25 5Z" fill="url(#coam-bronze)" stroke="#f8d497" stroke-width="1.4"/>' +
  '<path d="m124 48 15 33m-65-26 4 19m143-22-3 22" stroke="#ffe7ae" stroke-width="1.3" opacity=".65"/>' +
  '<path d="m25 72 18 22m234-27-20 25" stroke="#f2c684" stroke-width="2"/>';
const LID_OPEN =
  '<ellipse cx="152" cy="80" rx="116" ry="55" fill="url(#coam-glow)"/>' +
  '<path d="M33 76 69 40 224 29 272 61 249 73 55 89Z" fill="url(#coam-metal)" stroke="#e6b06c" stroke-width="2.4"/>' +
  '<path d="m53 68 34-19 133-13 30 21-16 4L68 77Z" fill="#4d4a46" stroke="#c5995d" stroke-width="1.4"/>' +
  '<path d="m114 39 25-4 15 38-24 5Z" fill="url(#coam-bronze)"/>' +
  '<path d="M47 94 68 78 239 69 256 89 233 105 63 107Z" fill="#0a0a0b" stroke="#d4a361" stroke-width="2"/>' +
  '<path d="M57 95 237 77 246 87 233 96 67 105Z" fill="url(#coam-lamp)" opacity=".95"/>' +
  '<path d="M80 94 221 83" stroke="#fff2b3" stroke-width="3" opacity=".8"/>';
function choamSupplyArt(opened = false) {
  const label = opened ? 'Открытый контейнер поставки КООАМ' : 'Закрытый контейнер поставки КООАМ';
  return '<svg class="ui03-choam-svg" viewBox="0 0 300 166" role="img" aria-label="' + label + '" xmlns="http://www.w3.org/2000/svg">' +
    DEFS +
    '<ellipse cx="151" cy="150" rx="134" ry="13" fill="#030302" opacity=".58"/>' +
    '<ellipse cx="150" cy="117" rx="147" ry="64" fill="url(#coam-glow)" opacity=".42"/>' +
    '<path d="m26 77 37-4 181-4 33 7-3 51-20 24H47l-21-22Z" fill="#131619" stroke="#c39862" stroke-width="2.2"/>' +
    '<path d="m29 85 18 11 4 50-20-17Zm245-3-19 12-3 52 20-17Z" fill="url(#coam-bronze)" stroke="#eed09a" stroke-width="1"/>' +
    '<path d="m47 94 24-10 156-2 30 12-5 49-17 8H68l-18-8Z" fill="url(#coam-face)" stroke="#ba864e" stroke-width="2"/>' +
    '<path d="M53 97 73 87l153-2 23 12" stroke="#f5d39c" stroke-width="1.7" fill="none" opacity=".55"/>' +
    '<path d="m59 103 22 6 5 35-21-6Zm181-1-21 7-5 34 21-6Z" fill="url(#coam-metal)" stroke="#bd884d" stroke-width="1.5"/>' +
    '<path d="M84 108h135l-5 33H88Z" fill="#101317" stroke="#79603c" stroke-width="1.4"/>' +
    '<path d="M88 109h127" stroke="url(#coam-lamp)" stroke-width="3"/>' +
    (opened ? LID_OPEN : LID_CLOSED) +
    '<path d="m117 106 14-7h42l14 7v29l-12 12h-47l-12-12Z" fill="#24211f" stroke="#e0b476" stroke-width="2"/>' +
    '<path d="m123 111 12-6h34l12 6v21l-10 10h-38l-10-10Z" fill="url(#coam-face)" stroke="#745a38" stroke-width="1"/>' +
    '<g fill="none" stroke="#eac183" stroke-width="2.8"><circle cx="143" cy="119" r="8"/><circle cx="156" cy="119" r="8"/></g>' +
    '<path d="M149 110v19" stroke="#ffdfa4" stroke-width=".6"/>' +
    '<path d="M131 136h36" stroke="#c69b61"/>' +
    '<circle cx="68" cy="124" r="2" fill="#ffe7ad"/><circle cx="232" cy="124" r="2" fill="#ffe7ad"/>' +
    '<path d="m32 119 15 6m205-1 16-7" stroke="url(#coam-lamp)" stroke-width="3"/>' +
    '</svg>';
}
function choamMarkArt() {
  return '<svg class="ui03-choam-mark" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' +
    '<path d="m5 19 12-8h16l11 8-4 22H9Z" fill="#22272c" stroke="#eac27f" stroke-width="2"/>' +
    '<path d="m5 19 12 7h14l13-7-11-8H17Z" fill="#53504a" stroke="#f8d89d" stroke-width="1.5"/>' +
    '<path d="m20 11 4 14v14" fill="none" stroke="#c99d60" stroke-width="4"/>' +
    '<path d="M10 28h29v10H10Z" fill="#332a25" stroke="#c1975d" stroke-width="1"/>' +
    '<g fill="none" stroke="#e6b36b" stroke-width="1.8"><circle cx="21" cy="33" r="3.8"/><circle cx="27" cy="33" r="3.8"/></g>' +
    '<path d="M7 26v9m34-9v9" stroke="#e4aa60" stroke-width="2"/>' +
    '</svg>';
}

export { calendarRewardIcon, dailyQuestIcon, dailyRewardIcon, choamSupplyArt, choamMarkArt, ART, QUEST_ART };
