import { Rules } from "../../../../types/rules";

interface TextAreaInputProps {
  placeholder: string;
  name: string;
  register: any;
  rules: Rules;
}

export function TextAreaInput({ placeholder, name, register, rules }: TextAreaInputProps) {
  return (
    <textarea
      className="" 
      placeholder={placeholder} 
      {...register(name, rules)}
      rows={7}
      cols={75}
    />
  )
}