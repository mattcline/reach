import React from "react"
import Image from "next/image";


export default function Action({ data, customCSS }: 
  { data: any,
    customCSS: string
  }
){

  const getIconURL = (type: string) => {
    switch (type) {
      case 'submitted':
        return '/offer.png';
      case 'accepted':
        return '/check_mark_green.png';
      case 'rejected':
        return '/x.png';
      case 'revoked':
        return '/x.png'; // TODO: make this red
      case 'countered':
        return '/counteroffer.png';
      default:
        return '';
    }
  }

  const getTextColor = (type: string) => {
    switch (type) {
      case 'submitted':
        return 'text-blue-800';
      case 'accepted':
        return 'text-green-800';
      case 'rejected':
        return 'text-red-800';
      case 'countered':
        return 'text-blue-800';
      default:
        return '';
    }
  }

  return (
    <div className={`flex flex-row items-center ${customCSS}`}>
      <Image
        height={25}
        width={25}
        src={getIconURL(data.type)}
        alt="action icon"
        className={'pr-2'}
      />
      <div className={getTextColor(data.type)}>{data.text}</div>
    </div>
  )
}
