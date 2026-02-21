import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";


const triggerClasses = 'text-lg md:text-xl items-start py-5 md:py-7';
const accordionContentClasses = 'text-lg';

const accordionItems = [
  {
    title: "Find a house to put an offer on",
    content: "Visit open houses and when you find a house you want to put an offer on, ask for the seller's email address (or their agent's) to be able to send them an offer."
  },
  {
    title: "Connect the house's Zillow listing",
    content: "Enter the address of the house above to get started.  We will pull in the house's Zillow listing to help you build your offer."
  },
  {
    title: "Build an offer to put on the house",
    content: "Use our free offer builder and template to build an offer to put on the house."
  },
  {
    title: "Have an attorney review your offer",
    content: "When your offer is accepted by the seller but before it's signed, hire an attorney to review it in Koya to make sure you're protected."
  }
];
  

function getItem(value: string, index: number, title: string, content: string) {
  return (
    <AccordionItem value={value} key={value} className="">
      <AccordionTrigger className={`${triggerClasses}`}>
        <div className="">
          <span className="font-bold mr-2 md:mr-3">{index}.</span>
          {title}
        </div>
      </AccordionTrigger>
      <AccordionContent className={`${accordionContentClasses}`}>
        {content}
      </AccordionContent>
    </AccordionItem>
  )
}

export function ProductExplanationAccordion() {
  return (
    <div className="flex flex-col w-full px-5 md:px-0 md:w-1/2 md:h-1/2 absolute md:mx-auto my-auto text-white">
      <h2 className="text-4xl font-bold mb-10 text-center">How it works:</h2>
      <Accordion type="single" collapsible>
        { accordionItems.map((item, index) => getItem(index.toString(), index + 1, item.title, item.content)) }
      </Accordion>
    </div>
  );
}