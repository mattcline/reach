
export default function Article({ children }: { children: React.ReactNode }) {

  return (
    <div className={`flex flex-row flex-1 justify-center overflow-scroll`}>
      <div className={`flex flex-col md:w-3/5 mx-6 md:mx-0 mt-10 md:mt-0`}>
        {children}
      </div>
    </div>
  )
}