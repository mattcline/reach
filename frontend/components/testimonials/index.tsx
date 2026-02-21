import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"


export function Testimonials() {
  return (
    <div className="flex flex-row flex-1 justify-center items-center w-1/2 my-20">
      <Avatar className="w-[50px] h-[50px] mr-3">
        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
        <AvatarFallback className="bg-blue-950/25 text-white">CN</AvatarFallback>
      </Avatar>
      <div>&quot;I saved so much money not using a real estate agent. I was able to put an offer on a house in just a few minutes.&quot;</div>
    </div>
  )
}