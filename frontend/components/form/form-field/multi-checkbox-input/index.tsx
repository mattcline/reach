import { Rules } from "../../../../types/rules";

interface MultiCheckboxInputProps {
  name: string;
  choices: any[];

  // FormField-specific fields
  register?: any;
  rules?: Rules;
}
export function MultiCheckboxInput({ name, choices, register, rules }: MultiCheckboxInputProps) {
  return (
    <>
      {
        choices.map(choice => (
          <span id={choice[0]} key={choice[0]}>
            <input id={choice[0]} type="checkbox" value={choice[0]} {...(register ? register(name, rules) : {name: name})} />
            <label id={`${choice[0]}-label`} htmlFor={choice[0]} className='m-3'>{choice[1]}</label>
          </span>
        ))
      }
    </>
  )
}