'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lexend, Funnel_Display, Aref_Ruqaa, Oregano } from 'next/font/google';
import {
  FilePlus,
  Signature,
  MessageSquareDiff,
  Handshake,
  ArrowRight,
  SearchCheck,
  Merge,
  ShieldCheck,
  TextSearch,
  ArrowDown,
  Flag
} from 'lucide-react';

import { prod } from 'lib/constants';
import { useUser } from 'context/user';
import { Button } from 'components/ui/button';
import { ProductExplanationAccordion } from 'components/product-explanation-accordion';
import { Testimonials } from 'components/testimonials';
import { Features } from 'components/features';
import { UserProfile } from 'types/user';
import { Card, CardContent, CardHeader } from 'components/ui/card';

export default function HomePage() {
  const { user, setUser } = useUser();
  const router = useRouter();

  useEffect(() => {
    return; // do not show google auth one tap for now

    if (user || !prod) return;

    // load google auth script
    const callback = (user: UserProfile) => {
      setUser(user);
      router.push(`/dashboard`);
    };
  }, [user, router, setUser]);

  return (
    <>
      <div className={`flex flex-col flex-1 overflow-y-scroll items-center md:mx-20`}>
        <div className="flex flex-col flex-1 w-full items-center">
          <div className="flex flex-col flex-1 w-full">
            <div className="flex flex-col flex-1 items-center justify-center my-10 md:my-20">
              {/* <h1 className="text-3xl md:text-7xl text-center break-normal">Reach better agreements, <span className="italic">together.</span></h1> */}
              <h1 className="text-4xl md:text-7xl mx-8 md:mx-40 text-center break-normal">Finalize agreements together with AI</h1>
              <h3 className="flex flex-col md:flex-row text-center break-normal gap-2 md:gap-6 text-md md:text-2xl"><span>1. Upload a markdown file</span><span>2. Invite collaborators</span><span>3. Edit with AI</span></h3>
              {/* <span>4. Sign</span> */}
              {/* <h3 className="text-center break-normal">Tackling the final stage of the agreement process where everything comes together.</h3> */}
              {/* <h1 className={`text-3xl md:text-7xl text-center tracking-tight [word-spacing:-0.075em]   bg-green-500/50 border-b-4 border-b-green-500`}>review with a human.</h1> */}
              {/* <h3 className="flex flex-row items-center mt-6 text-2xl gap-3">The reviewer-in-the-loop tool enabling speed and trust.</h3> */}
              {/* <div className="flex md:mt-18 gap-4">
                <Button
                  Icon={FilePlus}
                  onClick={() => router.push('/docs')}
                >
                  Upload your agreement
                  <ArrowRight />
                </Button>
              </div> */}
            </div>
            <div className="flex flex-row flex-1 md:mx-10">
              <video className={`rounded-lg`} autoPlay loop muted playsInline>
                <source src="/demo_feb_4_26.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
            {/* <div>Step 1. Upload your agreement .md draft</div>
            <div>Step 2. Invite collaborators</div>
            <div>Step 3. Use AI as a third party to hammer out the details</div>
            <div>Step 4. Sign the agreement</div> */}
            {/* <div className="flex flex-col flex-2 justify-center gap-5">
              <div className="flex flex-row justify-center gap-5">
                <Button
                  Icon={ArrowRight}
                  variant="ghost"
                />
                <Button
                  Icon={ArrowRight}
                  variant="outline"
                  className="bg-accent"
                >
                  <FilePlus />
                  Draft
                </Button>
                <Button
                  Icon={TextSearch}
                  variant="link"
                >
                  Review
                </Button>
                <Button
                  Icon={Flag}
                  variant="ghost"
                />
              </div>
              <Card className="bg-background mx-5">
                <CardContent className="p-6">
                  <div className="text-red-500 line-through">the house located at the house located at...</div>
                  <div className="text-green-500">the real property located at the real property located at...</div>
                </CardContent>
              </Card>
              <Card className="bg-background mx-5">
                <CardContent className="p-6">
                  <div className="text-red-500 line-through">the house located at the house located at...</div>
                  <div className="text-green-500">the real property located at the real property located at...</div>
                </CardContent>
              </Card>
              <Card className="bg-background mx-5">
                <CardContent className="p-6">
                  <div className="text-red-500 line-through">the house located at the house located at...</div>
                  <div className="text-green-500">the real property located at the real property located at...</div>
                </CardContent>
              </Card>
              <Card className="bg-background mx-5">
                <CardContent className="p-6">
                  <div className="text-red-500 line-through">the house located at the house located at...</div>
                  <div className="text-green-500">the real property located at the real property located at...</div>
                </CardContent>
              </Card>
              <Card className="bg-background mx-5">
                <CardContent className="p-6">
                  <div className="text-red-500 line-through">the house located at the house located at...</div>
                  <div className="text-green-500">the real property located at the real property located at...</div>
                </CardContent>
              </Card>
            </div> */}
          </div>
        </div>
        <footer className="flex flex-col flex-1 items-center justify-center py-5">
          <Link href={'https://www.linkedin.com/company/reachagreements/'} target={'_blank'}>
            <svg xmlns="http://www.w3.org/2000/svg" className={`mb-3 fill-foreground`} width="24" height="24" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
          </Link>
          <a className="mb-2" href={'/privacy_policy'}>Privacy Policy</a>
          <div className=''>© 2026 Koya LLC.  All rights reserved.</div>
        </footer>
      </div>
    </>
  );
}