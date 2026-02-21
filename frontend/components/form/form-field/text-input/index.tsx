import { Rules } from "../../../../types/rules";
import { Input } from "../../../ui/input"


interface TextInputProps {
  name: string;
  type: string;
  placeholder: string;
  register: any;
  rules: Rules;
}

export function TextInput({ name, type, placeholder, register, rules }: TextInputProps) {
  // TODO: might want to include this in the backend
  const getHtmlElType = (type: string) => {
    if (type === 'IntegerField') {
      return 'number';
    } else if (type === 'EmailField') {
      return 'email';
    }
    return type;
  }

  return (
    <Input
      type={getHtmlElType(type)}
      placeholder={placeholder}
      {...register(name, rules)}
      onWheel={(e: any) => e.target.blur()}
    />
  )
}