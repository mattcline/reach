import { Separator } from "../ui/separator";
import { Recycle, Signature, Bot, Lightbulb, Download } from "lucide-react"


export function Features() {
  const features = {
    'document_editor': {
      title: 'Document editor',
      icon: <Signature size="20" />
    },
    'pretrained_chatgpt': {
      title: 'Pretrained ChatGPT',
      icon: <Bot size="20" />
    },
    'learns': {
      title: 'Learns from updates',
      icon: <Recycle size="20" />
    },
    'document_downloads': {
      title: 'Document downloads',
      icon: <Download size="20" />
    },
    'buyer_seller': {
      title: 'Communication',
      icon: <Lightbulb size="20" />
    }
  }

  function getFeature(name: keyof typeof features) {
    const {title, icon} = features[name];
    return (
      <div className={`flex flex-row items-center justify-center ${name === 'document_editor' && 'text-blue-accent'}`}>
        {icon}
        <h2 className="ml-3">{title}</h2>
      </div>
    )
  }
  return (
    <>
      <div className="flex flex-row flex-1 mx-40">
        <video controls className={`rounded-lg`}>
          <source src="/marketing_final.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
      {/* <Separator className="my-4" /> */}
      <div className="flex h-5 items-center space-x-4 text-sm mt-5">
        {getFeature('document_editor')}
        <Separator orientation="vertical" />
        {getFeature('pretrained_chatgpt')}
        <Separator orientation="vertical" />
        {getFeature('learns')}
        <Separator orientation="vertical" />
        {getFeature(`document_downloads`)}
        <Separator orientation="vertical" />
        {getFeature(`buyer_seller`)}
      </div>
      <Separator className="my-4" />
    </>
  )
}