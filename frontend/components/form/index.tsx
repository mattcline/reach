'use client';

import { useEffect, ReactNode, MouseEvent } from 'react';
import { useForm } from 'react-hook-form';

import { makeRequest } from 'lib/utils/request';
import FormField from 'components/form/form-field';
import FieldError from 'components/form/field-error';
import { Button } from 'components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from 'components/ui/card';
import { FormField as IFormField } from 'types/form-field';

interface FormProps {
  children?: ReactNode,
  heading?: string;
  subheading?: string;
  fields: IFormField[] | null;
  formURL: string;
  formMethod?: string;
  formData?: object;
  onSubmit?: (data: any, status: number, body: any) => void;
  onCancel? : () => Promise<void>;
  submitButtonText?: string;
  includeCancelButton?: boolean;
  inlineSubmitButton?: boolean;
}

export function Form({ 
  children, 
  heading, 
  subheading, 
  fields,
  formURL, 
  formMethod,
  formData,
  onSubmit,
  onCancel,
  submitButtonText = 'Submit',
  includeCancelButton = false,
  inlineSubmitButton = false
}: FormProps) {
  const { 
    register,
    handleSubmit,
    control,
    setValue,
    getValues, 
    formState: { dirtyFields, errors, isSubmitting, isSubmitSuccessful } 
  } = useForm();

  useEffect(() => {
    // initialize form with data from backend
    fields?.forEach((field: any) => {
      setValue(field.name, field.value);
    });
  }, [fields, setValue]);

  async function submit(event: MouseEvent<HTMLButtonElement>) {
    return handleSubmit(async (data) => {
      // only send modified fields to backend
      let modifiedFields: any = {};
      for (const [key, value] of Object.entries(dirtyFields)) {
        modifiedFields[key] = data[key];
      }

      const { 
        data: responseData,
        status 
      } = await makeRequest({
        url: formURL,
        method: formMethod ? formMethod : "POST",
        body: formData ? {...modifiedFields, ...formData} : modifiedFields,
        accept: 'application/json'
      });

      if (onSubmit) {
        return onSubmit(responseData, status, formData ? {...modifiedFields, ...formData} : modifiedFields);
      }
    })();
  }

  const includeHeader = heading || subheading;
  return (
    <form className="flex flex-col">
      <Card className="w-full mx-auto border-none shadow-none">
        {includeHeader && (
          <CardHeader>
            {heading && <CardTitle className="text-2xl">{heading}</CardTitle> }
            {subheading && (
              <CardDescription>
                {subheading}
              </CardDescription>
            )}
          </CardHeader>
        )}
        <CardContent className={`p-0 ${inlineSubmitButton ? 'flex flex-1 items-end gap-2' : ''}`}>
          {fields?.map((field: IFormField) => (
            <div key={field.name} className={`mb-4 ${inlineSubmitButton ? 'flex-1' : ''}`}>
              <FormField
                key={field.name}
                field={field}
                direction={field.direction}
                register={register}
                control={control}
              />
              <FieldError error={errors[field.name]?.message} />
            </div>
          ))}
          {includeCancelButton ? (
            <div className="flex flex-row flex-1 justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submit}
              >
                { submitButtonText }
              </Button>
            </div>
          ) : (
            <Button
              onClick={submit}
              className="mb-4 relative"
            >
              { submitButtonText }
            </Button>
          )}
          {children}
        </CardContent>
      </Card>
    </form>
  );
}