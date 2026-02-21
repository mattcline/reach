'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from 'components/ui/button';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { useUser } from '@/context/user';
import { HOMEPAGE_URL } from '@/lib/constants';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
} from 'components/ui/navigation-menu';

interface NavbarProps {
  showAppSwitcher?: boolean;
  variant?: 'default' | 'minimal' | 'document';
}

export function Navbar({
  showAppSwitcher = true,
  variant = 'default'
}: NavbarProps = {}) {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isRootDomain, setIsRootDomain] = useState<boolean>(false);
  
  useEffect(() => {
    // Check if we're on the root path
    const pathname = window.location.pathname;
    setIsRootDomain(pathname === '/');
  }, [pathname]);
  
  // Matches /docs/:id, /docs.main.xyz/:id, /docs.anything/:id
  const hideNavbar = /^\/docs[^\/]*\/[^\/]+$/.test(pathname);
  if (hideNavbar) return null;

  return (
    <nav className="flex flex-row sticky top-0 z-50 px-5 md:px-20 py-5 items-center justify-between bg-background">
      <div className="flex items-center">
        <div className="flex items-center">
          <Link href={HOMEPAGE_URL} className="flex items-start">
            <svg width="40" height="40" viewBox="0 0 2068 2068" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="2068" height="2068" fill="#121316"/>
              <g filter="url(#filter0_d_158_161)">
              <mask id="path-2-outside-1_158_161" maskUnits="userSpaceOnUse" x="361" y="496" width="556" height="1116" fill="black">
              <rect fill="white" x="361" y="496" width="556" height="1116"/>
              <path d="M362.188 1611V520H520.188L540.188 939L518.188 882C522.854 840.667 531.854 797.667 545.188 753C559.188 708.333 578.854 666.667 604.188 628C630.188 588.667 663.188 557 703.187 533C743.854 509 793.521 497 852.188 497C863.521 497 874.188 497.667 884.188 499C894.854 500.333 905.188 502 915.188 504V701C898.521 695.667 880.854 692.333 862.188 691C844.188 689 827.188 688 811.188 688C778.521 688 745.521 694.333 712.187 707C678.854 719.667 647.854 740 619.188 768C590.521 795.333 566.854 831 548.188 875V1611H362.188Z"/>
              </mask>
              <path d="M362.188 1611V520H520.188L540.188 939L518.188 882C522.854 840.667 531.854 797.667 545.188 753C559.188 708.333 578.854 666.667 604.188 628C630.188 588.667 663.188 557 703.187 533C743.854 509 793.521 497 852.188 497C863.521 497 874.188 497.667 884.188 499C894.854 500.333 905.188 502 915.188 504V701C898.521 695.667 880.854 692.333 862.188 691C844.188 689 827.188 688 811.188 688C778.521 688 745.521 694.333 712.187 707C678.854 719.667 647.854 740 619.188 768C590.521 795.333 566.854 831 548.188 875V1611H362.188Z" fill="white"/>
              <path d="M362.188 1611H361.188V1612H362.188V1611ZM362.188 520V519H361.188V520H362.188ZM520.188 520L521.186 519.952L521.141 519H520.188V520ZM540.188 939L539.255 939.36L541.186 938.952L540.188 939ZM518.188 882L517.194 881.888L517.166 882.131L517.255 882.36L518.188 882ZM545.188 753L544.233 752.701L544.229 752.714L545.188 753ZM604.188 628L603.353 627.449L603.351 627.452L604.188 628ZM703.188 533L702.679 532.139L702.673 532.142L703.188 533ZM884.188 499L884.055 499.991L884.064 499.992L884.188 499ZM915.188 504H916.188V503.18L915.384 503.019L915.188 504ZM915.188 701L914.883 701.952L916.188 702.37V701H915.188ZM862.188 691L862.077 691.994L862.097 691.996L862.116 691.997L862.188 691ZM712.188 707L711.832 706.065L712.188 707ZM619.188 768L619.878 768.724L619.886 768.715L619.188 768ZM548.188 875L547.267 874.609L547.188 874.797V875H548.188ZM548.188 1611V1612H549.188V1611H548.188ZM362.188 1611H363.188V520H362.188H361.188V1611H362.188ZM362.188 520V521H520.188V520V519H362.188V520ZM520.188 520L519.189 520.048L539.189 939.048L540.188 939L541.186 938.952L521.186 519.952L520.188 520ZM540.188 939L541.12 938.64L519.12 881.64L518.188 882L517.255 882.36L539.255 939.36L540.188 939ZM518.188 882L519.181 882.112C523.841 840.844 532.827 797.903 546.146 753.286L545.188 753L544.229 752.714C530.881 797.431 521.868 840.489 517.194 881.888L518.188 882ZM545.188 753L546.142 753.299C560.115 708.719 579.742 667.136 605.024 628.548L604.188 628L603.351 627.452C577.967 666.197 558.261 707.947 544.233 752.701L545.188 753ZM604.188 628L605.022 628.551C630.94 589.341 663.832 557.78 703.702 533.857L703.188 533L702.673 532.142C662.544 556.22 629.435 587.992 603.353 627.449L604.188 628ZM703.188 533L703.696 533.861C744.175 509.972 793.657 498 852.188 498V497V496C793.385 496 743.533 508.028 702.679 532.139L703.188 533ZM852.188 497V498C863.482 498 874.104 498.664 884.055 499.991L884.188 499L884.32 498.009C874.271 496.669 863.56 496 852.188 496V497ZM884.188 499L884.064 499.992C894.707 501.323 905.017 502.986 914.991 504.981L915.188 504L915.384 503.019C905.359 501.014 895.001 499.344 884.312 498.008L884.188 499ZM915.188 504H914.188V701H915.188H916.188V504H915.188ZM915.188 701L915.492 700.048C898.745 694.688 880.999 691.341 862.259 690.003L862.188 691L862.116 691.997C880.709 693.326 898.297 696.645 914.883 701.952L915.188 701ZM862.188 691L862.298 690.006C844.266 688.003 827.229 687 811.188 687V688V689C827.146 689 844.109 689.997 862.077 691.994L862.188 691ZM811.188 688V687C778.389 687 745.269 693.359 711.832 706.065L712.188 707L712.543 707.935C745.773 695.307 778.653 689 811.188 689V688ZM712.188 707L711.832 706.065C678.356 718.786 647.242 739.201 618.489 767.285L619.188 768L619.886 768.715C648.467 740.799 679.353 720.547 712.543 707.935L712.188 707ZM619.188 768L618.497 767.276C589.714 794.721 565.976 830.509 547.267 874.609L548.188 875L549.108 875.391C567.732 831.491 591.328 795.945 619.878 768.724L619.188 768ZM548.188 875H547.188V1611H548.188H549.188V875H548.188ZM548.188 1611V1610H362.188V1611V1612H548.188V1611Z" fill="black" mask="url(#path-2-outside-1_158_161)"/>
              </g>
              <g filter="url(#filter1_d_158_161)">
              <mask id="path-4-outside-2_158_161" maskUnits="userSpaceOnUse" x="1151" y="496" width="556" height="1116" fill="black">
              <rect fill="white" x="1151" y="496" width="556" height="1116"/>
              <path d="M1705.81 1611V520H1547.81L1527.81 939L1549.81 882C1545.15 840.667 1536.15 797.667 1522.81 753C1508.81 708.333 1489.15 666.667 1463.81 628C1437.81 588.667 1404.81 557 1364.81 533C1324.15 509 1274.48 497 1215.81 497C1204.48 497 1193.81 497.667 1183.81 499C1173.15 500.333 1162.81 502 1152.81 504V701C1169.48 695.667 1187.15 692.333 1205.81 691C1223.81 689 1240.81 688 1256.81 688C1289.48 688 1322.48 694.333 1355.81 707C1389.15 719.667 1420.15 740 1448.81 768C1477.48 795.333 1501.15 831 1519.81 875V1611H1705.81Z"/>
              </mask>
              <path d="M1705.81 1611V520H1547.81L1527.81 939L1549.81 882C1545.15 840.667 1536.15 797.667 1522.81 753C1508.81 708.333 1489.15 666.667 1463.81 628C1437.81 588.667 1404.81 557 1364.81 533C1324.15 509 1274.48 497 1215.81 497C1204.48 497 1193.81 497.667 1183.81 499C1173.15 500.333 1162.81 502 1152.81 504V701C1169.48 695.667 1187.15 692.333 1205.81 691C1223.81 689 1240.81 688 1256.81 688C1289.48 688 1322.48 694.333 1355.81 707C1389.15 719.667 1420.15 740 1448.81 768C1477.48 795.333 1501.15 831 1519.81 875V1611H1705.81Z" fill="white"/>
              <path d="M1705.81 1611H1706.81V1612H1705.81V1611ZM1705.81 520V519H1706.81V520H1705.81ZM1547.81 520L1546.81 519.952L1546.86 519H1547.81V520ZM1527.81 939L1528.75 939.36L1526.81 938.952L1527.81 939ZM1549.81 882L1550.81 881.888L1550.83 882.131L1550.75 882.36L1549.81 882ZM1522.81 753L1523.77 752.701L1523.77 752.714L1522.81 753ZM1463.81 628L1464.65 627.449L1464.65 627.452L1463.81 628ZM1364.81 533L1365.32 532.139L1365.33 532.142L1364.81 533ZM1183.81 499L1183.94 499.991L1183.94 499.992L1183.81 499ZM1152.81 504H1151.81V503.18L1152.62 503.019L1152.81 504ZM1152.81 701L1153.12 701.952L1151.81 702.37V701H1152.81ZM1205.81 691L1205.92 691.994L1205.9 691.996L1205.88 691.997L1205.81 691ZM1355.81 707L1356.17 706.065L1355.81 707ZM1448.81 768L1448.12 768.724L1448.11 768.715L1448.81 768ZM1519.81 875L1520.73 874.609L1520.81 874.797V875H1519.81ZM1519.81 1611V1612H1518.81V1611H1519.81ZM1705.81 1611H1704.81V520H1705.81H1706.81V1611H1705.81ZM1705.81 520V521H1547.81V520V519H1705.81V520ZM1547.81 520L1548.81 520.048L1528.81 939.048L1527.81 939L1526.81 938.952L1546.81 519.952L1547.81 520ZM1527.81 939L1526.88 938.64L1548.88 881.64L1549.81 882L1550.75 882.36L1528.75 939.36L1527.81 939ZM1549.81 882L1548.82 882.112C1544.16 840.844 1535.17 797.903 1521.85 753.286L1522.81 753L1523.77 752.714C1537.12 797.431 1546.13 840.489 1550.81 881.888L1549.81 882ZM1522.81 753L1521.86 753.299C1507.89 708.719 1488.26 667.136 1462.98 628.548L1463.81 628L1464.65 627.452C1490.03 666.197 1509.74 707.947 1523.77 752.701L1522.81 753ZM1463.81 628L1462.98 628.551C1437.06 589.341 1404.17 557.78 1364.3 533.857L1364.81 533L1365.33 532.142C1405.46 556.22 1438.57 587.992 1464.65 627.449L1463.81 628ZM1364.81 533L1364.3 533.861C1323.82 509.972 1274.34 498 1215.81 498V497V496C1274.61 496 1324.47 508.028 1365.32 532.139L1364.81 533ZM1215.81 497V498C1204.52 498 1193.9 498.664 1183.94 499.991L1183.81 499L1183.68 498.009C1193.73 496.669 1204.44 496 1215.81 496V497ZM1183.81 499L1183.94 499.992C1173.29 501.323 1162.98 502.986 1153.01 504.981L1152.81 504L1152.62 503.019C1162.64 501.014 1173 499.344 1183.69 498.008L1183.81 499ZM1152.81 504H1153.81V701H1152.81H1151.81V504H1152.81ZM1152.81 701L1152.51 700.048C1169.26 694.688 1187 691.341 1205.74 690.003L1205.81 691L1205.88 691.997C1187.29 693.326 1169.7 696.645 1153.12 701.952L1152.81 701ZM1205.81 691L1205.7 690.006C1223.73 688.003 1240.77 687 1256.81 687V688V689C1240.85 689 1223.89 689.997 1205.92 691.994L1205.81 691ZM1256.81 688V687C1289.61 687 1322.73 693.359 1356.17 706.065L1355.81 707L1355.46 707.935C1322.23 695.307 1289.35 689 1256.81 689V688ZM1355.81 707L1356.17 706.065C1389.64 718.786 1420.76 739.201 1449.51 767.285L1448.81 768L1448.11 768.715C1419.53 740.799 1388.65 720.547 1355.46 707.935L1355.81 707ZM1448.81 768L1449.5 767.276C1478.29 794.721 1502.02 830.509 1520.73 874.609L1519.81 875L1518.89 875.391C1500.27 831.491 1476.67 795.945 1448.12 768.724L1448.81 768ZM1519.81 875H1520.81V1611H1519.81H1518.81V875H1519.81ZM1519.81 1611V1610H1705.81V1611V1612H1519.81V1611Z" fill="black" mask="url(#path-4-outside-2_158_161)"/>
              </g>
              <defs>
              <filter id="filter0_d_158_161" x="357.188" y="496" width="563" height="1124" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feFlood floodOpacity="0" result="BackgroundImageFix"/>
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
              <feOffset dy="4"/>
              <feGaussianBlur stdDeviation="2"/>
              <feComposite in2="hardAlpha" operator="out"/>
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_158_161"/>
              <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_158_161" result="shape"/>
              </filter>
              <filter id="filter1_d_158_161" x="1147.81" y="496" width="563" height="1124" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feFlood floodOpacity="0" result="BackgroundImageFix"/>
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
              <feOffset dy="4"/>
              <feGaussianBlur stdDeviation="2"/>
              <feComposite in2="hardAlpha" operator="out"/>
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_158_161"/>
              <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_158_161" result="shape"/>
              </filter>
              </defs>
            </svg>
          </Link>
        </div>
      </div>

      {isRootDomain && (
        <NavigationMenu viewport={false} className="hidden md:flex">
          <NavigationMenuList className="mb-0">
            {/* <NavigationMenuItem className="mb-0">
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href="/about">About</Link>
              </NavigationMenuLink>
            </NavigationMenuItem> */}
            {/* <NavigationMenuItem className="mb-0">
              <NavigationMenuTrigger>Connect</NavigationMenuTrigger>
              <NavigationMenuContent className="">
                <div className="flex justify-between">
                  {socialLinks.map((social) => {
                    const Icon = social.icon;
                    return (
                      <NavigationMenuLink asChild key={social.name}>
                        <Link
                          key={social.name}
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={social.name}
                        >
                          <Button Icon={Icon} variant="ghost" />
                        </Link>
                      </NavigationMenuLink>
                    );
                  })}
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem> */}
            <NavigationMenuItem className="mb-0">
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href="/blog">Blog</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem className="mb-0">
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href="https://succinct-soil-37c.notion.site/2c084bc6aead8080a94bebd812cfe4e0?v=2c084bc6aead8056ae21000c1a57e664" target="_blank">Changelog</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            {/* <NavigationMenuItem className="mb-0">
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href="/blog">Showcase</Link>
              </NavigationMenuLink>
            </NavigationMenuItem> */}
            {/* <NavigationMenuItem className="mb-0">
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href="/about">Agents</Link>
              </NavigationMenuLink>
            </NavigationMenuItem> */}
            {/* <NavigationMenuItem className="mb-0">
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href="/about">MCP</Link>
              </NavigationMenuLink>
            </NavigationMenuItem> */}
            {/* <NavigationMenuItem className="mb-0">
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href="/pricing">Pricing</Link>
              </NavigationMenuLink>
            </NavigationMenuItem> */}
          </NavigationMenuList>
        </NavigationMenu>
      )}
      
      <div className="flex justify-end gap-4">
        {pathname === '/' && user && <Button onClick={() => router.push('/docs')}>My Agreements</Button>}
        <ProfileDropdown />
      </div>
    </nav>
  );
}