import Link from 'next/link';
import { FilePlus } from 'lucide-react';
import { Cabin } from 'next/font/google';
const font = Cabin({ weight: '700', subsets: ['latin'] })

export function CompanyLogo() {
  return (
    <Link href="/" className="flex flex-row py-3 items-center">
      {/* <svg width="20" height="20" viewBox="0 0 154 143" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" width="124" height="143" rx="5" fill="white"/>
        <path d="M8 107.5C8 107.5 21 90.0003 48.5 90.0003C76 90.0003 76 107.5 101.5 107.5C127 107.5 134.593 89.8788 153.5 90.0008" stroke="black" strokeWidth="18"/>
        <path d="M8 63.4996C8 63.4996 21 46.0003 48.5 46.0003C76 46.0003 77 63.4995 102.5 63.4995C128 63.4995 134.593 45.8788 153.5 46.0008" stroke="black" strokeWidth="18"/>
      </svg> */}
      {/* <svg width="24" height="20" viewBox="0 0 124 143" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="124" height="143" rx="5" fill="white"/>
        <circle cx="61.5" cy="71.5" r="32.5" fill="black"/>
      </svg> */}
      {/* <FilePlus /> */}
      {/* <svg width="20" height="20" viewBox="0 0 124 143" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="124" height="143" rx="10" fill="white"/>
        <path d="M53.6665 75.1667C55.4559 77.5589 57.7388 79.5383 60.3605 80.9706C62.9821 82.403 65.8811 83.2547 68.8609 83.4681C71.8406 83.6815 74.8314 83.2516 77.6304 82.2075C80.4294 81.1634 82.9711 79.5295 85.0832 77.4167L97.5832 64.9167C101.378 60.9875 103.478 55.725 103.431 50.2625C103.383 44.8001 101.192 39.5748 97.3294 35.7122C93.4667 31.8495 88.2415 29.6585 82.779 29.611C77.3166 29.5635 72.054 31.6634 68.1248 35.4584L60.9582 42.5834" stroke="black" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M70.3332 66.8334C68.5438 64.4412 66.2609 62.4618 63.6392 61.0295C61.0176 59.5971 58.1186 58.7454 55.1388 58.532C52.159 58.3186 49.1682 58.7485 46.3692 59.7926C43.5703 60.8367 41.0285 62.4706 38.9165 64.5834L26.4165 77.0834C22.6216 81.0126 20.5217 86.2751 20.5691 91.7376C20.6166 97.2 22.8076 102.425 26.6703 106.288C30.533 110.151 35.7582 112.342 41.2207 112.389C46.6831 112.437 51.9456 110.337 55.8749 106.542L62.9999 99.4167" stroke="black" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
      </svg> */}
      {/* <svg width="30" height="30" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M30 4H12C10.9391 4 9.92172 4.42143 9.17157 5.17157C8.42143 5.92172 8 6.93913 8 8V40C8 41.0609 8.42143 42.0783 9.17157 42.8284C9.92172 43.5786 10.9391 44 12 44H36C37.0609 44 38.0783 43.5786 38.8284 42.8284C39.5786 42.0783 40 41.0609 40 40V14L30 4Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M28 4V12C28 13.0609 28.4214 14.0783 29.1716 14.8284C29.9217 15.5786 30.9391 16 32 16H40" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M23 35L25 37C25.197 37.197 25.4308 37.3532 25.6882 37.4598C25.9456 37.5665 26.2214 37.6213 26.5 37.6213C26.7786 37.6213 27.0544 37.5665 27.3118 37.4598C27.5692 37.3532 27.803 37.197 28 37C28.197 36.803 28.3532 36.5692 28.4598 36.3118C28.5665 36.0544 28.6213 35.7786 28.6213 35.5C28.6213 35.2214 28.5665 34.9456 28.4598 34.6882C28.3532 34.4308 28.197 34.197 28 34" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M26.0002 32L28.5002 34.5C28.8981 34.8978 29.4376 35.1213 30.0002 35.1213C30.5628 35.1213 31.1024 34.8978 31.5002 34.5C31.8981 34.1022 32.1215 33.5626 32.1215 33C32.1215 32.4374 31.8981 31.8978 31.5002 31.5L27.6202 27.62C27.0577 27.0582 26.2952 26.7427 25.5002 26.7427C24.7052 26.7427 23.9427 27.0582 23.3802 27.62L22.5002 28.5C22.1024 28.8978 21.5628 29.1213 21.0002 29.1213C20.4376 29.1213 19.8981 28.8978 19.5002 28.5C19.1024 28.1022 18.8789 27.5626 18.8789 27C18.8789 26.4374 19.1024 25.8978 19.5002 25.5L22.3102 22.69C23.2225 21.7802 24.4121 21.2006 25.6909 21.043C26.9696 20.8854 28.2644 21.1588 29.3702 21.82L29.8402 22.1C30.266 22.357 30.7723 22.4461 31.2602 22.35L33.0002 22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M33 21L34 32H32" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M15 21L14 32L20.5 38.5C20.8978 38.8978 21.4374 39.1213 22 39.1213C22.5626 39.1213 23.1022 38.8978 23.5 38.5C23.8978 38.1022 24.1213 37.5626 24.1213 37C24.1213 36.4374 23.8978 35.8978 23.5 35.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M15 22H23" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg> */}
      {/* <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M30 4H12C10.9391 4 9.92172 4.42143 9.17157 5.17157C8.42143 5.92172 8 6.93913 8 8V40C8 41.0609 8.42143 42.0783 9.17157 42.8284C9.92172 43.5786 10.9391 44 12 44H36C37.0609 44 38.0783 43.5786 38.8284 42.8284C39.5786 42.0783 40 41.0609 40 40V14L30 4Z" stroke="white" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
        <path d="M28 4V12C28 13.0609 28.4214 14.0783 29.1716 14.8284C29.9217 15.5786 30.9391 16 32 16H40" stroke="white" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
        <path d="M21 32C24.866 32 28 28.866 28 25C28 21.134 24.866 18 21 18C17.134 18 14 21.134 14 25C14 28.866 17.134 32 21 32Z" stroke="white" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
        <path d="M27 38C30.866 38 34 34.866 34 31C34 27.134 30.866 24 27 24C23.134 24 20 27.134 20 31C20 34.866 23.134 38 27 38Z" stroke="white" strokeWidth="2" strokeLinecap="round" stroke-linejoin="round"/>
      </svg>
      <p className={`${font.className} pl-1.5`} style={{'fontSize': '3rem'}}>
        Genagree
      </p> */}
    </Link>
  )
}