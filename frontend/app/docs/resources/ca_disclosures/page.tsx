import Image from "next/image"

export default async function DisclosuresPage(props: { params: Promise<{ id: string, offerId: string }> }) {
  const params = await props.params;

  const buildText = (text: string) => {
    return <div className={`text-lg my-5`}>{text}</div>
  }
  
  const buildHeading = (text: string) => {
    return <div className={`flex flex-row items-center my-5`}>
      <div className={`text-2xl font-bold`}>{text}</div>
    </div>
  }

  const buildIndentedText = (text: string) => {
    return <div className={`text-lg ml-5 my-5`}>{text}</div>
  }

  const buildLink = (text: string, url: string) => {
    return <a href={url} target="_blank" className={`text-blue-500 underline`}>{text}</a>
  }

  return (
    <div className={`flex flex-col flex-1 mb-16`}>
      <div className={`flex flex-col md:flex-row flex-1 justify-start items-center`}>
        <div className={`flex flex-col flex-1 md:mr-10`}>
          <h1 className={`text-4xl font-bold`}>California Seller Disclosures</h1>
          <div className={`mt-2`}>Last Edited: July 18, 2024</div>
        </div>
        <div className="flex flex-row flex-1">
          <Image
            alt="disclosures"
            src="/disclosures.jpg"
            className="my-10 flex flex-row flex-1 rounded-lg"
            width={500}
            height={500}
            priority
          />
        </div>
      </div>
      <div>
        {/* <div>The State of California Department of Real Estate published a helpful article but it's from 2005 so it's outdated: [Disclosures in Real Property Transactions](https://www.dre.ca.gov/files/pdf/re6.pdf)</div> */}
        <div className={`text-lg my-5`}>
          The California Civil Code outlines the required disclosures sellers have to provide to buyers when selling a home in California:&nbsp;
          {buildLink("California Civil Code § 1102 et seq.", "https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=CIV&division=2.&title=4.&part=4.&chapter=2.&article=1.5.")}
          &nbsp;and {buildLink("California Civil Code § 1103 - 1103.15", "https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=CIV&division=2.&title=4.&part=4.&chapter=2.&article=1.7.")}
        </div>
        {buildText("Our team has gone through the statute and started a summarized list of these disclosures:")}
        {buildHeading("1. The Real Estate Transfer Disclosure Statement")}
        <div className={`text-lg ml-5 my-5`}>
          The Real Estate Transfer Disclosure Statement (TDS) is a comprehensive form that requires the seller to disclose all known material facts about the property.  The state of California Civil Code contains a template for the TDS which you can find on pages 34-38 in the document obtained by navigating to this&nbsp;
          {buildLink('link', 'https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=201920200SB1371')} 
          &nbsp;and clicking &apos;Bill PDF&apos; at the top to download the document.
        </div>
        <div className={`text-lg ml-5 my-5`}>Some cities and/or counties require a local disclosure statement in addition to the TDS.  Similar to the TDS, the Civil Code requires a format for local disclosures that can be found on pages 9-10 after navigating to this&nbsp;
          {buildLink('link', 'https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=201720180AB1289')}
          &nbsp;and clicking &apos;Bill PDF&apos; at the top to download the document.
        </div>
        {/* <div>insert airport disclosure from 1102.6a.</div>
        {buildIndentedText("Note: mobile homes require a separate TDS: insert here")}
        {buildHeading("2. Natural Hazard Disclosure Statement (NHDS)")}
        {buildHeading("3. Mello-Roos Bonds and Taxes")}
        {buildHeading("4. Notice of ‘Supplemental’ Property Tax Bill")}
        {buildHeading("5. Smoke Detector Statement of Compliance")}
        {buildHeading("6. Lead-based Paint Hazards")}
        {buildIndentedText("1. Seller shall provide a warning statement and any known information about the presence of lead-based paint in the Property in the form of a document titled [“Disclosure of Information on Lead-Based Paint and/or Lead-Based Paint Hazards”](https://www.hud.gov/sites/documents/DOC_12343.PDF).")} 
        {buildIndentedText("2. Seller shall provide a lead information pamphlet titled [“Protect Your Family from Lead in Your Home”](https://www.epa.gov/lead/protect-your-family-lead-your-home-english) to Buyer.")} */}
        {/* {"include note about Buyer's option to receive an electronic copy"} */}
        {/* {buildIndentedText("3. Buyer has 10 days from Agreement Date to conduct an inspection to uncover any lead-based paint hazards.  Buyer has the option to waive this opportunity.")}
        {buildHeading("7. Tax Withholding")}
        {buildIndentedText("1. Buyer shall withhold and send 15% of gross sales price to the IRS if Seller is a “foreign person” according to the [Foreign Investment in Real Property Tax Act](https://www.irs.gov/individuals/international-taxpayers/firpta-withholding#:~:text=The%20disposition%20of%20a%20U.S.,of%20U.S.%20real%20property%20interests.).  If exempt, Seller shall provide Buyer with a non-foreign status affidavit and U.S. taxpayer I.D. number.")}
        {buildIndentedText("2. Seller shall disclose if the transaction is subject to California’s [real estate withholding requirement](https://www.ftb.ca.gov/pay/withholding/real-estate-withholding.html).")}
        {buildHeading("8. Water Heater Bracing Certification")}
        {buildIndentedText("1. Seller shall certify in writing that “all new and replacement water heaters, and all existing residential water heaters” have been “braced, anchored, or strapped to resist falling or horizontal displacement due to earthquake motion” according to [California Health and Safety Code § 19211](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=19211.).")}
        {buildHeading("9. Megan’s Law")}
        {buildIndentedText("1. **“Notice: Pursuant to Section 290.46 of the Penal Code, information about specified registered sex offenders is made available to the public via an Internet Web site maintained by the Department of Justice at www.meganslaw.ca.gov. Depending on an offender’s criminal history, this information will include either the address at which the offender resides or the community of residence and ZIP Code in which the offender resides.”** - [California Civil Code § 2079.10a](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=2079.10a.&lawCode=CIV).")}
        <div className={``}>Disclaimer: this article might not be comprehensive</div>
        <div>(maybe move to the top) Since statute is subject to change, reader is advised to consult statute (the civil code) for most updated information.</div>
        <div>These disclosures may not apply to your property - the exemptions are listed out in section 1102.2</div>
        <div>Note that you made need to provide other disclosures specific to your type of property (e.g. mobilehome)</div> */}
        {buildText("Note: this list is not yet complete - our team is at work on the remaining required disclosures so check back for updates.")}
        {/* Note: I left off at 1102.6a. */}
      </div>
    </div>
  );
}