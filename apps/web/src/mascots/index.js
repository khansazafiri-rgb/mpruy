// Sumber tunggal maskot MEDCOEL. SVG ada di file .svg di folder ini (dipakai
// apa adanya oleh web, ekspor brand/mascots, dan kebutuhan video/motion).
//
// Setiap SVG memakai nama lapisan yang sama supaya ekspresi bisa diatur dari
// luar lewat kelas mood-* (lihat styles/mascot.css):
//   .mc-float        seluruh badan (melayang/miring)
//   .mc-arm-right    lengan kanan (melambai)
//   .mc-eyes-normal  mata biasa (berkedip)   .mc-eyes-happy  mata senyum
//   .mc-mouth-normal / .mc-mouth-happy / .mc-mouth-think   mulut
//   .mc-spark        kilau/aksen kecil
import kila from './kila.svg?raw';
import kori from './kori.svg?raw';
import nilo from './nilo.svg?raw';

export const MASCOTS = {
  kori: {
    name: 'Kori',
    role: 'Rasa ingin tahu',
    tagline: 'Menemani langkah pertama dan pertanyaan pertama.',
    colors: { body: '#55C79D', limb: '#9DE0BD', leaf: '#F8C038', feet: '#00584E', line: '#172B38' },
    svg: kori,
  },
  kila: {
    name: 'Kila',
    role: 'Momen paham',
    tagline: 'Muncul saat jawabanmu benar dan konsepnya nyambung.',
    colors: { body: '#FFD56B', limb: '#F9D76F', wing: '#B8F0D5', feet: '#007060', line: '#172B38' },
    svg: kila,
  },
  nilo: {
    name: 'Nilo',
    role: 'Tumbuh bersama',
    tagline: 'Menemani saat meninjau ulang dan mencoba lagi.',
    colors: { body: '#315F73', limb: '#69BFD0', belly: '#DDF3EA', feet: '#123E49', line: '#172B38' },
    svg: nilo,
  },
};

export const MOODS = ['idle', 'wave', 'think', 'happy', 'talk', 'cheer'];
export const MASCOT_KEYS = Object.keys(MASCOTS);
