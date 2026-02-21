import { Rules } from "../../../../types/rules";

interface SelectInputProps {
  name: string;
  choices: any[];

  // FormField-specific fields
  register?: any;
  rules?: Rules;
}

// this component is used by the FormField and Document components
// class names for the select element below are from "@/components/ui/select"
export function SelectInput({ name, choices, register, rules }: SelectInputProps) {
  return (
    <select
      id={`${name}-select`}
      className={`h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent pl-3 pr-9 py-2 text-sm shadow-xs ring-offset-background placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1`}
      defaultValue="Select..."
      {...(register ? register(name, rules) : { id: name, name: name })}  // if register is provided, it's coming from FormField, otherwise it's coming from Document
    >
    <option id={`${name}-placeholder`} disabled value="Select...">Select...</option>
    { 
      choices.map(choice => (
        <option value={choice[0]} key={choice[0]}>{choice[1]}</option>
      ))
    }
    </select>
  )
}