import React from 'react';
import { Controller } from 'react-hook-form';

import { TextInput } from 'components/form/form-field/text-input';
import { SelectInput } from 'components/form/form-field/select-input';
import { MultiCheckboxInput } from 'components/form/form-field/multi-checkbox-input';
import { TextAreaInput } from 'components/form/form-field/textarea-input';
import { Label } from 'components/ui/label';
import { Checkbox } from 'components/ui/checkbox';
import { Rules } from 'types/rules';
import { FormField as IFormField } from 'types/form-field';

interface FormFieldProps {
  field: IFormField;
  direction?: string; // 'row' | 'column';
  register?: any; // TODO: update
  control?: any; // TODO: update
}

/**
 * Possible Django field types:
 *  CharField (w/ optional choices)
 *  IntegerField
 *  TextField
 *  ArrayField (w/ choices)
 */

export default function FormField({
  field,
  direction = 'column',
  register,
  control
}: FormFieldProps) {
  let input = null;
  let { name, choices, placeholder, type, title, description } = field;

  let rules: Rules = {};
  // TODO: test this
  if (field.required === true || field.required === undefined && !field.blank) {
    rules['required'] = field.required_message || 'This field is required';
  }

  if (field.max_length) {
    rules['maxLength'] = { value: field.max_length, message: `This field must be ${field.max_length} or less characters` };
  }

  let flexDirection = direction === 'row' ? 'flex-row' : 'flex-col';
  let flexAxis = direction === 'row' ? 'items' : 'justify';
  let labelMargin = direction === 'row' ? 'mr-2' : 'mb-2';

  if (choices !== undefined && choices !== null) {
    if (type === 'ArrayField') {
      input = <MultiCheckboxInput name={name} choices={choices} register={register} rules={rules} />
    } else {
      input = <SelectInput name={name} choices={choices} register={register} rules={rules} />
    }
  } else if (type === 'TextField' || type === 'textarea') { // check for both Django field type and custom type
    input = <TextAreaInput name={name} placeholder={placeholder || ''} register={register} rules={rules} />
  } else if (type === 'BooleanField' || type === 'checkbox') {
    input = (
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field }) => (
          <Checkbox
            ref={field.ref}
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            disabled={field.disabled}
            checked={field.value} // Manually bind the checked state
            onCheckedChange={(checked) => field.onChange(checked)} // Pass checked state to React Hook Form
            id={name}
            aria-label={title}
          />
        )}
      />
    );
    flexDirection = 'flex-row-reverse justify-end';
    flexAxis = 'items';
    labelMargin = 'ml-1.5';
  } else {
    input = <TextInput name={name} type={type} placeholder={placeholder || ''} register={register} rules={rules} />
  }

  return (
    <div className="flex flex-col flex-1">
      <div className={`flex ${flexDirection} ${flexAxis}-center`}>
        <Label className={`${labelMargin}`}>{title}</Label>
        { input }
      </div>
      { description && <p className="text-sm text-muted-foreground mt-1">{description}</p> }
    </div>
  )
}